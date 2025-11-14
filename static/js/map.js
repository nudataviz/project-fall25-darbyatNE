// Map utilities and rendering functions
const MapUtils = {
    initializeMap() {
        State.map = L.map('map').setView(CONFIG.MAP.initialView, CONFIG.MAP.initialZoom);
        L.tileLayer(CONFIG.MAP.tileLayer, {
            maxZoom: CONFIG.MAP.maxZoom,
            attribution: CONFIG.MAP.attribution
        }).addTo(State.map);
    },

    getColor(lmp) {
        if (lmp === undefined || lmp === null) return CONFIG.NO_DATA_COLOR;
        
        for (const scale of CONFIG.COLOR_SCALE) {
            if (lmp > scale.threshold) {
                return scale.color;
            }
        }
        return CONFIG.NO_DATA_COLOR;
    },

    getStyle(feature) {
        const zoneName = feature.properties.zone_name;
        const currentReadings = State.timeSeriesData[State.currentTimeIndex]?.readings;
        const lmp = currentReadings ? currentReadings[zoneName] : null;
        
        return {
            fillColor: MapUtils.getColor(lmp),
            weight: 2,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.7
        };
    },

    highlightFeature(e) {
        const layer = e.target;
        layer.setStyle({
            weight: 5,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.7
        });
        
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
    },

    resetHighlight(e) {
        State.geojsonLayer.resetStyle(e.target);
    },

    onEachFeature(feature, layer) {
        layer.on({
            mouseover: MapUtils.highlightFeature,
            mouseout: MapUtils.resetHighlight
        });

        const zoneName = feature.properties.zone_name;
        layer.bindPopup(`<strong>${zoneName || "Unknown Zone"}</strong>`);

        if (zoneName) {
            const center = layer.getBounds().getCenter();
            const label = L.marker(center, {
                icon: L.divIcon({
                    className: 'zone-label',
                    html: '',
                    iconSize: [80, 20]
                }),
                interactive: false
            }).addTo(State.map);
            
            State.labelMarkers[zoneName] = label;
        }
    },

    updatePopups(index) {
        const lmpDataForTime = State.timeSeriesData[index]?.readings;
        if (!lmpDataForTime || !State.geojsonLayer) return;

        State.geojsonLayer.eachLayer(function(layer) {
            const zoneName = layer.feature.properties.zone_name;
            const lmp = lmpDataForTime[zoneName];
            const content = `<strong>${zoneName}</strong><br>LMP: ${
                lmp !== undefined ? `$${lmp.toFixed(2)}` : 'No data'
            }`;
            layer.setPopupContent(content);
        });
    },

    updateLabels(index) {
        const lmpDataForTime = State.timeSeriesData[index]?.readings;
        if (!lmpDataForTime) return;

        for (const zoneName in State.labelMarkers) {
            const marker = State.labelMarkers[zoneName];
            const lmp = lmpDataForTime[zoneName];
            const labelText = (lmp !== null && lmp !== undefined) 
                ? `$${lmp.toFixed(1)}` 
                : '';
            
            marker.getIcon().options.html = labelText;
            marker.setIcon(marker.getIcon());
        }
    },

    createLegend() {
        const legend = L.control({ position: 'topright' });
        
        legend.onAdd = function() {
            const div = L.DomUtil.create('div', 'info legend');
            div.innerHTML = '<h4>LMP ($/MWh)</h4>';
            
            CONFIG.COLOR_SCALE.forEach(scale => {
                div.innerHTML += `
                    <div class="legend-item">
                        <i style="background:${scale.color}"></i>
                        <span>${scale.label}</span>
                    </div>
                `;
            });
            
            div.innerHTML += `
                <div class="legend-item">
                    <i style="background:${CONFIG.NO_DATA_COLOR}"></i>
                    <span>No Data</span>
                </div>
            `;
            
            return div;
        };
        
        legend.addTo(State.map);
    }
};