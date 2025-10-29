import pandas as pd
import json
import sys
import os

GEOJSON_FILE = "data/PJM_zones.geojson"
OUTPUT_CSV = "data/pjm_zones.csv"

try:
    with open(GEOJSON_FILE, 'r') as f:
        data = json.load(f)
except FileNotFoundError:
    print(f"ERROR: File not found at '{GEOJSON_FILE}'.")
    sys.exit(1)

print("Extracting properties from GeoJSON features...")
feature_properties = [feature['properties'] for feature in data['features']]

if not feature_properties:
    print("ERROR: No features found in the GeoJSON file.")
    sys.exit(1)

print("Creating Pandas DataFrame...")
df = pd.DataFrame(feature_properties)

print("DataFrame created. Here are the first 5 rows:")
print(df.head())
print("\nDataFrame Info:")
df.info()

output_dir = os.path.dirname(OUTPUT_CSV)
if output_dir and not os.path.exists(output_dir):
    os.makedirs(output_dir)
    print(f"Created directory: {output_dir}")

print(f"\nWriting data to CSV file '{OUTPUT_CSV}'...")
df.to_csv(
    OUTPUT_CSV,
    index=False,       
    encoding='utf-8'    
)

print(f"\nExport complete! CSV file saved to: {OUTPUT_CSV}")
print(f"Total rows exported: {len(df)}")
