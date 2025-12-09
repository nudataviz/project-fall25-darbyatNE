// src/components/map.js

import maplibregl from "npm:maplibre-gl";
import * as d3 from "npm:d3";
import { filter, saveFilter } from "./filter.js"; 
import { API_BASE_URL, ZONE_LABEL_OVERRIDES, COLOR_SCALE, NET_COLOR_SCALE } from "./config.js";
import { buildLegend, displayCurrentFilter } from "./ui.js";
import { MapController } from "./controller.js";
import { zonePlotManager } from "./zonePlot.js";
import { dateTimeRangePicker } from "./picker.js"; 

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
    
    window.mapInstance = map;
    
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));
    map.addControl(new maplibregl.AttributionControl(), 'bottom-right');

    // 2. Initialize Controller
    const controller = new MapController(map, {
        timeDisplay: document.getElementById('time-display'),
        slider: document.getElementById('slider'),
        playBtn: document.getElementById('play-btn'),
    });
    
    window.mapController = controller;

    // 3. Map Load Logic
    map.on('load', async () => {
        try {
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

            const zones = [{ name: "PJM", center: [-82, 38.6] }, ...shapes.features.map(f => ({ name: f.properties.Zone_Name, center: d3.geoCentroid(f) })).sort((a, b) => a.name.localeCompare(b.name))];
            document.getElementById('zone-list').innerHTML = zones.map(z => `<div class="zone-item" data-zone-name="${z.name}"><span class="zone-name">${z.name}</span><span class="zone-price"></span></div>`).join('');

            zonePlotManager.initialize(map, filter);
            window.zonePlotManager = zonePlotManager;

            map.on('mousemove', 'zoneFill', (e) => controller.handleMapHover(e));
            map.on('mouseleave', 'zoneFill', () => controller.hoverPopup.remove());
            map.on('click', 'zoneFill', (e) => controller.handleMapClick(e));

            document.getElementById('zone-list').addEventListener('click', (e) => {
                const item = e.target.closest('.zone-item');
                if (!item) return;
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

    // ✅ FIXED: Filter Button opens Modal with Picker
    const filterBtn = document.getElementById('filter-btn');
    const modal = document.getElementById('filter-modal');
    const mountPoint = document.getElementById('picker-mount-point');

    if (filterBtn && modal && mountPoint) {
        // Make this ASYNC to fetch data
        filterBtn.onclick = async () => {
            mountPoint.innerHTML = ''; 
            
            // 1. Get Active Constraints (from current controller data)
            const activeConstraints = controller.constraintsData 
                ? [...new Set(controller.constraintsData.map(c => c.monitored_facility || c.name))] 
                : [];

            // 2. Get All Constraints from API
            let allConstraints = [];
            try {
                const response = await fetch(`${API_BASE_URL}/api/constraints/list`);
                if (response.ok) {
                    const data = await response.json();
                    allConstraints = data.constraints || [];
                } else {
                    console.warn("Failed to fetch all constraints list, falling back to active constraints");
                    allConstraints = activeConstraints;
                }
            } catch (error) {
                console.error("Error fetching all constraints:", error);
                allConstraints = activeConstraints;
            }

            const picker = dateTimeRangePicker({
                width: 520, // Fits inside 600px modal
                initialStartTime: filter.startTime,
                initialEndTime: filter.endTime,
                initialStartDate: filter.startDate,
                initialEndDate: filter.endDate,
                initialDaysOfWeek: filter.daysOfWeek,
                initialConstraint: filter.selectedConstraint,
                activeConstraints: activeConstraints,
                allConstraints: allConstraints
            });

            picker.addEventListener('apply', (e) => {
                const newFilter = e.detail;
                Object.assign(filter, newFilter);
                saveFilter(filter);
                displayCurrentFilter(filter);
                controller.loadData(filter);
                modal.close();
            });

            mountPoint.appendChild(picker);
            modal.showModal();
        };
    }
}
