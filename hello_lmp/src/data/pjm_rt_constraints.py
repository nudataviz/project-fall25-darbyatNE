import os
import requests
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv
from datetime import date, timedelta
import time

# --- Configuration & Secrets ---
load_dotenv()
PJM_API_KEY = os.getenv("PJM_API_KEY")
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

# --- API and Table Configuration ---
API_URL = "https://api.pjm.com/api/v1/rt_marginal_value" 
TABLE_NAME = "pjm_binding_constraints"

def fetch_pjm_data(chunk_start_date: date, chunk_end_date: date, api_key: str) -> list:
    """Fetches all records for a specific date range (chunk) from the PJM API."""
    headers = {'Ocp-Apim-Subscription-Key': api_key}
    
    start_str = chunk_start_date.strftime("%Y-%m-%d")
    end_str = chunk_end_date.strftime("%Y-%m-%d")
    
    params = {
        'startRow': 1,
        'rowCount': 50000, # Should be large enough for most chunk sizes
        'datetime_beginning_ept': f'{start_str}T00:00:00',
        'datetime_ending_ept': f'{end_str}T23:59:59',
        'format': 'json'
    }
    
    print(f"Fetching PJM data for {start_str} to {end_str}...")
    try:
        response = requests.get(API_URL, headers=headers, params=params, timeout=90)
        response.raise_for_status()
        items = response.json().get('items', [])
        return items
    except requests.exceptions.RequestException as e:
        print(f"--- Error fetching API data for chunk {start_str} to {end_str} ---: {e}")
        return []

def save_data_to_mysql(conn, items: list) -> int:
    """Saves a list of PJM constraint items to the MySQL database."""
    if not items:
        return 0
        
    cursor = conn.cursor()
    sql = f'''
        INSERT IGNORE INTO {TABLE_NAME} (
            datetime_beginning_ept, monitored_facility, contingency_facility,
            transmission_constraint_penalty_factor, limit_control_percentage, shadow_price
        ) VALUES (%s, %s, %s, %s, %s, %s)
    '''
    
    rows_to_insert = [
        (
            item.get('datetime_beginning_ept'), item.get('monitored_facility'),
            item.get('contingency_facility'), item.get('transmission_constraint_penalty_factor'),
            item.get('limit_control_percentage'), item.get('shadow_price')
        ) for item in items
    ]
        
    cursor.executemany(sql, rows_to_insert)
    conn.commit()
    
    return cursor.rowcount

# --- Main Execution Block ---
if __name__ == "__main__":
    
    if not all([PJM_API_KEY, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME]):
        print("--- CONFIGURATION ERROR ---")
        print("One or more environment variables are missing. Please check your .env file.")
    else:
        # --- MODIFIED: Define the date range and chunk size ---
        START_DATE_STR = "2025-10-19"
        END_DATE_STR = "2025-10-19"
        CHUNK_SIZE_DAYS = 1 
        
        start_date = date.fromisoformat(START_DATE_STR)
        end_date = date.fromisoformat(END_DATE_STR)
        
        total_records_fetched = 0
        total_rows_added = 0
        
        conn = None
        try:
            conn = mysql.connector.connect(
                host=DB_HOST, user=DB_USER, password=DB_PASSWORD, database=DB_NAME
            )
            print(f"Successfully connected to MySQL database '{DB_NAME}'.")
            
            # Loop in chunks to reduce API calls
            chunk_start_date = start_date
            while chunk_start_date <= end_date:
                chunk_end_date = chunk_start_date + timedelta(days=CHUNK_SIZE_DAYS - 1)
                
                if chunk_end_date > end_date:
                    chunk_end_date = end_date
                
                api_data = fetch_pjm_data(chunk_start_date, chunk_end_date, PJM_API_KEY)
                
                if api_data:
                    rows_added = save_data_to_mysql(conn, api_data)
                    total_records_fetched += len(api_data)
                    total_rows_added += rows_added
                    print(f"-> Fetched: {len(api_data):>5} records. Inserted: {rows_added:>5} new records.")
                else:
                    print(f"-> No data returned from API for this chunk.")
                
                # --- MODIFIED: Move to the next chunk using the variable ---
                chunk_start_date += timedelta(days=CHUNK_SIZE_DAYS)
                
                # Courtesy delay to respect API rate limits
                # Only sleep if we are not past the end date
                if chunk_start_date <= end_date:
                    print("Waiting for 9 seconds before next API call...")
                    time.sleep(9)
                
        except Error as e:
            print(f"--- MySQL Database Error ---: {e}")
        finally:
            if conn and conn.is_connected():
                conn.close()
                print("\nMySQL connection closed.")

        print("\n--- Final Summary ---")
        print(f"Date Range Processed: {START_DATE_STR} to {END_DATE_STR}")
        print(f"Total records fetched from API: {total_records_fetched}")
        print(f"Total new records inserted into database: {total_rows_added}")
