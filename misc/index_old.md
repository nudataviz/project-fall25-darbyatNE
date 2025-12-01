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
    width: 100%; 
    max-width: 1120px;
    border: 1px solid #ccc;
    border-radius: 5px;
    font-family: sans-serif;
  }

  #map-container {
    flex: 1;
    height: 600px; 
    display: flex;
    flex-direction: column;
    position: relative; 
    min-width: 0; 
  }
  #map { 
    height: calc(100% - 40px); 
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
    font-size: 16px;
    min-width: 150px;
    text-align: right;
  }

  #zone-list-container {
    width: 170px;
    height: 600px;
    border-left: 1px solid #ccc;
    background: #f8f9fa;
    flex-shrink: 0; 
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

// --- Data Load ---
const zoneShapes = await FileAttachment("data/zones.json").json();
const lmpData = await FileAttachment("data/lmp_data.csv").csv({typed: true});

// --- NEW: Configuration for Label Overrides ---
const ZONE_LABEL_OVERRIDES = {
    "AEP": [[40.9, -84.4], [39.03, -82.55]],
    "APS": [[39.14, -79.8], [41.46, -78.2]],
    "COMED": [[41.95, -88.67]],
    "DAY": [[40.02, -84.42]],
    "DPL": [[38.74, -75.68]],
    "DOM": [[37.52, -77.65]],
    "DUQ": [[40.44, -79.96]],
    "EKPC": [[37.19, -85.17], [38.25, -83.60]],
    "FE-ATSI": [[41.2, -81.52]],
    "METED": [[40.37, -76.45], [40.86, -75.25]],
    "LGE": [[38.00, -85.06]],
    "PECO": [[40.10, -75.39]],
    "RECO": [[41.13, -74.34]],
    "JCPL": [[40.13, -74.24], [40.97, -74.6]]
};

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

const COLOR_SCALE = [
  { threshold: 100, color: '#b30000' }, { threshold: 75, color: '#dc3545' },
  { threshold: 62, color: '#ff5500' }, { threshold: 52, color: '#ff7b00' },
  { threshold: 44, color: '#ff9900' }, { threshold: 37, color: '#ffc107' },
  { threshold: 30, color: '#99cc33' }, { threshold: 25, color: '#00cc66' },
  { threshold: 20, color: '#00aaff' }, { threshold: 0, color: '#007bff' },
  { threshold: -Infinity, color: '#800080' }
];

function getColorForLmp(lmp) {
  if (lmp == null) return '#cccccc';
  for (const s of COLOR_SCALE) {
    if (lmp >= s.threshold) return s.color;
  }
  return '#cccccc';
}

const map = new maplibregl.Map({
  container: "map",
  zoom: 5,
  center: [-80.45, 38.6],
  pitch: 10,
  hash: true,
  style: 'https://wms.wheregroup.com/tileserver/style/osm-bright.json'
});

map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));
let currentIndex = 0;
let timer = null;

map.on('load', () => {
  const resizeObserver = new ResizeObserver(() => map.resize());
  resizeObserver.observe(document.getElementById('map-container'));

  map.addSource('zoneShapes', { type: 'geojson', data: zoneShapes });
  
  // --- Create a dedicated data source for labels using overrides ---
  const labelFeatures = [];
  for (const feature of zoneShapes.features) {
    const zoneName = feature.properties.Zone_Name;
    if (ZONE_LABEL_OVERRIDES[zoneName]) {
      // Use override coordinates if they exist
      for (const overrideCoords of ZONE_LABEL_OVERRIDES[zoneName]) {
        labelFeatures.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [overrideCoords[1], overrideCoords[0]] }, // lng, lat
          properties: { Zone_Name: zoneName }
        });
      }
    } else {
      // Otherwise, fall back to the calculated centroid
      const centroid = d3.geoCentroid(feature);
      labelFeatures.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: centroid },
        properties: { Zone_Name: zoneName }
      });
    }
  }
  const labelData = { type: 'FeatureCollection', features: labelFeatures };

  // Add the new, dedicated source for label points
  map.addSource('zoneLabelPoints', { type: 'geojson', data: labelData });

  map.addLayer({ 
    id: 'zoneFill', type: 'fill', source: 'zoneShapes', 
    paint: { "fill-color": '#cccccc', "fill-opacity": 0.7 } 
  });
  map.addLayer({ 
    id: 'zoneLines', type: 'line', source: 'zoneShapes', 
    paint: { "line-color": '#000', "line-width": 1.5 } 
  });

  // Update the labels layer to use the new point source
  map.addLayer({
    id: 'zoneLabels',
    type: 'symbol',
    source: 'zoneLabelPoints', // Use the new dedicated source
    layout: {
      'text-field': ['get', 'Zone_Name'],
      'text-size': 12,
      'text-allow-overlap': true,
      'text-ignore-placement': true
    },
    paint: {
      'text-color': '#000000',
      'text-halo-color': '#FFFFFF',
      'text-halo-width': 1,
      'text-halo-blur': 1
    }
  });

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

  function selectZone(selectedZoneName) {
    zoneListElement.querySelector('.selected')?.classList.remove('selected');
    zoneListElement.querySelector(`.zone-item[data-zone-name="${selectedZoneName}"]`)?.classList.add('selected');
    
    if (selectedZoneName === 'PJM') {
      map.flyTo({ center: [-80.45, 38.6], zoom: 5, pitch: 10, essential: true });
      map.setPaintProperty('zoneLines', 'line-width', 1.5);
    } else {
      const selectedZone = zones.find(z => z.name === selectedZoneName);
      if (selectedZone) {
        map.flyTo({ center: selectedZone.center, zoom: 6, pitch: 20, essential: true });
        map.setPaintProperty('zoneLines', 'line-width', [
          'case',
          ['==', ['get', 'Zone_Name'], selectedZoneName], 6,
          1.5
        ]);
      }
    }
  }

  function update(index) {
    currentIndex = index;
    document.getElementById('slider').value = index;
    
    const data = timeSeriesData[index];
    if (!data) return;
    
    const date = new Date(data.datetime);
    const hour = date.getHours();
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }); 
    document.getElementById('time-display').innerText = `${dayOfWeek} | ${date.toLocaleDateString()} | ${hour}:00-${hour+1}:00`;
    
    const colorExpression = ['case'];
    for (const zone in data.readings) {
      colorExpression.push(['==', ['get', 'Zone_Name'], zone], getColorForLmp(data.readings[zone]));
    }
    colorExpression.push('#cccccc');
    
    map.setPaintProperty('zoneFill', 'fill-color', colorExpression);
  }

  zoneListElement.addEventListener('click', (e) => {
    const zoneItem = e.target.closest('.zone-item');
    if (zoneItem) {
      selectZone(zoneItem.dataset.zoneName);
    }
  });
  
  map.on('click', 'zoneFill', (e) => {
    if (e.features.length > 0) {
      selectZone(e.features[0].properties.Zone_Name);
    }
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
      }, 500);
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

  document.getElementById('slider').max = timeSeriesData.length - 1;
  update(0);
  selectZone('PJM');
});
```
