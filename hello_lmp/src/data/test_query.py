import sys
import argparse
import json
import pandas as pd

sys.path.append('src/data')
from db_query import query_electric_data

parser = argparse.ArgumentParser(description="Test script for the query_electric_data function.")
parser.add_argument("--table_name", required=True, help="The name of the database table.")
parser.add_argument("--timestamp_col", required=True, help="The name of the timestamp column.")
parser.add_argument("--picker_data", required=True, help="A JSON string containing date/time picker data.")
args = parser.parse_args()

try:
    picker_data_dict = json.loads(args.picker_data)
except json.JSONDecodeError:
    print("Error: --picker_data argument is not a valid JSON string.", file=sys.stderr)
    sys.exit(1) 

# debug inputs
print("\n[1] Arguments received from command line:")
print(f"   - Picker: {picker_data_dict}")
print(f"   - Table Name: {args.table_name}")
print(f"   - Timestamp Column: {args.timestamp_col}")

# Query DB 
print("\n[2] Calling imported query_electric_data function...")
results_df = query_electric_data(picker_data_dict, args.table_name, args.timestamp_col)
print("Function complete.")

# Output
print("\n[3] Inspecting Results:")
if results_df is not None and not results_df.empty:
    print(f"Success! Query returned a DataFrame.")
    print(f"   - Shape: {results_df.shape[0]} rows, {results_df.shape[1]} columns")
    print("\n--- First 5 Rows ---")
    print(results_df.head())
else:
    print("Query returned an empty or None DataFrame.")

print("\n--- Donesky!!! ---")
