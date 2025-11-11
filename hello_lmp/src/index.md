# Interactive PJM LMP Map

<!DOCTYPE html>
<html>
<head>
  <title>Interactive PJM LMP Map</title>
  <meta charset="utf-8" />

  <!-- Leaflet CSS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  
  <style>
    body { font-family: sans-serif; }
    #controls {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 10px 20px;
      margin-bottom: 20px;
    }
    .leaflet-popup-content {
      margin: 13px 20px 13px 20px;
      font-size: 1.1em;
      min-width: 150px;
    }
  </style>
</head>
<body>

  <h1>Interactive PJM LMP Map</h1>
  <p>This map visualizes the average Locational Marginal Price (LMP) for PJM transmission zones. Use the controls to select a date range, days of the week, and hours to analyze.</p>

  <hr>
  <h2>Controls</h2>
  <div id="controls"></div>

  <hr>
  <h2>Map</h2>
  <div id="map" style="height: 600px; width: 100%;"></div>

  <!-- Use type="module" to allow top-level import statements -->
  <script type="module">
    // --- 1. Imports and Configuration ---
    import * as L from "https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.esm.js";
    import {Inputs} from "https://cdn.jsdelivr.net/npm/@observablehq/inputs@0.10.6/dist/inputs.min.js";

    const API_BASE_URL = "http://127.0.0.1:8000";

    // --- 2. Initialize Map and Layers ---
    const map = L.map('map').setView([40.0, -78.0], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Initialize the layer that will hold the zone shapes
    const zoneLayer = L.geoJSON().addTo(map);

    // --- 3. Define and Render UI Controls ---
    const updateButton = Inputs.button("Update Map", {required: true});
    const startDay = Inputs.date({label: "Start Date", value: "2025-11-05"});
    const endDay = Inputs.date({label: "End Date", value: "2025-11-05"});
    const daysOfWeek = Inputs.checkbox(
      ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      { label: "Days of Week", value: ["Mon", "Tue", "Wed", "Thu", "Fri"] }
    );
    const hourLabels = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
    const hours = Inputs.checkbox(hourLabels, {
      label: "Hours (EPT)",
      value: hourLabels,
      columns: "60px"
    });
    
    // Manually add the created input elements to the 'controls' div
    const controlsDiv = document.querySelector("#controls");
    controlsDiv.append(updateButton, startDay, endDay, daysOfWeek, hours);

    // --- 4. Helper Functions ---
    function getColorForLMP(lmp) {
      return lmp > 100 ? '#800026' :
             lmp > 75  ? '#BD0026' :
             lmp > 50  ? '#E31A1C' :
             lmp > 30  ? '#FC4E2A' :
             lmp > 20  ? '#FD8D3C' :
             lmp > 0   ? '#FEB24C' :
                         '#FED976';
    }

    function updateMapStyles(processedData) {
      zoneLayer.eachLayer(layer => {
        const zoneName = layer.feature.properties.zone_name;
        const avgLmp = processedData[zoneName];

        if (avgLmp !== undefined) {
          layer.setStyle({ fillColor: getColorForLMP(avgLmp), fillOpacity: 0.7 });
          layer.setPopupContent(`<b>Zone:</b> ${zoneName}<br><b>Avg LMP:</b> $${avgLmp.toFixed(2)}`);
        } else {
          layer.setStyle({ fillColor: '#808080', fillOpacity: 0.5 });
          layer.setPopupContent(`<b>Zone:</b> ${zoneName}<br>No data found for this selection.`);
        }
      });
    }

    // --- 5. Main Logic: Event Listener and Data Fetching ---

    // This is the "reactive" part. This function runs when the button is clicked.
    updateButton.addEventListener("click", async () => {
      const mapContainer = map.getContainer();
      mapContainer.style.cursor = 'wait'; // Show loading cursor

      const daysOfWeekMap = {"Sun": 1, "Mon": 2, "Tue": 3, "Wed": 4, "Thu": 5, "Fri": 6, "Sat": 7};
      
      // Get current values from the input elements using the .value property
      const payload = {
        start_day: startDay.value,
        end_day: endDay.value,
        days_of_week: daysOfWeek.value.map(dayName => daysOfWeekMap[dayName]),
        hours: hourLabels.map(h => hours.value.includes(h))
      };

      try {
        const res = await fetch(`${API_BASE_URL}/api/lmp/range`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        
        const lmpDataByZone = await res.json();
        
        const processedData = {};
        for (const zoneName in lmpDataByZone) {
          const readings = lmpDataByZone[zoneName];
          if (readings.length > 0) {
            const sum = readings.reduce((acc, curr) => acc + curr.total_lmp_rt, 0);
            processedData[zoneName] = sum / readings.length;
          }
        }
        
        updateMapStyles(processedData);

      } catch (e) {
        console.error("Failed to fetch or process LMP data:", e);
        alert("Error fetching data from the server. Check the console for details.");
      } finally {
        mapContainer.style.cursor = ''; // Reset cursor
      }
    });

    // --- 6. Initial Data Load (Zone Shapes) ---
    // We wrap this in an async IIFE (Immediately Invoked Function Expression)
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/zones`);
        const zoneGeoJSON = await res.json();
        
        zoneLayer.addData(zoneGeoJSON);
        zoneLayer.eachLayer(l => {
            const zoneName = l.feature.properties.zone_name;
            l.bindPopup(`<b>Zone:</b> ${zoneName}<br>Click "Update Map" to load data.`);
            l.setStyle({ weight: 2, color: 'white', fillColor: '#808080', fillOpacity: 0.6 });
        });
      } catch (e) {
        console.error("Failed to fetch initial zone shapes:", e);
        alert("Could not load initial map shapes. Is the server running?");
      }
    })();

  </script>

</body>
</html>
