---
html: |
  <link rel="stylesheet" href="npm:maplibre-gl/dist/maplibre-gl.css">
---
# Interactive PJM LMP Map

<div id="main-container">
  <div id="map-container">
    <div id="map"></div>
    <div id="controls-container">
      <button id="play-btn">Play</button>
      <input type="range" id="slider" min="0" max="1" value="0" style="flex-grow: 1; margin: 0 10px;">
      <div id="time-display">Loading...</div>
    </div>
  </div>
  <div id="zone-list-container">
    <h4>PJM Zones</h4>
    <div id="zone-list">
      <!-- Zone names dynamically added -->
    </div>
  </div>
</div>

<style>
  #main-container {
    display: flex;
    width: 1120px;
    border: 1px solid #ccc;
    border-radius: 5px;
    font-family: sans-serif;
  }

  #map-container {
    flex: 1;
    height: 600px; 
    display: flex;
    flex-direction: column;
  }
  #map { 
    height: calc(100% - 40px); /* Adjust height to make room for controls */
    width: 100%; 
  }

  #controls-container {
    height: 40px;
    display: flex;
    align-items: center;
    padding: 0 15px;
    border-top: 1px solid #ccc;
    background: #f8f9fa;
  }
  #time-display {
    font-size: 12px;
    min-width: 150px;
    text-align: right;
  }

  #zone-list-container {
    width: 320px;
    height: 600px;
    border-left: 1px solid #ccc;
    background: #f8f9fa;
  }

  #zone-list-container h4 {
    height: 30px;
    padding: 0 15px;
    margin: 0;
    border-bottom: 1px solid #ccc;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  #zone-list {
    height: calc(600px - 30px);
    box-sizing: border-box;
    overflow-y: auto;
  }

  .zone-item {
    padding: 3px 15px;
    cursor: pointer;
    border-bottom: 1px solid #e9ecef;
    font-size: 12px;
  }
  .zone-item:hover {
    background-color: #e2e6ea;
  }
  .zone-item.selected {
    background-color: #007bff;
    color: white;
    font-weight: bold;
  }
</style>

