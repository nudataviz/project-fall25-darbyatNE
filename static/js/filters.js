// In /static/js/filters.js

const Filters = {
    updateFormFromState() {
        const filter = State.currentFilter;

        // Set date inputs
        document.getElementById('start-date').value = filter.startDate.toISOString().split('T')[0];
        document.getElementById('end-date').value = filter.endDate.toISOString().split('T')[0];

        // Set price type dropdown // ADDED
        document.getElementById('price-type-select').value = filter.price_type;

        // Set day of week buttons
        const dayButtons = document.querySelectorAll('.day-button');
        dayButtons.forEach((button) => {
            const dayIndex = parseInt(button.dataset.day);
            if (filter.daysOfWeek[dayIndex]) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        // Note: Time slider is handled by TimeSlider.init() which reads from the state
    },

    init() {
        // Populate the form with the initial state when the page loads
        this.updateFormFromState();

        // --- Event Listeners ---

        // Filter panel toggle
        const filterPanel = document.getElementById('filter-panel');
        const filterToggle = document.getElementById('filter-toggle');
        const closeFilter = document.getElementById('close-filter');

        filterToggle.addEventListener('click', () => filterPanel.classList.add('open'));
        closeFilter.addEventListener('click', () => filterPanel.classList.remove('open'));

        // Price Type dropdown // ADDED
        document.getElementById('price-type-select').addEventListener('change', (e) => {
            State.currentFilter.price_type = e.target.value;
        });

        // Day of week buttons
        document.querySelectorAll('.day-button').forEach((button) => {
            button.addEventListener('click', () => {
                const dayIndex = parseInt(button.dataset.day);
                State.currentFilter.daysOfWeek[dayIndex] = !State.currentFilter.daysOfWeek[dayIndex];
                button.classList.toggle('active');
            });
        });

        // Date inputs
        document.getElementById('start-date').addEventListener('change', (e) => {
            const localDate = new Date(e.target.value);
            State.currentFilter.startDate = new Date(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate());
        });

        document.getElementById('end-date').addEventListener('change', (e) => {
            const localDate = new Date(e.target.value);
            State.currentFilter.endDate = new Date(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate());
        });

        // Apply filter button
        document.getElementById('apply-filter').addEventListener('click', () => {
            filterPanel.classList.remove('open');
            console.log("Applying filter:", State.currentFilter); // debugging
            API.fetchLmpData(State.currentFilter);
        });

        // Save filter button
        document.getElementById('save-filter').addEventListener('click', () => {
            this.saveFilter();
        });
    },

    saveFilter() {
        const filter = {
            id: Date.now(),
            startDate: new Date(State.currentFilter.startDate),
            endDate: new Date(State.currentFilter.endDate),
            startTime: State.currentFilter.startTime,
            endTime: State.currentFilter.endTime,
            daysOfWeek: [...State.currentFilter.daysOfWeek],
            price_type: State.currentFilter.price_type, // MODIFIED: Added price_type
            savedAt: new Date()
        };
        
        State.savedFilters.push(filter);
        this.updateSavedFiltersList();
    },

    updateSavedFiltersList() {
        const container = document.getElementById('saved-filters-list');
        
        if (State.savedFilters.length === 0) {
            container.innerHTML = '<div style="color: #666; font-style: italic; font-size: 12px;">No saved filters yet</div>';
            return;
        }

        const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const priceTypeLabels = {'RT': 'Real-Time', 'DA': 'Day-Ahead', 'NET': 'Net'};

        container.innerHTML = State.savedFilters.map((filter, index) => {
            const selectedDays = dayLabels.filter((_, i) => filter.daysOfWeek[i]).join(", ");
            const formatTime = (hours) => {
                const h = Math.floor(hours);
                const m = Math.round((hours - h) * 60);
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            };
            
            // MODIFIED: Use the lookup object to get the label
            const priceTypeLabel = priceTypeLabels[filter.price_type] || filter.price_type;
            
            return `
                <div class="saved-filter-item">
                    <div class="saved-filter-header">Filter #${State.savedFilters.length - index}</div>
                    <div class="saved-filter-details">
                        ${priceTypeLabel}<br>
                        📅 ${filter.startDate.toLocaleDateString()} — ${filter.endDate.toLocaleDateString()}<br>
                        ⏰ ${formatTime(filter.startTime)} — ${formatTime(filter.endTime)}<br>
                        📆 ${selectedDays}
                    </div>
                    <div class="saved-filter-buttons">
                        <button class="load-btn" onclick="Filters.loadFilter(${index})">Load</button>
                        <button class="delete-btn" onclick="Filters.deleteFilter(${index})">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    loadFilter(index) {
        const filterToLoad = State.savedFilters[index];
        // MODIFIED: Properly copy all values, including the new price_type
        State.currentFilter = {
            startDate: new Date(filterToLoad.startDate),
            endDate: new Date(filterToLoad.endDate),
            startTime: filterToLoad.startTime,
            endTime: filterToLoad.endTime,
            daysOfWeek: [...filterToLoad.daysOfWeek],
            price_type: filterToLoad.price_type || 'RT' // Default to 'RT' if not present in old saved filters
        };

        // MODIFIED: Call the single function to update the entire UI from the state
        this.updateFormFromState();

        // Re-initialize the time slider to reflect the loaded state
        TimeSlider.init();
    },

    deleteFilter(index) {
        State.savedFilters.splice(index, 1);
        this.updateSavedFiltersList();
    }
};
