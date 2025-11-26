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
  <div id="zone-list-container">
    <h4>PJM Zones</h4>
    <div id="zone-list"></div>
  </div>
</div>

<style>
  /* Title Styles */
  #page-header {
    width: 100%;
    max-width: 1320px;    
    margin: 0 auto;     
    text-align: center;     
    padding-top: 20px;
    padding-bottom: 10px;
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
    max-width: 1320px;
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
    background-color: #e0e0e0; /* Slightly darker than the buttons */
    color: #333;
    font-weight: bold;
    font-size: 14px;
    border-right: 1px solid #aaa; /* Adds the separator line */
    display: flex;
    align-items: center;
    cursor: default; /* Shows standard cursor, not pointer */
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
    max-width: 1320px; 
    border: 1px solid #ccc; 
    border-radius: 5px; 
    font-family: sans-serif; 
    margin: 0 auto; 
    box-sizing: border-box; 
  }

  #map-container { flex: 1; height: 600px; display: flex; flex-direction: column; position: relative; min-width: 0; }
  #map { height: calc(100% - 40px); width: 100%; }
  #controls-container { height: 40px; display: flex; align-items: center; padding: 0 15px; border-top: 1px solid #ccc; background: #f8f9fa; gap: 10px; }
  #time-display { font-size: 16px; min-width: 150px; text-align: right; }
  
  #zone-list-container {
    width: 130px;
    height: 600px;
    border-left: 1px solid #ccc;
    background: #f8f9fa;
    flex-shrink: 0;
  }
  
  #zone-list-container h4 { height: 30px; padding: 0 15px; margin: 0; border-bottom: 1px solid #ccc; box-sizing: border-box; display: flex; align-items: center; justify-content: center; text-align: center; }
  #zone-list { height: calc(600px - 30px); box-sizing: border-box; overflow-y: auto; }
  
  .zone-item {
    padding: 3px 15px;
    cursor: pointer;
    border-bottom: 1px solid #e9ecef;
    font-size: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .zone-item .zone-price {
    font-weight: bold;
    min-width: 45px;
    text-align: right;
  }
  .zone-item:hover { background-color: #e2e6ea; }
  .zone-item.selected { background-color: #007bff; color: white; font-weight: bold; }

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
import { getColorForLmp, formatDateForInput, transformApiData } from "./lib/utils.js";

let timeSeriesData = [], zones = [], currentIndex = 0, timer = null;
let activePriceType = 'da';

const playBtn = document.getElementById('play-btn');
const slider = document.getElementById('slider');
const filterBtn = document.getElementById('filter-btn');

async function fetchLmpData() {
    document.getElementById('time-display').innerText = 'Fetching...';
    try {
        const query = {
            start_day: formatDateForInput(filter.startDate),
            end_day: formatDateForInput(filter.endDate),
            days_of_week: filter.daysOfWeek.map((selected, i) => selected ? i + 1 : null).filter(day => day !== null),
            hours: Array.from({ length: 24 }, (_, i) => i >= filter.startTime && i < filter.endTime)
        };
        const lmpResponse = await fetch(`${API_BASE_URL}/api/lmp/range`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query) });
        if (!lmpResponse.ok) throw new Error(`Server error: ${lmpResponse.statusText}`);
        const apiLmpData = await lmpResponse.json();
        timeSeriesData = transformApiData(apiLmpData);

        if (Object.keys(apiLmpData).length === 0) {
            alert("No LMP data found.");
            timeSeriesData = [];
            slider.max = 1;
            playBtn.disabled = true;
            slider.disabled = true;
            document.getElementById('time-display').innerText = 'No Data';
            return;
        }
        slider.max = timeSeriesData.length - 1;
        slider.disabled = false;
        playBtn.disabled = false;
        updateAnimation(0);
    } catch (error) {
        console.error("Failed to fetch LMP data:", error);
        alert(`Could not load LMP data: ${error.message}`);
        document.getElementById('time-display').innerText = 'Error';
    }
}

function updateAnimation(index) {
    currentIndex = index;
    slider.value = index;
    const data = timeSeriesData[index];
    if (!data) return;

    // 1. Update Time Display
    const date = new Date(data.datetime);
    const hour = date.getUTCHours();
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    document.getElementById('time-display').innerText = `${dayOfWeek} | ${date.toLocaleDateString('en-US', { timeZone: 'UTC' })} | ${hour}:00-${hour + 1}:00`;
    
    // 2. Determine which Color Scale to use
    const currentScale = (activePriceType === 'net') ? NET_COLOR_SCALE : COLOR_SCALE;

    // 3. Update Map Colors
    const colorExpression = ['case'];
    for (const zone in data.readings) {
        const lmpValue = data.readings[zone] ? data.readings[zone][activePriceType] : null;
        // Pass currentScale to the color function
        colorExpression.push(['==', ['get', 'Zone_Name'], zone], getColorForLmp(lmpValue, currentScale));
    }
    colorExpression.push('#cccccc');
    map.setPaintProperty('zoneFill', 'fill-color', colorExpression);

    // 4. Update Sidebar List
    document.querySelectorAll('.zone-item').forEach(item => {
      const zoneName = item.dataset.zoneName;
      
      // 👇 THIS LINE WAS MISSING IN THE PREVIOUS SNIPPET
      const priceSpan = item.querySelector('.zone-price');
      
      if (!priceSpan || zoneName === 'PJM') return;

      const lmpData = data.readings[zoneName];
      const lmp = lmpData ? lmpData[activePriceType] : null;
      
      priceSpan.innerText = lmp != null ? `$${lmp.toFixed(2)}` : 'N/A';
      
      if (lmp != null) {
        // Pass currentScale here as well
        priceSpan.style.color = getColorForLmp(lmp, currentScale);
      } else {
        priceSpan.style.color = '#000000';
      }
    });
}

function displayCurrentFilter() {
  const container = document.getElementById('top-filter-display');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const selectedDays = filter.daysOfWeek.map((isSelected, i) => isSelected ? days[i] : null).filter(day => day).join(', ');
  const html = `
    <ul>
      <li><strong>Dates:</strong> ${filter.startDate.toLocaleDateString()} to ${filter.endDate.toLocaleDateString()}</li>
      <li><strong>Time:</strong> ${filter.startTime}:00 - ${filter.endTime}:00</li>
      <li><strong>Days:</strong> ${selectedDays || 'None'}</li>
    </ul>
  `;
  container.innerHTML = html;
}

const map = new maplibregl.Map({ container: "map", zoom: 5.1, center: [-81.5, 38.6], pitch: 10, hash: true, style: 'https://wms.wheregroup.com/tileserver/style/osm-bright.json', attributionControl: false });
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));
map.addControl(new maplibregl.AttributionControl(), 'bottom-right');

