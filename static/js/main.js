// Create map immediately at top level (like working version)
// This runs as soon as the script loads
MapUtils.initializeMap();

// Main application initialization for UI components and data loading
function initializeApp() {
    // Add legend
    MapUtils.createLegend();
    
    // Initialize UI components
    TimeSlider.init();
    Filters.init();
    Animation.init();
    
    // Load initial data
    API.fetchZoneShapes().then(() => {
        API.fetchLmpData();
    });

    
}

// Wait for DOM to be ready before initializing UI components
document.addEventListener('DOMContentLoaded', initializeApp);

window.addEventListener("load", () => {
    map.invalidateSize(); 
});
