// In /static/js/filters.js

const Filters = {
    // **NEW FUNCTION**: Add this function to sync the UI with the state.
    updateFormFromState() {
        const filter = State.currentFilter;

        // Set date inputs
        document.getElementById('start-date').value = filter.startDate.toISOString().split('T')[0];
        document.getElementById('end-date').value = filter.endDate.toISOString().split('T')[0];

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

        // Note: Time slider is handled by TimeSlider.init(), so we don't touch it here.
    },

    init() {
        // **ADD THIS LINE**: Call the new function at the start of init.
        this.updateFormFromState();

        // Filter panel toggle
        const filterPanel = document.getElementById('filter-panel');
        // ... (the rest of your init function is unchanged) ...
        const filterToggle = document.getElementById('filter-toggle');
        const closeFilter = document.getElementById('close-filter');

        filterToggle.addEventListener('click', () => {
            filterPanel.classList.add('open');
        });

        closeFilter.addEventListener('click', () => {
            filterPanel.classList.remove('open');
        });

        // Day of week buttons
        const dayButtons = document.querySelectorAll('.day-button');
        dayButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const dayIndex = parseInt(button.dataset.day);
                State.currentFilter.daysOfWeek[dayIndex] = !State.currentFilter.daysOfWeek[dayIndex];
                button.classList.toggle('active');
            });
        });

        // Date inputs
        document.getElementById('start-date').addEventListener('change', (e) => {
            // Add time zone correction by creating date as UTC
            const localDate = new Date(e.target.value);
            State.currentFilter.startDate = new Date(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate());
        });

        document.getElementById('end-date').addEventListener('change', (e) => {
            // Add time zone correction
            const localDate = new Date(e.target.value);
            State.currentFilter.endDate = new Date(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate());
        });

        // Apply filter button
        document.getElementById('apply-filter').addEventListener('click', () => {
            filterPanel.classList.remove('open');
            // **MODIFICATION**: Pass the current filter state to the API call.
            API.fetchLmpData(State.currentFilter);
        });

        // Save filter button
        document.getElementById('save-filter').addEventListener('click', () => {
            this.saveFilter();
        });
    },

    // ... (rest of your filters.js file is unchanged) ...
    saveFilter() {
        // ...
    },
    updateSavedFiltersList() {
        // ...
    },
    loadFilter(index) {
        // ...
    },
    deleteFilter(index) {
        // ...
    }
};
