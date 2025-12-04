import maplibregl from "npm:maplibre-gl";
import { API_BASE_URL, COLOR_SCALE, NET_COLOR_SCALE } from "./config.js";
import { transformApiData, getColorForLmp } from "./utils.js";
import { calculateGlobalStats, calculateZoneAverages } from "./math.js";
import { renderConstraintList, displayCurrentFilter, setConstraintModeUI, createZonePopupHTML, CONGESTION_POPUP_HTML, } from "./ui.js";

export class MapController {
    constructor(map, uiElements) {
        this.map = map;
        this.ui = uiElements;
        this.timeSeriesData = [];
        this.constraintsData = [];
        this.averageDataCache = {};
        this.globalConstraintCache = [];
        this.currentIndex = 0;
        this.playbackSpeed = 1000;
        this.timer = null;
        this.activePriceType = 'da'; 
        this.isAverageMode = false;
        this.selectedZoneName = null;        
        this.congestionHelpPopup = null;
        this.hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
    }

    getZoneValue(zoneName, dataMap) {
        if (!dataMap || !dataMap[zoneName]) return null;
        if (this.activePriceType === 'congestion') {
            if (!this.selectedZoneName || !dataMap[this.selectedZoneName]) return null;
            if (zoneName === this.selectedZoneName) return 0;
            const loadZonePrice = Number(dataMap[this.selectedZoneName].rt || 0);
            const remoteZonePrice = Number(dataMap[zoneName].rt || 0);
            return loadZonePrice - remoteZonePrice;
        }
        return Number(dataMap[zoneName][this.activePriceType]);
    }

    async loadData(filter) {
        this.ui.timeDisplay.innerText = 'Querying Data...';
        this.stopAnimation();

        try {
            const cleanDate = (d) => {
                if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/)) return d;
                return d ? new Date(d).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            };

            const daysBooleans = filter.daysOfWeek || Array(7).fill(true);
            
            const query = {
                start_day: cleanDate(filter.startDate),
                end_day: cleanDate(filter.endDate),
                days_of_week: daysBooleans.map((isActive, index) => isActive ? index + 1 : null).filter(val => val !== null),
                start_hour: parseInt(filter.startTime) || 0,
                end_hour: parseInt(filter.endTime) || 24,
                monitored_facility: filter.selectedConstraint || null
            };

