import os
import requests
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv
import time
from datetime import date

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME"),
    "port": int(os.getenv("DB_PORT", 3306))
}

PJM_API_KEY = os.getenv("PJM_API_KEY")
PJM_API_ENDPOINT = 'https://api.pjm.com/api/v1/da_hrl_lmps'
DB_TABLE_NAME = 'pjm_da_hrl_lmps'
START_DATE = date(2025, 10, 28)
END_DATE = date(2025, 10, 31)
PNODE_IDS = [
    51217, 51288, 4669664, 5413134, 31252687, 33092311, 33092313,
    33092315, 34497125, 34497127, 34497151, 35010337, 40523629,
    56958967, 81436855, 116013751, 116472927, 116472931, 116472933,
    116472935, 116472937, 116472939, 116472941, 116472943,
    116472945, 116472947, 116472949, 116472951, 116472953,
    116472955, 116472957, 116472959, 126769999, 1069452904,
    1124361945, 1127872598, 1258625176, 1269364670, 1269364671,
    1269364672, 1269364674, 1288248099, 1304468347, 1441662202,
    1709726615, 2156111904
]


def fetch_and_upsert_pjm_da_lmp_data_mysql():
    """
    Fetches PJM historical day-ahead LMP data for a list of PNode IDs
    for a specified date range and upserts it into a MySQL database.
    """
    if not all([PJM_API_KEY, DB_CONFIG["host"], DB_CONFIG["user"], DB_CONFIG["password"], DB_CONFIG["database"]]):
        print("Error: One or more required environment variables are missing.")
        return

    conn = None
    try:
        print(f"Connecting to MySQL database at {DB_CONFIG['host']}...")
        conn = mysql.connector.connect(**DB_CONFIG)
        if not conn.is_connected():
            print("Database connection failed.")
            return
        
        cursor = conn.cursor()
        print("Database connection successful.")

        date_range_str = f"{START_DATE.strftime('%Y-%m-%d')} to {END_DATE.strftime('%Y-%m-%d')}"
        
        for pnode_id in PNODE_IDS:
            print(f"\n--- Processing PNode ID: {pnode_id} for Date Range: {date_range_str} ---")

            params = {
                'rowCount': 50000,
                'order': 'Asc',
                'startRow': 1,
                'datetime_beginning_ept': date_range_str,
                'pnode_id': pnode_id
            }
            headers = {'Ocp-Apim-Subscription-Key': PJM_API_KEY}

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
                # Also wait here to avoid hammering the API on failure
                print("Waiting 10 seconds before next PNode...")
                time.sleep(10)
                continue
            except ValueError:
                print(f"Failed to decode JSON for PNode {pnode_id}. Response: {response.text}")
                continue

            try:
                print(f"Preparing to upsert into table '{DB_TABLE_NAME}'...")
                # --- CORRECTED SQL QUERY ---
                upsert_query = f"""
                    INSERT INTO {DB_TABLE_NAME} (
                        datetime_beginning_ept, pnode_id, pnode_name, type,
                        system_energy_price_da, total_lmp_da, congestion_price_da,
                        marginal_loss_price_da
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        system_energy_price_da = VALUES(system_energy_price_da),
                        total_lmp_da = VALUES(total_lmp_da),
                        congestion_price_da = VALUES(congestion_price_da),
                        marginal_loss_price_da = VALUES(marginal_loss_price_da);
                """
                
                # --- CORRECTED DATA MAPPING ---
                rows_to_upsert = [
                    (
                        item.get('datetime_beginning_ept'),
                        item.get('pnode_id'),
                        item.get('pnode_name'),
                        item.get('type'),
                        item.get('system_energy_price_da'),
                        item.get('total_lmp_da'),
                        item.get('congestion_price_da'),
                        item.get('marginal_loss_price_da') # Use the correct field name from the API
                    ) for item in items
                ]
                
                cursor.executemany(upsert_query, rows_to_upsert)
                conn.commit()
                
                print(f"Successfully upserted/updated {cursor.rowcount} rows for PNode {pnode_id}.")

            except Error as e:
                print(f"A MySQL database error occurred for PNode {pnode_id}: {e}")
                if conn.is_connected():
                    conn.rollback()
                    print("Database transaction rolled back.")
                
                # --- ADDED WAIT ON DB ERROR ---
                print("Waiting 10 seconds before next PNode...")
                time.sleep(10)
                continue
            
            print("Waiting 10 seconds before the next API call...")
            time.sleep(10)

    except Error as e:
        print(f"A MySQL connection error occurred: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()
            print("\nMySQL connection is closed.")

if __name__ == '__main__':
    fetch_and_upsert_pjm_da_lmp_data_mysql()
