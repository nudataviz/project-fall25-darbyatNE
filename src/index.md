<!-- src/index.md -->

<link rel="stylesheet" href="./components/style.css">
<link href="https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css" rel="stylesheet" />

<div class="header-container">
  <h1 id="page-header-text">Interactive PJM LMP Map</h1>
</div>

<div class="top-controls-wrapper">
  <div class="price-selector">
    <span class="price-label">Price Type &rarr;</span>
    <input type="radio" id="price-da" name="price-type" value="da" checked>
    <label for="price-da">Day-Ahead</label>
    <input type="radio" id="price-rt" name="price-type" value="rt">
    <label for="price-rt">Real-Time</label>
    <input type="radio" id="price-net" name="price-type" value="net">
    <label for="price-net">NET</label>
    <input type="radio" id="price-cong" name="price-type" value="congestion">
    <label for="price-cong">Congestion</label>
  </div>

  <div class="filter-container">
    <span class="filter-label">Filters &rarr;</span>
    <div id="top-filter-display"></div>
  </div>
</div>

<div id="main-container">
  <div id="map-container">
    <div id="map"></div>
    <div id="legend"></div>
    <div id="controls-container">
      <button id="filter-btn">Δ Filter</button>
      <button id="avg-btn">Avg Price View</button>
      <div id="speed-box">
          <label>Speed</label>
          <input type="range" id="speed-slider" min="100" max="3000" step="100" value="1000" title="Playback Speed (ms)">
      </div>
      <button id="play-btn">Play</button>
      <input type="range" id="slider" min="0" max="1" value="0" style="flex-grow: 1; margin: 0 10px;">
      <div id="time-display">Ready</div>
    </div>
  </div>
  
  <div id="sidebar">
    <div id="zone-section">
      <h4>PJM Zones</h4>
      <div id="zone-list"></div>
    </div>
    <div id="constraint-section">
      <div class="constraint-header-wrapper">
          <h4>Active Constraints</h4>
          <div class="c-toggle-container">
              <label><input type="radio" name="c-mode" value="global" checked disabled> Period Avg</label>
              <label><input type="radio" name="c-mode" value="current" disabled> Current Hour</label>
          </div>
      </div>
      <div id="constraint-list">
        <div class="empty-state">No active constraints</div>
      </div>
    </div>
  </div>
</div>

