// MapLibre component for PJM LMP visualization
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export function initMap(containerId, options = {}) {
    const map = new maplibregl.Map({
        container: containerId,
        style: options.style || {
            version: 8,
            sources: {
                'osm': {
                    type: 'raster',
                    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: '© OpenStreetMap contributors'
                }
            },
            layers: [{
                id: 'osm',
                type: 'raster',
                source: 'osm'
            }]
        },
        center: options.center || [-80, 40],
        zoom: options.zoom || 6,
        pitch: options.pitch || 0,
        bearing: options.bearing || 0
    });
    
    // Store state
    map.state = {
        timeSeriesData: [],
        currentTimeIndex: 0,
        selectedZones: new Set(),
        isAnimationStarted: false,
        animationTimer: null,
        zonesLoaded: false,
        enable3D: options.enable3D || false
    };
    
    // Disable rotation unless explicitly enabled
    if (!options.allowRotation) {
        map.dragRotate.disable();
        map.touchZoomRotate.disableRotation();
    }
    
    return map;
}

export function loadZones(map, geojsonData) {
    const state = map.state;
    
    map.on('load', () => {
        // Add zones source
        map.addSource('zones', {
            type: 'geojson',
            data: geojsonData
        });
        
        // Add fill layer (2D or 3D based on state.enable3D)
        if (state.enable3D) {
            // 3D extrusion layer
            map.addLayer({
                id: 'zones-extrusion',
                type: 'fill-extrusion',
                source: 'zones',
                paint: {
                    'fill-extrusion-color': [
                        'case',
                        ['has', 'lmp_value'],
                        ['get', 'color'],  // Will be set dynamically
                        '#808080'
                    ],
                    'fill-extrusion-height': [
                        'case',
                        ['has', 'lmp_value'],
                        ['*', 1000, ['+', 50, ['get', 'lmp_value']]],  // Scale for visibility
                        1000
                    ],
                    'fill-extrusion-base': 0,
                    'fill-extrusion-opacity': 0.85
                }
            });
            
            // Top border for 3D
            map.addLayer({
                id: 'zones-top-border',
                type: 'fill-extrusion',
                source: 'zones',
                paint: {
                    'fill-extrusion-color': '#ffffff',
                    'fill-extrusion-height': [
                        'case',
                        ['has', 'lmp_value'],
                        ['*', 1000, ['+', 50.05, ['get', 'lmp_value']]],
                        1005
                    ],
                    'fill-extrusion-base': [
                        'case',
                        ['has', 'lmp_value'],
                        ['*', 1000, ['+', 50, ['get', 'lmp_value']]],
                        1000
                    ],
                    'fill-extrusion-opacity': 0.9
                }
            });
        } else {
            // 2D fill layer
            map.addLayer({
                id: 'zones-fill',
                type: 'fill',
                source: 'zones',
                paint: {
                    'fill-color': [
                        'case',
                        ['has', 'color'],
                        ['get', 'color'],
                        '#808080'
                    ],
                    'fill-opacity': 0.7
                }
            });
        }
        
        // Add outline layer (works for both 2D and 3D)
        map.addLayer({
            id: 'zones-outline',
            type: 'line',
            source: 'zones',
            paint: {
                'line-color': [
                    'case',
                    ['boolean', ['get', 'selected'], false],
                    '#FFD700',  // Gold for selected
                    '#ffffff'   // White for normal
                ],
                'line-width': [
                    'case',
                    ['boolean', ['get', 'selected'], false],
                    4,
                    2
                ],
                'line-opacity': 0.8
            }
        });
        
        // Add labels layer
        map.addLayer({
            id: 'zones-labels',
            type: 'symbol',
            source: 'zones',
            layout: {
                'text-field': [
                    'case',
                    ['has', 'label'],
                    ['get', 'label'],
                    ['get', 'zone_name']
                ],
                'text-size': 11,
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold']
            },
            paint: {
                'text-color': '#ffffff',
                'text-halo-color': [
                    'case',
                    ['has', 'color'],
                    ['get', 'color'],
                    '#808080'
                ],
                'text-halo-width': 2,
                'text-halo-blur': 1
            }
        });
        
        // Click handler for zone selection
        map.on('click', 'zones-fill', (e) => handleZoneClick(map, e));
        if (state.enable3D) {
            map.on('click', 'zones-extrusion', (e) => handleZoneClick(map, e));
        }
        
        // Popup on hover
        map.on('mouseenter', 'zones-fill', () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        
        map.on('mouseleave', 'zones-fill', () => {
            map.getCanvas().style.cursor = '';
        });
        
        if (state.enable3D) {
            map.on('mouseenter', 'zones-extrusion', () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            
            map.on('mouseleave', 'zones-extrusion', () => {
                map.getCanvas().style.cursor = '';
            });
        }
        
        // Fit bounds to zones
        const bounds = new maplibregl.LngLatBounds();
        geojsonData.features.forEach(feature => {
            if (feature.geometry.type === 'Polygon') {
                feature.geometry.coordinates[0].forEach(coord => {
                    bounds.extend(coord);
                });
            } else if (feature.geometry.type === 'MultiPolygon') {
                feature.geometry.coordinates.forEach(polygon => {
                    polygon[0].forEach(coord => {
                        bounds.extend(coord);
                    });
                });
            }
        });
        
        map.fitBounds(bounds, { padding: 20 });
        
        state.zonesLoaded = true;
        
        // Dispatch ready event
        window.dispatchEvent(new CustomEvent('mapReady', { detail: { map } }));
    });
}

function handleZoneClick(map, e) {
    if (e.originalEvent.ctrlKey || e.originalEvent.metaKey) {
        const zoneName = e.features[0].properties.zone_name;
        ZoneSelection.toggleZone(map, zoneName);
    } else {
        // Show popup
        const props = e.features[0].properties;
        const lmp = props.lmp_value;
        new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
                <strong>${props.zone_name}</strong><br>
                ${lmp !== undefined && lmp !== null ? `LMP: $${lmp.toFixed(2)}/MWh` : 'No data'}
            `)
            .addTo(map);
    }
}

export function loadLmpData(map, lmpDataByZone) {
    const state = map.state;
    const dataByTimestamp = {};
    
    for (const zoneName in lmpDataByZone) {
        for (const reading of lmpDataByZone[zoneName]) {
            const timestamp = reading.datetime_beginning_ept;
            
            if (!dataByTimestamp[timestamp]) {
                dataByTimestamp[timestamp] = {
                    datetime: timestamp,
                    readings: {}
                };
            }
            
            dataByTimestamp[timestamp].readings[zoneName] = reading.lmp_value;
        }
    }
    
    state.timeSeriesData = Object.values(dataByTimestamp).sort((a, b) => {
        return new Date(a.datetime) - new Date(b.datetime);
    });
    
    // Initialize slider
    const slider = document.getElementById('hour-slider');
    if (slider) {
        slider.max = state.timeSeriesData.length - 1;
        Animation.updateMapForTimeIndex(map, 0);
    }
}

export const Animation = {
    updateMapForTimeIndex(map, index) {
        const state = map.state;
        state.currentTimeIndex = parseInt(index);
        
        const slider = document.getElementById('hour-slider');
        if (slider) slider.value = state.currentTimeIndex;
        
        const currentDataPoint = state.timeSeriesData[state.currentTimeIndex];
        if (!currentDataPoint) return;
        
        // Update time display
        const currentDate = new Date(currentDataPoint.datetime);
        const currentHour = currentDate.getHours();
        const nextHour = (currentHour + 1) % 24;
        const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        const dateString = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const hourString = `Hour: ${String(currentHour).padStart(2, '0')}:00 - ${String(nextHour).padStart(2, '0')}:00`;
        
        const display = document.getElementById('current-time-display');
        if (display) {
            display.innerText = `${dayOfWeek}, ${dateString} | ${hourString}`;
        }
        
        // Update zone data
        if (state.zonesLoaded && map.getSource('zones')) {
            const geojson = map.getSource('zones')._data;
            
            geojson.features.forEach(feature => {
                const zoneName = feature.properties.zone_name;
                const lmp = currentDataPoint.readings[zoneName];
                
                // Update properties
                feature.properties.lmp_value = lmp;
                feature.properties.color = this.getColorForLmp(lmp);
                
                // Update label to show price
                if (state.isAnimationStarted && lmp !== undefined) {
                    feature.properties.label = `$${lmp.toFixed(2)}`;
                } else {
                    feature.properties.label = zoneName;
                }
            });
            
            // Update the source
            map.getSource('zones').setData(geojson);
        }
    },
    
    getColorForLmp(lmp) {
        if (lmp === undefined || lmp === null) return '#808080';
        
        const scale = [
            { threshold: 100, color: '#b30000' },
            { threshold: 75, color: '#dc3545' },
            { threshold: 62, color: '#ff5500' },
            { threshold: 52, color: '#ff7b00' },
            { threshold: 44, color: '#ff9900' },
            { threshold: 37, color: '#ffc107' },
            { threshold: 30, color: '#99cc33' },
            { threshold: 25, color: '#00cc66' },
            { threshold: 20, color: '#00aaff' },
            { threshold: 0, color: '#007bff' },
            { threshold: -Infinity, color: '#800080' }
        ];
        
        for (const s of scale) {
            if (lmp > s.threshold) return s.color;
        }
        return scale[scale.length - 1].color;
    },
    
    play(map) {
        const state = map.state;
        const button = document.getElementById('play-pause-button');
        
        if (!state.isAnimationStarted) {
            state.isAnimationStarted = true;
        }
        
        if (button) button.textContent = '⏸ Pause';
        
        state.animationTimer = setInterval(() => {
            let nextIndex = state.currentTimeIndex + 1;
            
            if (nextIndex >= state.timeSeriesData.length) {
                this.pause(map);
                return;
            }
            
            this.updateMapForTimeIndex(map, nextIndex);
        }, 1000);
    },
    
    pause(map) {
        const state = map.state;
        clearInterval(state.animationTimer);
        state.animationTimer = null;
        
        const button = document.getElementById('play-pause-button');
        if (button) button.textContent = '▶ Play';
    }
};

export const ZoneSelection = {
    toggleZone(map, zoneName) {
        const state = map.state;
        
        if (state.selectedZones.has(zoneName)) {
            state.selectedZones.delete(zoneName);
        } else {
            state.selectedZones.add(zoneName);
        }
        
        // Update zone selection property
        if (map.getSource('zones')) {
            const geojson = map.getSource('zones')._data;
            
            geojson.features.forEach(feature => {
                if (feature.properties.zone_name === zoneName) {
                    feature.properties.selected = state.selectedZones.has(zoneName);
                }
            });
            
            map.getSource('zones').setData(geojson);
        }
        
        // Update selected zones list
        this.updateSelectedZonesList(map);
        
        // Trigger data update
        window.dispatchEvent(new CustomEvent('zonesChanged', {
            detail: { zones: Array.from(state.selectedZones) }
        }));
    },
    
    getSelected(map) {
        return Array.from(map?.state?.selectedZones || new Set()).sort();
    },
    
    updateSelectedZonesList(map) {
        const state = map.state;
        const container = document.getElementById('selected-zones-list');
        if (!container) return;
        
        if (state.selectedZones.size === 0) {
            container.innerHTML = '<div style="color: #999; font-style: italic;">Ctrl+Click zones to select</div>';
            return;
        }
        
        const sortedZones = Array.from(state.selectedZones).sort();
        const html = sortedZones.map(zone => `
            <span style="display: inline-block; background: #e7f3ff; padding: 4px 8px; margin: 2px; border-radius: 4px; border-left: 3px solid #FFD700;">
                ${zone}
            </span>
        `).join('');
        
        container.innerHTML = `
            <div style="margin-bottom: 5px;"><strong>Selected Zones (${state.selectedZones.size}):</strong></div>
            <div>${html}</div>
        `;
    }
};

export function toggle3D(map, enable) {
    const state = map.state;
    
    if (enable === state.enable3D) return;
    
    state.enable3D = enable;
    
    // Remove old layers
    if (map.getLayer('zones-fill')) map.removeLayer('zones-fill');
    if (map.getLayer('zones-extrusion')) map.removeLayer('zones-extrusion');
    if (map.getLayer('zones-top-border')) map.removeLayer('zones-top-border');
    
    if (enable) {
        // Add 3D layers
        map.addLayer({
            id: 'zones-extrusion',
            type: 'fill-extrusion',
            source: 'zones',
            paint: {
                'fill-extrusion-color': [
                    'case',
                    ['has', 'color'],
                    ['get', 'color'],
                    '#808080'
                ],
                'fill-extrusion-height': [
                    'case',
                    ['has', 'lmp_value'],
                    ['*', 1000, ['+', 50, ['get', 'lmp_value']]],
                    1000
                ],
                'fill-extrusion-base': 0,
                'fill-extrusion-opacity': 0.85
            }
        }, 'zones-outline');
        
        map.addLayer({
            id: 'zones-top-border',
            type: 'fill-extrusion',
            source: 'zones',
            paint: {
                'fill-extrusion-color': '#ffffff',
                'fill-extrusion-height': [
                    'case',
                    ['has', 'lmp_value'],
                    ['*', 1000, ['+', 50.05, ['get', 'lmp_value']]],
                    1005
                ],
                'fill-extrusion-base': [
                    'case',
                    ['has', 'lmp_value'],
                    ['*', 1000, ['+', 50, ['get', 'lmp_value']]],
                    1000
                ],
                'fill-extrusion-opacity': 0.9
            }
        }, 'zones-outline');
        
        // Add pitch
        map.easeTo({ pitch: 45, duration: 1000 });
        
    } else {
        // Add 2D layer
        map.addLayer({
            id: 'zones-fill',
            type: 'fill',
            source: 'zones',
            paint: {
                'fill-color': [
                    'case',
                    ['has', 'color'],
                    ['get', 'color'],
                    '#808080'
                ],
                'fill-opacity': 0.7
            }
        }, 'zones-outline');
        
        // Remove pitch
        map.easeTo({ pitch: 0, duration: 1000 });
    }
}