map.on('load', async () => {
    let zoneShapes;
    try {
        const zonesResponse = await fetch(`${API_BASE_URL}/api/zones`);
        if (!zonesResponse.ok) throw new Error(`Failed to fetch zones: ${zonesResponse.statusText}`);
        zoneShapes = await zonesResponse.json();
        zoneShapes.features.forEach(f => { f.properties.Zone_Name = f.properties.zone_name; });
    } catch (error) {
        alert(`CRITICAL ERROR: Could not load zone shapes. ${error.message}`);
        return;
    }
    
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(document.getElementById('map-container'));
    const labelFeatures = [];
    for (const feature of zoneShapes.features) {
        const zoneName = feature.properties.Zone_Name;
        if (ZONE_LABEL_OVERRIDES[zoneName]) {
            for (const overrideCoords of ZONE_LABEL_OVERRIDES[zoneName]) { labelFeatures.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [overrideCoords[1], overrideCoords[0]] }, properties: { Zone_Name: zoneName } }); }
        } else { labelFeatures.push({ type: 'Feature', geometry: { type: 'Point', coordinates: d3.geoCentroid(feature) }, properties: { Zone_Name: zoneName } }); }
    }
    const labelData = { type: 'FeatureCollection', features: labelFeatures };
    map.addSource('zoneShapes', { type: 'geojson', data: zoneShapes });
    map.addSource('zoneLabelPoints', { type: 'geojson', data: labelData });
    map.addLayer({ id: 'zoneFill', type: 'fill', source: 'zoneShapes', paint: { "fill-color": '#cccccc', "fill-opacity": 0.7 } });
    map.addLayer({ id: 'zoneLines', 'type': 'line', 'source': 'zoneShapes', 'paint': { 'line-color': '#000', 'line-width': 1.5 } });
    map.addLayer({ id: 'zoneLabels', type: 'symbol', source: 'zoneLabelPoints', layout: { 'text-field': ['get', 'Zone_Name'], 'text-size': 12, 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { 'text-color': '#000000', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1 } });

    // Function to build the Map legend 
    // 👇 It must accept 'currentScale' as an argument
    function buildLegend(currentScale) {
      const container = document.getElementById('legend');
      // Safety check: if scale is missing, default to the standard one
      if (!currentScale) currentScale = COLOR_SCALE; 
      if (!container) return;

      let html = '<strong>LMP ($/MWh)</strong>';

      currentScale.forEach((item, index) => {
        const color = item.color;
        const threshold = item.threshold;
        let label;

        if (index === 0) {
          label = `≥ $${threshold}`;
        } else if (threshold === -Infinity) {
          const prev = currentScale[index - 1].threshold;
          label = `< $${prev}`;
        } else {
          const prev = currentScale[index - 1].threshold;
          label = `$${threshold} – $${prev}`;
        }

        html += `
          <div class="legend-item">
            <span class="legend-color" style="background-color: ${color};"></span>
            <span>${label}</span>
          </div>
        `;
      });

      container.innerHTML = html;
    }

    buildLegend(COLOR_SCALE); 
    
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
    map.on('mousemove', 'zoneFill', (e) => {
        if (!e.features[0] || timeSeriesData.length === 0) return;
        const zone = e.features[0].properties.Zone_Name;
        const lmpData = timeSeriesData[currentIndex]?.readings[zone];
        const lmp = lmpData ? lmpData[activePriceType] : null;
        
        // Formatting the label (DA, RT, or NET)
        const label = activePriceType === 'da' ? 'Day-Ahead' : 
                      activePriceType === 'rt' ? 'Real-Time' : 'NET';

        popup.setLngLat(e.lngLat)
             .setHTML(`<div><strong>${zone}</strong><br>${label}: ${lmp != null ? '$' + lmp.toFixed(2) : 'N/A'}</div>`)
             .addTo(map);
    });
    map.on('mouseleave', 'zoneFill', () => { popup.remove(); });
    
    // List Logic
    zones = zoneShapes.features.map(f => ({ name: f.properties.Zone_Name, center: d3.geoCentroid(f) })).sort((a, b) => a.name.localeCompare(b.name));
    zones.unshift({ name: "PJM" });
    const zoneListElement = document.getElementById('zone-list');
    
    zoneListElement.innerHTML = zones.map(zone => `
      <div class="zone-item" data-zone-name="${zone.name}">
        <span class="zone-name">${zone.name}</span>
        <span class="zone-price"></span>
      </div>
    `).join('');

    function selectZone(selectedZoneName) {
        zoneListElement.querySelector('.selected')?.classList.remove('selected');
        zoneListElement.querySelector(`.zone-item[data-zone-name="${selectedZoneName}"]`)?.classList.add('selected');
        if (selectedZoneName === 'PJM') { map.flyTo({ center: [-81.5, 38.6], zoom: 5.1, pitch: 10, essential: true }); map.setPaintProperty('zoneLines', 'line-width', 1.5); }
        else { const z = zones.find(z => z.name === selectedZoneName); if (z) { map.flyTo({ center: z.center, zoom: 6.5, pitch: 20, essential: true }); map.setPaintProperty('zoneLines', 'line-width', ['case', ['==', ['get', 'Zone_Name'], selectedZoneName], 3, 1.5]); } }
    }
    
    zoneListElement.addEventListener('click', (e) => {
      const item = e.target.closest('.zone-item');
      if (item) selectZone(item.dataset.zoneName);
    });
    map.on('click', 'zoneFill', (e) => { if (e.features.length > 0) selectZone(e.features[0].properties.Zone_Name); });
    
    playBtn.disabled = true;
    slider.disabled = true;
    filterBtn.addEventListener('click', () => { window.location.href = '/picker'; });
    document.querySelector('.price-selector').addEventListener('change', (e) => {
        activePriceType = e.target.value;
        
        // Determine which scale to use
        const newScale = (activePriceType === 'net') ? NET_COLOR_SCALE : COLOR_SCALE;
        
        // Rebuild the legend
        buildLegend(newScale);
        if (timeSeriesData.length > 0) {
            updateAnimation(currentIndex);
        }
    });

    // restart animation from the beginning
    playBtn.onclick = () => {
        if (timer) {
            clearInterval(timer);
            timer = null;
            playBtn.innerText = 'Play';
        } else {
            if (currentIndex >= timeSeriesData.length - 1) {
                updateAnimation(0);
            }
            
            playBtn.innerText = 'Pause';
            timer = setInterval(() => {
                const nextIndex = currentIndex + 1;
                if (nextIndex >= timeSeriesData.length) {
                    clearInterval(timer);
                    timer = null;
                    playBtn.innerText = 'Play';
                } else {
                    updateAnimation(nextIndex);
                }
            }, 500);
        }
    };
    slider.oninput = (e) => { if (timer) { clearInterval(timer); timer = null; playBtn.innerText = 'Play'; } updateAnimation(parseInt(e.target.value)); };
    
    selectZone('PJM');

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('fetch') === 'true') {
      displayCurrentFilter();
      fetchLmpData();
    } else if (document.referrer.includes('/picker')) {
      displayCurrentFilter();
    } else {
      document.getElementById('top-filter-display').innerHTML = '<ul><li>-- None Selected --</li></ul>';
    }
});
```