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
    return FileResponse("index3.html")

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

class LmpRangeQuery(BaseModel):
    start_day: str
    end_day: str
    days_of_week: List[int]
    hours: List[bool]
    price_type: str

# JSON object Endpoint
@app.post("/api/data")
async def get_lmp_data_as_json(query: LmpRangeQuery, db: Session = Depends(get_db)):
    data = get_lmp_data_for_range(query, db) 
    return data

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

# Dynamic LMP Query Endpoint
# In your Python script

@app.post("/api/lmp/range")
def get_lmp_data_for_range(query: LmpRangeQuery, db: Session = Depends(get_db)):
    try:
        # --- Hour Selection Logic ---
        selected_hours = [i for i, selected in enumerate(query.hours) if selected]
        params = {}
        
        # --- Dynamic SQL Query Construction based on price_type ---
        price_type = query.price_type.upper()
        time_filter_alias = ""

        if price_type in ['RT', 'DA']:
            config = {
                'RT': {'table': 'pjm_rt_hrl_lmps', 'column': 'total_lmp_rt'},
                'DA': {'table': 'pjm_da_hrl_lmps', 'column': 'total_lmp_da'}
            }[price_type]
            
            table_name = config['table']
            price_column = config['column']
            time_filter_alias = "l"
            
            base_query_str = f"""
                SELECT
                    z.Transact_Z,
                    l.datetime_beginning_ept,
                    l.{price_column} AS lmp_value
                FROM
                    {table_name} AS l
                JOIN
                    pjm_lat_long AS ll ON l.pnode_name = ll.Alt_Name
                JOIN
                    pjm_zone_shapes AS z ON ll.Transact_Z = z.Transact_Z
                WHERE
                    l.datetime_beginning_ept >= :start_dt AND l.datetime_beginning_ept < :end_dt
            """

        elif price_type == 'NET':
            time_filter_alias = "da"
            base_query_str = """
                SELECT
                    z.Transact_Z,
                    da.datetime_beginning_ept,
                    (da.total_lmp_da - rt.total_lmp_rt) AS lmp_value
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
        else:
            raise HTTPException(status_code=400, detail=f"Invalid price_type: '{query.price_type}'. Must be 'RT', 'DA', or 'NET'.")

        # --- Date and Filter Logic ---
        start_datetime_obj = datetime.strptime(query.start_day, '%Y-%m-%d')
        end_datetime_obj = datetime.strptime(query.end_day, '%Y-%m-%d') + timedelta(days=1)
        params["start_dt"] = start_datetime_obj
        params["end_dt"] = end_datetime_obj
        
        if query.days_of_week:
            base_query_str += f" AND DAYOFWEEK({time_filter_alias}.datetime_beginning_ept) IN :days_of_week"
            params["days_of_week"] = tuple(query.days_of_week)
        if selected_hours:
            base_query_str += f" AND EXTRACT(HOUR FROM {time_filter_alias}.datetime_beginning_ept) IN :selected_hours"
            params["selected_hours"] = tuple(selected_hours)

        base_query_str += f" ORDER BY z.Transact_Z, {time_filter_alias}.datetime_beginning_ept;"
        
        lmp_query = text(base_query_str)
        lmp_result = db.execute(lmp_query, params)
        
        # --- Data Processing ---
        lmp_data_by_zone = collections.defaultdict(list)
        rows = lmp_result.fetchall() # Fetch all rows first
        
        if not rows:
            # If there are no rows, raise a 404 error that FastAPI will correctly send to the browser
            raise HTTPException(status_code=404, detail="No LMP data found for the specified criteria.")

        for row in rows:
            row_dict = row._asdict()
            lmp_data_by_zone[row_dict['Transact_Z']].append({
                "datetime_beginning_ept": row_dict['datetime_beginning_ept'].isoformat(),
                "lmp_value": row_dict['lmp_value']
            })

        return lmp_data_by_zone

    except ValueError:
        # This catches errors from datetime.strptime
        raise HTTPException(status_code=400, detail="Invalid date format. Please use YYYY-MM-DD.")
    except Exception as e:
        # This is a catch-all for truly unexpected errors (e.g., database connection failure)
        print(f"An unexpected server error occurred while fetching LMP data: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred processing your request.")


