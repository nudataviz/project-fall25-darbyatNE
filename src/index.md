<link rel="stylesheet" href="./components/style.css">
<link href="https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css" rel="stylesheet" />

<div class="header-container">
  <h1 id="page-header-text">Interactive PJM LMP Map</h1>
  <p style="font-size: 12px; color: #666; margin: 5px 0 0 0; font-style: italic;">
    💡 Tip: Use checkboxes in the zone list to compare prices
  </p>
</div>

<div class="top-controls-wrapper">
  <div class="price-selector">
    <span class="price-label">Price Type &rarr;</span>
    <input type="radio" id="price-da" name="price-type" value="da" checked><label for="price-da">Day-Ahead</label>
    <input type="radio" id="price-rt" name="price-type" value="rt"><label for="price-rt">Real-Time</label>
    <input type="radio" id="price-net" name="price-type" value="net"><label for="price-net">NET</label>
    <input type="radio" id="price-cong" name="price-type" value="congestion"><label for="price-cong">Congestion</label>
  </div>
  <div class="filter-container">
    <span class="filter-label">Filters &rarr;</span><div id="top-filter-display"></div>
  </div>
</div>

<div id="main-container">
  <div id="map-container">
    <div id="map"></div><div id="legend"></div>
    <div id="controls-container">
      <button id="filter-btn">⚙ Filter</button>
      <button id="avg-btn">Avg Price View</button>
      <div id="speed-box"><label>Speed</label><input type="range" id="speed-slider" min="100" max="3000" step="100" value="1000"></div>
      <button id="play-btn">Play</button>
      <input type="range" id="slider" min="0" max="1" value="0" style="flex-grow: 1; margin: 0 10px;">
      <div id="time-display">Ready</div>
    </div>
  </div>
  
  <div id="sidebar">
    <div id="zone-section"><h4>PJM Zones</h4><div id="zone-list"></div></div>
    <div id="constraint-section">
      <div class="constraint-header-wrapper"><h4>Active Constraints</h4>
          <div class="c-toggle-container">
              <label><input type="radio" name="c-mode" value="global" checked disabled> Period Avg</label>
              <label><input type="radio" name="c-mode" value="current" disabled> Current Hour</label>
          </div>
      </div>
      <div id="constraint-list"><div class="empty-state">No active constraints</div></div>
    </div>
  </div>
</div>

```js
import { initApp } from "./components/map.js";
initApp();
```