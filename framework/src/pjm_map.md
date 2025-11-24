---
html: |
  <link rel="stylesheet" href="npm:maplibre-gl/dist/maplibre-gl.css">
---
# Interactive PJM Map
---

<div id="main-container">
  <div id="map-container">
    <div id="map"></div>
  </div>
  <div id="zone-list-container">
    <h4>PJM Zones</h4>
    <div id="zone-list">
      <!-- Zone names will be dynamically inserted here -->
    </div>
  </div>
</div>

<style>
  /* CSS is unchanged */
  #main-container {
    display: flex;
    width: 1120px;
    border: 1px solid #ccc;
    border-radius: 5px;
  }

  #map-container {
    flex: 1;
    height: 600px; 
  }
  #map { 
    height: 100%; 
    width: 100%; 
  }

  #zone-list-container {
    width: 320px;
    height: 600px;
    border-left: 1px solid #ccc;
    background: #f8f9fa;
    font-family: sans-serif;
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
// JavaScript updated to handle zone selection opacity
import maplibregl from "npm:maplibre-gl";
import * as d3 from "npm:d3";

const zoneShapes = await FileAttachment("data/PJM_zones.geojson").json();

const map = new maplibregl.Map({
  container: "map",
  zoom: 5,
  center: [-80.45, 38.6],
  pitch: 10,
  hash: true,
  style: 'https://wms.wheregroup.com/tileserver/style/osm-bright.json'
});

map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));

map.on('load', () => {
  map.addSource('zoneShapes', { type: 'geojson', data: zoneShapes });
  map.addLayer({ 
    id: 'zoneFill', 
    type: 'fill', 
    source: 'zoneShapes', 
    paint: { 
      "fill-color": '#088', 
      "fill-opacity": 0.1 // Default opacity
    } 
  });
  map.addLayer({ id: 'zoneLines', type: 'line', source: 'zoneShapes', paint: { "line-color": '#000', "line-width": 1.5 } });

  if (zoneShapes && zoneShapes.features) {
    const zones = zoneShapes.features.map(feature => {
      const zoneName = (feature.properties && feature.properties.Zone_Name) ? feature.properties.Zone_Name : 'Unnamed Zone';
      return {
        name: zoneName,
        center: d3.geoCentroid(feature)
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    zones.unshift({ name: "PJM" });

    const zoneListElement = document.getElementById('zone-list');
    zoneListElement.innerHTML = '';

    zones.forEach(zone => {
      const item = document.createElement('div');
      item.className = 'zone-item';
      item.textContent = zone.name;
      item.dataset.zoneName = zone.name;
      zoneListElement.appendChild(item);
    });

    zoneListElement.addEventListener('click', (event) => {
      if (event.target && event.target.classList.contains('zone-item')) {
        const selectedZoneName = event.target.dataset.zoneName;

        const previouslySelected = zoneListElement.querySelector('.selected');
        if (previouslySelected) {
          previouslySelected.classList.remove('selected');
        }
        event.target.classList.add('selected');
        
        if (selectedZoneName === 'PJM') {
          map.flyTo({ center: [-80.45, 38.6], zoom: 5, pitch: 10, essential: true });
          // Reset opacity for all zones
          map.setPaintProperty('zoneFill', 'fill-opacity', 0.1);
        } else {
          const selectedZone = zones.find(z => z.name === selectedZoneName);
          if (selectedZone) {
            map.flyTo({ center: selectedZone.center, zoom: 6, pitch: 20, essential: true });
            // Highlight selected zone by increasing its opacity
            map.setPaintProperty('zoneFill', 'fill-opacity', [
              'case',
              ['==', ['get', 'Zone_Name'], selectedZoneName],
              0.3, // Opacity for the selected zone (increased by 20%)
              0.1  // Default opacity for all other zones
            ]);
          }
        }
      }
    });
  } else {
    console.error("Could not find any 'features' in the GeoJSON data.");
  }
});
```