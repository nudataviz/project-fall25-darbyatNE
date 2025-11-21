// Zone Selection Module
// Handles Ctrl+Left-Click to select/deselect zones

const ZoneSelection = {
    /**
     * Initialize zone selection handlers
     */
    init() {
        console.log("Zone selection initialized");
        this.updateSelectedZonesList();
    },

    /**
     * Toggle zone selection
     */
    toggleZoneSelection(zoneName) {
        if (!zoneName) return;

        if (State.selectedZones.has(zoneName)) {
            // Deselect
            State.selectedZones.delete(zoneName);
            console.log(`❌ Deselected: ${zoneName}`);
        } else {
            // Select
            State.selectedZones.add(zoneName);
            console.log(`✅ Selected: ${zoneName}`);
        }

        // Log current selection
        console.log(`📋 Currently selected zones (${State.selectedZones.size}):`, 
                    Array.from(State.selectedZones).sort());
        
        // Visual feedback
        this.updateVisualFeedback();
        
        // Update the selected zones list UI
        this.updateSelectedZonesList();
        
        // Update CSV with filtered data
        this.updateFilteredCSV();
    },

    /**
     * Check if a zone is selected
     */
    isSelected(zoneName) {
        return State.selectedZones.has(zoneName);
    },

    /**
     * Clear all selections
     */
    clearAll() {
        State.selectedZones.clear();
        console.log("🗑️ Cleared all zone selections");
        this.updateVisualFeedback();
        this.updateSelectedZonesList();
        this.updateFilteredCSV();
    },

    /**
     * Get all selected zones
     */
    getSelected() {
        return Array.from(State.selectedZones).sort();
    },

    /**
     * Update visual feedback for selected zones
     */
    updateVisualFeedback() {
        if (!State.geojsonLayer) return;
        
        State.geojsonLayer.eachLayer((layer) => {
            const zoneName = layer.feature.properties.zone_name;
            // Force re-style using the getStyleForFeature function
            layer.setStyle(MapUtils.getStyleForFeature(layer.feature));
        });
    },

    /**
     * Update the selected zones list UI
     */
    updateSelectedZonesList() {
        const container = document.getElementById('selected-zones-list');
        if (!container) return;

        if (State.selectedZones.size === 0) {
            container.innerHTML = '<div class="no-selection">Ctrl+Click zones to select</div>';
            return;
        }

        const sortedZones = Array.from(State.selectedZones).sort();
        const html = sortedZones.map(zone => `
            <div class="selected-zone-item">
                <span class="zone-name">${zone}</span>
                <button class="remove-zone-btn" onclick="ZoneSelection.removeZone('${zone}')">&times;</button>
            </div>
        `).join('');

        const clearButton = State.selectedZones.size > 1 
            ? '<button class="clear-all-btn" onclick="ZoneSelection.clearAll()">Clear All</button>'
            : '';

        container.innerHTML = `
            <div class="selected-zones-header">
                <span>Selected Zones (${State.selectedZones.size})</span>
                ${clearButton}
            </div>
            <div class="selected-zones-items">${html}</div>
        `;
    },

    /**
     * Remove a specific zone from selection
     */
    removeZone(zoneName) {
        State.selectedZones.delete(zoneName);
        console.log(`❌ Removed: ${zoneName}`);
        this.updateVisualFeedback();
        this.updateSelectedZonesList();
        this.updateFilteredCSV();
    },

    /**
     * Update CSV with filtered data based on selected zones
     */
    updateFilteredCSV() {
        if (!State.timeSeriesData || State.timeSeriesData.length === 0) return;

        // If no zones selected, show all zones
        const zonesToInclude = State.selectedZones.size > 0 
            ? Array.from(State.selectedZones) 
            : null;

        // Build filtered LMP data
        const filteredData = {};
        
        State.timeSeriesData.forEach(dataPoint => {
            const timestamp = dataPoint.datetime;
            
            for (const [zoneName, lmpValue] of Object.entries(dataPoint.readings)) {
                // Skip zones not in selection (if selection exists)
                if (zonesToInclude && !zonesToInclude.includes(zoneName)) {
                    continue;
                }
                
                if (!filteredData[zoneName]) {
                    filteredData[zoneName] = [];
                }
                
                filteredData[zoneName].push({
                    datetime_beginning_ept: timestamp,
                    lmp_value: lmpValue
                });
            }
        });

        // Generate CSV
        const csvString = window.convertLmpDataToCSV(filteredData);
        
        // Update CSV display/download
        this.updateCSVDisplay(csvString);
        
        console.log(`📊 CSV updated with ${Object.keys(filteredData).length} zones`);
    },

    /**
     * Update CSV display or download button
     */
    updateCSVDisplay(csvString) {
        const container = document.getElementById('csv-output-container');
        if (!container) return;

        // Create a download link
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const selectedCount = State.selectedZones.size;
        const downloadText = selectedCount > 0 
            ? `Download CSV (${selectedCount} zones)` 
            : 'Download CSV (All zones)';

        container.innerHTML = `
            <a href="${url}" download="lmp_data_filtered.csv" class="csv-download-btn">
                📥 ${downloadText}
            </a>
        `;
    }
};
