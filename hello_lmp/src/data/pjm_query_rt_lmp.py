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
PJM_API_ENDPOINT = 'https://api.pjm.com/api/v1/rt_hrl_lmps'
DB_TABLE_NAME = 'pjm_rt_hrl_lmps'

START_DATE = date(2024, 1, 1)
END_DATE = date(2024, 12, 31)
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


def fetch_and_upsert_pjm_rt_lmp_data_mysql():
    """
    Fetches PJM historical real-time LMP data for a list of PNode IDs
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
                print(f"Querying PJM API for RT LMP data for PNode {pnode_id}...")
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

            # Prepare data for batch upsert
            rows_to_upsert = []
            for item in items:
                rows_to_upsert.append((
                    item.get('datetime_beginning_ept'),
                    item.get('pnode_id'),
                    item.get('pnode_name'),
                    item.get('type'),
                    item.get('system_energy_price'),
                    item.get('total_lmp'),
                    item.get('congestion_price'),
                    item.get('loss_price') # API key is 'loss_price' for 'marginal_loss_price_rt'
                ))

            if not rows_to_upsert:
                continue

            # Batch upsert using executemany
            sql_upsert = f"""
                INSERT INTO {DB_TABLE_NAME} (
                    datetime_beginning_ept, pnode_id, pnode_name, type,
                    system_energy_price_rt, total_lmp_rt, congestion_price_rt, marginal_loss_price_rt
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    system_energy_price_rt = VALUES(system_energy_price_rt),
                    total_lmp_rt = VALUES(total_lmp_rt),
                    congestion_price_rt = VALUES(congestion_price_rt),
                    marginal_loss_price_rt = VALUES(marginal_loss_price_rt)
            """
            
            try:
                print(f"Preparing to upsert into table {DB_TABLE_NAME}...")
                cursor.executemany(sql_upsert, rows_to_upsert)
                conn.commit()
                print(f"Successfully upserted {cursor.rowcount} rows for PNode {pnode_id}.")
            except Error as e:
                print(f"Database error for PNode {pnode_id}: {e}")
                conn.rollback()

            print("Waiting 10 seconds before next PNode...")
            time.sleep(10)

    except Error as e:
        print(f"A database error occurred: {e}")
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()
            print("\nMySQL connection is closed.")

if __name__ == '__main__':
    fetch_and_upsert_pjm_rt_lmp_data_mysql()
