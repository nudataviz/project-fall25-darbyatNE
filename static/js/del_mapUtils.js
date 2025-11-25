/**
 * =================================================================================
 * MAP UTILITIES
 * =================================================================================
 * This module contains all functions for interacting with the Leaflet map.
 * It handles initialization, drawing, and updating map layers.
 */

const MapUtils = {
    /**
     * Initializes the Leaflet map.
     */
    initializeMap() {
        console.log("Initializing map...");
        // Note: Your config used 'map.center' and 'map.zoom', but Leaflet examples often use 'initialView' and 'initialZoom'.
        // I'll stick to your config's naming convention. If the map doesn't load, check that CONFIG.MAP.initialView is correct.
        State.map = L.map('map').setView(CONFIG.MAP.initialView, CONFIG.MAP.initialZoom);

        L.tileLayer(CONFIG.MAP.tileLayer, {
            attribution: CONFIG.MAP.attribution,
            maxZoom: CONFIG.MAP.maxZoom
        }).addTo(State.map);
        console.log("Map initialized.");
    },

    /**
     * Draws the PJM zone shapes on the map.
     * This function assumes that State.zoneShapes contains the GeoJSON data.
     */
    drawZoneShapes() {
        if (!State.zoneShapes || !State.zoneShapes.features) {
            console.error("Zone shapes data is not available to draw.");
            return;
        }

        console.log("Drawing zone shapes on the map...");

        // If a layer already exists, remove it before drawing a new one.
        if (State.zoneLayer) {
            State.map.removeLayer(State.zoneLayer);
        }

        State.zoneLayer = L.geoJSON(State.zoneShapes, {
            style: (feature) => {
                // Initial style: grey fill using the NO_DATA_COLOR from config.
                return {
                    color: "#333", // Border color
                    weight: 1.5,
                    fillColor: CONFIG.NO_DATA_COLOR, // Use config's no-data color
                    fillOpacity: 0.5
                };
            },
            onEachFeature: (feature, layer) => {
                // Add a tooltip to show the zone name on hover.
                const zoneName = feature.properties.zone_name;
                layer.bindTooltip(zoneName, {
                    permanent: false, // Show only on hover
                    direction: 'center',
                    className: 'zone-tooltip'
                });
            }
        }).addTo(State.map);

        console.log("Zone shapes drawn successfully.");
    },

    /**
     * Updates the colors of the zone shapes based on LMP data.
     * This version is adapted to use the detailed COLOR_SCALE from config.js.
     */
    updateMapColors() {
        console.log("MapUtils.updateMapColors() called.");
        if (!State.lmpData || !State.zoneLayer) {
            console.warn("LMP data or zone layer not ready for color update.");
            return;
        }

        // Helper function to get the right color for a given LMP value.
        // It iterates through the COLOR_SCALE (ordered highest to lowest) in config.js.
        const getColor = (lmp) => {
            for (const scale of CONFIG.COLOR_SCALE) {
                if (lmp >= scale.threshold) {
                    return scale.color;
                }
            }
            // This will be returned if lmp is null or doesn't meet any threshold.
            return CONFIG.NO_DATA_COLOR;
        };

        // Iterate over each zone shape layer on the map.
        State.zoneLayer.eachLayer(layer => {
            const zoneName = layer.feature.properties.zone_name;
            const lmpDataForZone = State.lmpData[zoneName];

            // Default to the specific NO_DATA_COLOR from your config file.
            let newColor = CONFIG.NO_DATA_COLOR;
            let newOpacity = 0.5; // Keep zones with no data slightly transparent.

            if (lmpDataForZone && lmpDataForZone.average_lmp !== null) {
                // We have data, so get the color from our scale.
                newColor = getColor(lmpDataForZone.average_lmp);
                newOpacity = 0.7; // Make zones with data slightly more opaque.
            }

            // Apply the new style to the map layer.
            layer.setStyle({
                fillColor: newColor,
                fillOpacity: newOpacity
            });
        });

        console.log("Map colors updated based on LMP data.");
    },


    /**
     * Shows a loading indicator on the map.
     */
    showLoadingIndicator() {
        document.getElementById('loading-indicator').style.display = 'block';
    },

    /**
     * Hides the loading indicator.
     */
    hideLoadingIndicator() {
        document.getElementById('loading-indicator').style.display = 'none';
    }
};

console.log("MapUtils module loaded.");
