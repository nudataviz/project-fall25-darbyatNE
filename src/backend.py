import os
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", include_in_schema=False)
async def root():
    return FileResponse("static/index.html")


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

# Query Params
class LmpRangeQuery(BaseModel):
    start_day: str
    end_day: str
    days_of_week: List[int]
    hours: List[bool]

# API ENDPOINTS
@app.post("/api/data")
async def get_lmp_data_as_json(query: LmpRangeQuery, db: Session = Depends(get_db)):
    """
    This endpoint is for direct data access. It accepts the same detailed
    query as the map and returns the processed JSON object.
    """
    data = get_lmp_data_for_range(query, db) 
    return data

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
        # --- Hour Selection Logic ---
        selected_hours = [i for i, selected in enumerate(query.hours) if selected]

        # --- Dynamic SQL Query Construction ---
        params = {}
        base_query_str = """
            SELECT
                z.Transact_Z,
                l.datetime_beginning_ept,
                l.total_lmp_rt
            FROM
                pjm_rt_hrl_lmps AS l
            JOIN
                pjm_lat_long AS ll ON l.pnode_name = ll.Alt_Name
            JOIN
                pjm_zone_shapes AS z ON ll.Transact_Z = z.Transact_Z
            WHERE
                l.datetime_beginning_ept >= :start_dt AND l.datetime_beginning_ept < :end_dt
        """

        start_datetime_obj = datetime.strptime(query.start_day, '%Y-%m-%d')
        end_datetime_obj = datetime.strptime(query.end_day, '%Y-%m-%d') + timedelta(days=1)
        params["start_dt"] = start_datetime_obj
        params["end_dt"] = end_datetime_obj
        if query.days_of_week:
            base_query_str += " AND DAYOFWEEK(l.datetime_beginning_ept) IN :days_of_week"
            params["days_of_week"] = query.days_of_week
        if selected_hours:
            base_query_str += " AND EXTRACT(HOUR FROM l.datetime_beginning_ept) IN :selected_hours"
            params["selected_hours"] = selected_hours

        base_query_str += " ORDER BY z.Transact_Z, l.datetime_beginning_ept;"
        lmp_query = text(base_query_str)
        lmp_result = db.execute(lmp_query, params)
        lmp_data_by_zone = collections.defaultdict(list)
        for row in lmp_result.fetchall():
            row_dict = row._asdict()
            lmp_data_by_zone[row_dict['Transact_Z']].append({
                "datetime_beginning_ept": row_dict['datetime_beginning_ept'].isoformat(),
                "total_lmp_rt": row_dict['total_lmp_rt']
            })

        if not lmp_data_by_zone:
            raise HTTPException(status_code=404, detail=f"No LMP data found for the specified criteria.")

        return lmp_data_by_zone

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Please use YYYY-MM-DD.")
    except Exception as e:
        print(f"An unexpected server error occurred while fetching LMP data: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred processing your request.")
