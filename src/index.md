<link rel="stylesheet" href="./components/style.css">
<link href="https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css" rel="stylesheet" />

<div class="header-container">
  <h1 id="page-header-text">Interactive PJM LMP Map</h1>
</div>

<div class="top-controls-wrapper">
  
  <!-- 1. Price Selector -->
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

  <!-- 2. Filter Summary Container -->
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

// Updated imports to point to ./components/
import { filter } from "./components/filter.js";
import { API_BASE_URL, ZONE_LABEL_OVERRIDES, COLOR_SCALE, NET_COLOR_SCALE } from "./components/config.js";
import { getColorForLmp, transformApiData } from "./components/utils.js";
import { renderConstraintList, displayCurrentFilter, buildLegend, setConstraintModeUI } from "./components/ui.js";
import { calculateGlobalStats, calculateZoneAverages } from "./components/math.js";

// --- Module Variables ---
let timeSeriesData = [];
let constraintsData = []; 
let zones = [];
let currentIndex = 0;
let timer = null;
let activePriceType = 'da';
let selectedZoneName = null; 
let globalConstraintCache = [];
let congestionHelpPopup = null; 
let isAverageMode = false; 
let averageDataCache = {}; 
let playbackSpeed = 1000;

// --- HTML Templates ---
const CONGESTION_POPUP_HTML = `
    <div style="font-family: sans-serif; text-align: center; color: #333;">
        <strong style="display:block; border-bottom:1px solid #ccc; margin-bottom:8px; padding-bottom:4px; font-size:13px;">
            Load Congestion View
        </strong>
        <div style="font-size: 11px; line-height: 1.4;">
            The <span style="background-color: #333; color: #FFFF00; padding: 1px 4px; font-weight: bold; border-radius: 3px;">Yellow Bordered Zone</span> is the selected Load Zone.<br>
            Prices displayed are the cost to "deliver" from each zone to the selected Load Zone.
        </div>
    </div>
`;

const createZonePopupHTML = (zoneName, priceType, value) => {
    const formattedPrice = value !== null ? `$${value.toFixed(2)}` : 'N/A';
    return `
        <div class="zone-popup-content">
            <strong class="zone-popup-header">${zoneName}</strong>
            <div>
                <span class="zone-popup-label">${priceType}:</span> 
                <span class="zone-popup-value">${formattedPrice}</span>
            </div>
        </div>
    `;
};

// --- DOM Elements ---
const playBtn = document.getElementById('play-btn');
const avgBtn = document.getElementById('avg-btn'); 
const slider = document.getElementById('slider');
const speedSlider = document.getElementById('speed-slider'); 
const filterBtn = document.getElementById('filter-btn');
const timeDisplay = document.getElementById('time-display');
const zoneListElement = document.getElementById('zone-list');

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

// --- Main Loop To Render Hours ---
function renderAverageView() {
    isAverageMode = true;
    timeDisplay.innerText = 'All Filtered Hours';
    slider.value = 0; 
    setConstraintModeUI('global');
    renderConstraintList(globalConstraintCache, 'Avg $/MWHr');

    if (Object.keys(averageDataCache).length === 0) {
        averageDataCache = calculateZoneAverages(timeSeriesData);
    }

    const currentScale = (activePriceType === 'net' || activePriceType === 'congestion') ? NET_COLOR_SCALE : COLOR_SCALE;
    const colorExpression = ['case'];
    
    const getValForZone = (zName) => {
        if (!averageDataCache[zName]) return null;
        if (activePriceType === 'congestion') {
            if (!selectedZoneName || !averageDataCache[selectedZoneName]) return null;
            if (zName === selectedZoneName) return 0;
            return averageDataCache[zName].rt - averageDataCache[selectedZoneName].rt;
        } 
        return averageDataCache[zName][activePriceType];
    };

    for (const zone in averageDataCache) {
        const val = getValForZone(zone);
        if (val !== null && val !== undefined) {
            colorExpression.push(['==', ['get', 'Zone_Name'], zone], getColorForLmp(val, currentScale));
        }
    }
    colorExpression.push('#cccccc');
    
    if (map.getLayer('zoneFill')) map.setPaintProperty('zoneFill', 'fill-color', colorExpression);

    // Update Sidebar
    document.querySelectorAll('.zone-item').forEach(item => {
        const zName = item.dataset.zoneName;
        const priceSpan = item.querySelector('.zone-price');
        if (!priceSpan) return;
        
        let val = (zName === 'PJM') ? 0 : getValForZone(zName); 
        if (val !== null && val !== undefined) {
            priceSpan.innerText = `$${val.toFixed(2)}`;
            priceSpan.style.color = getColorForLmp(val, currentScale);
        } else {
            priceSpan.innerText = '';
        }
    });
}

