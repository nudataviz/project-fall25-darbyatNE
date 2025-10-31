# src/data/db_query.py
import os
import pandas as pd
from sqlalchemy import create_engine
from dotenv import load_dotenv
import json
import sys
import argparse

def query_electric_data(picker_data, table_name, timestamp_col):
    """
    Queries a specified table for time-series data based on picker criteria.
    """
    load_dotenv()
    db_user = os.getenv("DB_USER")
    db_password = os.getenv("DB_PASSWORD")
    db_host = os.getenv("DB_HOST")
    db_port = os.getenv("DB_PORT")
    db_name = os.getenv("DB_NAME")

    connection_str = f"mysql+mysqlconnector://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    engine = create_engine(connection_str)

    start_date = picker_data["initialStartDate"]
    end_date = picker_data["initialEndDate"]
    start_hour = picker_data["initialStartTime"]
    end_hour = picker_data["initialEndTime"]
    days_of_week = picker_data["initialDaysOfWeek"]

    selected_days = [i + 1 for i, is_selected in enumerate(days_of_week) if is_selected]

    if not selected_days:
        print("Warning: No days of the week were selected.", file=sys.stderr)
        return pd.DataFrame()

    days_placeholders = ", ".join(["%s"] * len(selected_days))
    query = f"""
        SELECT *
        FROM {table_name}
        WHERE
            DATE({timestamp_col}) BETWEEN %s AND %s
            AND HOUR({timestamp_col}) >= %s AND HOUR({timestamp_col}) < %s
            AND DAYOFWEEK({timestamp_col}) IN ({days_placeholders})
        ORDER BY
            {timestamp_col} ASC;
    """

    params = tuple([start_date, end_date, start_hour, end_hour] + selected_days)

    try:
        with engine.connect() as connection:
            df = pd.read_sql(query, connection, params=params)
            return df
    except Exception as e:
        print(f"An error occurred: {e}", file=sys.stderr)
        return pd.DataFrame()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--picker_data", required=True)
    parser.add_argument("--table_name", required=True)
    parser.add_argument("--timestamp_col", required=True)
    
    args = parser.parse_args()
    picker_from_js = json.loads(args.picker_data)
    results_df = query_electric_data(picker_from_js, args.table_name, args.timestamp_col)
    print(results_df.to_json(orient="records", date_format="iso"))
