import os
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
import collections
from pydantic import BaseModel
from typing import Optional, List

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 1. Modified Model: Everything optional except start/end day
class LmpRangeQuery(BaseModel):
    start_day: str
    end_day: str
    days_of_week: Optional[List[int]] = None
    start_hour: Optional[int] = None
    end_hour: Optional[int] = None
    monitored_facility: Optional[str] = None

# PJM Zone Shapes Endpoint
@app.get("/api/zones")
def get_zones(db: Session = Depends(get_db)):
    try:
        shape_query = text("""
            SELECT Transact_Z, ST_AsGeoJSON(ST_GeomFromText(WKT)) as geometry_geojson
            FROM pjm_zone_shapes
            WHERE WKT IS NOT NULL
        """)
        shape_result = db.execute(shape_query)
        features = []
        for zone_shape_row in shape_result.fetchall():
            row_dict = zone_shape_row._asdict()
            feature = {
                "type": "Feature",
                "geometry": json.loads(row_dict['geometry_geojson']),
                "properties": {"zone_name": row_dict['Transact_Z']}
            }
            features.append(feature)
        if not features:
            raise HTTPException(status_code=404, detail="No zone shapes found.")
        return {"type": "FeatureCollection", "features": features}
    except Exception as e:
        print(f"An unexpected server error occurred while fetching zones: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")

@app.post("/api/lmp/range")
def get_lmp_data_for_range(query: LmpRangeQuery, db: Session = Depends(get_db)):
    try:
        # Params
        params = {}
        start_datetime_obj = datetime.strptime(query.start_day, '%Y-%m-%d')
        end_datetime_obj = datetime.strptime(query.end_day, '%Y-%m-%d') + timedelta(days=1)
        params["start_dt"] = start_datetime_obj
        params["end_dt"] = end_datetime_obj
        params["start_hour"] = query.start_hour
        params["end_hour"] = query.end_hour

        # --- BASE QUERY STRINGS ---
        
        # LMP Query 
        lmp_query_str = """
            SELECT
                z.Transact_Z,
                da.datetime_beginning_ept,
                da.total_lmp_da AS lmp_da,
                rt.total_lmp_rt AS lmp_rt,
                (rt.total_lmp_rt - da.total_lmp_da) AS lmp_net
            FROM
                pjm_da_hrl_lmps AS da
            JOIN
                pjm_rt_hrl_lmps AS rt ON da.pnode_name = rt.pnode_name AND da.datetime_beginning_ept = rt.datetime_beginning_ept
            JOIN
                pjm_lat_long AS ll ON da.pnode_name = ll.Alt_Name
            JOIN
                pjm_zone_shapes AS z ON ll.Transact_Z = z.Transact_Z
            WHERE
                da.datetime_beginning_ept >= :start_dt AND da.datetime_beginning_ept < :end_dt
                AND EXTRACT(HOUR FROM da.datetime_beginning_ept) >= :start_hour
                AND EXTRACT(HOUR FROM da.datetime_beginning_ept) < :end_hour
        """

        # Constraints Query
        constraints_query_str = """
            SELECT
                DATE_FORMAT(datetime_beginning_ept, '%Y-%m-%d %H:00:00') AS hour_beginning,
                monitored_facility,
                ROUND(SUM(shadow_price) / 12, 2) AS shadow_price
            FROM
                electric_data.pjm_binding_constraints
            WHERE
                datetime_beginning_ept >= :start_dt AND datetime_beginning_ept < :end_dt
                AND EXTRACT(HOUR FROM datetime_beginning_ept) >= :start_hour
                AND EXTRACT(HOUR FROM datetime_beginning_ept) < :end_hour
        """

        # --- DYNAMIC FILTERS ---

        # 1. Day of Week Filter
        if query.days_of_week:
            dow_clause_da = " AND DAYOFWEEK(da.datetime_beginning_ept) IN :days_of_week"
            dow_clause_con = " AND DAYOFWEEK(datetime_beginning_ept) IN :days_of_week"
            
            lmp_query_str += dow_clause_da
            constraints_query_str += dow_clause_con
            
            params["days_of_week"] = tuple(query.days_of_week)

        # 2. Selected Constraint Filter
        if query.monitored_facility:
            subquery = """
                SELECT DISTINCT DATE_FORMAT(datetime_beginning_ept, '%Y-%m-%d %H:00:00')
                FROM electric_data.pjm_binding_constraints
                WHERE monitored_facility = :monitored_facility
            """
            
            # Show LMP only for hours where constraint existed
            lmp_query_str += f" AND da.datetime_beginning_ept IN ({subquery})"
            constraints_query_str += f" AND DATE_FORMAT(datetime_beginning_ept, '%Y-%m-%d %H:00:00') IN ({subquery})"
            params["monitored_facility"] = query.monitored_facility

        # Order and Group
        lmp_query_str += " ORDER BY z.Transact_Z, da.datetime_beginning_ept;"
        constraints_query_str += " GROUP BY hour_beginning, monitored_facility ORDER BY hour_beginning, monitored_facility;"

        # Execute Queries
        lmp_result = db.execute(text(lmp_query_str), params)
        constraints_result = db.execute(text(constraints_query_str), params)

        # LMP Data Processing
        lmp_data_by_zone = collections.defaultdict(list)
        lmp_rows = lmp_result.fetchall()
        
        if lmp_rows:
            for row in lmp_rows:
                row_dict = row._asdict()
                lmp_data_by_zone[row_dict['Transact_Z']].append({
                    "datetime_beginning_ept": row_dict['datetime_beginning_ept'].isoformat(),
                    "lmp_values": {
                        "da": row_dict['lmp_da'],
                        "rt": row_dict['lmp_rt'],
                        "net": row_dict['lmp_net']
                    }
                })

        # Constraints Data Processing
        constraints_data = []
        constraint_rows = constraints_result.fetchall()

        for row in constraint_rows:
            row_dict = row._asdict()
            constraints_data.append({
                "name": row_dict['monitored_facility'],
                "timestamp": str(row_dict['hour_beginning']), 
                "shadow_price": row_dict['shadow_price'] 
            })

        # Response
        return {
            "zones": lmp_data_by_zone,
            "constraints": constraints_data
        }

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Please use YYYY-MM-DD.")
    except Exception as e:
        print(f"An unexpected server error occurred while fetching LMP data: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred processing your request.")
    
@app.get("/api/constraints/list")
def get_unique_constraints(db: Session = Depends(get_db)):
    try:
        # Query for distinct monitored facilities aka constraints
        query = text("""
            SELECT DISTINCT monitored_facility 
            FROM electric_data.pjm_binding_constraints
            WHERE monitored_facility IS NOT NULL
            ORDER BY monitored_facility ASC
        """)
        
        result = db.execute(query)
        constraints = [row[0] for row in result.fetchall()]
        return {"constraints": constraints}
        
    except Exception as e:
        print(f"An unexpected server error occurred while fetching constraint list: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")