            const response = await fetch(`${API_BASE_URL}/api/lmp/range`, { 
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query) 
            });
            
            if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
            
            const rawData = await response.json();
            this.constraintsData = rawData.constraints || [];
            this.timeSeriesData = transformApiData(rawData.zones || rawData);

            if (!this.timeSeriesData || this.timeSeriesData.length === 0) {
                this.ui.timeDisplay.innerText = 'No Data Found';
                displayCurrentFilter(filter, 0);
                return;
            }

            displayCurrentFilter(filter, this.timeSeriesData.length);
            this.globalConstraintCache = calculateGlobalStats(this.constraintsData, this.timeSeriesData.length);
            this.averageDataCache = calculateZoneAverages(this.timeSeriesData);
            this.ui.slider.max = this.timeSeriesData.length - 1;
            this.ui.slider.disabled = false;
            this.ui.playBtn.disabled = false;
            this.renderAverageView();

        } catch (error) {
            console.error("Fetch Error:", error);
            this.ui.timeDisplay.innerText = 'Data Error';
        }
    }

    renderCurrentView() {
        if (this.isAverageMode) { this.renderAverageView(); } else { this.renderTimeStep(this.currentIndex); }
    }

    renderAverageView() {
        this.isAverageMode = true;
        this.ui.timeDisplay.innerText = 'All Filtered Hours';
        this.ui.slider.value = 0;
        setConstraintModeUI('global');
        renderConstraintList(this.globalConstraintCache, 'Avg $/MWHr');

        const currentScale = (this.activePriceType === 'net' || this.activePriceType === 'congestion') ? NET_COLOR_SCALE : COLOR_SCALE;
        const colorExpression = ['case'];
        const dataSource = this.averageDataCache;

        for (const zone in dataSource) {
            const val = this.getZoneValue(zone, dataSource);
            if (val !== null && !isNaN(val)) {
                colorExpression.push(['==', ['get', 'Zone_Name'], zone], getColorForLmp(val, currentScale));
            }
        }
        colorExpression.push('#cccccc');
        if (this.map.getLayer('zoneFill')) this.map.setPaintProperty('zoneFill', 'fill-color', colorExpression);

        let pjmSum = 0, pjmCount = 0;
        Object.keys(dataSource).forEach(zone => {
            const val = this.getZoneValue(zone, dataSource);
            if (val !== null && !isNaN(val)) {
                if (this.activePriceType === 'congestion' && zone === this.selectedZoneName) return;
                pjmSum += val; pjmCount++;
            }
        });
        const pjmAvg = pjmCount > 0 ? pjmSum / pjmCount : 0;
        this.updateSidebarPrices((z) => this.getZoneValue(z, dataSource), currentScale, pjmAvg);
    }

    renderTimeStep(index) {
        this.isAverageMode = false;
        this.currentIndex = index;
        this.ui.slider.value = index;
        const data = this.timeSeriesData[index];
        if (!data) return;

        let displayDateStr = "Invalid Date";
        
        if (data.datetime) {
            const match = data.datetime.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
            
            if (match) {
                const [_, y, m, d, hr, min] = match;
                const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                const timeStr = `${parseInt(hr)}:${min}`; 
                displayDateStr = `${dateStr} | ${timeStr}`;
            } else {
                displayDateStr = data.datetime;
            }
        }

        this.ui.timeDisplay.innerText = displayDateStr;
        
        const currentScale = (this.activePriceType === 'net' || this.activePriceType === 'congestion') ? NET_COLOR_SCALE : COLOR_SCALE;
        const dataSource = data.readings;
        const colorExpression = ['case'];
        for (const zone in dataSource) {
            const val = this.getZoneValue(zone, dataSource);
            if (val !== null && !isNaN(val)) {
                colorExpression.push(['==', ['get', 'Zone_Name'], zone], getColorForLmp(val, currentScale));
            }
        }
        colorExpression.push('#cccccc');
        if (this.map.getLayer('zoneFill')) this.map.setPaintProperty('zoneFill', 'fill-color', colorExpression);

        let pjmSum = 0, pjmCount = 0;
        Object.keys(dataSource).forEach(zone => {
            const val = this.getZoneValue(zone, dataSource);
            if (val !== null && !isNaN(val)) {
                if (this.activePriceType === 'congestion' && zone === this.selectedZoneName) return;
                pjmSum += val; pjmCount++;
            }
        });
        const pjmAvg = pjmCount > 0 ? pjmSum / pjmCount : 0;
        this.updateSidebarPrices((z) => this.getZoneValue(z, dataSource), currentScale, pjmAvg);

        setConstraintModeUI('current');
        const currentTs = new Date(data.datetime.replace(' ', 'T')).getTime();
        const activeConstraints = this.constraintsData
            .filter(c => new Date(c.timestamp.replace(' ', 'T')).getTime() === currentTs)
            .map(c => ({ name: c.name || c.monitored_facility, price: Number(c.shadow_price || 0) }))
            .sort((a, b) => a.price - b.price)
            .slice(0, 10);
        renderConstraintList(activeConstraints, 'Shadow Price');
    }

    updateSidebarPrices(getValueFn, scale, pjmAvg) {
        document.querySelectorAll('.zone-item').forEach(item => {
            const zName = item.dataset.zoneName;
            const priceSpan = item.querySelector('.zone-price');
            if (!priceSpan) return;
            let val;
            if (zName === 'PJM') { val = pjmAvg; } else { val = getValueFn(zName); }
            if (val !== null && val !== undefined && !isNaN(val)) {
                priceSpan.innerText = `$${val.toFixed(2)}`;
                priceSpan.style.color = getColorForLmp(val, scale);
            } else {
                priceSpan.innerText = '';
                priceSpan.style.color = '#000';
            }
        });
    }

    updateZoneBorders() {
        if (!this.map.getLayer('zoneLines')) return;
        const targetZone = (this.activePriceType === 'congestion' && this.selectedZoneName) ? this.selectedZoneName : '';
        this.map.setPaintProperty('zoneLines', 'line-width', ['case', ['==', ['get', 'Zone_Name'], targetZone], 6, 1.5]);
        this.map.setPaintProperty('zoneLines', 'line-color', ['case', ['==', ['get', 'Zone_Name'], targetZone], '#FFFF00', '#000000']);
        if (this.congestionHelpPopup) { this.congestionHelpPopup.remove(); this.congestionHelpPopup = null; }
        if (targetZone && targetZone !== 'PJM') {
            this.congestionHelpPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'congestion-info-popup', maxWidth: '250px' })
            .setLngLat([-72, 37]).setHTML(CONGESTION_POPUP_HTML).addTo(this.map);
        }
    }

    handleMapHover(e) {
        if (!e.features[0]) return;
        const zone = e.features[0].properties.Zone_Name;
        let dataSource = null;
        if (this.isAverageMode) { dataSource = this.averageDataCache; } 
        else if (this.timeSeriesData.length > 0) { const step = this.timeSeriesData[this.currentIndex]; dataSource = step ? step.readings : null; }
        const val = this.getZoneValue(zone, dataSource);
        this.hoverPopup.setLngLat(e.lngLat).setHTML(createZonePopupHTML(zone, this.activePriceType, val)).addTo(this.map);
    }

    handleMapClick(e) {
        if (!e.features.length) return;
        const clickedZone = e.features[0].properties.Zone_Name;
        if (e.originalEvent.shiftKey && this.activePriceType === 'congestion') {
            this.selectedZoneName = clickedZone;
            this.updateZoneBorders();
            this.renderCurrentView();
            new maplibregl.Popup({ closeButton: false }).setLngLat(e.lngLat).setHTML(`<div style="font-size:11px; font-weight:bold; color:#8B4513; padding:2px;">New Reference: ${clickedZone}</div>`).addTo(this.map);
            return;
        }
        const sidebarItem = document.querySelector(`.zone-item[data-zone-name="${clickedZone}"]`);
        if (sidebarItem) sidebarItem.click();
    }

    setPriceType(type) { this.activePriceType = type; this.updateZoneBorders(); this.renderCurrentView(); }
    setPlaybackSpeed(val) { this.playbackSpeed = 3100 - val; if (this.timer) { clearInterval(this.timer); this.startAnimation(); } }
    startAnimation() { this.ui.playBtn.innerText = 'Pause'; this.timer = setInterval(() => { const nextIndex = this.currentIndex + 1; if (nextIndex >= this.timeSeriesData.length) { this.stopAnimation(); } else { this.renderTimeStep(nextIndex); } }, this.playbackSpeed); }
    stopAnimation() { if (this.timer) { clearInterval(this.timer); this.timer = null; } this.ui.playBtn.innerText = 'Play'; }
    togglePlay() { if (this.timer) { this.stopAnimation(); } else { if (this.currentIndex >= this.timeSeriesData.length - 1) this.renderTimeStep(0); this.startAnimation(); } }
}
