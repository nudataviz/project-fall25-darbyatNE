---
html: |
  <link rel="stylesheet" href="npm:maplibre-gl/dist/maplibre-gl.css">
  <style> body { margin: 0; padding: 0; } </style>
---

<div class="header-container">
  <h1>Interactive PJM LMP Map</h1>
</div>

<div class="top-controls-wrapper">
  <div class="price-selector-container">
    <div class="price-selector">
    <span class="price-label">Price Type &rarr;</span>
      <input type="radio" id="price-da" name="price-type" value="da" checked>
      <label for="price-da">Day-Ahead</label>
      <input type="radio" id="price-rt" name="price-type" value="rt">
      <label for="price-rt">Real-Time</label>
      <input type="radio" id="price-net" name="price-type" value="net">
      <label for="price-net">NET</label>
    </div>
  </div>
  <div id="top-filter-display">
    <!-- Dyn -->
  </div>
</div>


<div id="main-container">
  <div id="map-container">
    <div id="map"></div>
    <div id="legend"></div>
    <div id="controls-container">
      <button id="filter-btn">Filter</button>
      <button id="play-btn">Play</button>
      <input type="range" id="slider" min="0" max="1" value="0" style="flex-grow: 1; margin: 0 10px;">
      <div id="time-display">Ready</div>
    </div>
  </div>
  
  <!-- Sidebar Wrapper -->
  <div id="sidebar">
    <!-- Column 1: Zones -->
    <div id="zone-section">
      <h4>PJM Zones</h4>
      <div id="zone-list"></div>
    </div>
    <!-- Column 2: Constraints -->
    <div id="constraint-section">
      <div class="constraint-header-wrapper" style="background-color: #e9ecef; border-bottom: 1px solid #ccc; padding: 5px;">
          <h4 style="margin: 0; border: none; background: none; padding-bottom: 2px;">Active Constraints</h4>
          <div class="c-toggle-container" style="display: flex; justify-content: center; gap: 10px; font-size: 10px;">
              <label style="cursor: pointer;">
                  <input type="radio" name="c-mode" value="global" checked> Period Avg
              </label>
              <label style="cursor: pointer;">
                  <input type="radio" name="c-mode" value="current"> Current Hour
              </label>
          </div>
      </div>
      <div id="constraint-list">
        <div class="empty-state">No active constraints</div>
      </div>
    </div>


  </div>
</div>

