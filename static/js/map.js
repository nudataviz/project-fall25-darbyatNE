// In /static/js/map.js - Replace the entire MapUtils object with this

const MapUtils = {
    /** Initializes the Leaflet map, its controls, and the tile layer. */
    initializeMap() {
        State.map = L.map('map').setView(CONFIG.MAP.initialView, CONFIG.MAP.initialZoom);
        L.tileLayer(CONFIG.MAP.tileLayer, {
            maxZoom: CONFIG.MAP.maxZoom,
            attribution: CONFIG.MAP.attribution
        }).addTo(State.map);
        this.createLegend();
        setTimeout(() => State.map.invalidateSize(), 100);
    },

    /** Adds the zone shapes to the map and updates the unified legend. */
    addZoneShapesToMap(geojson) {
        if (State.geojsonLayer) {
            State.map.removeLayer(State.geojsonLayer);
        }
        // Clear old labels before adding new ones
        for (const zoneName in State.labelMarkers) {
            State.labelMarkers[zoneName].forEach(marker => State.map.removeLayer(marker));
        }
        State.labelMarkers = {};
        State.zoneLayers = {};

        State.geojsonLayer = L.geoJSON(geojson, {
            style: this.getStyleForFeature,
            // Pass 'this' context to onEachFeature
            onEachFeature: this.onEachFeature.bind(this)
        }).addTo(State.map);

        this.createLegend();
    },

    onEachFeature(feature, layer) {
        const zoneName = feature.properties.zone_name;
        if (!zoneName) return;

        State.zoneLayers[zoneName] = layer;
        layer.bindPopup(`<strong>${zoneName}</strong>`);
        
        // Initialize the array for this zone's labels
        State.labelMarkers[zoneName] = [];

        const createLabel = (center, initialText) => {
            return L.marker(center, {
                icon: L.divIcon({
                    className: 'zone-label',
                    html: `<span>${initialText}</span>`,
                    iconSize: [70, 20] // Adjust size as needed
                }),
                interactive: false // Labels don't capture clicks
            }).addTo(State.map);
        };

        // Check for custom position overrides first
        const overrides = CONFIG.ZONE_LABEL_OVERRIDES[zoneName];
        if (overrides && overrides.length > 0) {
            overrides.forEach(coords => {
                const center = L.latLng(coords[0], coords[1]);
                const label = createLabel(center, zoneName);
                State.labelMarkers[zoneName].push(label);
            });
            return; // Skip automatic placement
        }

        // This handles both Polygon and MultiPolygon features correctly.
        const center = layer.getBounds().getCenter();
        const label = createLabel(center, zoneName);
        State.labelMarkers[zoneName].push(label);
    },

    /** Dynamically determines the style of a zone. */
    getStyleForFeature(feature) {
        const zoneName = feature.properties.zone_name;
        if (!State.isAnimationStarted) {
            return { fillColor: '#808080', weight: 1.5, opacity: 1, color: 'white', fillOpacity: 0.7 };
        }
        const lmpData = State.timeSeriesData[State.currentTimeIndex]?.readings;
        const lmp = lmpData ? lmpData[zoneName] : undefined;
        const color = MapUtils.getColorForLmp(lmp);
        return { fillColor: color, weight: 2, opacity: 1, color: 'white', fillOpacity: 0.85 };
    },

    /** Gets the color for a given LMP value. */
    getColorForLmp(lmp) {
        if (lmp === undefined || lmp === null) return CONFIG.NO_DATA_COLOR;
        for (const scale of CONFIG.COLOR_SCALE) {
            if (lmp > scale.threshold) return scale.color;
        }
        return CONFIG.COLOR_SCALE[CONFIG.COLOR_SCALE.length - 1].color;
    },

    /* Updates the text of the zone labels to show prices.  */
    updateLabelsToPrice(index) {
        if (!State.isAnimationStarted || !State.timeSeriesData[index]) return;
        const lmpData = State.timeSeriesData[index].readings;
        const OPACITY = 0.6;

        for (const zoneName in State.labelMarkers) {
            const markers = State.labelMarkers[zoneName];
            if (!markers || !lmpData) continue;
            
            const lmp = lmpData[zoneName];
            const priceText = (lmp !== undefined) ? `$${lmp.toFixed(2)}` : 'N/A';
            
            // Get the corresponding color for the LMP value.
            const color = MapUtils.getColorForLmp(lmp);
            
            for (const marker of markers) {
                // Update the HTML to include the new text AND the new background color.
                marker.getIcon().options.html = `<span style="background-color: ${color};">${priceText}</span>`;
                marker.setIcon(marker.getIcon()); // Redraw the icon
            }
        }
    },

    /**
     * Updates the on-click popup content for each zone.
     */
    updatePopups(index) {
        if (!State.timeSeriesData[index] || !State.geojsonLayer) return;
        const lmpData = State.timeSeriesData[index].readings;

        State.geojsonLayer.eachLayer(function(layer) {
            const zoneName = layer.feature.properties.zone_name;
            const lmp = lmpData ? lmpData[zoneName] : undefined;
            const content = `<strong>${zoneName}</strong><br>LMP: ${lmp !== undefined ? `$${lmp.toFixed(2)}` : 'No data'}`;
            layer.setPopupContent(content);
        });
    },

    createLegend() {
        if (State.legendControl) {
            State.map.removeControl(State.legendControl);
        }
        State.legendControl = L.control({ position: 'bottomright' });
        State.legendControl.onAdd = function() {
            const div = L.DomUtil.create('div', 'info legend');
            let legendHtmlParts = [];
            const priceTypeMap = { 'RT': 'Real Time Prices', 'DA': 'Day Ahead Prices', 'NET': 'Net Price of Two Settlement' };
            const priceTypeDescription = priceTypeMap[State.currentFilter.price_type] || 'Unknown Price Type';
            legendHtmlParts.push(`<h4>Price Type</h4><span>${priceTypeDescription}</span>`);
            legendHtmlParts.push('<hr class="legend-hr">');

            if (!State.isAnimationStarted) {
                legendHtmlParts.push('<h4>Zone</h4>');
                legendHtmlParts.push(`<div class="legend-item"><i class="legend-color-box" style="background:#808080;"></i><span>Zone Area</span></div>`);
            } else {
                legendHtmlParts.push('<h4>LMP ($/MWh)</h4>');
                for (const scale of CONFIG.COLOR_SCALE) {
                    legendHtmlParts.push(`<div class="legend-item"><i class="legend-color-box" style="background:${scale.color};"></i><span>${scale.label}</span></div>`);
                }
                legendHtmlParts.push(`<div class="legend-item"><i class="legend-color-box" style="background:${CONFIG.NO_DATA_COLOR};"></i><span>No Data</span></div>`);
            }
            
            div.innerHTML = legendHtmlParts.join('');
            L.DomEvent.disableClickPropagation(div);
            return div;
        };
        State.legendControl.addTo(State.map);
    }
};
