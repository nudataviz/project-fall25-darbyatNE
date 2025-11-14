// Filter panel functionality
const Filters = {
    init() {
        // Filter panel toggle
        const filterPanel = document.getElementById('filter-panel');
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
            State.currentFilter.startDate = new Date(e.target.value);
        });

        document.getElementById('end-date').addEventListener('change', (e) => {
            State.currentFilter.endDate = new Date(e.target.value);
        });

        // Apply filter button
        document.getElementById('apply-filter').addEventListener('click', () => {
            filterPanel.classList.remove('open');
            API.fetchLmpData();
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
        
        container.innerHTML = State.savedFilters.map((filter, index) => {
            const selectedDays = dayLabels.filter((_, i) => filter.daysOfWeek[i]).join(", ");
            const formatTime = (hours) => {
                const h = Math.floor(hours);
                const m = Math.round((hours - h) * 60);
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            };
            
            return `
                <div class="saved-filter-item">
                    <div class="saved-filter-header">Filter #${State.savedFilters.length - index}</div>
                    <div class="saved-filter-details">
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
        const filter = State.savedFilters[index];
        State.currentFilter = {
            startDate: new Date(filter.startDate),
            endDate: new Date(filter.endDate),
            startTime: filter.startTime,
            endTime: filter.endTime,
            daysOfWeek: [...filter.daysOfWeek]
        };

        // Update UI
        document.getElementById('start-date').value = filter.startDate.toISOString().split('T')[0];
        document.getElementById('end-date').value = filter.endDate.toISOString().split('T')[0];
        
        const dayButtons = document.querySelectorAll('.day-button');
        dayButtons.forEach((button) => {
            const dayIndex = parseInt(button.dataset.day);
            if (State.currentFilter.daysOfWeek[dayIndex]) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        TimeSlider.init();
    },

    deleteFilter(index) {
        State.savedFilters.splice(index, 1);
        this.updateSavedFiltersList();
    }
};