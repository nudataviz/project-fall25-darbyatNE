import * as d3 from "npm:d3";

export function dateTimeRangePicker(options = {}) {
  const {
    width = 800,
    height = 400,
    initialStartTime = 0,
    initialEndTime = 24,
    initialStartDate = new Date(),
    initialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    initialDaysOfWeek = [true, true, true, true, true, true, true]
  } = options;

  const container = d3.create("div")
    .style("font-family", "system-ui, -apple-system, sans-serif")
    .style("max-width", `${width}px`);

  // State management
  let startTime = Math.round(initialStartTime);
  let endTime = Math.round(initialEndTime);
  let startDate = new Date(initialStartDate);
  let endDate = new Date(initialEndDate);
  let daysOfWeek = [...initialDaysOfWeek];
  let savedFilters = [];

  // Days of week labels
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Create main sections
  const header = container.append("div")
    .style("margin-bottom", "20px");

  // Date range picker section
  const dateSection = container.append("div")
    .style("margin-bottom", "20px")
    .style("padding", "15px")
    .style("background", "#f8f9fa")
    .style("border-radius", "8px");

  dateSection.append("h4")
    .style("margin", "0 0 10px 0")
    .style("font-size", "14px")
    .text("Date Range");

  const dateInputs = dateSection.append("div")
    .style("display", "flex")
    .style("gap", "15px")
    .style("align-items", "center");

  dateInputs.append("label")
    .style("font-weight", "500")
    .text("Start:");

  const startDateInput = dateInputs.append("input")
    .attr("type", "date")
    .attr("value", formatDateForInput(startDate))
    .style("padding", "6px")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .on("change", function() {
      startDate = new Date(this.value);
      updateDisplay();
    });

  dateInputs.append("label")
    .style("font-weight", "500")
    .style("margin-left", "15px")
    .text("End:");

  const endDateInput = dateInputs.append("input")
    .attr("type", "date")
    .attr("value", formatDateForInput(endDate))
    .style("padding", "6px")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .on("change", function() {
      endDate = new Date(this.value);
      updateDisplay();
    });

  // Days of week section
  const daysSection = container.append("div")
    .style("margin-bottom", "20px")
    .style("padding", "15px")
    .style("background", "#f8f9fa")
    .style("border-radius", "8px");

  daysSection.append("h4")
    .style("margin", "0 0 10px 0")
    .style("font-size", "14px")
    .text("Days of Week");

  const daysContainer = daysSection.append("div")
    .style("display", "flex")
    .style("gap", "10px")
    .style("flex-wrap", "wrap");

  const dayButtons = dayLabels.map((label, i) => {
    const btn = daysContainer.append("button")
      .style("padding", "8px 16px")
      .style("border", "2px solid #007bff")
      .style("border-radius", "20px")
      .style("background", daysOfWeek[i] ? "#007bff" : "white")
      .style("color", daysOfWeek[i] ? "white" : "#007bff")
      .style("cursor", "pointer")
      .style("font-weight", "500")
      .style("transition", "all 0.2s")
      .text(label)
      .on("click", function() {
        daysOfWeek[i] = !daysOfWeek[i];
        d3.select(this)
          .style("background", daysOfWeek[i] ? "#007bff" : "white")
          .style("color", daysOfWeek[i] ? "white" : "#007bff");
        updateDisplay();
      })
      .on("mouseenter", function() {
        d3.select(this).style("opacity", "0.8");
      })
      .on("mouseleave", function() {
        d3.select(this).style("opacity", "1");
      });
    return btn;
  });

  // Time range slider section
  const timeSection = container.append("div")
    .style("margin-bottom", "20px")
    .style("padding", "15px")
    .style("background", "#f8f9fa")
    .style("border-radius", "8px");

  timeSection.append("h4")
    .style("margin", "0 0 10px 0")
    .style("font-size", "14px")
    .text("Time Range");

  const timeDisplay = timeSection.append("div")
    .style("margin-bottom", "15px")
    .style("font-size", "16px")
    .style("font-weight", "500")
    .style("color", "#333");

  const svgWidth = width - 60;
  const svgHeight = 80;
  const margin = { top: 20, right: 20, bottom: 30, left: 20 };
  const innerWidth = svgWidth - margin.left - margin.right;
  const innerHeight = svgHeight - margin.top - margin.bottom;
  const svg = timeSection.append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight);
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Create time scale
  const timeScale = d3.scaleLinear()
    .domain([0, 24])
    .range([0, innerWidth]);

  // Draw axis
  const axis = d3.axisBottom(timeScale)
    .ticks(24)
    .tickFormat(d => `${d}:00`);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(axis)
    .selectAll("text")
    .style("font-size", "10px");

  // Draw track
  const track = g.append("line")
    .attr("x1", 0)
    .attr("x2", innerWidth)
    .attr("y1", innerHeight / 2)
    .attr("y2", innerHeight / 2)
    .attr("stroke", "#ddd")
    .attr("stroke-width", 4)
    .attr("stroke-linecap", "round");

  // Draw selected range
  const rangeRect = g.append("rect")
    .attr("y", innerHeight / 2 - 2)
    .attr("height", 4)
    .attr("fill", "#007bff")
    .attr("rx", 2);

  // Create draggable handles
  const handleRadius = 10;
  
