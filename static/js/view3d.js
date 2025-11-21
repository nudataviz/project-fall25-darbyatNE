// 3D Mapbox view module

const View3D = {
    map: null,
    isInitialized: false,
    labelMarkers: [],
    legendControl: null,
    
    /**
     * Initialize the Mapbox 3D view
     */
    initialize() {
        if (this.isInitialized) {
            return;
        }

        mapboxgl.accessToken = "pk.eyJ1IjoiYmRhcmIiLCJhIjoiY21od3NqdWtmMDMwNjJxcTF2cm5pcDgxZiJ9._zUfYxCl4qqjDdjzUqGMFQ";
        
        this.map = new mapboxgl.Map({
            container: 'map-3d',
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [-80, 40],
            zoom: 4.5,
            pitch: 10,
            bearing: 0,
            antialias: true
        });
        
        // Disable rotation for better UX
        this.map.dragRotate.disable();
        this.map.touchZoomRotate.disableRotation();

        this.map.on('load', () => {
            console.log("3D Map loaded");
            this.addLayers();
            this.createLegend();
            this.isInitialized = true;
        });
    },

    /**
     * Add zone layers to the 3D map
     */
    addLayers() {
        if (!State.geojsonLayer || !State.geojsonLayer.toGeoJSON) {
            console.warn("No GeoJSON data available for 3D view");
            return;
        }

        const geojsonData = State.geojsonLayer.toGeoJSON();
        
        // Initialize lmp_value property for all features
        for (const feature of geojsonData.features) {
            feature.properties.lmp_value = null;
        }

        // Add source
        this.map.addSource('zones', {
            'type': 'geojson',
            'data': geojsonData
        });

        // Add 3D extrusion layer
        this.map.addLayer({
            'id': 'zone-extrusion',
            'type': 'fill-extrusion',
            'source': 'zones',
            'paint': {
                'fill-extrusion-color': [
                    'interpolate',
                    ['linear'],
                    ['coalesce', ['get', 'lmp_value'], 0],
                    -10, '#5e4fa2',  // Negative = Purple
                    0, '#cccccc',    // Price 0 = Light Grey
                    20, '#66c2a5',
                    30, '#e6f598',
                    50, '#fee08b',
                    75, '#f46d43',
                    100, '#9e0142'
                ],
                // Height calculation with negative price support
                'fill-extrusion-height': [
                    'case',
                    ['<', ['coalesce', ['get', 'lmp_value'], 0], 0],
                    10000, // Fixed at zero plane for negative prices
                    ['+', 10000, ['*', 2000, ['coalesce', ['get', 'lmp_value'], 0]]]
                ],
                'fill-extrusion-base': [
                    'case',
                    ['<', ['coalesce', ['get', 'lmp_value'], 0], 0],
                    ['max', 0, ['+', 10000, ['*', 2000, ['coalesce', ['get', 'lmp_value'], 0]]]],
                    10000
                ],
                'fill-extrusion-opacity': 0.85
            }
        });

        // Add click handler for popups
        this.map.on('click', 'zone-extrusion', (e) => {
            const props = e.features[0].properties;
            const lmp = props.lmp_value;
            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`<strong>${props.zone_name}</strong><br>LMP: ${lmp !== null ? `$${lmp.toFixed(2)}` : 'No data'}`)
                .addTo(this.map);
        });

        // Change cursor on hover
        this.map.on('mouseenter', 'zone-extrusion', () => {
            this.map.getCanvas().style.cursor = 'pointer';
        });
        
        this.map.on('mouseleave', 'zone-extrusion', () => {
            this.map.getCanvas().style.cursor = '';
        });
    },

    /**
     * Update the 3D view for a given time index
     */
    updateForTimeIndex(index) {
        if (!this.isInitialized || !this.map.getSource('zones')) {
            return;
        }

        const currentDataPoint = State.timeSeriesData[index];
        if (!currentDataPoint) return;

        const readings = currentDataPoint.readings;
        
        // Get current GeoJSON data
        const geojsonData = this.map.getSource('zones')._data;
        
        // Update lmp_value for each feature
        for (const feature of geojsonData.features) {
            const zoneName = feature.properties.zone_name;
            const price = readings[zoneName];
            feature.properties.lmp_value = (price !== undefined) ? price : null;
        }
        
        // Update the source data
        this.map.getSource('zones').setData(geojsonData);
        
        // Update labels if animation started
        if (State.isAnimationStarted) {
            this.updateLabels(index);
        }
        
        // Update legend
        this.updateLegend();
    },

    /**
     * Create and add labels to the 3D map
     */
    createLabels() {
        // Remove existing markers
        if (this.labelMarkers) {
            this.labelMarkers.forEach(marker => marker.remove());
        }
        this.labelMarkers = [];

        if (!State.geojsonLayer) return;

        const geojsonData = State.geojsonLayer.toGeoJSON();
        
        geojsonData.features.forEach(feature => {
            const zoneName = feature.properties.zone_name;
            if (!zoneName) return;

            // Check for custom positions
            const overrides = CONFIG.ZONE_LABEL_OVERRIDES[zoneName];
            
            if (overrides && overrides.length > 0) {
                // Use custom positions
                overrides.forEach(coords => {
                    const marker = this.createLabelMarker([coords[1], coords[0]], zoneName);
                    this.labelMarkers.push(marker);
                });
            } else {
                // Use centroid
                const coordinates = feature.geometry.coordinates;
                let center;
                
                if (feature.geometry.type === 'Polygon') {
                    center = this.getCentroid(coordinates[0]);
                } else if (feature.geometry.type === 'MultiPolygon') {
                    // Get centroid of largest polygon
                    let largest = coordinates[0][0];
                    let maxArea = 0;
                    coordinates.forEach(poly => {
                        const area = this.getPolygonArea(poly[0]);
                        if (area > maxArea) {
                            maxArea = area;
                            largest = poly[0];
                        }
                    });
                    center = this.getCentroid(largest);
                }
                
                if (center) {
                    const marker = this.createLabelMarker(center, zoneName);
                    this.labelMarkers.push(marker);
                }
            }
        });
    },

    /**
     * Create a label marker
     */
    createLabelMarker(lngLat, text) {
        const el = document.createElement('div');
        el.className = 'mapbox-zone-label';
        el.textContent = text;
        
        const marker = new mapboxgl.Marker({
            element: el,
            anchor: 'center'
        })
        .setLngLat(lngLat)
        .addTo(this.map);
        
        return marker;
    },

    /**
     * Update labels with price data
     */
    updateLabels(index) {
        if (!State.isAnimationStarted || !State.timeSeriesData[index]) return;
        
        const lmpData = State.timeSeriesData[index].readings;
        
        if (!this.labelMarkers || this.labelMarkers.length === 0) {
            this.createLabels();
        }
        
        const geojsonData = State.geojsonLayer.toGeoJSON();
        
        geojsonData.features.forEach(feature => {
            const zoneName = feature.properties.zone_name;
            const lmp = lmpData[zoneName];
            
            if (lmp !== undefined) {
                const priceText = `$${lmp.toFixed(2)}`;
                const color = this.getColorForLmp(lmp);
                
                // Find markers for this zone
                this.labelMarkers.forEach(marker => {
                    const el = marker.getElement();
                    if (el.textContent === zoneName || el.textContent.startsWith('$')) {
                        el.textContent = priceText;
                        el.style.backgroundColor = color;
                        el.style.color = 'white';
                        el.style.padding = '2px 6px';
                        el.style.borderRadius = '4px';
                        el.style.fontSize = '11px';
                        el.style.fontWeight = 'bold';
                        el.style.border = '1px solid rgba(255,255,255,0.3)';
                    }
                });
            }
        });
    },

    /**
     * Get color for LMP value
     */
    getColorForLmp(lmp) {
        if (lmp === undefined || lmp === null) return CONFIG.NO_DATA_COLOR;
        for (const scale of CONFIG.COLOR_SCALE) {
            if (lmp > scale.threshold) return scale.color;
        }
        return CONFIG.COLOR_SCALE[CONFIG.COLOR_SCALE.length - 1].color;
    },

    /**
     * Calculate centroid of a polygon
     */
    getCentroid(coords) {
        let sumX = 0, sumY = 0;
        coords.forEach(coord => {
            sumX += coord[0];
            sumY += coord[1];
        });
        return [sumX / coords.length, sumY / coords.length];
    },

    /**
     * Calculate approximate area of a polygon
     */
    getPolygonArea(coords) {
        let area = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            area += (coords[i][0] * coords[i+1][1]) - (coords[i+1][0] * coords[i][1]);
        }
        return Math.abs(area / 2);
    },

    /**
     * Create legend for 3D view
     */
    createLegend() {
        // Remove existing legend
        if (this.legendControl) {
            this.legendControl.remove();
        }

        class LegendControl {
            onAdd(map) {
                this._map = map;
                this._container = document.createElement('div');
                this._container.className = 'mapboxgl-ctrl info legend';
                this.update();
                return this._container;
            }

            onRemove() {
                this._container.parentNode.removeChild(this._container);
                this._map = undefined;
            }

            update() {
                let html = '<h4>LMP ($/MWh)</h4>';
                
                // Show price scale
                CONFIG.COLOR_SCALE.forEach(scale => {
                    html += `<div class="legend-item">
                        <i style="background:${scale.color}"></i>
                        <span>${scale.label}</span>
                    </div>`;
                });
                
                html += `<div class="legend-item">
                    <i style="background:${CONFIG.NO_DATA_COLOR}"></i>
                    <span>No Data</span>
                </div>`;
                
                this._container.innerHTML = html;
            }
        }

        this.legendControl = new LegendControl();
        this.map.addControl(this.legendControl, 'top-right');
    },

    /**
     * Update legend (called when animation state changes)
     */
    updateLegend() {
        if (this.legendControl && this.legendControl.update) {
            this.legendControl.update();
        }
    },

    /**
     * Resize the map (call when container size changes)
     */
    resize() {
        if (this.map) {
            this.map.resize();
        }
    },

    /**
     * Show the 3D view
     */
    show() {
        document.getElementById('map-3d').style.display = 'block';
        document.getElementById('map').style.display = 'none';
        
        // Initialize if first time
        if (!this.isInitialized) {
            this.initialize();
        } else {
            // Resize to ensure proper rendering
            this.resize();
            // Update to current time index
            this.updateForTimeIndex(State.currentTimeIndex);
            
            // Create/update labels if animation started
            if (State.isAnimationStarted) {
                this.updateLabels(State.currentTimeIndex);
            } else {
                this.createLabels();
            }
        }
    },

    /**
     * Hide the 3D view
     */
    hide() {
        document.getElementById('map-3d').style.display = 'none';
        document.getElementById('map').style.display = 'block';
    }
};
