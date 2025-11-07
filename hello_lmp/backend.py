import os
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import create_engine, text, bindparam
from sqlalchemy.orm import sessionmaker, Session
  
import collections

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serves the 'static' folder for your frontend stuff
app.mount("/static", StaticFiles(directory="static"), name="static")

# Conn Secrets
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# FastAPI dependency to manage database sessions
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- API ENDPOINTS ---

# NEW ENDPOINT 1: Provides GeoJSON data for all PJM zone boundaries.
@app.get("/api/zones")
def get_zones(db: Session = Depends(get_db)):
    """
    Retrieves all zone shapes as a GeoJSON FeatureCollection.
    This is called once by the frontend to draw the map outlines.
    """
    try:
        # This query fetches the zone name and its geometry, converting it to GeoJSON format.
        shape_query = text("""
            SELECT Transact_Z, ST_AsGeoJSON(ST_GeomFromText(WKT)) as geometry_geojson
            FROM pjm_zone_shapes
            WHERE WKT IS NOT NULL
        """)
        
        shape_result = db.execute(shape_query)
        
        features = []
        for zone_shape_row in shape_result.fetchall():
            row_dict = zone_shape_row._asdict()
            zone_name = row_dict['Transact_Z']
            # Create a GeoJSON Feature for each zone
            feature = {
                "type": "Feature",
                "geometry": json.loads(row_dict['geometry_geojson']),
                "properties": {
                    # The frontend will use this name to look up LMP data
                    "zone_name": zone_name
                }
            }
            features.append(feature)

        if not features:
            raise HTTPException(status_code=404, detail="No zone shapes found in the database.")

        # Return the standard GeoJSON FeatureCollection structure
        return {"type": "FeatureCollection", "features": features}

    except Exception as e:
        print(f"An unexpected server error occurred while fetching zones: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred while fetching zone data.")

# NEW ENDPOINT 2: Provides LMP data for a given date, grouped by zone.
@app.get("/api/lmp/{day}")
def get_lmp_data(day: str, db: Session = Depends(get_db)):
    """
    Retrieves hourly LMP values for a given day, grouped by zone name.
    The 'day' parameter should be in 'YYYY-MM-DD' format.
    """
    try:
        # This is the same LMP query logic from your original script
        lmp_query = text("""
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
            ORDER BY
                z.Transact_Z, l.datetime_beginning_ept;
        """)

        start_datetime_obj = datetime.strptime(day, '%Y-%m-%d')
        end_datetime_obj = start_datetime_obj + timedelta(days=1)
        
        lmp_result = db.execute(lmp_query, {
            "start_dt": start_datetime_obj, 
            "end_dt": end_datetime_obj
        })

        # Group the results by zone name, which is the format the frontend expects
        lmp_data_by_zone = collections.defaultdict(list)
        for row in lmp_result.fetchall():
            row_dict = row._asdict()
            lmp_data_by_zone[row_dict['Transact_Z']].append({
                "datetime_beginning_ept": row_dict['datetime_beginning_ept'].isoformat(),
                "total_lmp_rt": row_dict['total_lmp_rt']
            })

        if not lmp_data_by_zone:
            raise HTTPException(status_code=404, detail=f"No LMP data found for date {day}")

        return lmp_data_by_zone

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Please use YYYY-MM-DD.")
    except Exception as e:
        print(f"An unexpected server error occurred while fetching LMP data: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred processing your request.")


@app.get("/")
def read_root():
    """Serves the main index.html file."""
    return FileResponse('static/index.html')
