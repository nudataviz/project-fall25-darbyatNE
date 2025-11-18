// In map.js - Replace the entire MapUtils object with this

const MapUtils = {
    // --- UPDATED FUNCTION ---
    initializeMap() {
        State.map = L.map('map').setView(CONFIG.MAP.initialView, CONFIG.MAP.initialZoom);
        L.tileLayer(CONFIG.MAP.tileLayer, {
            maxZoom: CONFIG.MAP.maxZoom,
            attribution: CONFIG.MAP.attribution
        }).addTo(State.map);
        
        // --- NEW: Right-click to get coordinates ---
        State.map.on('contextmenu', function(e) {
            console.log(`Map Coordinates: [${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}]`);
        });
        // --- END NEW ---

        setTimeout(() => {
            State.map.invalidateSize();
        }, 100);
    },

    getColor(lmp) {
        if (lmp === undefined || lmp === null) return CONFIG.NO_DATA_COLOR;
        for (const scale of CONFIG.COLOR_SCALE) {
            if (lmp > scale.threshold) return scale.color;
        }
        return CONFIG.NO_DATA_COLOR;
    },

    stringToHslColor(str) {
        const GOLDEN_ANGLE = 137.5;
        let hash = 0;
        if (!str || str.length === 0) return `hsl(0, 0%, 80%)`;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        hash = Math.abs(hash);
        const hue = (hash * GOLDEN_ANGLE) % 360;
        const saturation = 70 + (hash % 21);
        const lightness = 45 + (hash % 11);
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    },

    getStyle(feature) {
        const zoneName = feature.properties.zone_name;
        const outlineColor = MapUtils.stringToHslColor(zoneName);
        return {
            fillColor: '#FFFFFF',
            fillOpacity: 0.0,
            weight: 3,
            opacity: 1,
            color: outlineColor,
            dashArray: ''
        };
    },

    highlightFeature(e) {
        const layer = e.target;
        layer.setStyle({ weight: 5, color: '#666', dashArray: '' });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
    },

    resetHighlight(e) {
        State.geojsonLayer.resetStyle(e.target);
    },

    // --- UPDATED FUNCTION ---
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

            // --- NEW: Check for manual overrides first ---
            const overrides = CONFIG.ZONE_LABEL_OVERRIDES[zoneName];
            if (overrides && overrides.length > 0) {
                overrides.forEach(coords => {
                    const center = L.latLng(coords[0], coords[1]);
                    const label = createLabel(center);
                    State.labelMarkers[zoneName].push(label);
                });
                return; // Skip automatic placement
            }
            // --- END NEW ---

            // Fallback to automatic placement if no override is found
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

    createLegend() {
        const legend = L.control({ position: 'topright' });
        legend.onAdd = function() {
            const div = L.DomUtil.create('div', 'info legend');
            div.innerHTML = '<h4>Zone Outlines</h4><span>Each zone has a unique color.</span>';
            return div;
        };
        legend.addTo(State.map);
    }
};