function updateAnimation(index) {
    isAverageMode = false; 
    currentIndex = index;
    slider.value = index;
    const data = timeSeriesData[index];
    if (!data) return;

    const d = new Date(data.datetime);    
    timeDisplay.innerText = `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} | ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })}`;
    
    const currentScale = (activePriceType === 'net' || activePriceType === 'congestion') ? NET_COLOR_SCALE : COLOR_SCALE;
    let sourcePriceCurrentHour = 0;
    if (activePriceType === 'congestion' && selectedZoneName && data.readings[selectedZoneName]) {
        sourcePriceCurrentHour = data.readings[selectedZoneName].rt || 0;
    }

    const colorExpression = ['case'];
    for (const zone in data.readings) {
        const r = data.readings[zone];
        let val = null;
        if (activePriceType === 'congestion') {
            if (selectedZoneName && r) val = (r.rt || 0) - sourcePriceCurrentHour;
        } else {
            val = r ? r[activePriceType] : null;
        }
        if (val !== null) colorExpression.push(['==', ['get', 'Zone_Name'], zone], getColorForLmp(val, currentScale));
    }
    colorExpression.push('#cccccc');
    
    if (map.getLayer('zoneFill')) map.setPaintProperty('zoneFill', 'fill-color', colorExpression);

    // Update Sidebar
    document.querySelectorAll('.zone-item').forEach(item => {
        const zName = item.dataset.zoneName;
        const priceSpan = item.querySelector('.zone-price');
        if (!priceSpan) return;
        
        let val;
        if (zName !== 'PJM') {
            if (activePriceType === 'congestion') {
                if (selectedZoneName && data.readings[zName]) val = (data.readings[zName].rt || 0) - sourcePriceCurrentHour;
            } else {
                val = data.readings[zName] ? data.readings[zName][activePriceType] : null;
            }
        }
        if (val !== null && val !== undefined) {
            priceSpan.innerText = `$${val.toFixed(2)}`;
            priceSpan.style.color = getColorForLmp(val, currentScale);
        } else {
            priceSpan.innerText = '';
        }
    });

    // Update Constraints
    setConstraintModeUI('current');
    const currentTs = new Date(data.datetime.replace(' ', 'T')).getTime();
    const activeConstraints = constraintsData.filter(c => new Date(c.timestamp.replace(' ', 'T')).getTime() === currentTs)
        .map(c => ({ name: c.name || c.monitored_facility, price: Number(c.shadow_price || 0) }))
        .sort((a, b) => a.price - b.price).slice(0, 10);
    renderConstraintList(activeConstraints, 'Shadow Price');
}

function updateZoneBorders() {
    if (!map.getLayer('zoneLines')) return;
    const targetZone = (activePriceType === 'congestion' && selectedZoneName) ? selectedZoneName : '';
    
    map.setPaintProperty('zoneLines', 'line-width', ['case', ['==', ['get', 'Zone_Name'], targetZone], 6, 1.5]);
    map.setPaintProperty('zoneLines', 'line-color', ['case', ['==', ['get', 'Zone_Name'], targetZone], '#FFFF00', '#000000']);

    if (congestionHelpPopup) { congestionHelpPopup.remove(); congestionHelpPopup = null; }
    if (targetZone && targetZone !== 'PJM') {
        congestionHelpPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'congestion-info-popup', maxWidth: '250px' })
        .setLngLat([-72, 37])
        .setHTML(CONGESTION_POPUP_HTML)
        .addTo(map);
    }
}

async function fetchLmpData() {
    timeDisplay.innerText = 'Querying Data...';
    try {
        const cleanDate = (d) => d ? new Date(d).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const daysBooleans = filter.daysOfWeek || Array(7).fill(true);
        const query = {
            start_day: cleanDate(filter.startDate),
            end_day: cleanDate(filter.endDate),
            days_of_week: daysBooleans.map((isActive, index) => isActive ? index + 1 : null).filter(val => val !== null),
            start_hour: parseInt(filter.startTime) || 0,
            end_hour: parseInt(filter.endTime) || 24,
            monitored_facility: filter.selectedConstraint || null
        };

        const response = await fetch(`${API_BASE_URL}/api/lmp/range`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query) });
        if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
        
        const rawData = await response.json();
        constraintsData = rawData.constraints || [];
        timeSeriesData = transformApiData(rawData.zones || rawData);

        if (!timeSeriesData || timeSeriesData.length === 0) {
            timeDisplay.innerText = 'No Data Found';
            displayCurrentFilter(filter, 0);
            return;
        }

        displayCurrentFilter(filter, timeSeriesData.length);
        globalConstraintCache = calculateGlobalStats(constraintsData, timeSeriesData.length);
        slider.max = timeSeriesData.length - 1;
        slider.disabled = false;
        playBtn.disabled = false;
        averageDataCache = calculateZoneAverages(timeSeriesData); 
        renderAverageView(); 
    } catch (error) {
        console.error("Fetch Error:", error);
        timeDisplay.innerText = 'Data Error';
    }
}

