// /static/js/map.js

const MapUtils = {
    /**
     * Initializes the Leaflet map, its controls, and the tile layer.
     */
    initializeMap() {
        State.map = L.map('map').setView(CONFIG.MAP.initialView, CONFIG.MAP.initialZoom);
        L.tileLayer(CONFIG.MAP.tileLayer, {
            maxZoom: CONFIG.MAP.maxZoom,
            attribution: CONFIG.MAP.attribution
        }).addTo(State.map);

        // Create the unified legend on initial load
        this.createLegend();

        // Invalidate map size after a short delay to ensure proper rendering
        setTimeout(() => State.map.invalidateSize(), 100);
    },

    /**
     * Adds the zone shapes to the map and updates the unified legend.
     */
    addZoneShapesToMap(geojson) {
        if (State.geojsonLayer) {
            State.map.removeLayer(State.geojsonLayer);
        }
        State.zoneLayers = {};

        State.geojsonLayer = L.geoJSON(geojson, {
            style: this.getStyleForFeature,
            onEachFeature: this.onEachFeature
        }).addTo(State.map);

        // Update the legend to reflect the new data state
        this.createLegend();
    },

    /**
     * Defines behavior for each feature (zone) when it's created.
     */
    onEachFeature(feature, layer) {
        const zoneName = feature.properties.zone_name;
        State.zoneLayers[zoneName] = layer;

        layer.bindTooltip(zoneName, {
            permanent: true,
            direction: 'center',
            className: 'zone-label'
        }).openTooltip();

        layer.bindPopup(`<strong>${zoneName}</strong>`);
    },

    /**
     * Dynamically determines the style of a zone.
     */
    getStyleForFeature(feature) {
        const zoneName = feature.properties.zone_name;

        if (!State.isAnimationStarted) {
            return { fillColor: '#808080', weight: 1.5, opacity: 1, color: 'white', fillOpacity: 0.7 };
        }

        const lmpData = State.timeSeriesData[State.currentTimeIndex]?.readings;
        const lmp = lmpData ? lmpData[zoneName] : undefined;
        const color = MapUtils.getColorForLmp(lmp);

        return { fillColor: color, weight: 2, opacity: 1, color: 'white', fillOpacity: 0.7 };
    },

    /**
     * Gets the color for a given LMP value.
     */
    getColorForLmp(lmp) {
        if (lmp === undefined || lmp === null) return CONFIG.NO_DATA_COLOR;
        for (const scale of CONFIG.COLOR_SCALE) {
            if (lmp > scale.threshold) return scale.color;
        }
        return CONFIG.COLOR_SCALE[CONFIG.COLOR_SCALE.length - 1].color;
    },

    /**
     * Updates the text of the zone labels (tooltips) to show prices.
     */
    updateLabelsToPrice(index) {
        if (!State.isAnimationStarted || !State.timeSeriesData[index]) return;
        const lmpData = State.timeSeriesData[index].readings;

        for (const zoneName in State.zoneLayers) {
            const layer = State.zoneLayers[zoneName];
            if (layer && lmpData) {
                const lmp = lmpData[zoneName];
                const priceText = (lmp !== undefined) ? `$${lmp.toFixed(2)}` : 'N/A';
                layer.setTooltipContent(priceText);
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

    /**
     * MERGED: Creates or updates the map legend, now including the Price Type.
     */
    createLegend() {
        if (State.legendControl) {
            State.map.removeControl(State.legendControl);
        }
        State.legendControl = L.control({ position: 'bottomright' });
        State.legendControl.onAdd = function() {
            const div = L.DomUtil.create('div', 'info legend');
            let legendHtmlParts = [];

            // --- Logic from createPriceTypeControl is now here ---
            const priceTypeMap = {
                'RT': 'Real Time Prices',
                'DA': 'Day Ahead Prices',
                'NET': 'Net Price of Two Settlement'
            };
            const priceTypeDescription = priceTypeMap[State.currentFilter.price_type] || 'Unknown Price Type';
            legendHtmlParts.push(`<h4>Price Type</h4><span>${priceTypeDescription}</span>`);
            legendHtmlParts.push('<hr class="legend-hr">'); // Adds a separator line
            // --- End of merged logic ---

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
    // The createPriceTypeControl function has been removed.
};