<style>
  /* Title Styles */
  #page-header {
    width: 100%;
    max-width: 98%;   
    margin: 0 auto;     
    text-align: center;     
    padding-top: 5px;
    padding-bottom: 1px;
    font-family: sans-serif;
    box-sizing: border-box; 
  }

  #page-header h1 {
    margin: 0;
    color: #333;
    font-size: 2rem;
  }

  /* Styles for the top controls area */
  .top-controls-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    padding: 8px 0;
    max-width: 98%;
    margin: 0 auto;
    font-family: sans-serif;
  }
  #top-filter-display {
    background-color: #e7f3ff;
    border: 1px solid #99caff;
    border-radius: 5px;
    padding: 8px 15px;
    font-size: 16px;
    min-width: 700px;
  }
  #top-filter-display ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    gap: 15px;
  }
  #top-filter-display li {
    white-space: nowrap;
  }

  /* Price Selector styles */
  .price-label {
    padding: 8px 16px;
    background-color: #e0e0e0; 
    color: #333;
    font-weight: bold;
    font-size: 14px;
    border-right: 1px solid #aaa; /* Adds the separator line */
    display: flex;
    align-items: center;
    cursor: default; 
  }
  .price-selector-container { display: flex; justify-content: center; }
  .price-selector { display: flex; border-radius: 5px; overflow: hidden; border: 1px solid #aaa; }
  .price-selector input[type="radio"] { display: none; }
  .price-selector label { padding: 8px 16px; cursor: pointer; background: #f0f0f0; user-select: none; transition: background 0.2s; font-size: 14px; }
  .price-selector input[type="radio"]:checked + label { background: #007bff; color: white; font-weight: bold; }
  .price-selector label:not(:last-of-type) { border-right: 1px solid #aaa; }

  /* Main container styles */
  #main-container { 
    display: flex; 
    width: 100%; 
    max-width: 98%;
    border: 1px solid #ccc; 
    border-radius: 5px; 
    font-family: sans-serif; 
    margin: 0 auto; 
    box-sizing: border-box; 
    height: 660px; 
  }

  #map-container { flex: 1; height: 100%; display: flex; flex-direction: column; position: relative; min-width: 0; }
  #map { height: calc(100% - 40px); width: 100%; }
  #controls-container { height: 40px; display: flex; align-items: center; padding: 0 15px; border-top: 1px solid #ccc; background: #f8f9fa; gap: 10px; }
  #time-display { font-size: 16px; min-width: 150px; text-align: right; }
  
  /* SIDEBAR STYLES */
  #sidebar {
    /* Sum of zone-section and constraint-section widths */
    width: 310px; 
    height: 100%;
    border-left: 1px solid #ccc;
    background: #f8f9fa;
    flex-shrink: 0;
    display: flex;
    flex-direction: row; 
  }
  
  /* 1. Zone Section Width */
  #zone-section {
    width: 130px; 
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-right: 1px solid #ccc; 
  }

  /* 2. Constraint Section Width */
  #constraint-section {
    width: 180px; 
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  h4 {
    height: 30px;
    padding: 0 10px;
    margin: 0;
    background-color: #e9ecef;
    border-bottom: 1px solid #ccc;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 13px;
    color: #333;
    flex-shrink: 0;
  }

  /* Scrollable Lists */
  #zone-list, #constraint-list {
    flex: 1;
    overflow-y: auto;
    background: white;
  }
  
  /* List Items (Shared Look) */
  .zone-item, .constraint-row {
    padding: 5px 3px; 
    border-bottom: 1px solid #f0f0f0;
    font-size: 11px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  /* Zone Specifics */
  .zone-item { cursor: pointer; }
  .zone-item:hover { background-color: #e2e6ea; }
  .zone-item.selected { background-color: #007bff; color: white; font-weight: bold; }
  .zone-item .zone-price { font-weight: bold; min-width: 40px; text-align: right; }

  /* Constraint Specifics */
  .constraint-row .c-name {
    flex: 1;
    margin-right: 5px;
    word-wrap: break-word;
    line-height: 1.1;
    font-size: 10px; 
  }
  .constraint-row .c-price {
    font-weight: bold;
    color: #d32f2f;
    white-space: nowrap;
    font-size: 10px;
  }
  .empty-state {
    padding: 15px;
    text-align: center;
    color: #999;
    font-style: italic;
    font-size: 11px;
  }

/* Legend Container */
#legend {
  position: absolute;
  bottom: 50px;        
  right: 10px;         
  width: 120px;       
  max-height: 300px;
  overflow-y: auto;
  background-color: rgba(255, 255, 255, 0.95);
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  font-family: sans-serif;
  font-size: 12px;
  line-height: 1.4;
  z-index: 100; 
}

/* Legend Header */
#legend strong {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  border-bottom: 1px solid #ccc;
  padding-bottom: 4px;
  color: #333;
}

/* Individual Legend Rows */
.legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 3px;
}

/* The Color Box */
.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  margin-right: 8px;
  border: 1px solid rgba(0,0,0,0.2);
  flex-shrink: 0;
}
</style>

