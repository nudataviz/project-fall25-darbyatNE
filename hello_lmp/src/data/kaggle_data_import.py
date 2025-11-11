import os
import kagglehub
from kagglehub import KaggleDatasetAdapter
import pandas as pd
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

# --- Configuration ---
load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME"),
    "port": int(os.getenv("DB_PORT", 3306))
}

# --- Data Fetching ---

def fetch_kaggle_dataset():
    """
    Downloads the US Electric Power Transmission Lines dataset from Kaggle
    and loads it directly into a pandas DataFrame using the KaggleDatasetAdapter.
    """
    try:
        print("Attempting to download and load dataset from Kaggle...")
        file_path = "Electric__Power_Transmission_Lines.csv"
        df = kagglehub.dataset_load(
            KaggleDatasetAdapter.PANDAS,
            "behroozsohrabi/us-electric-power-transmission-lines",
            file_path,
        )
        print("Successfully loaded dataset into DataFrame!")
        # Replace pandas's NaN/NaT with None for database compatibility
        df = df.astype(object).where(pd.notnull(df), None)
        return df
    except Exception as e:
        print(f"An error occurred during the Kaggle fetch/load process: {e}")
        return None

# --- Database Operations ---

def insert_transmission_lines_data(db_params, dataframe):
    """
    Transforms the DataFrame to match the database schema and inserts or updates the data.
    """
    if dataframe is None or dataframe.empty:
        print("No data in DataFrame to insert.")
        return

    try:
        sql_columns = [
            'OBJECTID', 'ID', 'TYPE', 'STATUS', 'OWNER', 'VOLTAGE', 'VOLT_CLASS',
            'SUB_1', 'SUB_2', 'SHAPE__Length', 'GlobalID'
        ]
        aligned_df = dataframe[sql_columns]
        print("DataFrame has been aligned with the updated database schema.")
        conn = None
        print("Connecting to the database...")
        conn = mysql.connector.connect(**db_params)
        if conn.is_connected():
            print("Database connection successful.")
            cursor = conn.cursor()
            sql = """
                INSERT INTO transmission_lines (
                    OBJECTID, ID, TYPE, STATUS, OWNER, VOLTAGE, VOLT_CLASS,
                    SUB_1, SUB_2, SHAPE__Length, GlobalID
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    ID = VALUES(ID), TYPE = VALUES(TYPE), STATUS = VALUES(STATUS),
                    OWNER = VALUES(OWNER), VOLTAGE = VALUES(VOLTAGE), VOLT_CLASS = VALUES(VOLT_CLASS),
                    SUB_1 = VALUES(SUB_1), SUB_2 = VALUES(SUB_2),
                    SHAPE__Length = VALUES(SHAPE__Length), GlobalID = VALUES(GlobalID);
            """

            data_to_insert = [tuple(row) for row in aligned_df.itertuples(index=False)]

            print(f"Upserting {len(data_to_insert)} rows...")
            cursor.executemany(sql, data_to_insert)
            conn.commit()
            print(f"Operation completed. Affected rows: {cursor.rowcount}")
            cursor.close()

    except Error as e:
        print(f"Database error: {e}")
    except KeyError as e:
        print(f"A column mismatch error occurred: {e}. The DataFrame from Kaggle may have changed.")
    finally:
        if conn and conn.is_connected():
            conn.close()
            print("Database connection closed.")


def main():
    """Main function to run the data pipeline."""
    print("--- Starting Data Pipeline: Kaggle to MySQL ---")
    transmission_df = fetch_kaggle_dataset()
    if transmission_df is not None:
        insert_transmission_lines_data(DB_CONFIG, transmission_df)
    else:
        print("Skipping database insertion due to download failure.")
    print("\n--- Script Finished ---")

if __name__ == "__main__":
    main()
