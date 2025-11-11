```js
# Mapping LMP's
import geopandas as gpd
import folium
import os

# --- Define paths relative to the script location ---
# Input data path
data_path = 'data/PJM_zones.geojson'

# Output path for the map inside the Observable public directory
output_dir = 'docs/public/maps'
os.makedirs(output_dir, exist_ok=True) # Create the directory if it doesn't exist
output_filename = os.path.join(output_dir, 'pjm_zones_map.html')


# --- Rest of your script remains the same ---

# Load the PJM zones shapefile
gdf = gpd.read_file(data_path)

# Calculate the center of all zones for the initial map view
union_of_zones = gdf.geometry.union_all()
center_lat = union_of_zones.centroid.y
center_lon = union_of_zones.centroid.x

# Create a folium map
m = folium.Map(location=[center_lat, center_lon], zoom_start=6)

# Add the PJM zones polygons
folium.GeoJson(gdf, name='PJM Zones').add_to(m)

# Add labels for each zone
for idx, row in gdf.iterrows():
    centroid = row.geometry.centroid
    zone_name = row['Zone_Name']
    folium.Marker(
        location=[centroid.y, centroid.x],
        tooltip=zone_name,
        icon=folium.Icon(color='blue', icon='info-sign')
    ).add_to(m)

# Save the map to the new output path
m.save(output_filename)

print(f"Map has been created and saved to '{output_filename}'.")
```