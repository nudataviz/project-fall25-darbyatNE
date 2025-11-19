const MapUtils = {
    /**
     * Initializes the Leaflet map, tile layer, and event listeners.
     */
    initializeMap() {
        State.map = L.map('map').setView(CONFIG.MAP.initialView, CONFIG.MAP.initialZoom);
        L.tileLayer(CONFIG.MAP.tileLayer, {
            maxZoom: CONFIG.MAP.maxZoom,
            attribution: CONFIG.MAP.attribution
        }).addTo(State.map);
        
        // Developer helper to log coordinates on right-click
        State.map.on('contextmenu', function(e) {
            console.log(`Map Coordinates: [${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}]`);
        });

        // Ensures map resizes correctly if its container was hidden
        setTimeout(() => {
            State.map.invalidateSize();
        }, 100);
    },

    /**
     * Gets the color for a given LMP value based on the descending COLOR_SCALE in config.js.
     * @param {number|null|undefined} lmp - The Locational Marginal Price.
     * @returns {string} A hex color code.
     */
    getColor(lmp) {
        if (lmp === undefined || lmp === null) {
            return CONFIG.NO_DATA_COLOR;
        }
        // The COLOR_SCALE is ordered from highest to lowest threshold.
        // Loop through and find the first threshold the value is greater than.
        for (const scale of CONFIG.COLOR_SCALE) {
            if (lmp > scale.threshold) {
                return scale.color;
            }
        }
        // This will catch any value that didn't meet the other thresholds (e.g., <= 0)
        // because the last threshold is -Infinity.
        return CONFIG.COLOR_SCALE[CONFIG.COLOR_SCALE.length - 1].color;
    },

    /**
     * Sets the *initial* style for GeoJSON features.
     * Zones will start with the 'No Data' color until LMP data is loaded.
     */
    getStyle(feature) {
        return {
            fillColor: CONFIG.NO_DATA_COLOR, // Default color
            fillOpacity: 0.7,
            weight: 2,
            opacity: 1,
            color: '#FFFFFF', // White border for good contrast
            dashArray: ''
        };
    },

    /**
     * Highlights a feature on mouseover.
     */
    highlightFeature(e) {
        const layer = e.target;
        layer.setStyle({ weight: 4, color: '#333', dashArray: '' });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
    },

    /**
     * Resets the highlight on mouseout, preserving the dynamic fill color.
     */
    resetHighlight(e) {
        const layer = e.target;
        // Revert only the properties that were changed for the highlight
        // This prevents the fillColor from being reset to the default gray.
        layer.setStyle({
            weight: 2,          // Back to original weight
            color: '#FFFFFF'    // Back to original white border
        });
    },

    /**
     * Defines behavior for each feature (zone), such as popups and labels.
     */
    onEachFeature(feature, layer) {
        layer.on({
            mouseover: MapUtils.highlightFeature,
            mouseout: MapUtils.resetHighlight
        });

        const zoneName = feature.properties.zone_name;
        layer.bindPopup(`<strong>${zoneName || "Unknown Zone"}</strong>`);

        if (zoneName) {
            State.labelMarkers[zoneName] = [];

            const createLabel = (center) => {
                return L.marker(center, {
                    icon: L.divIcon({ className: 'zone-label', html: '', iconSize: [80, 20] }),
                    interactive: false
                }).addTo(State.map);
            };

            const overrides = CONFIG.ZONE_LABEL_OVERRIDES[zoneName];
            if (overrides && overrides.length > 0) {
                overrides.forEach(coords => {
                    const center = L.latLng(coords[0], coords[1]);
                    const label = createLabel(center);
                    State.labelMarkers[zoneName].push(label);
                });
                return;
            }

            if (feature.geometry.type === 'MultiPolygon') {
                const polygonLatLngs = layer.getLatLngs();
                polygonLatLngs.forEach(latlngs => {
                    const tempPolygon = L.polygon(latlngs);
                    const center = tempPolygon.getBounds().getCenter();
                    const label = createLabel(center);
                    State.labelMarkers[zoneName].push(label);
                });
            } else {
                const center = layer.getBounds().getCenter();
                const label = createLabel(center);
                State.labelMarkers[zoneName].push(label);
            }
        }
    },

    /**
     * Updates the fill color of each zone based on its LMP value for a given time index.
     */
    updateZoneColors(index) {
        const lmpDataForTime = State.timeSeriesData[index]?.readings;
        if (!lmpDataForTime || !State.geojsonLayer) return;

        State.geojsonLayer.eachLayer(function(layer) {
            const zoneName = layer.feature.properties.zone_name;
            const lmp = lmpDataForTime[zoneName];
            const fillColor = MapUtils.getColor(lmp); // Use the getColor function

            layer.setStyle({
                fillColor: fillColor
            });
        });
    },

    /**
     * Updates the popup content for each zone with the current LMP data.
     */
    updatePopups(index) {
        const lmpDataForTime = State.timeSeriesData[index]?.readings;
        if (!lmpDataForTime || !State.geojsonLayer) return;

        State.geojsonLayer.eachLayer(function(layer) {
            const zoneName = layer.feature.properties.zone_name;
            const lmp = lmpDataForTime[zoneName];
            const content = `<strong>${zoneName}</strong><br>LMP: ${lmp !== undefined ? `$${lmp.toFixed(2)}` : 'No data'}`;
            layer.setPopupContent(content);
        });
    },

    /**
     * Updates the text for the zone labels with the current LMP data.
     */
    updateLabels(index) {
        const lmpDataForTime = State.timeSeriesData[index]?.readings;
        if (!lmpDataForTime) return;

        for (const zoneName in State.labelMarkers) {
            const markers = State.labelMarkers[zoneName];
            const lmp = lmpDataForTime[zoneName];
            const labelText = (lmp !== null && lmp !== undefined) ? `$${lmp.toFixed(1)}` : '';
            
            for (const marker of markers) {
                marker.getIcon().options.html = labelText;
                marker.setIcon(marker.getIcon());
            }
        }
    },

    /**
     * Dynamically creates the map legend from the CONFIG.COLOR_SCALE.
     */
    createLegend() {
        const legend = L.control({ position: 'bottomright' });

        legend.onAdd = function() {
            const div = L.DomUtil.create('div', 'info legend');
            div.innerHTML += '<h4>LMP ($/MWh)</h4>';

            // Loop through the color scale to build the legend items
            for (const scale of CONFIG.COLOR_SCALE) {
                div.innerHTML +=
                    `<div class="legend-item">
                        <i class="legend-color-box" style="background:${scale.color};"></i>
                        <span>${scale.label}</span>
                    </div>`;
            }

            // Add the 'No Data' color to the legend
            div.innerHTML +=
                `<div class="legend-item">
                    <i class="legend-color-box" style="background:${CONFIG.NO_DATA_COLOR};"></i>
                    <span>No Data</span>
                </div>`;

            // Prevent map interactions when clicking on the legend
            L.DomEvent.disableClickPropagation(div);

            return div;
        };

        legend.addTo(State.map);
    }
};

