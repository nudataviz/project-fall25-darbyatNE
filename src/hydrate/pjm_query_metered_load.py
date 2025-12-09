import os
import requests
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv
import time
from datetime import date, timedelta

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME"),
    "port": int(os.getenv("DB_PORT", 3306))
}

PJM_API_KEY = os.getenv("PJM_API_KEY")
PJM_API_ENDPOINT = 'https://api.pjm.com/api/v1/hrl_load_metered'
DB_TABLE_NAME = 'pjm_metered_load'
START_DATE = date(2024, 10, 1)
END_DATE = date(2025, 10, 27)


def get_next_month(current_date):
    """Calculates the first day of the next month."""
    if current_date.month == 12:
        return date(current_date.year + 1, 1, 1)
    return date(current_date.year, current_date.month + 1, 1)


def fetch_and_upsert_pjm_hist_data_mysql():
    """
    Fetches PJM historical metered load data month-by-month and upserts it into a MySQL database.
    """

    conn = None
    try:
        print(f"Connecting to MySQL database at {DB_CONFIG['host']}...")
        conn = mysql.connector.connect(**DB_CONFIG)
        if not conn.is_connected():
            print("Database connection failed.")
            return
        
        cursor = conn.cursor()
        print("Database connection successful.")

        current_start_date = START_DATE
        while current_start_date <= END_DATE:
            next_month_start = get_next_month(current_start_date)
            current_end_date = min(next_month_start - timedelta(days=1), END_DATE)

            date_range_str = f"{current_start_date.strftime('%Y-%m-%d')} to {current_end_date.strftime('%Y-%m-%d')}"
            print(f"\n--- Processing date range: {date_range_str} ---")

            # API params
            params = {
                'rowCount': 50000,
                'order': 'Asc',
                'startRow': 1,
                'datetime_beginning_ept': date_range_str
            }
            headers = {
                'Ocp-Apim-Subscription-Key': PJM_API_KEY
            }

            # API GET
            try:
                print("Querying PJM API for historical metered load data...")
                response = requests.get(PJM_API_ENDPOINT, headers=headers, params=params)
                response.raise_for_status()
                
                response_data = response.json()
                items = response_data.get('items', [])
                
                for item in items:
                    print(item)

                if not items:
                    print("API query successful, but no data was returned for this period.")
                    current_start_date = next_month_start
                    print("Waiting 10 seconds before the next API call...")
                    time.sleep(10)
                    continue

                print(f"Successfully fetched {len(items)} records from the PJM API.")

            except requests.exceptions.RequestException as e:
                print(f"An error occurred during the API call: {e}")
                break 
            except ValueError:
                print(f"Failed to decode JSON from the API response. Response text: {response.text}")
                break

            # Upsert 
            try:
                print(f"Preparing to upsert into table '{DB_TABLE_NAME}'...")
                upsert_query = f"""
                    INSERT INTO {DB_TABLE_NAME} (
                        datetime_beginning_ept,
                        zone,
                        load_area,
                        mw,
                        nerc_region,
                        mkt_region
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        mw = VALUES(mw);
                """

                # match rows need for Db
                rows_to_upsert = [
                    (
                        item.get('datetime_beginning_ept'),
                        item.get('zone'),
                        item.get('load_area'),
                        item.get('mw'),
                        item.get('nerc_region'),
                        item.get('mkt_region')
                    ) for item in items
                ]
                
                cursor.executemany(upsert_query, rows_to_upsert)
                conn.commit()
                
                print(f"Successfully upserted/updated {cursor.rowcount} rows into the database.")

            except Error as e:
                print(f"A MySQL database error occurred: {e}")
                if conn.is_connected():
                    conn.rollback()
                    print("Database transaction rolled back due to error.")
                break 

            current_start_date = next_month_start
            
            if current_start_date <= END_DATE:
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
    fetch_and_upsert_pjm_hist_data_mysql()
