// /static/js/animation.js

const Animation = {
    init() {
        const slider = document.getElementById('hour-slider');
        const playPauseButton = document.getElementById('play-pause-button');

        slider.addEventListener('input', (e) => {
            this.pause(); // Stop animation when user interacts with slider
            this.updateMapForTimeIndex(e.target.value);
        });

        playPauseButton.onclick = () => {
            if (State.animationTimer) {
                this.pause();
            } else {
                this.play();
            }
        };
    },

    /**
     * Master function to update the entire map state for a given time index.
     */
    updateMapForTimeIndex(index) {
        State.currentTimeIndex = parseInt(index);
        document.getElementById('hour-slider').value = State.currentTimeIndex;

        const currentDataPoint = State.timeSeriesData[State.currentTimeIndex];
        if (!currentDataPoint) return;

        // Update time display text
        const currentDate = new Date(currentDataPoint.datetime);
        const currentHour = currentDate.getHours();
        const nextHour = (currentHour + 1) % 24;
        const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        const dateString = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const hourString = `Hour: ${String(currentHour).padStart(2, '0')}:00 - ${String(nextHour).padStart(2, '0')}:00`;
        document.getElementById('current-time-display').innerText = `${dayOfWeek}, ${dateString} | ${hourString}`;

        // Update 2D view (Leaflet)
        if (State.geojsonLayer) {
            // Redraw the zone colors by re-evaluating the style for every feature
            State.geojsonLayer.setStyle(MapUtils.getStyleForFeature);

            // Update popups and labels
            MapUtils.updatePopups(State.currentTimeIndex);
            if (State.isAnimationStarted) {
                MapUtils.updateLabelsToPrice(State.currentTimeIndex);
            }
        }

        // Update 3D view (Mapbox) if it's active
        if (typeof ViewToggle !== 'undefined' && ViewToggle.getCurrentView() === '3d') {
            View3D.updateForTimeIndex(State.currentTimeIndex);
        }
    },

    play() {
        // This block runs only on the VERY FIRST click of the "Play" button
        if (!State.isAnimationStarted) {
            State.isAnimationStarted = true;
            
            // Re-create the legend to show the price scale instead of the "Zone" text
            // This also fixes the "updateLegend is not a function" crash
            MapUtils.createLegend();
            
            // Update 3D view legend if in 3D mode
            if (typeof ViewToggle !== 'undefined' && ViewToggle.getCurrentView() === '3d') {
                View3D.updateLegend();
            }
            
            // Generate initial CSV with current data
            if (typeof ZoneSelection !== 'undefined') {
                ZoneSelection.updateFilteredCSV();
            }
            
            // Force an immediate update of the map to switch from grey zones/names to colored zones/prices
            this.updateMapForTimeIndex(State.currentTimeIndex);
        }

        // Standard play logic
        document.getElementById('play-pause-button').innerText = '⏸ Pause';
        
        State.animationTimer = setInterval(() => {
            let nextIndex = State.currentTimeIndex + 1;
            
            if (nextIndex >= State.timeSeriesData.length) {
                this.pause(); // Stop at the end
                return;
            }
            
            this.updateMapForTimeIndex(nextIndex);
        }, CONFIG.ANIMATION.interval || 1000); // Use interval from config or default
    },

    pause() {
        clearInterval(State.animationTimer);
        State.animationTimer = null;
        document.getElementById('play-pause-button').innerText = '▶ Play';
    }
};