```js
import maplibregl from "npm:maplibre-gl";
import * as d3 from "npm:d3";
import { filter } from "./lib/filter.js";
import { API_BASE_URL, ZONE_LABEL_OVERRIDES, COLOR_SCALE, NET_COLOR_SCALE } from "./lib/config.js";
import { getColorForLmp, transformApiData } from "./lib/utils.js";

// States
let timeSeriesData = [];
let constraintsData = []; 
let zones = [];
let currentIndex = 0;
let timer = null;
let activePriceType = 'da';
let selectedZoneName = null; 
let activeConstraintMode = 'global'; // Currently Displayed Hour Const
let globalConstraintCache = []; // Mos Active 10 Const

// DOM Elements
const playBtn = document.getElementById('play-btn');
const slider = document.getElementById('slider');
const filterBtn = document.getElementById('filter-btn');
const timeDisplay = document.getElementById('time-display');
const zoneListElement = document.getElementById('zone-list');
const constraintListElement = document.getElementById('constraint-list');
function renderConstraintList(listItems, labelType) {
    const container = document.getElementById('constraint-list');
    if (!container) return;
    
    container.innerHTML = '';

    if (!listItems || listItems.length === 0) {
        container.innerHTML = '<div class="empty-state">No active constraints</div>';
        return;
    }

    const listHtml = listItems.map(item => `
        <div class="constraint-row" style="padding: 8px 5px; border-bottom: 1px solid #eee;">
            <div style="flex: 1; padding-right: 10px;">
                <div class="c-name" style="font-weight: 600; color: #333; font-size: 11px;">${item.name}</div>
            </div>
            <div style="text-align: right;">
                <div class="c-price" style="font-size: 12px; color: #d32f2f; font-weight: bold;">
                    $${item.price.toFixed(2)}
                </div>
                <div style="font-size: 9px; color: #999;">${labelType}</div>
            </div>
        </div>
    `).join('');

    container.innerHTML = listHtml;
}

// Calculate Constraint Hourly Averages over Query Period
function calculateGlobalStats(constraintList, totalHours) {
    if (!constraintList || constraintList.length === 0) return [];

    return d3.rollups(
        constraintList,
        (group) => d3.sum(group, d => Number(d.shadow_price) || 0),
        d => d.name
    )
    .map(([name, totalSum]) => ({
        name: name,
        price: totalSum / (totalHours || 1) // Avg/Hr
    }))
    .sort((a, b) => a.price - b.price) 
    .slice(0, 10); // Limit to 10 most active constraints
}


// Fetch Op
async function fetchLmpData() {
    timeDisplay.innerText = 'Querying Data';
    
    try {
        const cleanDate = (d) => {
            if (!d) return new Date().toISOString().split('T')[0];
            const date = new Date(d);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        const daysBooleans = filter.daysOfWeek || Array(7).fill(true);
        const selectedDayIndices = daysBooleans
            .map((isActive, index) => isActive ? index + 1 : null)
            .filter(val => val !== null);
        const query = {
            start_day: cleanDate(filter.startDate),
            end_day: cleanDate(filter.endDate),
            days_of_week: selectedDayIndices,
            start_hour: parseInt(filter.startTime) || 0,
            end_hour: parseInt(filter.endTime) || 24
        };
        const response = await fetch(`${API_BASE_URL}/api/lmp/range`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(query) 
        });

        if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
        
        const rawData = await response.json();
        const zoneData = rawData.zones || rawData;
        constraintsData = rawData.constraints || [];
        timeSeriesData = transformApiData(zoneData);

        if (!timeSeriesData || timeSeriesData.length === 0) {
            alert("No LMP data found for this range.");
            timeDisplay.innerText = 'No Data';
            return;
        }
        const totalHours = timeSeriesData.length;
        globalConstraintCache = calculateGlobalStats(constraintsData, totalHours);
        if (activeConstraintMode === 'global') {
            renderConstraintList(globalConstraintCache, 'Avg/Hr');
        }

        slider.max = timeSeriesData.length - 1;
        slider.disabled = false;
        playBtn.disabled = false;
        
        updateAnimation(0);
        
    } catch (error) {
        console.error("Fetch Error:", error);
        timeDisplay.innerText = 'Error';
        alert(`Error: ${error.message}`);
    }
}

// Animation
function updateAnimation(index) {
    currentIndex = index;
    slider.value = index;
    const data = timeSeriesData[index];
    if (!data) return;

    const d = new Date(data.datetime);    
    const dateStr = d.toLocaleDateString('en-US', { 
        weekday: 'short', month: 'short', day: 'numeric', 
        timeZone: 'America/New_York'
    });
    
    const hourStr = d.toLocaleTimeString('en-US', { 
        hour: 'numeric', minute: '2-digit', hour12: false,
        timeZone: 'America/New_York'
    });

    timeDisplay.innerText = `${dateStr} | ${hourStr}`;

    // B. Update Map
    const currentScale = (activePriceType === 'net') ? NET_COLOR_SCALE : COLOR_SCALE;
    const colorExpression = ['case'];
    for (const zone in data.readings) {
        const val = data.readings[zone] ? data.readings[zone][activePriceType] : null;
        colorExpression.push(['==', ['get', 'Zone_Name'], zone], getColorForLmp(val, currentScale));
    }
    colorExpression.push('#cccccc');
    
    if (map.getLayer('zoneFill')) {
        map.setPaintProperty('zoneFill', 'fill-color', colorExpression);
    }

    // Update Sidebar: ZONES
    document.querySelectorAll('.zone-item').forEach(item => {
        const zName = item.dataset.zoneName;
        const priceSpan = item.querySelector('.zone-price');
        if (!priceSpan) return;
        const val = data.readings[zName] ? data.readings[zName][activePriceType] : null;
        if (val !== null && val !== undefined) {
            priceSpan.innerText = `$${val.toFixed(2)}`;
            priceSpan.style.color = getColorForLmp(val, currentScale);
        } else {
            priceSpan.innerText = ''; 
            priceSpan.style.color = '#000';
        }
    });

    // Update Current Constraint Sidebar
    if (activeConstraintMode === 'current') {

        const currentLmpIso = data.datetime.replace(' ', 'T'); 
        const currentTs = new Date(currentLmpIso).getTime();
        
        const activeConstraints = constraintsData.filter(c => {
            const constraintIso = c.timestamp.replace(' ', 'T'); 
            const constraintTs = new Date(constraintIso).getTime();
            return constraintTs === currentTs;
        })
        .map(c => ({
            name: c.name || c.monitored_facility,
            price: Number(c.shadow_price || 0)
        }))
        // Sort Smallest(most neg) to Largest
        .sort((a, b) => a.price - b.price); 

        renderConstraintList(activeConstraints, 'Shadow Price');
    }
}

// UI Stuff
function displayCurrentFilter() {
    const container = document.getElementById('top-filter-display');
    if (!container || !filter.startDate) return;

    const formatDate = (d) => {
        const date = new Date(d);
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    };

    // Calc Days String
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayFlags = filter.daysOfWeek || Array(7).fill(true);
    
    const selectedDaysList = dayFlags
        .map((isSelected, i) => isSelected ? days[i] : null)
        .filter(day => day);

    let dayString = selectedDaysList.join(', ');
    if (selectedDaysList.length === 7) dayString = "All Days";
    if (selectedDaysList.length === 0) dayString = "None";

    container.innerHTML = `
        <ul>
            <li><strong>Dates:</strong> ${formatDate(filter.startDate)} to ${formatDate(filter.endDate)}</li>
            <li><strong>Days:</strong> ${dayString}</li>
            <li><strong>Time:</strong> ${filter.startTime}:00 - ${filter.endTime}:00</li>
        </ul>`;
}

function buildLegend(currentScale) {
    const container = document.getElementById('legend');
    if (!container) return;
    let html = '<strong>LMP ($/MWh)</strong>';
    currentScale.forEach((item, index) => {
        const prev = index > 0 ? currentScale[index - 1].threshold : null;
        let label = index === 0 ? `≥ $${item.threshold}` : `$${item.threshold} – $${prev}`;
        if (item.threshold === -Infinity) label = `< $${prev}`;
        html += `<div class="legend-item"><span class="legend-color" style="background-color: ${item.color};"></span><span>${label}</span></div>`;
    });
    container.innerHTML = html;
}

// Map Init
const map = new maplibregl.Map({ container: "map", zoom: 4.8, center: [-81.5, 38.6], pitch: 10, hash: true, style: 'https://api.maptiler.com/maps/streets/style.json?key=eDHUbUTyNqfZvtDLiUCT'
, attributionControl: false });
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));
map.addControl(new maplibregl.AttributionControl(), 'bottom-right');

map.on('load', async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/zones`);
        const shapes = await res.json();
        shapes.features.forEach(f => f.properties.Zone_Name = f.properties.zone_name);
        
        const labelFeatures = [];
        for (const feature of shapes.features) {
            const zoneName = feature.properties.Zone_Name;
            if (ZONE_LABEL_OVERRIDES[zoneName]) {
                for (const overrideCoords of ZONE_LABEL_OVERRIDES[zoneName]) { 
                    labelFeatures.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [overrideCoords[1], overrideCoords[0]] }, properties: { Zone_Name: zoneName } }); 
                }
            } else { 
                labelFeatures.push({ type: 'Feature', geometry: { type: 'Point', coordinates: d3.geoCentroid(feature) }, properties: { Zone_Name: zoneName } }); 
            }
        }

        map.addSource('zoneShapes', { type: 'geojson', data: shapes });
        map.addSource('zoneLabelPoints', { type: 'geojson', data: { type: 'FeatureCollection', features: labelFeatures } });
        map.addLayer({ id: 'zoneFill', type: 'fill', source: 'zoneShapes', paint: { "fill-color": '#cccccc', "fill-opacity": 0.7 } });
        map.addLayer({ id: 'zoneLines', type: 'line', source: 'zoneShapes', paint: { 'line-color': '#000', 'line-width': 1.5 } });
        map.addLayer({ id: 'zoneLabels', type: 'symbol', source: 'zoneLabelPoints', layout: { 'text-field': ['get', 'Zone_Name'], 'text-size': 12, 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { 'text-color': '#000000', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1 } });

        zones = shapes.features.map(f => ({ name: f.properties.Zone_Name, center: d3.geoCentroid(f) })).sort((a, b) => a.name.localeCompare(b.name));
        zones.unshift({ name: "PJM", center: [-81.5, 38.6] });
        
        zoneListElement.innerHTML = zones.map(z => `<div class="zone-item" data-zone-name="${z.name}"><span class="zone-name">${z.name}</span><span class="zone-price"></span></div>`).join('');
    } catch (e) { alert("Failed to load Map Zones"); }

    buildLegend(COLOR_SCALE);
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('fetch') === 'true') { displayCurrentFilter(); fetchLmpData(); } 
    else if (document.referrer.includes('/picker')) { displayCurrentFilter(); } 
    else { document.getElementById('top-filter-display').innerHTML = '<ul><li>-- None Selected --</li></ul>'; }
    
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
    map.on('mousemove', 'zoneFill', (e) => {
        if (!e.features[0] || timeSeriesData.length === 0) return;
        const zone = e.features[0].properties.Zone_Name;
        const lmpData = timeSeriesData[currentIndex]?.readings[zone];
        const lmp = lmpData ? lmpData[activePriceType] : null;
        const label = activePriceType === 'da' ? 'Day-Ahead' : activePriceType === 'rt' ? 'Real-Time' : 'NET';
        popup.setLngLat(e.lngLat).setHTML(`<div><strong>${zone}</strong><br>${label}: ${lmp != null ? '$' + lmp.toFixed(2) : 'N/A'}</div>`).addTo(map);
    });
    map.on('mouseleave', 'zoneFill', () => { popup.remove(); });
});

