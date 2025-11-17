// =================================================================
// Main Application Logic
// =================================================================

// 1. --- Configuration ---
// All static configuration is here.
const Config = {
    backendApiBaseUrl: 'http://127.0.0.1:8000',
    arcgisServiceUrl: 'https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/Electric_Power_Transmission_Lines/FeatureServer/0',
    map: {
        initialView: [40.0, -76.0], // Centered on Pennsylvania
        initialZoom: 7,
        tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors & Esri'
    }
};

// 2. --- Initialize the Map ---
// This code runs as soon as the script is loaded.
const map = L.map('map').setView(Config.map.initialView, Config.map.initialZoom);

L.tileLayer(Config.map.tileLayer, {
    attribution: Config.map.attribution
}).addTo(map);

console.log("Map initialized.");

// 3. --- Fetch and Draw Transmission Lines ---
// This function handles the entire data fetching pipeline.
function fetchAndDrawLines() {
    const transmissionIdsUrl = `${Config.backendApiBaseUrl}/api/transmission-ids`;

    console.log(`Fetching transmission IDs from: ${transmissionIdsUrl}`);

    // Step A: Get the list of GlobalIDs from your backend
    fetch(transmissionIdsUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Backend Error: Could not fetch transmission IDs. Status: ${response.status}`);
            }
            return response.json();
        })
        .then(globalIds => {
            if (!globalIds || globalIds.length === 0) {
                console.warn("Received an empty list of IDs from the backend. Nothing to draw.");
                return; // Stop if there are no IDs
            }
            
            console.log(`Received ${globalIds.length} IDs. Querying ArcGIS server...`);

            // Step B: Use the IDs to query the ArcGIS server for the line geometries
            const whereClause = `GlobalID IN (${globalIds.map(id => `'${id}'`).join(',')})`;
            const queryParams = new URLSearchParams({
                where: whereClause,
                outFields: 'ID,TYPE,STATUS,VOLTAGE', // Fields for the popup
                outSR: '4326', // Standard latitude/longitude
                f: 'geojson'
            });

            const arcgisQueryUrl = `${Config.arcgisServiceUrl}/query?${queryParams}`;
            
            return fetch(arcgisQueryUrl);
        })
        .then(response => {
            if (!response) return; // In case the previous step returned nothing
            if (!response.ok) {
                throw new Error(`ArcGIS Server Error: Query failed. Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data) return;

            if (data.features && data.features.length > 0) {
                console.log(`Drawing ${data.features.length} transmission lines on the map.`);
                
                // Step C: Create a GeoJSON layer and add it to the map
                const transmissionLayer = L.geoJSON(data, {
                    style: {
                        color: '#FF0000', // Bright red for high visibility
                        weight: 3,
                        opacity: 0.8
                    },
                    onEachFeature: (feature, layer) => {
                        const props = feature.properties;
                        const popupContent = `
                            <h4>Transmission Line</h4>
                            <strong>ID:</strong> ${props.ID || 'N/A'}<br>
                            <strong>Type:</strong> ${props.TYPE || 'N/A'}<br>
                            <strong>Status:</strong> ${props.STATUS || 'N/A'}<br>
                            <strong>Voltage:</strong> ${props.VOLTAGE || 'N/A'} kV
                        `;
                        layer.bindPopup(popupContent);
                    }
                });

                transmissionLayer.addTo(map);
                map.fitBounds(transmissionLayer.getBounds()); // Zoom to fit the lines

            } else {
                console.warn("ArcGIS query was successful, but returned no features for the given IDs.");
            }
        })
        .catch(error => {
            console.error('Failed to render transmission lines:', error);
            alert(`An error occurred. Check the developer console for details. \n\nError: ${error.message}`);
        });
}

// 4. --- Run the Application ---
// We wait for the HTML document to be fully loaded before fetching data.
document.addEventListener('DOMContentLoaded', fetchAndDrawLines);