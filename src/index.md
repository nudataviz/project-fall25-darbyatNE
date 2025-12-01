<link rel="stylesheet" href="npm:maplibre-gl/dist/maplibre-gl.css">
<style> body { margin: 0; padding: 0; } </style>

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
    <div id="top-filter-display">
      <!-- Dynamic Content Loads Here -->
    </div>
  </div>

</div>

<div id="main-container">
  <!-- ... (The rest of your map container code remains the same) ... -->
  <div id="map-container">
    <div id="map"></div>
    <div id="legend"></div>
    <div id="controls-container">
      <button id="filter-btn">Filter</button>
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

<!-- CSS -->
<style>
  :root {
    --max-width: 100% !important; 
  }

  #observablehq-main, main {
    max-width: 100% !important;
    padding: 0 0 0 50px !important;
    margin: 0 !important;
    width: 100% !important;
  }

  #page-header {
    width: 100%;
    margin: 0;         
    text-align: center;     
    padding: 5px 20px 1px 20px; 
    font-family: sans-serif;
    box-sizing: border-box; 
  }

  #page-header h1 {
    margin: 0;
    color: #333;
    font-size: 2rem;
  }

  .top-controls-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    padding: 8px 20px; 
    width: 100%;       
    margin: 0;
    font-family: sans-serif;
    box-sizing: border-box;
  }

  .filter-container {
    display: flex;
    border: 1px solid #aaa;
    border-radius: 5px;
    overflow: hidden;
    flex: 1;          
    min-width: 0;     
    background-color: #e7f3ff; 
  }

  .filter-label {
    padding: 8px 16px; 
    background-color: #e0e0e0; 
    color: #333;
    font-weight: bold;
    font-size: 14px;
    border-right: 1px solid #aaa; 
    display: flex;
    align-items: center;
    white-space: nowrap; 
    cursor: default;
  }

  #top-filter-display {
    border: none;     
    border-radius: 0; 
    background-color: transparent;
    
    padding: 6px 15px;
    font-size: 14px;
    flex: 1; 
    min-width: 0;
    display: flex;   
    align-items: center;
  }

  #top-filter-display ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 5px 20px;
  }

  #top-filter-display li {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 300px;
    line-height: 1.4;
  }

  .price-label {
    padding: 8px 16px;
    background-color: #e0e0e0; 
    color: #333;
    font-weight: bold;
    font-size: 14px;
    border-right: 1px solid #aaa; 
    display: flex;
    align-items: center;
    cursor: default; 
  }
  .price-selector-container { display: flex; justify-content: center; }
  .price-selector { display: flex; border-radius: 5px; overflow: hidden; border: 1px solid #aaa; flex-shrink: 0; }
  .price-selector input[type="radio"] { display: none; }
  .price-selector label { padding: 8px 16px; cursor: pointer; background: #f0f0f0; user-select: none; transition: background 0.2s; font-size: 14px; display: flex; align-items: center; }
  .price-selector input[type="radio"]:checked + label { background: #007bff; color: white; font-weight: bold; }
  .price-selector label:not(:last-of-type) { border-right: 1px solid #aaa; }

  /* Container & Map */
  #main-container { 
    display: flex; 
    width: 100%;      
    border: 3px solid #444; 
    border-radius: 5px; 
    font-family: sans-serif; 
    margin: 0;        
    box-sizing: border-box; 
    height: 75vh;     
    min-height: 600px;
  }

  #map-container { flex: 1; height: 100%; display: flex; flex-direction: column; position: relative; min-width: 0; }
  #map { height: calc(100% - 40px); width: 100%; }
  #controls-container { height: 40px; display: flex; align-items: center; padding: 0 15px; border-top: 1px solid #ccc; background: #f8f9fa; gap: 10px; }
  
  /* Button Styling */
  #controls-container button {
    cursor: pointer;
    padding: 4px 10px;
    margin-right: 5px;
    font-size: 13px;
  }

  #avg-btn {
  font-size: 11px !important;     
  padding: 6px 4px !important;   
                
}

  /* Playback Speed Styling */
  #speed-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 60px;
    margin-right: 5px;
  }
  #speed-box label {
    font-size: 9px;
    color: #666;
    line-height: 1;
    margin-bottom: 2px;
  }
  #speed-slider {
    width: 100%;
    cursor: pointer;
    height: 5px;
  }

  #time-display { font-size: 16px; min-width: 150px; text-align: right; }
  
  /* Sidebar Layout */
  #sidebar {
    width: 310px; 
    height: 100%;
    border-left: 1px solid #ccc;
    background: #f8f9fa;
    flex-shrink: 0;
    display: flex;
    flex-direction: row; 
  }
  
  #zone-section {
    width: 130px; 
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-right: 1px solid #ccc; 
  }

  #constraint-section {
    width: 180px; 
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Headers & Lists */
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

  #zone-section h4 {
    height: 47px; 
    border-bottom: 1px solid #ccc;
  }

  .constraint-header-wrapper {
    height: 48px;             
    box-sizing: border-box;   
    background-color: #e9ecef;
    border-bottom: 1px solid #ccc;
    padding: 0 5px;           
    display: flex;
    flex-direction: column;
    justify-content: center; 
    flex-shrink: 0; 
  }

  .constraint-header-wrapper h4 {
    margin: 0;
    border: none;
    background: none;
    padding-bottom: 2px;
    height: auto;
    width: 100%;
  }

  .c-toggle-container {
    display: flex;
    justify-content: center;
    gap: 10px;
    font-size: 10px;
    z-index: 5;         
  }
  .c-toggle-container label {
    cursor: default; 
    display: flex;
    align-items: center;
    gap: 3px;
    opacity: 1; 
  }
  .c-toggle-container input[type="radio"]:checked {
      accent-color: #007bff;
  }

  #zone-list, #constraint-list {
    flex: 1;
    overflow-y: auto;
    background: #6f726dff; 
  }
  
  .zone-item, .constraint-row {
    padding: 2.5px 2px; 
    border-bottom: 1px solid #ccc;
    font-size: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .zone-item { cursor: pointer; }
  .zone-item:hover { background-color: #e2e6ea; }
  .zone-item.selected { background-color: #afb7c0ff; color: white; font-weight: bold; }
  .zone-item .zone-price { font-weight: bold; min-width: 40px; text-align: right; }

  .constraint-row .c-name {
    flex: 1;
    margin-right: 5px;
    word-wrap: break-word;
    line-height: 1.1;
    font-size: 10px; 
  }
  .constraint-row .c-price {
    font-weight: bold;
    color: #2f37d3ff;
    white-space: nowrap;
    font-size: 14px;
  }
  .empty-state {
    padding: 15px;
    text-align: center;
    color: #666;
    font-style: italic;
    font-size: 11px;
  }

  #legend {
    display: none;
    position: absolute;
    bottom: 50px;        
    left: 10px;         
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

  #legend strong {
    display: block;
    margin-bottom: 6px;
    font-size: 13px;
    border-bottom: 1px solid #ccc;
    padding-bottom: 4px;
    color: #333;
  }

  .legend-item {
    display: flex;
    align-items: center;
    margin-bottom: 3px;
  }

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
// JS Code begins
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
let globalConstraintCache = []; 
let isAverageMode = false; 
let averageDataCache = {}; 
let playbackSpeed = 1000;

// DOM Elements
const playBtn = document.getElementById('play-btn');
const avgBtn = document.getElementById('avg-btn'); 
const slider = document.getElementById('slider');
const speedSlider = document.getElementById('speed-slider'); 
const filterBtn = document.getElementById('filter-btn');
const timeDisplay = document.getElementById('time-display');
const zoneListElement = document.getElementById('zone-list');
const constraintListElement = document.getElementById('constraint-list');

// Helper: Update the Radio Button UI
function setConstraintModeUI(mode) {
    const radio = document.querySelector(`input[name="c-mode"][value="${mode}"]`);
    if (radio) radio.checked = true;
}

function renderConstraintList(listItems, labelType) {
    const container = document.getElementById('constraint-list');
    if (!container) return;
    
    container.innerHTML = '';

    if (!listItems || listItems.length === 0) {
        container.innerHTML = '<div class="empty-state">No active constraints</div>';
        return;
    }

    const listHtml = listItems.map(item => `
        <div class="constraint-row">
            <div style="flex: 1; padding-right: 10px;">
                <div class="c-name">${item.name}</div>
            </div>
            <div style="text-align: right;">
                <div class="c-price">$${item.price.toFixed(2)}</div>
                <div style="font-size: 9px; color: #000000;">${labelType}</div>
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
        price: totalSum / (totalHours || 1) 
    }))
    .sort((a, b) => a.price - b.price) 
    .slice(0, 10); 
}

// Calculate Zone Averages for the Initial View
function calculateZoneAverages() {
    const sums = {};
    
    timeSeriesData.forEach(step => {
        Object.entries(step.readings).forEach(([zone, values]) => {
            if (!sums[zone]) sums[zone] = { da: 0, rt: 0, net: 0, congestion: 0, count: 0 };
            sums[zone].da += values.da || 0;
            sums[zone].rt += values.rt || 0;
            sums[zone].net += values.net || 0;
            sums[zone].congestion += values.congestion || 0;
            sums[zone].count++;
        });
    });

    const averages = {};
    Object.keys(sums).forEach(zone => {
        const s = sums[zone];
        if (s.count > 0) {
            averages[zone] = {
                da: s.da / s.count,
                rt: s.rt / s.count,
                net: s.net / s.count,
                congestion: s.congestion / s.count 
            };
        }
    });
    return averages;
}

// Render the Average Price View
function renderAverageView() {
    isAverageMode = true;
    timeDisplay.innerText = 'All Filtered Hours';
    slider.value = 0; 
    
    // Set Constraint View Mode
    setConstraintModeUI('global');
    renderConstraintList(globalConstraintCache, 'Avg $/MWHr');

    // 1. Check for data
    if (Object.keys(averageDataCache).length === 0) {
        averageDataCache = calculateZoneAverages();
    }

    const currentScale = (activePriceType === 'net' || activePriceType === 'congestion') ? NET_COLOR_SCALE : COLOR_SCALE;
    const colorExpression = ['case'];
    const getValForZone = (zName) => {
        if (!averageDataCache[zName]) return null;

        if (activePriceType === 'congestion') {
            if (!selectedZoneName || !averageDataCache[selectedZoneName]) return null;
            if (zName === selectedZoneName) return 0;

            const sourcePrice = averageDataCache[selectedZoneName].rt; // Selected (Load Zone)
            const sinkPrice = averageDataCache[zName].rt;             // Target (Gen Zone)
            
            return sinkPrice - sourcePrice;
        } 
        else {
            // Standard lookup for da, rt, net
            return averageDataCache[zName][activePriceType];
        }
    };

    // 2. Update Map Colors
    for (const zone in averageDataCache) {
        const val = getValForZone(zone);
        
        if (val !== null && val !== undefined) {
            colorExpression.push(['==', ['get', 'Zone_Name'], zone], getColorForLmp(val, currentScale));
        }
    }
    colorExpression.push('#cccccc');
    
    if (map.getLayer('zoneFill')) {
        map.setPaintProperty('zoneFill', 'fill-color', colorExpression);
    }

    // 3. Calculate PJM System Average (for sidebar header)
    let pjmSum = 0;
    let pjmCount = 0;
    
    Object.keys(averageDataCache).forEach(zone => {
        const val = getValForZone(zone);

        if (val !== undefined && val !== null) {
            if (activePriceType === 'congestion' && zone === selectedZoneName) return;
            
            pjmSum += val;
            pjmCount++;
        }
    });
    
    const pjmAvg = pjmCount > 0 ? pjmSum / pjmCount : 0;

    // 4. Update Sidebar List
    document.querySelectorAll('.zone-item').forEach(item => {
        const zName = item.dataset.zoneName;
        const priceSpan = item.querySelector('.zone-price');
        if (!priceSpan) return;
        
        let val;
        if (zName === 'PJM') {
            val = pjmAvg; 
        } else {
            val = getValForZone(zName);
        }

        if (val !== null && val !== undefined) {
            priceSpan.innerText = `$${val.toFixed(2)}`;
            priceSpan.style.color = getColorForLmp(val, currentScale);
        } else {
            priceSpan.innerText = ''; 
            priceSpan.style.color = '#000';
        }
    });
}



// Query Operation
async function fetchLmpData() {
    timeDisplay.innerText = 'Querying Data...';
    
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
            end_hour: parseInt(filter.endTime) || 24,
            monitored_facility: filter.selectedConstraint || null
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

        // --- CHECK FOR EMPTY DATA ---
        if (!timeSeriesData || timeSeriesData.length === 0) {
            console.warn("No LMP data found for the selected range.");
            timeDisplay.innerText = 'No Data Found';
            
            displayCurrentFilter(0); 
            document.getElementById('zone-list').innerHTML = '<div class="empty-state" style="padding:10px;">No data available for this range.</div>';
            document.getElementById('constraint-list').innerHTML = '<div class="empty-state">No active constraints</div>';
            return;
        }

        displayCurrentFilter(timeSeriesData.length);

        const totalHours = timeSeriesData.length;
        globalConstraintCache = calculateGlobalStats(constraintsData, totalHours);
        slider.max = timeSeriesData.length - 1;
        slider.disabled = false;
        playBtn.disabled = false;
        
        averageDataCache = calculateZoneAverages(); 
        renderAverageView(); 
        
    } catch (error) {
        console.error("Fetch Error:", error);
        timeDisplay.innerText = 'Data Error';
        console.warn(`Error details: ${error.message}`);
    }
}

// Animation
function updateAnimation(index) {
    isAverageMode = false; 
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
    const currentScale = (activePriceType === 'net' || activePriceType === 'congestion') ? NET_COLOR_SCALE : COLOR_SCALE;
    
    // 1. Get Reference Price (Source / Selected Zone)
    let sourcePriceCurrentHour = 0;
    if (activePriceType === 'congestion' && selectedZoneName) {
        if (data.readings[selectedZoneName]) {
            sourcePriceCurrentHour = data.readings[selectedZoneName].rt || 0;
        }
    }

    // 2. Update Map Zone Colors
    const colorExpression = ['case'];
    for (const zone in data.readings) {
        const r = data.readings[zone];
        let val = null;

        if (activePriceType === 'congestion') {
            if (selectedZoneName && r) {
                // Math: Target (Sink) - Selected (Source)
                val = (r.rt || 0) - sourcePriceCurrentHour;
            }
        } else {
            val = r ? r[activePriceType] : null;
        }

        if (val !== null) {
            colorExpression.push(['==', ['get', 'Zone_Name'], zone], getColorForLmp(val, currentScale));
        }
    }
    colorExpression.push('#cccccc');
    
    if (map.getLayer('zoneFill')) {
        map.setPaintProperty('zoneFill', 'fill-color', colorExpression);
    }

    // 3. Hourly Avgs Calc for Sidebar
    let pjmSum = 0;
    let pjmCount = 0;

    Object.keys(data.readings).forEach(zone => {
        const r = data.readings[zone];
        if (r) {
            let val = 0;

            if (activePriceType === 'congestion') {
                if (!selectedZoneName) return; 
                if (zone === selectedZoneName) return;
                // Math: Target (Sink) - Selected (Source)
                val = (r.rt || 0) - sourcePriceCurrentHour;
            } 
            else if (r[activePriceType] !== undefined) {
                val = r[activePriceType];
            }

            pjmSum += val;
            pjmCount++;
        }
    });
    const pjmAvg = pjmCount > 0 ? pjmSum / pjmCount : 0;


    // 4. Update Sidebar Text
    document.querySelectorAll('.zone-item').forEach(item => {
        const zName = item.dataset.zoneName;
        const priceSpan = item.querySelector('.zone-price');
        if (!priceSpan) return;
        
        let val;
        if (zName === 'PJM') {
            val = pjmAvg; 
        } else {
            if (activePriceType === 'congestion') {
                if (selectedZoneName && data.readings[zName]) {
                     val = (data.readings[zName].rt || 0) - sourcePriceCurrentHour;
                }
            } else {
                val = data.readings[zName] ? data.readings[zName][activePriceType] : null;
            }
        }

        if (val !== null && val !== undefined) {
            priceSpan.innerText = `$${val.toFixed(2)}`;
            priceSpan.style.color = getColorForLmp(val, currentScale);
        } else {
            priceSpan.innerText = ''; 
            priceSpan.style.color = '#000';
        }
    });

    // Update Constraints
    setConstraintModeUI('current');
    
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
    .sort((a, b) => a.price - b.price) 
    .slice(0, 10); 

    renderConstraintList(activeConstraints, 'Shadow Price');
}

  // Helper: Update Border Styles 
function updateZoneBorders() {
    if (!map.getLayer('zoneLines')) return;
    map.setPaintProperty('zoneLines', 'line-width', 
        ['case', 
            ['==', ['get', 'Zone_Name'], selectedZoneName || ''], 
            6, 
            1.5
        ]
    );

    map.setPaintProperty('zoneLines', 'line-color', 
        ['case', 
            ['==', ['get', 'Zone_Name'], selectedZoneName || ''], 
            '#FFFF00',
            '#000000' 
        ]
    );
}

// Current Filter Info
function displayCurrentFilter(resultCount = null) {
    const container = document.getElementById('top-filter-display');
    if (!container || !filter.startDate) return;

    const formatDate = (d) => {
        const date = new Date(d);
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    };

    // 1. Days String Logic
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayFlags = filter.daysOfWeek || Array(7).fill(true);
    const selectedDaysList = dayFlags.map((isSelected, i) => isSelected ? days[i] : null).filter(d => d);
    
    let dayString = selectedDaysList.join(', ');
    if (selectedDaysList.length === 7) dayString = "All Days";
    if (selectedDaysList.length === 0) dayString = "None";

    // 2. Constraint Logic
    let constraintHtml = '';
    if (filter.selectedConstraint) {
        constraintHtml = `<li><strong>Constraint:</strong> ${filter.selectedConstraint}</li>`;
    }

    // 3. Hours Calculation Logic
    let hoursValue = 0;
    let hoursColor = "#333"; 
    let labelText = "Total Hours";

    if (resultCount === 0) {
        hoursValue = "0";
        hoursColor = "#dc3545"; 
    } 
    else if (typeof resultCount === 'number') {
        hoursValue = resultCount;
        hoursColor = "#007bff"; 
    } 
    else {
        // Estimated hours based on calendar selection
        let estimated = 0;
        const start = new Date(filter.startDate);
        const end = new Date(filter.endDate);
        
        let dailyHours = 24;
        if (filter.selectedHours && Array.isArray(filter.selectedHours)) {
            dailyHours = filter.selectedHours.length;
        } else {
            dailyHours = (parseInt(filter.endTime) || 24) - (parseInt(filter.startTime) || 0);
        }

        let current = new Date(start);
        while (current <= end) {
            if (dayFlags[current.getDay()]) estimated += dailyHours;
            current.setDate(current.getDate() + 1);
        }
        hoursValue = estimated;
        labelText = "Est. Hours"; 
    }

    // 4. Render with Split Layout
    container.style.display = "flex";
    container.style.justifyContent = "space-between";
    container.style.alignItems = "center";
    container.innerHTML = `
        <!-- Left Side: Filter Details -->
        <div style="flex: 1; min-width: 0; padding-right: 10px;">
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 4px 20px;">
                <li><strong>Dates:</strong> ${formatDate(filter.startDate)} - ${formatDate(filter.endDate)}</li>
                <li><strong>Days:</strong> ${dayString}</li>
                <li><strong>Time:</strong> ${filter.startTime}:00 - ${filter.endTime}:00</li>
                ${constraintHtml}
            </ul>
        </div>

        <!-- Right Side: Total Hours Badge -->
        <div style="
            flex-shrink: 0; 
            border-left: 1px solid #ccc; 
            padding-left: 15px; 
            margin-left: 5px; 
            text-align: center; 
            display: flex; 
            flex-direction: column; 
            justify-content: center;
            min-width: 70px;
        ">
            <span style="font-size: 10px; color: #666; text-transform: uppercase; font-weight: bold; line-height: 1; margin-bottom: 2px;">
                ${labelText}
            </span>
            <span style="font-size: 22px; font-weight: bold; color: ${hoursColor}; line-height: 1;">
                ${hoursValue}
            </span>
        </div>`;
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
const map = new maplibregl.Map({ container: "map", zoom: 5.3, center: [-82, 38.6], pitch: 10, hash: true, style: 'https://api.maptiler.com/maps/streets/style.json?key=eDHUbUTyNqfZvtDLiUCT'
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
        zones.unshift({ name: "PJM", center: [-82, 38.6] });
        
        zoneListElement.innerHTML = zones.map(z => `<div class="zone-item" data-zone-name="${z.name}"><span class="zone-name">${z.name}</span><span class="zone-price"></span></div>`).join('');
    } catch (e) { alert("Failed to load Map Zones"); }

    buildLegend(COLOR_SCALE);
    const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('fetch') === 'true') { 
        displayCurrentFilter(); 
        document.getElementById('legend').style.display= 'block'; 
        fetchLmpData(); 
    } 
    else if (document.referrer.includes('/picker')) {displayCurrentFilter(); 
    } 
    else {document.getElementById('top-filter-display').innerHTML = '<ul><li>-- None Selected --</li></ul>'; 
    }
    
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
    
    // Mouse Hover Listener
map.on('mousemove', 'zoneFill', (e) => {
    if (!e.features[0]) return;
    
    const zone = e.features[0].properties.Zone_Name;
    let val = null;
    let labelPrefix = '';
    let zoneData = null;
    let sourceData = null;

    if (isAverageMode) {
        zoneData = averageDataCache[zone];
        if (selectedZoneName) sourceData = averageDataCache[selectedZoneName];
        labelPrefix = 'Avg ';
    } 
    else if (timeSeriesData.length > 0) {
        const step = timeSeriesData[currentIndex];
        if (step) {
            zoneData = step.readings[zone];
            if (selectedZoneName) sourceData = step.readings[selectedZoneName];
        }
    }

    // 2. Calculate the Value
    if (activePriceType === 'congestion') {
        // Logic: Sink (Seelcted) - Source (Others)
        if (selectedZoneName && zoneData && sourceData) {
            // Use RT price for congestion calculation
            const sinkPrice = zoneData.rt || 0;
            const sourcePrice = sourceData.rt || 0;
            val = sinkPrice - sourcePrice;
        } 
        else if (zone === selectedZoneName) {
            val = 0.00; // Congestion to itself is 0
        }

    } 
    else {
        val = zoneData ? zoneData[activePriceType] : null;
    }

    // 3. Determine Label Text
    let typeLabel = 'NET';
    if (activePriceType === 'da') typeLabel = 'Day-Ahead';
    else if (activePriceType === 'rt') typeLabel = 'Real-Time';
    else if (activePriceType === 'congestion') typeLabel = 'Congestion';

    const finalLabel = `${labelPrefix}${typeLabel}`;
    
    // 4. Set Popup
    popup.setLngLat(e.lngLat)
            .setHTML(`
                <div style="font-family:sans-serif; padding:4px;">
                    <strong style="font-size:13px;">${zone}</strong><br>
                    <span style="color:#555; font-size:11px;">${finalLabel}:</span> 
                    <span style="font-weight:bold; font-size:13px;">
                        ${val !== null ? '$' + val.toFixed(2) : 'N/A'}
                    </span>
                </div>
            `)
            .addTo(map);
});
    
    map.on('mouseleave', 'zoneFill', () => { popup.remove(); });
});

// Listeners
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
        updateZoneBorders();     
    } 
    else if (zData) { 
        map.flyTo({ center: zData.center, zoom: 5.9, pitch: 20 }); 
        selectedZoneName = zName;
        updateZoneBorders();

        // Recalculate if in Congestion Mode
        if (activePriceType === 'congestion') {
            if (isAverageMode) renderAverageView();
            else updateAnimation(currentIndex);
        }
    }
});

// Map Click Listener (Handles Shift+Click for Congestion)
map.on('click', 'zoneFill', (e) => {
    if (!e.features.length) return;
    
    const clickedZone = e.features[0].properties.Zone_Name;
    if (e.originalEvent.shiftKey && activePriceType === 'congestion') {
        selectedZoneName = clickedZone;
        updateZoneBorders();
        if (isAverageMode) {
            renderAverageView();
        } else {
            updateAnimation(currentIndex);
        }
        
        new maplibregl.Popup({ closeButton: false })
            .setLngLat(e.lngLat)
            .setHTML(`<div style="font-size:11px; font-weight:bold; color:#8B4513;">New Reference: ${clickedZone}</div>`)
            .addTo(map);

        return;
    }

    const sidebarItem = document.querySelector(`.zone-item[data-zone-name="${clickedZone}"]`);
    if (sidebarItem) sidebarItem.click();
});

// Price Selector Config
document.querySelector('.price-selector').addEventListener('change', (e) => { 
    activePriceType = e.target.value; 
    const useNetScale = (activePriceType === 'net' || activePriceType === 'congestion');
    buildLegend(useNetScale ? NET_COLOR_SCALE : COLOR_SCALE); 
    
    if (isAverageMode) {
        renderAverageView();
    } else if (timeSeriesData.length) {
        updateAnimation(currentIndex); 
    }
});


// Slider Logic
slider.oninput = (e) => { 
    if (timer) { clearInterval(timer); timer = null; playBtn.innerText = 'Play'; } 
    updateAnimation(parseInt(e.target.value)); 
};

// Animation Speed Logic
speedSlider.oninput = (e) => {
    playbackSpeed = 3100 - parseInt(e.target.value);
    if (timer) {
        clearInterval(timer);
        timer = setInterval(() => { 
            const nextIndex = currentIndex + 1; 
            if (nextIndex >= timeSeriesData.length) { 
                clearInterval(timer); timer = null; playBtn.innerText = 'Play'; 
            } else { 
                updateAnimation(nextIndex); 
            } 
        }, playbackSpeed);
    }
};

// Click Play bttn Logic
playBtn.onclick = () => {
    if (timer) { clearInterval(timer); timer = null; playBtn.innerText = 'Play'; } 
    else { 
        if (currentIndex >= timeSeriesData.length - 1) updateAnimation(0); 
        playBtn.innerText = 'Pause'; 
        timer = setInterval(() => { 
            const nextIndex = currentIndex + 1; 
            if (nextIndex >= timeSeriesData.length) { 
                clearInterval(timer); timer = null; playBtn.innerText = 'Play'; 
            } else { 
                updateAnimation(nextIndex); 
            } 
        }, playbackSpeed); 
    }
};

// Click Avg bttn Logic
avgBtn.onclick = () => {
    if (timer) { clearInterval(timer); timer = null; playBtn.innerText = 'Play'; }
    renderAverageView();
};

filterBtn.onclick = () => window.location.href = '/picker';
```