const startHandle = g.append("circle")
  .attr("cy", innerHeight / 2)
  .attr("r", handleRadius)
  .attr("fill", "#007bff")
  .attr("stroke", "white")
  .attr("stroke-width", 2)
  .attr("cursor", "ew-resize")
  .call(d3.drag()
    .on("drag", function(event) {
      const x = Math.max(0, Math.min(innerWidth, event.x));
      const newTime = Math.round(timeScale.invert(x)); // Snap to whole hour
      if (newTime < endTime) {
        startTime = newTime;
        updateTimeSlider();
        updateDisplay();
      }
    }));

const endHandle = g.append("circle")
  .attr("cy", innerHeight / 2)
  .attr("r", handleRadius)
  .attr("fill", "#007bff")
  .attr("stroke", "white")
  .attr("stroke-width", 2)
  .attr("cursor", "ew-resize")
  .call(d3.drag()
    .on("drag", function(event) {
      const x = Math.max(0, Math.min(innerWidth, event.x));
      const newTime = Math.round(timeScale.invert(x)); // Snap to whole hour
      if (newTime > startTime) {
        endTime = newTime;
        updateTimeSlider();
        updateDisplay();
      }
    }));

  function updateTimeSlider() {
    const x1 = timeScale(startTime);
    const x2 = timeScale(endTime);
    
    startHandle.attr("cx", x1);
    endHandle.attr("cx", x2);
    rangeRect
      .attr("x", x1)
      .attr("width", x2 - x1);
  }

  // Current filter display
  const currentFilterDisplay = container.append("div")
    .style("margin-bottom", "20px")
    .style("padding", "15px")
    .style("background", "#e7f3ff")
    .style("border-radius", "8px")
    .style("border", "2px solid #007bff");

  // Save button
  const saveButton = container.append("button")
    .style("padding", "10px 20px")
    .style("background", "#28a745")
    .style("color", "white")
    .style("border", "none")
    .style("border-radius", "6px")
    .style("font-size", "14px")
    .style("font-weight", "600")
    .style("cursor", "pointer")
    .style("margin-bottom", "20px")
    .text("💾 Save Filter")
    .on("click", saveFilter)
    .on("mouseenter", function() {
      d3.select(this).style("background", "#218838");
    })
    .on("mouseleave", function() {
      d3.select(this).style("background", "#28a745");
    });

  // Saved filters section
  const savedSection = container.append("div")
    .style("margin-top", "20px");

  savedSection.append("h4")
    .style("margin", "0 0 10px 0")
    .style("font-size", "14px")
    .text("Saved Filters");

  const savedList = savedSection.append("div")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("gap", "10px");

  function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
  }

  function formatTime(hours) {
    // Since hours are now integers (whole numbers), just output HH:00
    return `${Math.floor(hours).toString().padStart(2, '0')}:00`;
  }

  function getCurrentFilter() {
    return {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startTime: startTime,
      endTime: endTime,
      daysOfWeek: [...daysOfWeek],
      // Helper function for filtering data
      matches: function(date) {
        const d = new Date(date);
        const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const dayOfWeek = d.getDay();
        const hours = d.getHours() + d.getMinutes() / 60;
        
        return dateOnly >= this.startDate &&
               dateOnly <= this.endDate &&
               hours >= this.startTime &&
               hours <= this.endTime &&
               this.daysOfWeek[dayOfWeek];
      }
    };
  }

  function updateDisplay() {
    const selectedDays = dayLabels.filter((_, i) => daysOfWeek[i]).join(", ") || "None";
    
    timeDisplay.html(`
      <span style="color: #007bff;">${formatTime(startTime)}</span>
      <span style="color: #666;"> — </span>
      <span style="color: #007bff;">${formatTime(endTime)}</span>
    `);

    currentFilterDisplay.html(`
      <strong>Current Selection:</strong><br>
      <div style="margin-top: 8px; line-height: 1.6;">
        📅 Dates: ${startDate.toLocaleDateString()} — ${endDate.toLocaleDateString()}<br>
        ⏰ Time: ${formatTime(startTime)} — ${formatTime(endTime)}<br>
        📆 Days: ${selectedDays}
      </div>
    `);

    // Dispatch custom event with current filter
    container.node().dispatchEvent(new CustomEvent('filterchange', {
      detail: getCurrentFilter(),
      bubbles: true
    }));
  }

  function saveFilter() {
    const filter = getCurrentFilter();
    filter.id = Date.now();
    filter.savedAt = new Date();
    savedFilters.push(filter);
    updateSavedList();
    
    // Dispatch event for saved filters
    container.node().dispatchEvent(new CustomEvent('filtersaved', {
      detail: { filter, allFilters: savedFilters },
      bubbles: true
    }));
  }

  function updateSavedList() {
    savedList.selectAll("*").remove();

    if (savedFilters.length === 0) {
      savedList.append("div")
        .style("color", "#666")
        .style("font-style", "italic")
        .text("No saved filters yet");
      return;
    }

    savedFilters.forEach((filter, index) => {
      const filterItem = savedList.append("div")
        .style("padding", "12px")
        .style("background", "white")
        .style("border", "1px solid #ddd")
        .style("border-radius", "6px")
        .style("display", "flex")
        .style("justify-content", "space-between")
        .style("align-items", "start");

      const filterInfo = filterItem.append("div")
        .style("flex", "1");

      const selectedDays = dayLabels.filter((_, i) => filter.daysOfWeek[i]).join(", ");

      filterInfo.html(`
        <div style="font-weight: 500; margin-bottom: 4px;">Filter #${savedFilters.length - index}</div>
        <div style="font-size: 12px; color: #666; line-height: 1.5;">
          📅 ${filter.startDate.toLocaleDateString()} — ${filter.endDate.toLocaleDateString()}<br>
          ⏰ ${formatTime(filter.startTime)} — ${formatTime(filter.endTime)}<br>
          📆 ${selectedDays}
        </div>
      `);

      const buttonContainer = filterItem.append("div")
        .style("display", "flex")
        .style("gap", "8px");

      buttonContainer.append("button")
        .style("padding", "6px 12px")
        .style("background", "#007bff")
        .style("color", "white")
        .style("border", "none")
        .style("border-radius", "4px")
        .style("cursor", "pointer")
        .style("font-size", "12px")
        .text("Load")
        .on("click", () => loadFilter(filter))
        .on("mouseenter", function() {
          d3.select(this).style("background", "#0056b3");
        })
        .on("mouseleave", function() {
          d3.select(this).style("background", "#007bff");
        });

      buttonContainer.append("button")
        .style("padding", "6px 12px")
        .style("background", "#dc3545")
        .style("color", "white")
        .style("border", "none")
        .style("border-radius", "4px")
        .style("cursor", "pointer")
        .style("font-size", "12px")
        .text("Delete")
        .on("click", () => deleteFilter(filter.id))
        .on("mouseenter", function() {
          d3.select(this).style("background", "#c82333");
        })
        .on("mouseleave", function() {
          d3.select(this).style("background", "#dc3545");
        });
    });
  }

  function loadFilter(filter) {
    startDate = new Date(filter.startDate);
    endDate = new Date(filter.endDate);
    startTime = filter.startTime;
    endTime = filter.endTime;
    daysOfWeek = [...filter.daysOfWeek];

    startDateInput.property("value", formatDateForInput(startDate));
    endDateInput.property("value", formatDateForInput(endDate));
    
    dayButtons.forEach((btn, i) => {
      btn.style("background", daysOfWeek[i] ? "#007bff" : "white")
         .style("color", daysOfWeek[i] ? "white" : "#007bff");
    });

    updateTimeSlider();
    updateDisplay();
  }

  function deleteFilter(id) {
    savedFilters = savedFilters.filter(f => f.id !== id);
    updateSavedList();
  }

  // Initialize display
  updateTimeSlider();
  updateDisplay();
  updateSavedList();

  // Add method to get current filter
  const node = container.node();
  node.getCurrentFilter = getCurrentFilter;
  node.getSavedFilters = () => savedFilters;

  return node;
}
