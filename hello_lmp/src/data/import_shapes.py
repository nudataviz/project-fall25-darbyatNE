import os
import pandas as pd
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

# --- Configuration ---

# Load environment variables from .env file
load_dotenv()

# Database connection details from environment variables
DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME"),
    "port": int(os.getenv("DB_PORT", 3306))
}

# --- 1. User Configuration ---
CSV_FILE_PATH = 'pjm_zones.csv'  # The name of your CSV file
DB_TABLE_NAME = 'pjm_zone_shapes' # The name of your existing database table

# !!! IMPORTANT !!!
# YOU MUST SET THIS VARIABLE to the name of the column in your database table
# that is the PRIMARY KEY or has a UNIQUE constraint (e.g., "FID", "Zone_ID").
DB_UNIQUE_KEY_COL = 'FID' # <-- EDIT THIS VALUE

# --- 2. Column Definition ---
# These are the columns from your CSV that you want to import.
# The order must match the columns in your CSV file.
CSV_COLUMNS = [
    'WKT', 'FID', 'Zone_Name', 'Transact_Z', 'Transact_G', 'Transact_1',
    'Total_Ener', 'Peak_Load_', 'Load_Growt', 'Peak_Loa_1', 'Summer_Cap',
    'Reserve_Ma', 'Source', 'Zone_ID', 'Layer_ID', 'Shape__Area',
    'Shape__Length', 'ISO', 'TWh'
]


def upsert_shape_data(connection):
    """
    Reads shape data from a CSV and upserts it into an existing MySQL table.
    'Upsert' means it will INSERT new rows or UPDATE existing ones if a
    duplicate key is found.
    """
    if not DB_UNIQUE_KEY_COL:
        print("Error: The 'DB_UNIQUE_KEY_COL' variable is not set. Please edit the script.")
        return

    cursor = None
    try:
        if not connection.is_connected():
            print("Database connection is not active.")
            return

        cursor = connection.cursor()
        print("Database connection successful.")

        # --- 3. Read and Clean CSV Data ---
        print(f"Reading data from '{CSV_FILE_PATH}'...")
        df = pd.read_csv(CSV_FILE_PATH, names=CSV_COLUMNS, header=0) # Use names and skip header
        
        # Replace pandas NaN (Not a Number) with None, which translates to SQL NULL
        df = df.where(pd.notnull(df), None)
        
        print(f"Found {len(df)} records in the CSV to process.")
        if df.empty:
            return

        # --- 4. Prepare and Execute the SQL Query ---
        
        # Prepare column names for the SQL query string
        cols_for_sql = '`, `'.join(CSV_COLUMNS)
        
        # Prepare the ON DUPLICATE KEY UPDATE part of the query
        # This will update every column except for the unique key itself
        update_clause = ', '.join([f"`{col}` = VALUES(`{col}`)" for col in CSV_COLUMNS if col != DB_UNIQUE_KEY_COL])
        
        sql_query = f"""
        INSERT INTO {DB_TABLE_NAME} (`{cols_for_sql}`)
        VALUES ({', '.join(['%s'] * len(CSV_COLUMNS))})
        ON DUPLICATE KEY UPDATE
            {update_clause};
        """

        # Convert DataFrame rows into a list of tuples for executemany
        data_to_upsert = [tuple(row) for row in df.itertuples(index=False)]

        print("Executing upsert operation...")
        cursor.executemany(sql_query, data_to_upsert)
        connection.commit()

        # For ON DUPLICATE KEY UPDATE, rowcount returns:
        # 1 for each new row inserted.
        # 2 for each existing row that was updated.
        print(f"Success! The operation affected {cursor.rowcount} rows (1 per insert, 2 per update).")
        print(f"Processed {len(data_to_upsert)} records from the CSV file.")

    except FileNotFoundError:
        print(f"Error: The file '{CSV_FILE_PATH}' was not found.")
    except KeyError as e:
        print(f"Error: A required column was not found: {e}. Check the 'CSV_COLUMNS' list.")
    except Error as err:
        print(f"Database Error: {err}")
        if connection and connection.is_connected():
            print("Transaction rolled back.")
            connection.rollback()
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        if cursor:
            cursor.close()
            print("Database cursor closed.")


# --- Main Execution Block ---
if __name__ == "__main__":
    conn = None
    try:
        print(f"--- Starting Shape Data Upsert Script ---")
        print(f"Connecting to MySQL database at {DB_CONFIG['host']}...")
        conn = mysql.connector.connect(**DB_CONFIG)
        upsert_shape_data(conn)
    except Error as err:
        print(f"Failed to connect to the database: {err}")
    finally:
        if conn and conn.is_connected():
            conn.close()
            print("Database connection closed.")
        print("--- Script Finished ---")
