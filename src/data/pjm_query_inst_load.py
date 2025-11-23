import os
import requests
import mysql.connector
from mysql.connector import Error
from datetime import date, timedelta, datetime
import argparse
import time
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME"),
    "port": int(os.getenv("DB_PORT", 3306))
}
PJM_API_KEY = os.getenv("PJM_API_KEY")

API_CHUNK_SIZE_DAYS = 6  

def get_date_chunks(start_date, end_date, chunk_size_days):
    """Splits a date range into smaller chunks of a specified size."""
    chunks = []
    current_start = start_date
    while current_start <= end_date:
        current_end = current_start + timedelta(days=chunk_size_days - 1)
        if current_end > end_date:
            current_end = end_date
        chunks.append((current_start, current_end))
        current_start = current_end + timedelta(days=1)
    return chunks

def fetch_pjm_inst_load(api_key, start_date, end_date):
    """Fetches instantaneous load data from the PJM API for a specific date range."""
    print(f"Fetching data from PJM for {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}...")

    if not api_key:
        print("Error: PJM_API_KEY is not set. Please check your .env file.")
        return None

    api_url = "https://api.pjm.com/api/v1/inst_load"
    start_datetime = f"{start_date.strftime('%Y-%m-%d')}T00:00:00"
    end_datetime = f"{end_date.strftime('%Y-%m-%d')}T23:59:59"

    headers = {'Ocp-Apim-Subscription-Key': api_key}
    params = {
        'startRow': 1,
        'rowCount': 50000,
        'datetime_beginning_ept': f'{start_datetime}to{end_datetime}',
        'format': 'json'
    }

    try:
        response = requests.get(api_url, headers=headers, params=params, timeout=60) # Increased timeout
        print(f"API Response Status Code: {response.status_code}")
        response.raise_for_status()
        data = response.json()

        if 'items' in data:
            print(f"Successfully decoded JSON. Found {len(data['items'])} items.")
            return data['items']
        else:
            print("The expected key 'items' is not present in the response.")
            return None

    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error occurred: {e}")
        print(f"Response Body: {response.text[:500]}")
        return None
    except requests.exceptions.RequestException as e:
        print(f"A network-level error occurred: {e}")
        return None
    except requests.exceptions.JSONDecodeError:
        print("Failed to decode JSON. The API response may not be valid JSON.")
        print(f"Response Text: {response.text[:500]}")
        return None

def insert_load_data(db_params, pjm_data):
    """Inserts or updates PJM load data into the MySQL database."""
    if not pjm_data:
        print("No valid PJM data to insert.")
        return

    conn = None
    try:
        print("Connecting to the database...")
        conn = mysql.connector.connect(**db_params)
        if conn.is_connected():
            print("Database connection successful.")
            cursor = conn.cursor()

            sql = """
                INSERT INTO inst_load (datetime_beginning_ept, area, instantaneous_load)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    instantaneous_load = VALUES(instantaneous_load);
            """
            
            data_to_insert = [
                (item['datetime_beginning_ept'], item['area'], item['instantaneous_load'])
                for item in pjm_data
            ]
            
            print(f"Upserting {len(data_to_insert)} rows...")
            cursor.executemany(sql, data_to_insert)
            conn.commit()
            print(f"Operation completed. Affected rows: {cursor.rowcount}")
            cursor.close()

    except Error as e:
        print(f"Database error: {e}")
    finally:
        if conn and conn.is_connected():
            conn.close()
            print("Database connection closed.")

def main():
    """Main function to parse arguments and run the data pipeline."""
    
    parser = argparse.ArgumentParser(description="Fetch PJM instantaneous load data and store it in a database.")
    
    parser.add_argument(
        '--start_date',
        help="The start date for the data fetch in YYYY-MM-DD format.",
        required=True
    )
    
    parser.add_argument(
        '--end_date',
        help="The end date for the data fetch in YYYY-MM-DD format.",
        required=True
    )
    
    args = parser.parse_args()

    try:
        start_date = datetime.strptime(args.start_date, '%Y-%m-%d').date()
        end_date = datetime.strptime(args.end_date, '%Y-%m-%d').date()
    except ValueError:
        print("Error: The start_date and end_date must be in YYYY-MM-DD format.")
        return

    if start_date > end_date:
        print("Error: The start_date cannot be after the end_date.")
        return

    print(f"--- Script Starting for date range: {start_date} to {end_date} ---")
    
    date_chunks = get_date_chunks(start_date, end_date, API_CHUNK_SIZE_DAYS)
    
    for i, (chunk_start, chunk_end) in enumerate(date_chunks):
        print(f"\n--- Processing chunk {i+1}/{len(date_chunks)}: {chunk_start.strftime('%Y-%m-%d')} to {chunk_end.strftime('%Y-%m-%d')} ---")
        pjm_data = fetch_pjm_inst_load(PJM_API_KEY, chunk_start, chunk_end)
        
        if pjm_data:
            insert_load_data(DB_CONFIG, pjm_data)
        else:
            print(f"No data received from PJM for this chunk.")
        
        if i < len(date_chunks) - 1:
            print("Waiting for 10 seconds before the next API request...")
            time.sleep(10)
    
    print("\n--- Script Finished ---")

if __name__ == "__main__":
    main()
