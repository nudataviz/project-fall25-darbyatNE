// Animation and time control functions
const Animation = {
    init() {
        const slider = document.getElementById('hour-slider');
        const playPauseButton = document.getElementById('play-pause-button');

        slider.addEventListener('input', (e) => {
            if (State.animationTimer) {
                this.pause();
            }
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

    updateMapForTimeIndex(index) {
        State.currentTimeIndex = parseInt(index);
        const slider = document.getElementById('hour-slider');
        slider.value = State.currentTimeIndex;

        const currentDataPoint = State.timeSeriesData[State.currentTimeIndex];
        if (!currentDataPoint) return;

        const currentDate = new Date(currentDataPoint.datetime);
        const currentHour = currentDate.getHours();
        const nextHour = (currentHour + 1) % 24;

        const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        const dateString = currentDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const hourString = `Hour: ${String(currentHour).padStart(2, '0')}:00 - ${String(nextHour).padStart(2, '0')}:00`;

        const timeDisplay = document.getElementById('current-time-display');
        timeDisplay.innerText = `${dayOfWeek}, ${dateString} | ${hourString}`;

        if (State.geojsonLayer) {
            State.geojsonLayer.setStyle(MapUtils.getStyle);
            MapUtils.updatePopups(State.currentTimeIndex);
            MapUtils.updateLabels(State.currentTimeIndex);
            MapUtils.updateZoneColors(State.currentTimeIndex);
        }
    },

    play() {
        const playPauseButton = document.getElementById('play-pause-button');
        playPauseButton.innerText = '❚❚ Pause';
        
        State.animationTimer = setInterval(() => {
            let nextIndex = State.currentTimeIndex + 1;
            
            if (nextIndex >= State.timeSeriesData.length) {
                this.pause();
                return;
            }
            
            this.updateMapForTimeIndex(nextIndex);
        }, CONFIG.ANIMATION.interval);
    },

    pause() {
        clearInterval(State.animationTimer);
        State.animationTimer = null;
        
        const playPauseButton = document.getElementById('play-pause-button');
        playPauseButton.innerText = '▶ Play';
    }
};
