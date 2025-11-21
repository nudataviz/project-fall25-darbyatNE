// Observable Plot visualization module - Auto-shows when zones selected

const ObservablePlot = {
    currentData: null,
    viewMode: 'chart', // 'chart' or 'table'

    /**
     * Initialize the plot functionality
     */
    init() {
        const showTableBtn = document.getElementById('show-table');
        const showChartBtn = document.getElementById('show-chart');

        if (showTableBtn) {
            showTableBtn.addEventListener('click', () => {
                this.viewMode = 'table';
                showTableBtn.style.display = 'none';
                showChartBtn.style.display = 'inline-block';
                if (this.currentData) {
                    this.renderTable(this.currentData);
                }
            });
        }

        if (showChartBtn) {
            showChartBtn.addEventListener('click', () => {
                this.viewMode = 'chart';
                showChartBtn.style.display = 'none';
                showTableBtn.style.display = 'inline-block';
                if (this.currentData) {
                    this.renderChart(this.currentData);
                }
            });
        }

        // Initially hide the plot container
        this.hide();

        console.log("Observable Plot module initialized");
    },

    /**
     * Show the plot container
     */
    show() {
        const plotContainer = document.getElementById('plot-container');
        const plotContent = document.getElementById('plot-content');
        
        if (plotContainer && plotContent) {
            plotContainer.style.display = 'block';
            plotContent.style.display = 'block';
            document.body.classList.add('plot-visible');
        }
    },

    /**
     * Hide the plot container
     */
    hide() {
        const plotContainer = document.getElementById('plot-container');
        const plotContent = document.getElementById('plot-content');
        
        if (plotContainer && plotContent) {
            plotContainer.style.display = 'none';
            plotContent.style.display = 'none';
            document.body.classList.remove('plot-visible');
        }
    },

    /**
     * Update the plot with new filtered data
     * @param {Object} lmpDataByZone - LMP data organized by zone
     */
    async updatePlot(lmpDataByZone) {
        // Check if Plot library is available
        if (!window.Plot) {
            console.error("Observable Plot library not loaded");
            return;
        }

        // Convert data to flat array format
        const plotData = [];
        
        for (const [zone, readings] of Object.entries(lmpDataByZone)) {
            for (const reading of readings) {
                plotData.push({
                    zone: zone,
                    datetime: new Date(reading.datetime_beginning_ept),
                    lmp: reading.lmp_value,
                    hour: new Date(reading.datetime_beginning_ept).getHours(),
                    date: new Date(reading.datetime_beginning_ept).toISOString().split('T')[0]
                });
            }
        }

        this.currentData = plotData;

        // Show container if we have selected zones
        const hasSelectedZones = State.selectedZones && State.selectedZones.size > 0;
        const hasData = plotData.length > 0;

        if (hasSelectedZones && hasData) {
            this.show();
            // Render based on current view mode
            if (this.viewMode === 'table') {
                this.renderTable(plotData);
            } else {
                this.renderChart(plotData);
            }
        } else {
            this.hide();
        }

        console.log(`Plot data updated: ${plotData.length} records across ${Object.keys(lmpDataByZone).length} zones`);
    },

    /**
     * Render the Observable Plot chart
     * @param {Array} data - Array of data points
     */
    renderChart(data) {
        if (!window.Plot || !data || data.length === 0) {
            console.warn("Cannot render chart: missing Plot library or data");
            return;
        }

        const container = document.getElementById('observable-plot');
        if (!container) {
            console.error("observable-plot container not found");
            return;
        }

        // Clear previous content
        container.innerHTML = '';

        try {
            // Get unique zones for color scale
            const zones = [...new Set(data.map(d => d.zone))].sort();
            
            // Create color scale
            const colorScale = d3.scaleOrdinal()
                .domain(zones)
                .range(d3.schemeTableau10);

            // Create the plot
            const plot = Plot.plot({
                marginLeft: 60,
                marginRight: 120,
                width: Math.max(container.offsetWidth, 800),
                height: 400,
                y: {
                    grid: true,
                    label: "LMP ($/MWh)"
                },
                x: {
                    label: "Date/Time",
                    type: "time"
                },
                color: {
                    legend: true,
                    domain: zones,
                    range: zones.map(z => colorScale(z))
                },
                marks: [
                    // Background
                    Plot.ruleY([0], {stroke: "#ccc", strokeWidth: 1}),
                    
                    // Lines for each zone
                    Plot.line(data, {
                        x: "datetime",
                        y: "lmp",
                        stroke: "zone",
                        strokeWidth: 2,
                        tip: true
                    }),
                    
                    // Points for interactivity
                    Plot.dot(data, {
                        x: "datetime",
                        y: "lmp",
                        fill: "zone",
                        r: 3,
                        title: d => `${d.zone}\n${d.datetime.toLocaleString()}\n$${d.lmp.toFixed(2)}/MWh`
                    })
                ]
            });

            container.appendChild(plot);
            console.log("Chart rendered successfully");

        } catch (error) {
            console.error("Error rendering chart:", error);
            container.innerHTML = `<div class="plot-error">Error rendering chart: ${error.message}</div>`;
        }
    },

    /**
     * Render the data as a table
     * @param {Array} data - Array of data points
     */
    renderTable(data) {
        if (!data || data.length === 0) {
            console.warn("Cannot render table: no data");
            return;
        }

        const container = document.getElementById('observable-plot');
        if (!container) {
            console.error("observable-plot container not found");
            return;
        }

        // Clear previous content
        container.innerHTML = '';

        try {
            // Sort data by zone and datetime
            const sortedData = [...data].sort((a, b) => {
                const zoneCompare = a.zone.localeCompare(b.zone);
                if (zoneCompare !== 0) return zoneCompare;
                return a.datetime - b.datetime;
            });

            // Create table HTML
            const tableHTML = `
                <div class="data-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Zone</th>
                                <th>Date/Time</th>
                                <th>LMP ($/MWh)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedData.map(d => `
                                <tr>
                                    <td><strong>${d.zone}</strong></td>
                                    <td>${d.datetime.toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}</td>
                                    <td>$${d.lmp.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="table-actions">
                        <button id="download-csv-btn" class="plot-btn">📥 Download CSV</button>
                    </div>
                </div>
            `;

            container.innerHTML = tableHTML;

            // Add download functionality
            const downloadBtn = document.getElementById('download-csv-btn');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', () => {
                    this.downloadAsCSV(sortedData);
                });
            }

            console.log("Table rendered successfully");

        } catch (error) {
            console.error("Error rendering table:", error);
            container.innerHTML = `<div class="plot-error">Error rendering table: ${error.message}</div>`;
        }
    },

    /**
     * Download data as CSV
     * @param {Array} data - Array of data points
     */
    downloadAsCSV(data) {
        // Create CSV content
        const headers = ['Zone', 'Date', 'Hour', 'LMP ($/MWh)'];
        const rows = data.map(d => {
            const dateStr = d.datetime.toISOString().split('T')[0];
            const hour = d.datetime.getHours();
            return [d.zone, dateStr, hour, d.lmp.toFixed(2)];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Generate filename with selected zones
        const selectedZones = State.selectedZones.size > 0 
            ? Array.from(State.selectedZones).join('-')
            : 'all-zones';
        a.download = `lmp_data_${selectedZones}_${new Date().toISOString().split('T')[0]}.csv`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('CSV downloaded');
    }
};
