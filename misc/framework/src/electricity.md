# electricity demo

* MapLibre examples
  * [Add a GeoJSON polygon](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-geojson-polygon/)
  * [Fit a map to a bounding box](https://maplibre.org/maplibre-gl-js/docs/examples/fit-a-map-to-a-bounding-box/)
* MapLibre in Framework
  * [Pangea Proxima](https://observablehq.observablehq.cloud/pangea/party/maplibre-gl#12/47.27574/11.39085/0/52)
   * this Fil demo shows how to get MapLibre up and running in Framework
 * [pangea](https://github.com/Fil/pangea/blob/main/src/party/maplibre-gl.md?plain=1) -- github
* [d3-geo: spherical math](https://d3js.org/d3-geo/math) -- d3js.org

<!-- Don't use html code blocks or they won't load in time -->
<div id="map" style="width: 100%; height: 450px;"></div>
<link rel="stylesheet" href="npm:maplibre-gl/dist/maplibre-gl.css">

```js echo
import maplibregl from "npm:maplibre-gl";
```

```js echo
const map = new maplibregl.Map({
    container: 'map',
    style: 'https://demotiles.maplibre.org/style.json',
    center: geoCentroid,
    zoom: 1
});

map.fitBounds(geoBounds);

map.addControl(
  new maplibregl.NavigationControl({
    visualizePitch: true,
    showZoom: true,
    showCompass: true
  })
);

map.on('load', () => {
    map.addSource('zoneShapes', {
      type: 'geojson',
      data: zoneShapes
    });

    map.addLayer({
        id: 'zoneFill',
        type: 'fill',
        source: 'zoneShapes',
        layout: {},
        paint: {
            "fill-color": '#088',
            "fill-opacity": 0.8,
        }
    });

    map.addLayer({
        'id': 'zoneLines',
        'type': 'line',
        'source': 'zoneShapes',
        'layout': {},
        'paint': {
            "line-color": '#333',
            "line-width": 1,
        }
    });
});
```

## data

```js echo
let zoneShapes = await FileAttachment("data/PJM_zones.geojson").json();

// The last features seems to be a bounding box for a larger domain
zoneShapes.features.pop();

display(zoneShapes)

const geoCentroid = d3.geoCentroid(zoneShapes);
const geoBounds = d3.geoBounds(zoneShapes);
display(geoCentroid)
display(geoBounds)
```

```js
async function fetchZoneShapes() {
  try {
    const response = await fetch('http://127.0.0.1:8000/api/zones');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const geojsonData = await response.json();
    return geojsonData;
  } catch (error) {
    display(error);
    display(`ERROR: Could not load zone shapes.`);
  }
}
```
