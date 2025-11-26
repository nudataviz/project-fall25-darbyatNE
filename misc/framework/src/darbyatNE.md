# project-4: electricity

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

```js
let zoneShapes = await fetchZoneShapes();

// The last features seems to be a bounding box for a larger domain
zoneShapes.features.pop();

display(zoneShapes)
```

```js
const chart = Plot.plot({
  projection: {
    type: "equirectangular",
    domain: zoneShapes,
  },
  marks: [
    Plot.geo(zoneShapes),
  ]
})

display(chart);
```

```js
const button = view(Inputs.button("Download PNG"));
```

```js
if (button > 0) downloadPNG(chart);

function downloadPNG(svg, padding = 20) {
  
  // Get the actual rendered dimensions
  const bbox = svg.getBoundingClientRect();
  const canvas = document.createElement("canvas");
  
  // Add padding to canvas dimensions
  canvas.width = bbox.width + (padding * 2);
  canvas.height = bbox.height + (padding * 2);
  
  const ctx = canvas.getContext("2d");
  
  // Fill background (optional - remove if you want transparent)
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Clone and prepare SVG data
  const svgClone = svg.cloneNode(true);
  svgClone.setAttribute("width", bbox.width);
  svgClone.setAttribute("height", bbox.height);
  
  const svgData = new XMLSerializer().serializeToString(svgClone);
  const svgBlob = new Blob([svgData], {type: "image/svg+xml;charset=utf-8"});
  const url = URL.createObjectURL(svgBlob);
  
  const img = new Image();
  img.onload = () => {
    // Draw with padding offset
    ctx.drawImage(img, padding, padding, bbox.width, bbox.height);
    
    canvas.toBlob((blob) => {
      const link = document.createElement("a");
      link.download = "chart.png";
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    });
    
    URL.revokeObjectURL(url);
  };
  
  img.src = url;
}
```