```js
import maplibregl from "npm:maplibre-gl";
import * as d3 from "npm:d3";

// --- MERGED FROM SCRIPT 1: DATA LOADING & PROCESSING ---
const zoneShapes = await FileAttachment("data/zones.json").json();
const lmpData = await FileAttachment("data/lmp_data.csv").csv({typed: true});

const timeSeriesData = [];
const dataByTimestamp = {};

for (const row of lmpData) {
  if (!dataByTimestamp[row.datetime]) {
    dataByTimestamp[row.datetime] = { datetime: row.datetime, readings: {} };
  }
  dataByTimestamp[row.datetime].readings[row.zone] = row.lmp;
}

for (const timestamp of Object.keys(dataByTimestamp).sort()) {
  timeSeriesData.push(dataByTimestamp[timestamp]);
}

// --- MERGED FROM SCRIPT 1: COLOR LOGIC ---
const COLOR_SCALE = [
  { threshold: 100, color: '#b30000' }, { threshold: 75, color: '#dc3545' },
  { threshold: 62, color: '#ff5500' }, { threshold: 52, color: '#ff7b00' },
  { threshold: 44, color: '#ff9900' }, { threshold: 37, color: '#ffc107' },
  { threshold: 30, color: '#99cc33' }, { threshold: 25, color: '#00cc66' },
  { threshold: 20, color: '#00aaff' }, { threshold: 0, color: '#007bff' },
  { threshold: -Infinity, color: '#800080' }
];

function getColorForLmp(lmp) {
  if (lmp == null) return '#cccccc'; // Use a neutral grey for null
  for (const s of COLOR_SCALE) {
    if (lmp >= s.threshold) return s.color;
  }
  return '#cccccc';
}

// --- FROM SCRIPT 2: MAP INITIALIZATION ---
const map = new maplibregl.Map({
  container: "map",
  zoom: 5,
  center: [-80.45, 38.6],
  pitch: 10,
  hash: true,
  style: 'https://wms.wheregroup.com/tileserver/style/osm-bright.json'
});

map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));

// --- MERGED: GLOBAL STATE VARIABLES ---
let currentIndex = 0;
let timer = null;

map.on('load', () => {
  map.addSource('zoneShapes', { type: 'geojson', data: zoneShapes });
  
  // MERGED: Layers now handle both color (from price) and opacity (from selection)
  map.addLayer({ 
    id: 'zoneFill', 
    type: 'fill', 
    source: 'zoneShapes', 
    paint: { 
      "fill-color": '#cccccc', // Initial neutral color
      "fill-opacity": 0.7
    } 
  });
  map.addLayer({ 
    id: 'zoneLines', 
    type: 'line', 
    source: 'zoneShapes', 
    paint: { "line-color": '#000', "line-width": 1.5 } 
  });

  // --- FROM SCRIPT 1: POPUP ON HOVER ---
  const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
  map.on('mousemove', 'zoneFill', (e) => {
    if (!e.features[0]) return;
    const zone = e.features[0].properties.Zone_Name;
    const lmp = timeSeriesData[currentIndex]?.readings[zone];
    popup.setLngLat(e.lngLat)
      .setHTML(`<div><strong>${zone}</strong><br>LMP: ${lmp != null ? '$' + lmp.toFixed(2) : 'N/A'}</div>`)
      .addTo(map);
  });
  map.on('mouseleave', 'zoneFill', () => { popup.remove(); });

  // --- FROM SCRIPT 2: ZONE LIST CREATION ---
  const zones = zoneShapes.features.map(feature => ({
    name: feature.properties.Zone_Name,
    center: d3.geoCentroid(feature)
  })).sort((a, b) => a.name.localeCompare(b.name));
  zones.unshift({ name: "PJM" });

  const zoneListElement = document.getElementById('zone-list');
  zones.forEach(zone => {
    const item = document.createElement('div');
    item.className = 'zone-item';
    item.textContent = zone.name;
    item.dataset.zoneName = zone.name;
    zoneListElement.appendChild(item);
  });

  // --- FROM SCRIPT 2: SELECTION LOGIC (MODIFIED) ---
  function selectZone(selectedZoneName) {
    zoneListElement.querySelector('.selected')?.classList.remove('selected');
    zoneListElement.querySelector(`.zone-item[data-zone-name="${selectedZoneName}"]`)?.classList.add('selected');
    
    if (selectedZoneName === 'PJM') {
      map.flyTo({ center: [-80.45, 38.6], zoom: 5, pitch: 10, essential: true });
      map.setPaintProperty('zoneFill', 'fill-opacity', 0.7); // Reset opacity for all
    } else {
      const selectedZone = zones.find(z => z.name === selectedZoneName);
      if (selectedZone) {
        map.flyTo({ center: selectedZone.center, zoom: 6.5, pitch: 20, essential: true });
        // Set opacity based on selection, leaving color to be controlled by price
        map.setPaintProperty('zoneFill', 'fill-opacity', [
          'case',
          ['==', ['get', 'Zone_Name'], selectedZoneName], 0.9, // Higher opacity for selected
          0.6 // Lower opacity for others
        ]);
      }
    }
  }

  // --- FROM SCRIPT 1: UPDATE & ANIMATION LOGIC ---
  function update(index) {
    currentIndex = index;
    document.getElementById('slider').value = index;
    
    const data = timeSeriesData[index];
    if (!data) return;
    
    const date = new Date(data.datetime);
    const hour = date.getHours();
    document.getElementById('time-display').innerText = `${date.toLocaleDateString()} | ${hour}:00-${hour+1}:00`;
    
    const colorExpression = ['case'];
    for (const zone in data.readings) {
      colorExpression.push(['==', ['get', 'Zone_Name'], zone], getColorForLmp(data.readings[zone]));
    }
    colorExpression.push('#cccccc');
    
    map.setPaintProperty('zoneFill', 'fill-color', colorExpression);
  }

  // --- MERGED: EVENT LISTENERS ---
  zoneListElement.addEventListener('click', (e) => {
    if (e.target?.classList.contains('zone-item')) selectZone(e.target.dataset.zoneName);
  });
  map.on('click', 'zoneFill', (e) => {
    if (e.features.length > 0) selectZone(e.features[0].properties.Zone_Name);
  });

  document.getElementById('play-btn').onclick = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
      document.getElementById('play-btn').innerText = 'Play';
    } else {
      document.getElementById('play-btn').innerText = 'Pause';
      timer = setInterval(() => {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= timeSeriesData.length) {
          clearInterval(timer);
          timer = null;
          document.getElementById('play-btn').innerText = 'Play';
        } else {
          update(nextIndex);
        }
      }, 500); // 500ms interval for a smoother animation
    }
  };

  document.getElementById('slider').oninput = (e) => {
    if (timer) {
      clearInterval(timer);
      timer = null;
      document.getElementById('play-btn').innerText = 'Play';
    }
    update(parseInt(e.target.value));
  };

  // --- INITIALIZE ---
  document.getElementById('slider').max = timeSeriesData.length - 1;
  update(0); // Set initial state
  selectZone('PJM'); // Set initial view
});
```

---

### How It Works: The Breakdown

1.  **Unified HTML & CSS:**
    *   We've kept the `main-container` layout from your second script (map on left, list on right).
    *   The animation controls (Play button, slider, time display) from the first script have been moved into a new `controls-container` directly below the map, keeping the UI clean.

2.  **Combined Data Loading:**
    *   The script now loads **both** `zones.json` (for shapes) and `lmp_data.csv` (for prices) right at the beginning.
    *   All the data processing logic from your first script (creating `timeSeriesData`, the `COLOR_SCALE`, and `getColorForLmp` function) is included.

3.  **The Core Logic: Coexistence**
    This is the most important part. We've made the two systems work together instead of fighting for control of the map layers.
    *   The **`update()` function** (from script 1) is now solely responsible for **`fill-color`**. On every tick of the animation or slide of the scrubber, it recalculates the colors of all zones based on price and applies them.
    *   The **`selectZone()` function** (from script 2) is now solely responsible for the camera (`flyTo`) and **`fill-opacity`**. When you click a zone, it makes that zone *more opaque* and all other zones slightly less opaque, creating a "highlight" effect without overriding the price color.

4.  **Unified Event Handling:**
    *   All event listeners (`map.on('click')`, `zoneList.addEventListener`, `play-btn.onclick`, `slider.oninput`) are now in one place.
    *   They call their respective functions (`selectZone` or `update`) to trigger the correct behavior.

### Next Steps

1.  **Replace your `index.md`:** Copy the entire block of code above and use it to overwrite your `index.md` file.
2.  **Check File Paths:** Make sure your data files are still correctly located at `data/zones.json` and `data/lmp_data.csv` relative to your `index.md`.
3.  **Run it:** Start your development server (`npm run dev`) and you should see your new, combined application.

You now have a single, powerful visualization that leverages the strengths of both your previous scripts.
