# PJM LMP Visualization

Observable loads dataloaders at build time, so dynamic SQL queries will require some additional backend like FastAPI. For the sake of testing this out, edit lmp_data.csv.js to change the hardcoded date ranges.

```js
import maplibregl from "npm:maplibre-gl";
import * as d3 from "npm:d3";

// Load zone shapes and LMP data
const zoneShapes = await FileAttachment("data/zones.json").json();
const lmpData = await FileAttachment("data/lmp_data.csv").csv({typed: true});

// Process LMP data into time series
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

// Color scale
const COLOR_SCALE = [
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

function getColorForLmp(lmp) {
  if (lmp == null) return '#808080';
  for (const s of COLOR_SCALE) {
    if (lmp > s.threshold) return s.color;
  }
  return '#808080';
}
```

<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.0.0/dist/maplibre-gl.css">

<style>
  /* Disable all MapLibre transitions for instant updates */
  .maplibregl-canvas-container canvas {
    transition: none !important;
  }
</style>

<div id="map" style="width: 100%; height: 600px;"></div>

<button id="play-btn">Play</button>
<input type="range" id="slider" min="0" max="${timeSeriesData.length - 1}" value="0">
<div id="time-display"></div>

```js
const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256
      }
    },
    layers: [{
      id: 'osm',
      type: 'raster',
      source: 'osm'
    }],
    transition: {
      duration: 0,
      delay: 0
    }
  },
  center: [-80, 40],
  zoom: 5.5,
  fadeDuration: 0
});

map.addControl(new maplibregl.NavigationControl());

let currentIndex = 0;
let timer = null;
let started = false;

map.on('load', () => {
  map.addSource('zones', {
    type: 'geojson',
    data: zoneShapes
  });
  
  map.addLayer({
    id: 'fills',
    type: 'fill',
    source: 'zones',
    paint: {
      'fill-color': '#808080',
      'fill-opacity': 0.7
    }
  });
  
  map.addLayer({
    id: 'borders',
    type: 'line',
    source: 'zones',
    paint: {
      'line-color': '#fff',
      'line-width': 2
    }
  });
  
  map.addLayer({
    id: 'labels',
    type: 'symbol',
    source: 'zones',
    layout: {
      'text-field': ['get', 'Zone_Name'],
      'text-size': 11
    },
    paint: {
      'text-color': '#000',
      'text-halo-color': '#fff',
      'text-halo-width': 2
    }
  });
  
  const popup = new maplibregl.Popup({ 
    closeButton: false,
    closeOnClick: false
  });
  
  map.on('mousemove', 'fills', (e) => {
    if (!e.features[0]) return;
    const zone = e.features[0].properties.Zone_Name;
    const lmp = timeSeriesData[currentIndex]?.readings[zone];
    popup.setLngLat(e.lngLat)
      .setHTML(`<div><strong>${zone}</strong><br>LMP: ${lmp != null ? '$' + lmp.toFixed(2) : 'N/A'}</div>`)
      .addTo(map);
  });
  
  map.on('mouseleave', 'fills', () => {
    popup.remove();
  });
});

function update(index) {
  currentIndex = index;
  document.getElementById('slider').value = index;
  
  const data = timeSeriesData[index];
  if (!data) return;
  
  const date = new Date(data.datetime);
  const hour = date.getHours();
  document.getElementById('time-display').innerText = `${date.toLocaleDateString()} | ${hour}:00-${hour+1}:00`;
  
  const expr = ['case'];
  for (const zone in data.readings) {
    expr.push(['==', ['get', 'Zone_Name'], zone], getColorForLmp(data.readings[zone]));
  }
  expr.push('#808080');
  
  map.setPaintProperty('fills', 'fill-color', expr);
  
  if (started) {
    const labelExpr = ['case'];
    for (const zone in data.readings) {
      const lmp = data.readings[zone];
      labelExpr.push(['==', ['get', 'Zone_Name'], zone], lmp != null ? '$' + lmp.toFixed(2) : 'N/A');
    }
    labelExpr.push(['get', 'Zone_Name']);
    map.setLayoutProperty('labels', 'text-field', labelExpr);
  }
}

document.getElementById('play-btn').onclick = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
    document.getElementById('play-btn').innerText = 'Play';
  } else {
    if (!started) {
      started = true;
      update(currentIndex);
    }
    document.getElementById('play-btn').innerText = 'Pause';
    timer = setInterval(() => {
      if (currentIndex >= timeSeriesData.length - 1) {
        clearInterval(timer);
        timer = null;
        document.getElementById('play-btn').innerText = 'Play';
      } else {
        update(currentIndex + 1);
      }
    }, 1000);
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

update(0);
```

---

## Charts

```js
const filteredData = lmpData;
```

```js
Plot.plot({
  marginLeft: 60,
  width,
  height: 400,
  y: { grid: true, label: "LMP ($/MWh)" },
  x: { label: "Date/Time" },
  color: {
    legend: true,
    domain: Array.from(new Set(filteredData.map(d => d.zone))).sort(),
    scheme: "tableau10"
  },
  marks: [
    Plot.ruleY([0], {stroke: "#e0e0e0"}),
    Plot.line(filteredData, {
      x: d => new Date(d.datetime),
      y: "lmp",
      stroke: "zone",
      strokeWidth: 2.5,
      tip: true
    })
  ]
})
```

```js
Inputs.table(filteredData, {
  columns: ["zone", "datetime", "lmp"],
  header: {
    zone: "Zone",
    datetime: "Date/Time",
    lmp: "LMP ($/MWh)"
  },
  format: {
    datetime: d => new Date(d).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    lmp: d => `$${d.toFixed(2)}`
  },
  sort: "datetime",
  reverse: true,
  rows: 20
})
```