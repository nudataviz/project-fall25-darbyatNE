// D3-based time range slider
const TimeSlider = {
    init() {
        const svgWidth = document.getElementById('time-slider-container').clientWidth;
        const svgHeight = 80;
        const margin = { top: 20, right: 10, bottom: 30, left: 10 };
        const innerWidth = svgWidth - margin.left - margin.right;
        const innerHeight = svgHeight - margin.top - margin.bottom;

        const svg = d3.select("#time-slider-svg")
            .attr("width", svgWidth)
            .attr("height", svgHeight);

        svg.selectAll("*").remove();

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const timeScale = d3.scaleLinear()
            .domain([0, 24])
            .range([0, innerWidth]);

        // Axis
        const axis = d3.axisBottom(timeScale)
            .ticks(12)
            .tickFormat(d => `${d}:00`);

        g.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(axis)
            .selectAll("text")
            .style("font-size", "9px");

        // Track
        g.append("line")
            .attr("x1", 0)
            .attr("x2", innerWidth)
            .attr("y1", innerHeight / 2)
            .attr("y2", innerHeight / 2)
            .attr("stroke", "#ddd")
            .attr("stroke-width", 4)
            .attr("stroke-linecap", "round");

        // Selected range
        const rangeRect = g.append("rect")
            .attr("y", innerHeight / 2 - 2)
            .attr("height", 4)
            .attr("fill", "#007bff")
            .attr("rx", 2);

        const handleRadius = 10;

        // Start handle
        const startHandle = g.append("circle")
            .attr("cy", innerHeight / 2)
            .attr("r", handleRadius)
            .attr("fill", "#007bff")
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .attr("cursor", "ew-resize");

        // End handle
        const endHandle = g.append("circle")
            .attr("cy", innerHeight / 2)
            .attr("r", handleRadius)
            .attr("fill", "#007bff")
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .attr("cursor", "ew-resize");

        const updateSlider = () => {
            const x1 = timeScale(State.currentFilter.startTime);
            const x2 = timeScale(State.currentFilter.endTime);
            
            startHandle.attr("cx", x1);
            endHandle.attr("cx", x2);
            rangeRect
                .attr("x", x1)
                .attr("width", x2 - x1);
            
            this.updateTimeDisplay();
        };

        const drag = d3.drag()
            .on("drag", function(event, d) {
                const isStart = d === 'start';
                const x = Math.max(0, Math.min(innerWidth, event.x));
                const newTime = timeScale.invert(x);
                
                if (isStart && newTime < State.currentFilter.endTime) {
                    State.currentFilter.startTime = newTime;
                    updateSlider();
                } else if (!isStart && newTime > State.currentFilter.startTime) {
                    State.currentFilter.endTime = newTime;
                    updateSlider();
                }
            });

        startHandle.datum('start').call(drag);
        endHandle.datum('end').call(drag);

        updateSlider();
    },

    updateTimeDisplay() {
        const formatTime = (hours) => {
            const h = Math.floor(hours);
            const m = Math.round((hours - h) * 60);
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };
        
        document.getElementById('time-display').textContent = 
            `${formatTime(State.currentFilter.startTime)} — ${formatTime(State.currentFilter.endTime)}`;
    }
};