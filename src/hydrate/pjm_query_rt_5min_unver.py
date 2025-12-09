import os
import sys
import requests
import pymysql
from pymysql.cursors import DictCursor
from dotenv import load_dotenv
import time
from datetime import date, timedelta, datetime

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from update_pjm_db import PNODE_IDS 

load_dotenv()


# --- Configuration ---
DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "cursorclass": DictCursor
}

PJM_API_KEY = os.getenv("PJM_API_KEY")
PJM_API_ENDPOINT = 'https://api.pjm.com/api/v1/rt_unverified_fivemin_lmps'
DB_TABLE_NAME = 'pjm_rt_unverified_fivemin_lmps'

def fetch_and_upsert_pjm_data_efficiently(start_date_obj, end_date_obj):
    """
    Fetches PJM data by making one API call per PNode for the entire date range.
    """
    if not all([PJM_API_KEY, DB_CONFIG["host"], DB_CONFIG["user"], DB_CONFIG["password"], DB_CONFIG["database"]]):
        print("Error: One or more required environment variables are missing.")
        return

    conn = None
    try:
        print(f"Connecting to MySQL database: {DB_CONFIG['database']} at {DB_CONFIG['host']}...")
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("Database connection successful.")

        headers = {'Ocp-Apim-Subscription-Key': PJM_API_KEY}

        # Convert date objects to datetime strings for the API
        start_dt = datetime.combine(start_date_obj, datetime.min.time())
        # For end date, we want the end of that day (23:59:59)
        end_dt = datetime.combine(end_date_obj, datetime.max.time())
        
        time_range_string = f"{start_dt.strftime('%Y-%m-%d %H:%M:%S')} to {end_dt.strftime('%Y-%m-%d %H:%M:%S')}"
        
        print(f"Fetching data for all PNodes from {time_range_string}")

        # Uses the imported PNODE_IDS list
        for pnode_id in PNODE_IDS:
            print(f"\n--- Processing PNode ID: {pnode_id} ---")
            
            params = {
                'rowCount': 50000,
                'order': 'Asc',
                'startRow': 1,
                'datetime_beginning_ept': time_range_string,
                'pnode_id': pnode_id,
                'fields': 'datetime_beginning_ept,pnode_id,pnode_name,total_lmp_rt,congestion_price_rt,marginal_loss_price_rt'
            }

            try:
                print(f"Querying API for PNode {pnode_id}...")
                response = requests.get(PJM_API_ENDPOINT, headers=headers, params=params)
                response.raise_for_status()
                
                items = response.json().get('items', [])
                
                if items:
                    print(f"Successfully fetched {len(items)} records.")
                    rows_to_upsert = [
                        (
                            item.get('datetime_beginning_ept'), item.get('pnode_id'),
                            item.get('pnode_name'), item.get('total_lmp_rt'),
                            item.get('congestion_price_rt'), item.get('marginal_loss_price_rt')
                        ) for item in items
                    ]
                    
                    sql_upsert = f"""
                        INSERT INTO {DB_TABLE_NAME} (
                            datetime_beginning_ept, pnode_id, pnode_name, total_lmp_rt, congestion_price_rt, marginal_loss_price_rt
                        ) VALUES (%s, %s, %s, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE
                            pnode_name = VALUES(pnode_name),
                            total_lmp_rt = VALUES(total_lmp_rt),
                            congestion_price_rt = VALUES(congestion_price_rt),
                            marginal_loss_price_rt = VALUES(marginal_loss_price_rt)
                    """
                    cursor.executemany(sql_upsert, rows_to_upsert)
                    conn.commit()
                else:
                    print(f"No data returned for PNode {pnode_id}.")

            except Exception as e:
                print(f"Error for PNode {pnode_id}: {e}")
                if conn: conn.rollback()

            print("Waiting 5 seconds...")
            time.sleep(5)

    except pymysql.Error as e:
        print(f"A database connection error occurred: {e}")
    finally:
        if conn:
            cursor.close()
            conn.close()
            print("\nMySQL connection is closed.")

if __name__ == '__main__':
    # --- DYNAMIC DATE LOGIC ---
    if len(sys.argv) > 2:
        try:
            start_d = date.fromisoformat(sys.argv[1])
            end_d = date.fromisoformat(sys.argv[2])
            print(f"--- Dynamic Mode: {start_d} to {end_d} ---")
        except ValueError:
            print("Error: Invalid date format. Use YYYY-MM-DD.")
            sys.exit(1)
    else:
        # Manual Default: Last 4 days
        end_d = date.today()
        start_d = end_d - timedelta(days=4)
        print(f"--- Manual Mode: {start_d} to {end_d} ---")

    fetch_and_upsert_pjm_data_efficiently(start_d, end_d)
