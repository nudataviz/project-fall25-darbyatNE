# Map Libre demo

<div id="map" style="width: 100%; height: 450px;"></div>
<link rel="stylesheet" href="npm:maplibre-gl/dist/maplibre-gl.css">

```js echo
import maplibregl from "npm:maplibre-gl";
```

```js echo
const map = new maplibregl.Map({
  container: "map",
  zoom: 5, // Zoomed out to show the state
  center: [-80.45, 38.6], // Centered on West Virginia [longitude, latitude]
  pitch: 10,
  hash: true,
  style: {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "&copy; OpenStreetMap Contributors",
        maxzoom: 19
      }
    },
    layers: [
      {
        id: "osm",
        type: "raster",
        source: "osm"
      }
    ]
  },
  maxZoom: 18,
  maxPitch: 85
});

map.addControl(
  new maplibregl.NavigationControl({
    visualizePitch: true,
    showZoom: true,
    showCompass: true
  })
);

// Updated the marker to the new center
new maplibregl.Marker()
  .setLngLat([-80.45, 38.6])
  .addTo(map);

```