// --- Event Listeners & Map Load ---
map.on('load', async () => {
    try {
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

        zones = shapes.features.map(f => ({ name: f.properties.Zone_Name, center: d3.geoCentroid(f) })).sort((a, b) => a.name.localeCompare(b.name));
        zones.unshift({ name: "PJM", center: [-82, 38.6] });
        zoneListElement.innerHTML = zones.map(z => `<div class="zone-item" data-zone-name="${z.name}"><span class="zone-name">${z.name}</span><span class="zone-price"></span></div>`).join('');
    } catch (e) { console.error("Map Load Error", e); }

    buildLegend(COLOR_SCALE);
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('fetch') === 'true' || document.referrer.includes('/picker')) {
        displayCurrentFilter(filter);
        document.getElementById('legend').style.display= 'block'; 
        fetchLmpData();
    } else {
        document.getElementById('top-filter-display').innerHTML = '<ul><li>-- None Selected --</li></ul>';
    }

    // Hover Popup
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
    
    map.on('mousemove', 'zoneFill', (e) => {
        if (!e.features[0]) return;
        const zone = e.features[0].properties.Zone_Name;
        let val = null;
        let zoneData, sourceData;

        // logic to determine which time mode
        if (isAverageMode) {
            zoneData = averageDataCache[zone];
            if (selectedZoneName) sourceData = averageDataCache[selectedZoneName];
        } else if (timeSeriesData.length > 0) {
            const step = timeSeriesData[currentIndex];
            zoneData = step ? step.readings[zone] : null;
            if (selectedZoneName && step) sourceData = step.readings[selectedZoneName];
        }

        // logic to determine which math mode
        if (activePriceType === 'congestion') {
            if (selectedZoneName && zoneData && sourceData) val = (zoneData.rt || 0) - (sourceData.rt || 0);
            else if (zone === selectedZoneName) val = 0.00;
        } else {
            val = zoneData ? zoneData[activePriceType] : null;
        }
        popup.setLngLat(e.lngLat)
             .setHTML(createZonePopupHTML(zone, activePriceType, val))
             .addTo(map);
    });

    map.on('mouseleave', 'zoneFill', () => popup.remove());
});

// UI Interactions
zoneListElement.addEventListener('click', (e) => {
    const item = e.target.closest('.zone-item');
    if (!item) return;
    document.querySelectorAll('.zone-item').forEach(i => i.classList.remove('selected'));
    item.classList.add('selected');
    const zName = item.dataset.zoneName;
    const zData = zones.find(z => z.name === zName);
    
    if (zName === 'PJM') { 
        map.flyTo({ center: [-82, 38.6], zoom: 5.3, pitch: 10 }); 
        selectedZoneName = null;
    } else if (zData) { 
        map.flyTo({ center: zData.center, zoom: 6, pitch: 20 }); 
        selectedZoneName = zName;
    }
    updateZoneBorders();
    if (activePriceType === 'congestion') isAverageMode ? renderAverageView() : updateAnimation(currentIndex);
});

// Playback Control
function stopAnimation() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    playBtn.innerText = 'Play';
}

function startAnimation() {
    playBtn.innerText = 'Pause';
    timer = setInterval(() => {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= timeSeriesData.length) {
            stopAnimation();
        } else {
            updateAnimation(nextIndex);
        }
    }, playbackSpeed);
}

// --- Map Interactions ---
map.on('click', 'zoneFill', (e) => {
    if (!e.features.length) return;
    const clickedZone = e.features[0].properties.Zone_Name;

    // Interaction 1: Set Congestion Reference
    if (e.originalEvent.shiftKey && activePriceType === 'congestion') {
        selectedZoneName = clickedZone;
        updateZoneBorders();
        
        // Refresh current view
        isAverageMode ? renderAverageView() : updateAnimation(currentIndex);
        
        // Show confirmation popup
        new maplibregl.Popup({ closeButton: false })
            .setLngLat(e.lngLat)
            .setHTML(`<div style="font-size:11px; font-weight:bold; color:#8B4513; padding:2px;">New Reference: ${clickedZone}</div>`)
            .addTo(map);
        return;
    }

    // Interaction 2: Select Zone in Sidebar
    const sidebarItem = document.querySelector(`.zone-item[data-zone-name="${clickedZone}"]`);
    if (sidebarItem) sidebarItem.click();
});

// --- View Controls ---
document.querySelector('.price-selector').addEventListener('change', (e) => { 
    activePriceType = e.target.value; 
    
    // Update Legend & Borders
    const scale = (activePriceType === 'net' || activePriceType === 'congestion') ? NET_COLOR_SCALE : COLOR_SCALE;
    buildLegend(scale); 
    updateZoneBorders();

    // Refresh Map Data
    if (isAverageMode) renderAverageView();
    else if (timeSeriesData.length) updateAnimation(currentIndex); 
});

avgBtn.onclick = () => { 
    stopAnimation(); 
    renderAverageView(); 
};

filterBtn.onclick = () => window.location.href = '/picker';

// --- Timeline Controls ---
slider.oninput = (e) => { 
    stopAnimation(); 
    updateAnimation(parseInt(e.target.value)); 
};

speedSlider.oninput = (e) => {
    playbackSpeed = 3100 - parseInt(e.target.value);
    
    // restart the timer with the new speed
    if (timer) { 
        clearInterval(timer); 
        startAnimation();
    }
};

playBtn.onclick = () => {
    if (timer) {
        stopAnimation();
    } else { 
        if (currentIndex >= timeSeriesData.length - 1) updateAnimation(0); 
        startAnimation();
    }
};
```