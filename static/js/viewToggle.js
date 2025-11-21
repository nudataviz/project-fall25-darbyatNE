// View toggle module - switches between 2D and 3D views

const ViewToggle = {
    currentView: '2d', // '2d' or '3d'
    
    /**
     * Initialize the view toggle functionality
     */
    init() {
        const toggleButton = document.getElementById('view-toggle');
        
        if (!toggleButton) {
            console.error("View toggle button not found");
            return;
        }

        toggleButton.addEventListener('click', () => {
            this.toggle();
        });

        // Start with 2D view
        this.show2D();
    },

    /**
     * Toggle between 2D and 3D views
     */
    toggle() {
        if (this.currentView === '2d') {
            this.show3D();
        } else {
            this.show2D();
        }
    },

    /**
     * Switch to 2D view
     */
    show2D() {
        this.currentView = '2d';
        
        // Update button text
        const toggleButton = document.getElementById('view-toggle');
        toggleButton.innerHTML = '🗻 3D View';
        toggleButton.title = 'Switch to 3D view';
        
        // Hide 3D, show 2D
        View3D.hide();
        
        // Update the 2D map to current time index
        if (State.map && State.geojsonLayer && State.timeSeriesData.length > 0) {
            State.map.invalidateSize();
            Animation.updateMapForTimeIndex(State.currentTimeIndex);
        }
    },

    /**
     * Switch to 3D view
     */
    show3D() {
        this.currentView = '3d';
        
        // Update button text
        const toggleButton = document.getElementById('view-toggle');
        toggleButton.innerHTML = '🗺️ 2D View';
        toggleButton.title = 'Switch to 2D view';
        
        // Show 3D view
        View3D.show();
        
        // Update the 3D map to current time index
        if (State.timeSeriesData.length > 0) {
            View3D.updateForTimeIndex(State.currentTimeIndex);
        }
    },

    /**
     * Get the current view type
     */
    getCurrentView() {
        return this.currentView;
    }
};
