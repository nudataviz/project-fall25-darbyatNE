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


# 1. DB Config
DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "cursorclass": DictCursor
}

PJM_API_KEY = os.getenv("PJM_API_KEY")
PJM_API_ENDPOINT = 'https://api.pjm.com/api/v1/da_hrl_lmps' 
DB_TABLE_NAME = 'pjm_da_hrl_lmps' 

# Default dates for Manual Runs
START_DATE = date(2025, 11, 1)
END_DATE = date(2025, 12, 6)

def fetch_and_upsert_pjm_da_lmp_data_pymysql():
    """
    Fetches PJM historical Day-Ahead LMP data for a list of PNode IDs
    for a specified date range and upserts it into a MySQL database using pymysql.
    """
    # Use global variables (updated in __main__ if dynamic)
    global START_DATE, END_DATE

    if not all([PJM_API_KEY, DB_CONFIG["host"], DB_CONFIG["user"], DB_CONFIG["password"], DB_CONFIG["database"]]):
        print("Error: One or more required environment variables are missing.")
        return

    conn = None
    try:
        print(f"Connecting to MySQL database: {DB_CONFIG['database']} at {DB_CONFIG['host']}...")
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("Database connection successful.")

        date_range_str = f"{START_DATE.strftime('%Y-%m-%d')} to {END_DATE.strftime('%Y-%m-%d')}"
        
        headers = {'Ocp-Apim-Subscription-Key': PJM_API_KEY}
        
        # PNODE_IDS is imported from update_pjm_db
        for pnode_id in PNODE_IDS:
            print(f"\n--- Processing PNode ID: {pnode_id} for Date Range: {date_range_str} ---")

            params = {
                'rowCount': 50000,
                'order': 'Asc',
                'startRow': 1,
                'datetime_beginning_ept': date_range_str,
                'pnode_id': pnode_id
            }

            try:
                print(f"Querying PJM API for DA LMP data for PNode {pnode_id}...")
                response = requests.get(PJM_API_ENDPOINT, headers=headers, params=params)
                response.raise_for_status()
                
                response_data = response.json()
                items = response_data.get('items', [])
                
                if not items:
                    print(f"No data returned for PNode {pnode_id} in this period.")
                    print("Waiting 10 seconds before next PNode...")
                    time.sleep(10)
                    continue

                print(f"Successfully fetched {len(items)} records for PNode {pnode_id}.")

            except requests.exceptions.RequestException as e:
                print(f"An error occurred during the API call for PNode {pnode_id}: {e}")
                continue
            except ValueError:
                print(f"Could not decode JSON response for PNode {pnode_id}.")
                continue

            # Prepare data for batch upsert (Using DA keys)
            rows_to_upsert = []
            for item in items:
                rows_to_upsert.append((
                    item.get('datetime_beginning_ept'),
                    item.get('pnode_id'),
                    item.get('pnode_name'),
                    item.get('type'),
                    item.get('system_energy_price_da'), # DA Key
                    item.get('total_lmp_da'),           # DA Key
                    item.get('congestion_price_da'),    # DA Key
                    item.get('marginal_loss_price_da')  # DA Key
                ))

            if not rows_to_upsert:
                continue

            # Batch upsert using executemany
            sql_upsert = f"""
                INSERT INTO {DB_TABLE_NAME} (
                    datetime_beginning_ept, pnode_id, pnode_name, type,
                    system_energy_price_da, total_lmp_da, congestion_price_da, marginal_loss_price_da
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    pnode_name = VALUES(pnode_name),
                    type = VALUES(type),
                    system_energy_price_da = VALUES(system_energy_price_da),
                    total_lmp_da = VALUES(total_lmp_da),
                    congestion_price_da = VALUES(congestion_price_da),
                    marginal_loss_price_da = VALUES(marginal_loss_price_da)
            """
            
            try:
                print(f"Preparing to upsert into table {DB_TABLE_NAME}...")
                cursor.executemany(sql_upsert, rows_to_upsert)
                conn.commit()
                print(f"Successfully upserted {len(rows_to_upsert)} rows for PNode {pnode_id}.")
            except pymysql.Error as e:
                print(f"Database error for PNode {pnode_id}: {e}")
                conn.rollback()

            print("Waiting 10 seconds before next PNode...")
            time.sleep(10)

    except pymysql.Error as e:
        print(f"A database error occurred: {e}")
    finally:
        if conn:
            cursor.close()
            conn.close()
            print("\nMySQL connection is closed.")

if __name__ == '__main__':
    # Check if dates were passed via Command Line
    if len(sys.argv) > 2:
        try:
            START_DATE = date.fromisoformat(sys.argv[1])
            END_DATE = date.fromisoformat(sys.argv[2])
            print(f"--- Dynamic Mode: Running from {START_DATE} to {END_DATE} ---")
        except ValueError:
            print("Error: Invalid date format. Use YYYY-MM-DD.")
            sys.exit(1)
    else:
        print(f"--- Manual Mode: Using default dates {START_DATE} to {END_DATE} ---")
    
    # Run the Day-Ahead function
    fetch_and_upsert_pjm_da_lmp_data_pymysql()
