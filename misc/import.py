import pandas as pd
from sqlalchemy import create_engine
import json
import sys

# --- Configuration ---
DB_FILE = "../project.db"
GEOJSON_FILE = "data/PJM_zones.geojson"
TABLE_NAME = "pjm_zones"

# 1. Load the raw JSON data from the file
try:
    with open(GEOJSON_FILE, 'r') as f:
        data = json.load(f)
except FileNotFoundError:
    print(f"ERROR: File not found at '{GEOJSON_FILE}'.")
    sys.exit(1)

# 2. Extract the 'properties' dictionary from each feature
# This will become the data for our DataFrame.
print("Extracting properties from GeoJSON features...")
# This list comprehension is a concise way to build a list of all the properties
feature_properties = [feature['properties'] for feature in data['features']]

if not feature_properties:
    print("ERROR: No features found in the GeoJSON file.")
    sys.exit(1)

# 3. Create a Pandas DataFrame from the list of properties
print("Creating Pandas DataFrame...")
df = pd.DataFrame(feature_properties)

# Let's inspect the DataFrame to make sure it looks correct
print("DataFrame created. Here are the first 5 rows:")
print(df.head())
print("\nDataFrame Info:")
df.info()

# 4. Write the DataFrame to the SQLite database
engine = create_engine(f'sqlite:///{DB_FILE}')

print(f"\nWriting data to table '{TABLE_NAME}' in {DB_FILE}...")
df.to_sql(
    TABLE_NAME,
    engine,
    if_exists='replace',  # Use 'replace' to overwrite the table if it exists
    index=False           # Do not write the DataFrame index as a column
)

print("\nImport complete!")
