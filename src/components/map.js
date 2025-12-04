// src/components/map.js

import maplibregl from "npm:maplibre-gl";
import * as d3 from "npm:d3";
import { filter } from "./filter.js";
import { API_BASE_URL, ZONE_LABEL_OVERRIDES, COLOR_SCALE, NET_COLOR_SCALE } from "./config.js";
import { buildLegend, displayCurrentFilter } from "./ui.js";
import { MapController } from "./controller.js";
import { zonePlotManager } from "./zonePlot.js";

export function initApp() {
    // 1. Initialize Map
    const map = new maplibregl.Map({
        container: "map",
        zoom: 5.3,
        center: [-82, 38.6],
        pitch: 10,
        hash: true,
        style: 'https://api.maptiler.com/maps/streets/style.json?key=eDHUbUTyNqfZvtDLiUCT',
        attributionControl: false
    });
    
    // Store map instance globally for plot manager access
    window.mapInstance = map;
    
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));
    map.addControl(new maplibregl.AttributionControl(), 'bottom-right');

    // 2. Initialize Controller
    const controller = new MapController(map, {
        timeDisplay: document.getElementById('time-display'),
        slider: document.getElementById('slider'),
        playBtn: document.getElementById('play-btn'),
    });
    
    // Store controller globally for plot manager access
    window.mapController = controller;

    // 3. Map Load Logic
    map.on('load', async () => {
        try {
            // Fetch & Draw Zones
            const shapes = await (await fetch(`${API_BASE_URL}/api/zones`)).json();
            shapes.features.forEach(f => f.properties.Zone_Name = f.properties.zone_name);

            const labelFeatures = shapes.features.flatMap(f => {
                const zName = f.properties.Zone_Name;
                const coords = ZONE_LABEL_OVERRIDES[zName] ? ZONE_LABEL_OVERRIDES[zName].map(c => [c[1], c[0]]) : [d3.geoCentroid(f)];
                return coords.map(c => ({ type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: { Zone_Name: zName } }));
            });

            map.addSource('zoneShapes', { type: 'geojson', data: shapes });
            map.addSource('zoneLabelPoints', { type: 'geojson', data: { type: 'FeatureCollection', features: labelFeatures } });
            map.addLayer({ id: 'zoneFill', type: 'fill', source: 'zoneShapes', paint: { "fill-color": '#cccccc', "fill-opacity": 0.7 } });
            map.addLayer({ id: 'zoneLines', type: 'line', source: 'zoneShapes', paint: { 'line-color': '#000', 'line-width': 1.5 } });
            map.addLayer({ id: 'zoneLabels', type: 'symbol', source: 'zoneLabelPoints', layout: { 'text-field': ['get', 'Zone_Name'], 'text-size': 12, 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { 'text-color': '#000000', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1 } });

            // Setup Sidebar List
            const zones = [{ name: "PJM", center: [-82, 38.6] }, ...shapes.features.map(f => ({ name: f.properties.Zone_Name, center: d3.geoCentroid(f) })).sort((a, b) => a.name.localeCompare(b.name))];
            document.getElementById('zone-list').innerHTML = zones.map(z => `<div class="zone-item" data-zone-name="${z.name}"><span class="zone-name">${z.name}</span><span class="zone-price"></span></div>`).join('');

            // Initialize Zone Plot Manager after zone list is created
            zonePlotManager.initialize(map, filter);
            window.zonePlotManager = zonePlotManager;

            // Map Interactions
            map.on('mousemove', 'zoneFill', (e) => controller.handleMapHover(e));
            map.on('mouseleave', 'zoneFill', () => controller.hoverPopup.remove());
            map.on('click', 'zoneFill', (e) => controller.handleMapClick(e));

            // Sidebar Interactions
            document.getElementById('zone-list').addEventListener('click', (e) => {
                const item = e.target.closest('.zone-item');
                if (!item) return;
                
                // Don't trigger zone selection if clicking checkbox
                if (e.target.classList.contains('zone-checkbox')) return;
                
                document.querySelectorAll('.zone-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');

                const zData = zones.find(z => z.name === item.dataset.zoneName);
                if (zData) {
                    map.flyTo({ center: zData.center, zoom: zData.name === 'PJM' ? 5.3 : 6, pitch: zData.name === 'PJM' ? 10 : 20 });
                    controller.selectedZoneName = zData.name === 'PJM' ? null : zData.name;
                    controller.updateZoneBorders();
                    controller.renderCurrentView();
                }
            });

            // Initial Data Load
            buildLegend(COLOR_SCALE);
            document.getElementById('legend').style.display = 'block';

            if (!filter.startDate) {
                const today = new Date().toISOString().split('T')[0];
                Object.assign(filter, { startDate: today, endDate: today, startTime: 0, endTime: 24, daysOfWeek: Array(7).fill(true) });
            }
            displayCurrentFilter(filter);
            controller.loadData(filter);

        } catch (e) { console.error("Map Load Error", e); }
    });

    // 4. Bind DOM Controls
    document.querySelector('.price-selector').addEventListener('change', (e) => {
        const priceType = e.target.value;
        buildLegend((priceType === 'net' || priceType === 'congestion') ? NET_COLOR_SCALE : COLOR_SCALE);
        controller.setPriceType(priceType);
    });
    
    document.getElementById('play-btn').onclick = () => controller.togglePlay();
    document.getElementById('avg-btn').onclick = () => { controller.stopAnimation(); controller.renderAverageView(); };
    document.getElementById('slider').oninput = (e) => { controller.stopAnimation(); controller.renderTimeStep(parseInt(e.target.value)); };
    document.getElementById('speed-slider').oninput = (e) => controller.setPlaybackSpeed(parseInt(e.target.value));
    document.getElementById('filter-btn').onclick = () => window.location.href = '/picker';
}