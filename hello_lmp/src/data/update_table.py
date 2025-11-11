import pandas as pd
import mysql.connector
from dotenv import load_dotenv
import os

# --- Load Environment Variables ---
load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME"),
    "port": int(os.getenv("DB_PORT", 3306))
}

# --- 1. User Configuration ---
CSV_FILE_PATH = 'utc_alt_names.csv'
DB_TABLE_NAME = 'pjm_zone_shapes'

# --- Column Mapping ---
CSV_NAME_COL = 'NAME'              # Name column in CSV.
CSV_LAT_COL = 'Latitude'                # Latitude column in CSV.
CSV_LON_COL = 'Longitude'               # Longitude column in CSV.

DB_UNIQUE_KEY_COL = 'Transact_Z'        # The UNIQUE key column in the DB to match against.
DB_ALT_NAME_COL = 'alt_name'            # The column to store the name on INSERT.
DB_LAT_COL = 'Latitude'                 # The latitude column in your DB.
DB_LON_COL = 'Longitude'                # The longitude column in your DB.


def upsert_data_from_csv(connection):
    """
    Updates records in a MySQL table from a CSV based on a name match,
    or inserts a new record if no match is found.

    Args:
        connection: An active mysql.connector database connection object.
    """
    cursor = None
    try:
        if not connection.is_connected():
            print("Database connection is not active.")
            return

        cursor = connection.cursor()
        print("Database connection successful.")
        
        print(f"Reading data from '{CSV_FILE_PATH}'...")
        df = pd.read_csv(CSV_FILE_PATH)
        
        # Filter out rows where key columns are missing in the CSV
        df.dropna(subset=[CSV_NAME_COL, CSV_LAT_COL, CSV_LON_COL], inplace=True)

        # Prepare data for the query. The tuple must match the INSERT columns.
        # For a new row, we insert the PNODENAME into both Transact_Z and alt_name.
        data_to_process = [
            (row[CSV_NAME_COL], row[CSV_NAME_COL], row[CSV_LAT_COL], row[CSV_LON_COL])
            for index, row in df.iterrows()
        ]

        if not data_to_process:
            print("No valid data found in the CSV to process.")
            return

        print(f"Found {len(data_to_process)} records in CSV to process.")

        # --- 2. SQL Query with ON DUPLICATE KEY UPDATE ---
        # This query attempts to INSERT a new row.
        # If the INSERT fails because the value for DB_UNIQUE_KEY_COL already exists,
        # it will trigger the ON DUPLICATE KEY UPDATE clause instead.
        sql_query = f"""
        INSERT INTO {DB_TABLE_NAME} ({DB_UNIQUE_KEY_COL}, {DB_ALT_NAME_COL}, {DB_LAT_COL}, {DB_LON_COL})
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            {DB_LAT_COL} = VALUES({DB_LAT_COL}),
            {DB_LON_COL} = VALUES({DB_LON_COL});
        """
        # The VALUES() function refers to the data that *would have been inserted*.

        # --- 3. Execute the Query ---
        cursor.executemany(sql_query, data_to_process)
        connection.commit()

        # NOTE: cursor.rowcount for this query has special behavior:
        # - 1 for each row that is INSERTED as a new row.
        # - 2 for each row that is UPDATED.
        print(f"Success! {cursor.rowcount} is the total value from affected rows (1 per insert, 2 per update).")
        print(f"Processed {len(data_to_process)} records from the CSV file.")

    except FileNotFoundError:
        print(f"Error: The file '{CSV_FILE_PATH}' was not found.")
    except KeyError as e:
        print(f"Error: A required column was not found in the CSV: {e}. Please check your column names.")
    except mysql.connector.Error as err:
        print(f"Database Error: {err}")
        if "Unknown column" in err.msg:
            print("Hint: Check that the column names in the script configuration match your database table.")
        if "Duplicate entry" not in err.msg and "doesn't have a default value" not in err.msg:
             # Only rollback if it's not a standard duplicate key error that we are handling
            if connection and connection.is_connected():
                connection.rollback()
                print("Transaction rolled back.")
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
        print(f"Connecting to MySQL database at {DB_CONFIG['host']}...")
        conn = mysql.connector.connect(**DB_CONFIG)
        upsert_data_from_csv(conn)
    except mysql.connector.Error as err:
        print(f"Failed to connect to the database: {err}")
    finally:
        if conn and conn.is_connected():
            conn.close()
            print("Database connection closed.")
