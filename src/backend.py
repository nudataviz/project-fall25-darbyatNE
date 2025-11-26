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
from typing import List

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

# MODIFIED: Removed 'price_type' from the query model
class LmpRangeQuery(BaseModel):
    start_day: str
    end_day: str
    days_of_week: List[int]
    hours: List[bool]

# PJM Zone Shapes Endpoint (Unchanged)
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

# MODIFIED: This endpoint now fetches DA, RT, and calculates NET in a single query.
@app.post("/api/lmp/range")
def get_lmp_data_for_range(query: LmpRangeQuery, db: Session = Depends(get_db)):
    try:
        selected_hours = [i for i, selected in enumerate(query.hours) if selected]
        params = {}

        base_query_str = """
            SELECT
                z.Transact_Z,
                da.datetime_beginning_ept,
                da.total_lmp_da AS lmp_da,
                rt.total_lmp_rt AS lmp_rt,
                (da.total_lmp_da - rt.total_lmp_rt) AS lmp_net
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
        """
        
        start_datetime_obj = datetime.strptime(query.start_day, '%Y-%m-%d')
        end_datetime_obj = datetime.strptime(query.end_day, '%Y-%m-%d') + timedelta(days=1)
        params["start_dt"] = start_datetime_obj
        params["end_dt"] = end_datetime_obj
        
        if query.days_of_week:
            base_query_str += " AND DAYOFWEEK(da.datetime_beginning_ept) IN :days_of_week"
            params["days_of_week"] = tuple(query.days_of_week)
        if selected_hours:
            base_query_str += " AND EXTRACT(HOUR FROM da.datetime_beginning_ept) IN :selected_hours"
            params["selected_hours"] = tuple(selected_hours)

        base_query_str += " ORDER BY z.Transact_Z, da.datetime_beginning_ept;"
        
        lmp_query = text(base_query_str)
        lmp_result = db.execute(lmp_query, params)
        
        lmp_data_by_zone = collections.defaultdict(list)
        rows = lmp_result.fetchall()
        
        if not rows:
            # Return an empty object instead of an error to prevent frontend from crashing
            return {}

        for row in rows:
            row_dict = row._asdict()
            lmp_data_by_zone[row_dict['Transact_Z']].append({
                "datetime_beginning_ept": row_dict['datetime_beginning_ept'].isoformat(),
                "lmp_values": { # NEW data structure
                    "da": row_dict['lmp_da'],
                    "rt": row_dict['lmp_rt'],
                    "net": row_dict['lmp_net']
                }
            })

        return lmp_data_by_zone

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Please use YYYY-MM-DD.")
    except Exception as e:
        print(f"An unexpected server error occurred while fetching LMP data: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred processing your request.")