```js
import maplibregl from "npm:maplibre-gl";
import * as d3 from "npm:d3";

// 1. Import Config & Helpers
import { filter } from "./components/filter.js";
import { API_BASE_URL, ZONE_LABEL_OVERRIDES, COLOR_SCALE, NET_COLOR_SCALE } from "./components/config.js";
import { buildLegend, displayCurrentFilter } from "./components/ui.js";

// 2. Import the Controller Class
import { MapController } from "./components/controller.js";

// --- Map Initialization ---
const map = new maplibregl.Map({ 
    container: "map", 
    zoom: 5.3, 
    center: [-82, 38.6], 
    pitch: 10, 
    hash: true, 
    style: 'https://api.maptiler.com/maps/streets/style.json?key=eDHUbUTyNqfZvtDLiUCT', 
    attributionControl: false 
});

map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));
map.addControl(new maplibregl.AttributionControl(), 'bottom-right');

// --- Controller Setup ---
const uiElements = {
    timeDisplay: document.getElementById('time-display'),
    slider: document.getElementById('slider'),
    playBtn: document.getElementById('play-btn'),
};

// Instantiate the Controller
const controller = new MapController(map, uiElements);

map.on('load', async () => {
    try {
        // Fetch & Draw Zone Shapes
        const res = await fetch(`${API_BASE_URL}/api/zones`);
        const shapes = await res.json();
        shapes.features.forEach(f => f.properties.Zone_Name = f.properties.zone_name);
        
        const labelFeatures = [];
        for (const feature of shapes.features) {
            const zoneName = feature.properties.Zone_Name;
            const coords = ZONE_LABEL_OVERRIDES[zoneName] ? ZONE_LABEL_OVERRIDES[zoneName].map(c => [c[1], c[0]]) : [d3.geoCentroid(feature)];
            coords.forEach(c => labelFeatures.push({ type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: { Zone_Name: zoneName } }));
        }

        map.addSource('zoneShapes', { type: 'geojson', data: shapes });
        map.addSource('zoneLabelPoints', { type: 'geojson', data: { type: 'FeatureCollection', features: labelFeatures } });
        
        map.addLayer({ id: 'zoneFill', type: 'fill', source: 'zoneShapes', paint: { "fill-color": '#cccccc', "fill-opacity": 0.7 } });
        map.addLayer({ id: 'zoneLines', type: 'line', source: 'zoneShapes', paint: { 'line-color': '#000', 'line-width': 1.5 } });
        map.addLayer({ id: 'zoneLabels', type: 'symbol', source: 'zoneLabelPoints', layout: { 'text-field': ['get', 'Zone_Name'], 'text-size': 12, 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { 'text-color': '#000000', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1 } });

        // Generate Sidebar List (Static Setup)
        const zones = shapes.features.map(f => ({ name: f.properties.Zone_Name, center: d3.geoCentroid(f) })).sort((a, b) => a.name.localeCompare(b.name));
        zones.unshift({ name: "PJM", center: [-82, 38.6] });
        
        const zoneListElement = document.getElementById('zone-list');
        zoneListElement.innerHTML = zones.map(z => `<div class="zone-item" data-zone-name="${z.name}"><span class="zone-name">${z.name}</span><span class="zone-price"></span></div>`).join('');

        // Delegate Map Interactions to Controller
        map.on('mousemove', 'zoneFill', (e) => controller.handleMapHover(e));
        map.on('mouseleave', 'zoneFill', () => controller.hoverPopup.remove());
        map.on('click', 'zoneFill', (e) => controller.handleMapClick(e));

        // Sidebar Click Interaction
        zoneListElement.addEventListener('click', (e) => {
            const item = e.target.closest('.zone-item');
            if (!item) return;
            
            document.querySelectorAll('.zone-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');

            const zName = item.dataset.zoneName;
            const zData = zones.find(z => z.name === zName);
            if (zName === 'PJM') { 
                map.flyTo({ center: [-82, 38.6], zoom: 5.3, pitch: 10 }); 
                controller.selectedZoneName = null; 
            } else if (zData) { 
                map.flyTo({ center: zData.center, zoom: 6, pitch: 20 }); 
                controller.selectedZoneName = zName;
            }
            
            controller.updateZoneBorders();
            controller.renderCurrentView();
        });

        // Initial Data Load
        buildLegend(COLOR_SCALE);
        document.getElementById('legend').style.display= 'block'; 

        // // If filter is empty (fresh load), set defaults to Today
        // if (!filter.startDate) {
        //     const today = new Date().toISOString().split('T')[0];
        //     filter.startDate = today;
        //     filter.endDate = today;
        //     filter.startTime = 0;
        //     filter.endTime = 24;
        //     filter.daysOfWeek = [true, true, true, true, true, true, true];
        // }

        // Execute Load
        displayCurrentFilter(filter);
        controller.loadData(filter);

    } catch (e) { 
        console.error("Map Load Error", e); 
    }
});

// --- DOM Events---

// Price Type Selector
document.querySelector('.price-selector').addEventListener('change', (e) => { 
    const type = e.target.value;
    const scale = (type === 'net' || type === 'congestion') ? NET_COLOR_SCALE : COLOR_SCALE;
    
    buildLegend(scale); 
    controller.setPriceType(type);
});

// Playback Controls
document.getElementById('play-btn').onclick = () => controller.togglePlay();
document.getElementById('avg-btn').onclick = () => { 
    controller.stopAnimation(); 
    controller.renderAverageView(); 
};

document.getElementById('slider').oninput = (e) => { 
    controller.stopAnimation(); 
    controller.renderTimeStep(parseInt(e.target.value)); 
};

document.getElementById('speed-slider').oninput = (e) => {
    controller.setPlaybackSpeed(parseInt(e.target.value));
};

document.getElementById('filter-btn').onclick = () => window.location.href = '/picker';
