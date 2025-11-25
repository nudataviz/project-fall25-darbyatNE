# Reactive

```js
import maplibregl from "npm:maplibre-gl";
```

```js
async function fetchZoneShapes() {
  try {
    const response = await fetch('http://127.0.0.1:8000/api/zones');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const geojsonData = await response.json();
    // The last feature seems to be a bounding box.
    geojsonData.features.pop();
    return geojsonData;
  } catch (error) {
    display(error);
    display(`ERROR: Could not load zone shapes.`);
    return {type: "FeatureCollection", features: []};
  }
}
```

```js
const zoneShapes = await fetchZoneShapes();
```

```js
const mapContainer = html`<div style="height: 600px; width: 100%;"></div>`
```

```js
const map = (async () => {
  const container = mapContainer;
  
  const map = new maplibregl.Map({
    container: container,
    zoom: 5,
    center: [-80.45, 38.6],
    style: 'https://demotiles.maplibre.org/style.json'
  });

  map.addControl(new maplibregl.NavigationControl());

  await map.once('load');
  
  return map;
})();
```

```js
{
  const source = map.getSource("zoneShapes");
  if (source) {
    source.setData(zoneShapes);
  } 
  else {
    map.addSource("zoneShapes", {
      type: "geojson",
      data: zoneShapes
    });

    map.addLayer({
      id: "zoneShapes-fill",
      type: "fill",
      source: "zoneShapes",
      paint: {
        "fill-color": "#088",
        "fill-opacity": 0.6
      }
    });
  }

  if (zoneShapes.features.length > 0) {
    const bounds = new maplibregl.LngLatBounds();
    zoneShapes.features.forEach(feature => {
      const coords = feature.geometry.coordinates;
      if (feature.geometry.type === 'Point') {
        bounds.extend(coords);
      } else if (feature.geometry.type === 'LineString') {
        coords.forEach(c => bounds.extend(c));
      } else if (feature.geometry.type === 'Polygon') {
        coords.forEach(ring => ring.forEach(c => bounds.extend(c)));
      }
    });
    map.fitBounds(bounds, {padding: 40, duration: 1000});
  }
}
```