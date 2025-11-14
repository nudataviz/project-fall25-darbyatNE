// API communication functions
const API = {
    async fetchZoneShapes() {
        try {
            const response = await fetch(CONFIG.API.zones);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const geojsonData = await response.json();
            State.geojsonLayer = L.geoJson(geojsonData, {
                style: MapUtils.getStyle,
                onEachFeature: MapUtils.onEachFeature
            }).addTo(State.map);
            
            State.map.fitBounds(State.geojsonLayer.getBounds());
        } catch (error) {
            console.error("Error fetching zone shapes:", error);
            alert("Could not load zone shapes. The map will not be drawn.");
        }
    },

    async fetchLmpData() {
        const timeDisplay = document.getElementById('current-time-display');
        timeDisplay.innerText = "Loading LMP data...";
        
        try {
            // Build hours array from time range
            const hours = Array(24).fill(false);
            const startHour = Math.floor(State.currentFilter.startTime);
            const endHour = Math.ceil(State.currentFilter.endTime);
            
            for (let i = startHour; i < endHour; i++) {
                hours[i] = true;
            }

            // Build days of week array (convert to 1-7, Monday=1, Sunday=7)
            const daysOfWeek = [];
            State.currentFilter.daysOfWeek.forEach((active, index) => {
                if (active) {
                    // Convert from JS (0=Sun) to API format (1=Mon, 7=Sun)
                    const apiDay = index === 0 ? 7 : index;
                    daysOfWeek.push(apiDay);
                }
            });

            const queryPayload = {
                start_day: State.currentFilter.startDate.toISOString().split('T')[0],
                end_day: State.currentFilter.endDate.toISOString().split('T')[0],
                days_of_week: daysOfWeek,
                hours: hours,
                price_type: "NET"
            };
            
            console.log("Query payload:", queryPayload);
            
            const response = await fetch(CONFIG.API.lmpRange, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(queryPayload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            
            const lmpDataByZone = await response.json();
            this.processLmpData(lmpDataByZone);

            if (State.timeSeriesData.length === 0) {
                timeDisplay.innerText = "No data returned for the selected query.";
                return;
            }

            const slider = document.getElementById('hour-slider');
            slider.max = State.timeSeriesData.length - 1;
            Animation.updateMapForTimeIndex(0);

        } catch (error) {
            console.error("Error fetching LMP data:", error);
            timeDisplay.innerText = "Failed to load data.";
            alert("Could not load LMP data. The map will not be colored.");
        }
    },

    processLmpData(lmpDataByZone) {
        const dataByTimestamp = {};

        for (const zoneName in lmpDataByZone) {
            for (const reading of lmpDataByZone[zoneName]) {
                const timestamp = reading.datetime_beginning_ept;
                
                if (!dataByTimestamp[timestamp]) {
                    dataByTimestamp[timestamp] = {
                        datetime: timestamp,
                        readings: {}
                    };
                }
                
                dataByTimestamp[timestamp].readings[zoneName] = reading.lmp_value;
            }
        }

        State.timeSeriesData = Object.values(dataByTimestamp).sort((a, b) => {
            return new Date(a.datetime) - new Date(b.datetime);
        });
    }
};