// EVENT LISTENERS ---

document.querySelectorAll('input[name="c-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        activeConstraintMode = e.target.value;
        if (activeConstraintMode === 'global') {
            renderConstraintList(globalConstraintCache, 'Avg/Hr');
        } else {
            updateAnimation(currentIndex);
        }
    });
});

zoneListElement.addEventListener('click', (e) => {
    const item = e.target.closest('.zone-item');
    if (!item) return;
    document.querySelectorAll('.zone-item').forEach(i => i.classList.remove('selected'));
    item.classList.add('selected');
    const zName = item.dataset.zoneName;
    const zData = zones.find(z => z.name === zName);
    
    if (zName === 'PJM') { 
        map.flyTo({ center: [-81.5, 38.6], zoom: 4.8, pitch: 10 }); 
    } 
    else if (zData) { 
        // Zone Clicked: Zoom & Update Border
        map.flyTo({ center: zData.center, zoom: 5.7, pitch: 20 }); 
        selectedZoneName = zName;
        if (map.getLayer('zoneLines')) {
            map.setPaintProperty('zoneLines', 'line-width', 
                ['case', ['==', ['get', 'Zone_Name'], selectedZoneName], 6, 1.5]
            );
        }
    }
});

map.on('click', 'zoneFill', (e) => { if (e.features.length) { const name = e.features[0].properties.Zone_Name; document.querySelector(`.zone-item[data-zone-name="${name}"]`)?.click(); }});
document.querySelector('.price-selector').addEventListener('change', (e) => { activePriceType = e.target.value; buildLegend(activePriceType === 'net' ? NET_COLOR_SCALE : COLOR_SCALE); if (timeSeriesData.length) updateAnimation(currentIndex); });
slider.oninput = (e) => { if (timer) { clearInterval(timer); timer = null; playBtn.innerText = 'Play'; } updateAnimation(parseInt(e.target.value)); };
playBtn.onclick = () => {
    if (timer) { clearInterval(timer); timer = null; playBtn.innerText = 'Play'; } 
    else { if (currentIndex >= timeSeriesData.length - 1) updateAnimation(0); playBtn.innerText = 'Pause'; timer = setInterval(() => { const nextIndex = currentIndex + 1; if (nextIndex >= timeSeriesData.length) { clearInterval(timer); timer = null; playBtn.innerText = 'Play'; } else { updateAnimation(nextIndex); } }, 500); }
};
filterBtn.onclick = () => window.location.href = '/picker';


