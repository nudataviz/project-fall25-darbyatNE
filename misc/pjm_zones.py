import geopandas as gpd
import folium

# Load the PJM zones shapefile into a GeoDataFrame
# Replace 'path/to/your/pjm_zones.shp' with the actual file path
gdf = gpd.read_file('misc/PJM_zones.geojson')

# --- FIX for DeprecationWarning ---
# Use union_all() instead of the deprecated unary_union
# Calculate the center of all zones for the initial map view
union_of_zones = gdf.geometry.union_all()
center_lat = union_of_zones.centroid.y
center_lon = union_of_zones.centroid.x

# Create a folium map centered on the PJM region
m = folium.Map(location=[center_lat, center_lon], zoom_start=6)

# Add the PJM zones polygons to the map
folium.GeoJson(
    gdf,
    name='PJM Zones'
).add_to(m)

# --- NEW: Add labels for each zone ---
# Iterate through the GeoDataFrame to add a labeled marker for each zone
for idx, row in gdf.iterrows():
    # Get the representative point (centroid) of the zone's geometry
    centroid = row.geometry.centroid
    # Get the zone name from the 'Zone_Name' field
    zone_name = row['Zone_Name']
    
    # Add a marker with a tooltip showing the zone name
    folium.Marker(
        location=[centroid.y, centroid.x],
        tooltip=zone_name,
        icon=folium.Icon(color='blue', icon='info-sign')
    ).add_to(m)

# Save the map to an HTML file
output_filename = 'pjm_zones_labeled_map.html'
m.save(output_filename)

print(f"A map with all PJM zones and their labels has been created and saved to '{output_filename}'.")

