# HW05-Story 4
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ERCOT Electricity Generation Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
    <script src="https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6"></script>
</head>
<body>
    <h1>MW's Generated in ERCOT, the Independent Electricity System of Texas</h1>
    <div id="chart"></div>
    <div id="debug-info" style="margin-top: 20px; padding: 10px; border: 1px solid #ccc; background-color: #f9f9f9;"></div>
    <label for="start-date">Start Date:</label>
    <input type="date" id="start-date" name="start-date" value="2025-07-01">
    <label for="end-date">End Date:</label>
    <input type="date" id="end-date" name="end-date" value="2025-07-02">
    <button id="get-data">Get Data</button>
    <span id="updateMessage" style="display:none; margin-left: 10px;"></span>
    <div id="day-checkboxes">
        <label><input type="checkbox" name="day" value="Monday" checked> Monday</label>
        <label><input type="checkbox" name="day" value="Tuesday" checked> Tuesday</label>
        <label><input type="checkbox" name="day" value="Wednesday" checked> Wednesday</label>
        <label><input type="checkbox" name="day" value="Thursday" checked> Thursday</label>
        <label><input type="checkbox" name="day" value="Friday" checked> Friday</label>
        <label><input type="checkbox" name="day" value="Saturday" checked> Saturday</label>
        <label><input type="checkbox" name="day" value="Sunday" checked> Sunday</label>
    </div>
    <script>
        // Globals
        let daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        let dayofWeek = [];
        let checkout = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        async function fetchData(startDate, endDate) {
            if (!startDate || !endDate) {
                throw new Error('Start date and end date are required');
            }
            const formattedStartDate = `${startDate}T00`;
            const formattedEndDate = `${endDate}T23`;
            const apiUrl = `https://api.eia.gov/v2/electricity/rto/region-data/data/?api_key=6kEAa3sFxE3ReohgUBBKFv4fm2AcGDG8Fx8Iog8l&frequency=hourly&data[0]=value&facets[respondent][]=ERCO&sort[0][column]=period&sort[0][direction]=asc&start=${formattedStartDate}&end=${formattedEndDate}`;
            try {
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const jsonData = await response.json();
                if (!jsonData.response || !jsonData.response.data) {
                    console.log('Full API response:', jsonData);
                    throw new Error('Unexpected API response');
                }
                const dataArray = jsonData.response.data;
                const netGenerationData = dataArray
                    .filter(item => item["type-name"] === "Net generation")
                    .map(item => ({
                        period: item.period,
                        value: item.value
                    }));
                if (netGenerationData.length === 0) {
                    console.log('All available data:', dataArray);
                }
                return netGenerationData;
            } catch (error) {
                console.error("Fetch error:", error);
                throw error;
            }
        }
        document.getElementById('get-data').addEventListener('click', async () => {
            const startDate = document.getElementById('start-date').value;
            const endDate = document.getElementById('end-date').value;
            document.getElementById('debug-info').innerHTML = '';
            if (startDate && endDate) {
                try {
                    const data = await fetchData(startDate, endDate);
                    const processedData = data.map(item => {
                        const p = item.period;
                        let isoString = `${p}:00:00Z`;
                        const date = new Date(isoString);
                        return {
                            day: date.toISOString().split('T')[0],
                            hour: date.getUTCHours(),
                            value: item.value
                        };
                    });
                    dayofWeek = processedData.map(d => {
                        const date = new Date(d.day);
                        const dayofweek = daysOfWeek[date.getUTCDay()];
                        return {
                            ...d,
                            dayofweek: dayofweek
                        };
                    });
                    updateChart();
                    const messageElement = document.getElementById('updateMessage');
                    messageElement.textContent = 'Chart Data Updated 😊';
                    messageElement.style.display = 'inline';
                    setTimeout(() => {
                        messageElement.style.display = 'none';
                    }, 3000);
                } catch (error) {
                    alert('Error fetching data: ' + error.message);
                }
            } else {
                alert('Please select a start and end date.');
            }
        });
        function updateChart() {
            d3.select("#chart").selectAll("*").remove();
            if (dayofWeek.length === 0) {
                return;
            }
            const filteredData = dayofWeek.filter(d => checkout.includes(d.dayofweek));
            try {
                const chart = Plot.plot({
                    marks: [
                        Plot.line(filteredData, {
                            x: "hour",
                            y: "value",
                            stroke: "dayofweek",
                            z: "day"
                        }),
                        Plot.tip(filteredData, Plot.pointer({
                            x: "hour",
                            y: "value",
                            z: "day",
                            title: (d) => `${d.dayofweek}, Hour ${d.hour}\n${d.value.toLocaleString()} MW`
                        }))
                    ],
                    x: {
                        label: "Hour of Day (UTC)",
                        grid: true,
                        ticks: 24
                    },
                    y: {
                        label: "Total Megawatts",
                        grid: true,
                        domain: [30000, 85000]
                    },
                    color: {
                        domain: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                        range: ["#af7aa1", "#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f", "#edc949"],
                        legend: true
                    }
                });
                document.getElementById("chart").appendChild(chart);
            } catch (error) {
                console.error('Chart error:', error);
            }
        }
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                if (this.checked) {
                    if (!checkout.includes(this.value)) {
                        checkout.push(this.value);
                    }
                } else {
                    checkout = checkout.filter(day => day !== this.value);
                }
                if (dayofWeek.length > 0) {
                    updateChart();
                }
            });
        });
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('get-data').click();
        });
    </script>
</body>
</html>
