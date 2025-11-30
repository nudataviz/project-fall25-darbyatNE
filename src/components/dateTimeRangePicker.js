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
  let startTime = Math.round(initialStartTime ?? 0);
  let endTime = Math.round(initialEndTime ?? 24);
  let startDate = new Date(initialStartDate);
  let endDate = new Date(initialEndDate);
  let daysOfWeek = [...(initialDaysOfWeek || [true, true, true, true, true, true, true])];
  let savedFilters = [];

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // --- SECTIONS ---
  const header = container.append("div").style("margin-bottom", "20px");

  // 1. Date Section
  const dateSection = container.append("div")
    .style("margin-bottom", "20px")
    .style("padding", "15px")
    .style("background-color", "#f8f9fa") 
    .style("border-radius", "8px");

  dateSection.append("h4").style("margin", "0 0 10px 0").style("font-size", "14px").text("Date Range");
  const dateInputs = dateSection.append("div").style("display", "flex").style("gap", "15px").style("align-items", "center");

  dateInputs.append("label").style("font-weight", "500").text("Start:");
  const startDateInput = dateInputs.append("input")
    .attr("type", "date")
    .attr("value", formatDateForInput(startDate))
    .style("padding", "6px").style("border", "1px solid #ccc").style("border-radius", "4px")
    .on("change", function() {
      const parts = this.value.split('-');
      startDate = new Date(parts[0], parts[1] - 1, parts[2]); 
      updateDisplay();
    });

  dateInputs.append("label").style("font-weight", "500").style("margin-left", "15px").text("End:");
  const endDateInput = dateInputs.append("input")
    .attr("type", "date")
    .attr("value", formatDateForInput(endDate))
    .style("padding", "6px").style("border", "1px solid #ccc").style("border-radius", "4px")
    .on("change", function() {
      const parts = this.value.split('-');
      endDate = new Date(parts[0], parts[1] - 1, parts[2]);
      updateDisplay();
    });

  // 2. Days Section
  const daysSection = container.append("div")
    .style("margin-bottom", "20px")
    .style("padding", "15px")
    .style("background-color", "#f8f9fa")
    .style("border-radius", "8px");

  daysSection.append("h4").style("margin", "0 0 10px 0").style("font-size", "14px").text("Days of Week");
  const daysContainer = daysSection.append("div").style("display", "flex").style("gap", "10px").style("flex-wrap", "wrap");

  const dayButtons = dayLabels.map((label, i) => {
    return daysContainer.append("button")
      .style("padding", "8px 16px")
      .style("border", "2px solid #007bff")
      .style("border-radius", "20px")
      .style("background-color", daysOfWeek[i] ? "#007bff" : "white")
      .style("color", daysOfWeek[i] ? "white" : "#007bff")
      .style("cursor", "pointer").style("font-weight", "500").style("transition", "all 0.2s")
      .text(label)
      .on("click", function() {
        daysOfWeek[i] = !daysOfWeek[i];
        d3.select(this)
          .style("background-color", daysOfWeek[i] ? "#007bff" : "white")
          .style("color", daysOfWeek[i] ? "white" : "#007bff");
        updateDisplay();
      })
      .on("mouseenter", function() { d3.select(this).style("opacity", "0.8"); })
      .on("mouseleave", function() { d3.select(this).style("opacity", "1"); });
  });

  // 3. Time Section
  const timeSection = container.append("div")
    .style("margin-bottom", "20px")
    .style("padding", "15px")
    .style("background-color", "#f8f9fa") 
    .style("border-radius", "8px");

  timeSection.append("h4").style("margin", "0 0 10px 0").style("font-size", "14px").text("Time Range");
  const timeDisplay = timeSection.append("div").style("margin-bottom", "15px").style("font-size", "16px").style("font-weight", "500").style("color", "#333");

  const svgWidth = width - 60, svgHeight = 80, margin = { top: 20, right: 20, bottom: 30, left: 20 };
  const innerWidth = svgWidth - margin.left - margin.right, innerHeight = svgHeight - margin.top - margin.bottom;
  const svg = timeSection.append("svg").attr("width", svgWidth).attr("height", svgHeight);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const timeScale = d3.scaleLinear().domain([0, 24]).range([0, innerWidth]);
  const axis = d3.axisBottom(timeScale).ticks(24).tickFormat(d => `${d}:00`);
  g.append("g").attr("transform", `translate(0,${innerHeight})`).call(axis).selectAll("text").style("font-size", "10px");
  
  const track = g.append("line").attr("x1", 0).attr("x2", innerWidth).attr("y1", innerHeight / 2).attr("y2", innerHeight / 2).attr("stroke", "#ddd").attr("stroke-width", 4).attr("stroke-linecap", "round");
  const rangeRect = g.append("rect").attr("y", innerHeight / 2 - 2).attr("height", 4).attr("fill", "#007bff").attr("rx", 2);
  const handleRadius = 10;

  const startHandle = g.append("circle").attr("cy", innerHeight / 2).attr("r", handleRadius).attr("fill", "#007bff").attr("stroke", "white").attr("stroke-width", 2).attr("cursor", "ew-resize")
    .call(d3.drag().on("drag", function(event) {
        const x = Math.max(0, Math.min(innerWidth, event.x));
        const newTime = Math.round(timeScale.invert(x)); 
        if (newTime < endTime) { startTime = newTime; updateTimeSlider(); updateDisplay(); }
      }));

  const endHandle = g.append("circle").attr("cy", innerHeight / 2).attr("r", handleRadius).attr("fill", "#007bff").attr("stroke", "white").attr("stroke-width", 2).attr("cursor", "ew-resize")
    .call(d3.drag().on("drag", function(event) {
        const x = Math.max(0, Math.min(innerWidth, event.x));
        const newTime = Math.round(timeScale.invert(x)); 
        if (newTime > startTime) { endTime = newTime; updateTimeSlider(); updateDisplay(); }
      }));

  function updateTimeSlider() {
    const x1 = timeScale(startTime), x2 = timeScale(endTime);
    startHandle.attr("cx", x1); endHandle.attr("cx", x2);
    rangeRect.attr("x", x1).attr("width", x2 - x1);
  }

  // 4. Current Filter Display
  const currentFilterDisplay = container.append("div")
    .style("margin-bottom", "20px")
    .style("padding", "15px")
    .style("background-color", "#e7f3ff") 
    .style("border-radius", "8px")
    .style("border", "2px solid #007bff");

  // ============================================================
  // 🔘 ACTION BUTTONS (Save & Map Data)
  // ============================================================
  const actionContainer = container.append("div")
    .style("display", "flex")
    // PADDING: 0 (top/bottom) 50px (left/right) -> Makes buttons narrower
    .style("padding", "0 50px")  
    .style("margin-bottom", "20px");

  // Save Button
  actionContainer.append("button")
    .style("flex", "1")
    .style("margin-right", "20px") // 20px Space between buttons
    .style("padding", "12px 6px")
    .style("background-color", "#28a745") 
    .style("color", "white")
    .style("border", "none")
    .style("border-radius", "6px")
    .style("font-size", "14px")
    .style("font-weight", "600")
    .style("cursor", "pointer")
    .text("💾 Save Filter")
    .on("click", saveFilter)
    .on("mouseenter", function() { d3.select(this).style("background-color", "#218838"); })
    .on("mouseleave", function() { d3.select(this).style("background-color", "#28a745"); });

  // Map Data Button (Triggers 'apply' event)
  actionContainer.append("button")
    .style("flex", "1")
    .style("padding", "12px 12px")
    .style("background-color", "#17a2b8") 
    .style("color", "white")
    .style("border", "none")
    .style("border-radius", "6px")
    .style("font-size", "14px")
    .style("font-weight", "600")
    .style("cursor", "pointer")
    .text("🗺️ Map Data") 
    .on("click", function() {
        // 🚀 Dispatches the event to the parent page
        container.node().dispatchEvent(new CustomEvent('apply', {
            detail: getCurrentFilter(),
            bubbles: true
        }));
    })
    .on("mouseenter", function() { d3.select(this).style("background-color", "#138496"); })
    .on("mouseleave", function() { d3.select(this).style("background-color", "#17a2b8"); });

  // 5. Saved Filters List
  const savedSection = container.append("div").style("margin-top", "20px");
  savedSection.append("h4").style("margin", "0 0 10px 0").style("font-size", "14px").text("Saved Filters");
  const savedList = savedSection.append("div").style("display", "flex").style("flex-direction", "column").style("gap", "10px");

  // --- HELPERS ---
  function formatDateForInput(date) {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  function formatTime(hours) { return `${Math.floor(hours).toString().padStart(2, '0')}:00`; }

  function getCurrentFilter() {
    return {
      startDate: new Date(startDate), endDate: new Date(endDate),
      startTime: startTime, endTime: endTime, daysOfWeek: [...daysOfWeek],
      matches: function(date) { /* ... logic ... */ }
    };
  }

  function updateDisplay() {
    const selectedDays = dayLabels.filter((_, i) => daysOfWeek[i]).join(", ") || "None";
    timeDisplay.html(`<span style="color: #007bff;">${formatTime(startTime)}</span> <span style="color: #666;">—</span> <span style="color: #007bff;">${formatTime(endTime)}</span>`);
    currentFilterDisplay.html(`<strong>Current Selection:</strong><br><div style="margin-top: 8px; line-height: 1.6;">📅 Dates: ${startDate.toLocaleDateString()} — ${endDate.toLocaleDateString()}<br>⏰ Time: ${formatTime(startTime)} — ${formatTime(endTime)}<br>📆 Days: ${selectedDays}</div>`);
    container.node().dispatchEvent(new CustomEvent('filterchange', { detail: getCurrentFilter(), bubbles: true }));
  }

  function saveFilter() {
    const filter = getCurrentFilter();
    filter.id = Date.now(); filter.savedAt = new Date();
    savedFilters.push(filter);
    updateSavedList();
    container.node().dispatchEvent(new CustomEvent('filtersaved', { detail: { filter, allFilters: savedFilters }, bubbles: true }));
  }

  function updateSavedList() {
    savedList.selectAll("*").remove();
    if (savedFilters.length === 0) { savedList.append("div").style("color", "#666").style("font-style", "italic").text("No saved filters yet"); return; }
    savedFilters.forEach((filter, index) => {
      const filterItem = savedList.append("div").style("padding", "12px").style("background-color", "white").style("border", "1px solid #ddd").style("border-radius", "6px").style("display", "flex").style("justify-content", "space-between").style("align-items", "start");
      const selectedDays = dayLabels.filter((_, i) => filter.daysOfWeek[i]).join(", ");
      filterItem.append("div").style("flex", "1").html(`<div style="font-weight: 500; margin-bottom: 4px;">Filter #${savedFilters.length - index}</div><div style="font-size: 12px; color: #666; line-height: 1.5;">📅 ${filter.startDate.toLocaleDateString()} — ${filter.endDate.toLocaleDateString()}<br>⏰ ${formatTime(filter.startTime)} — ${formatTime(filter.endTime)}<br>📆 ${selectedDays}</div>`);
      const btnContainer = filterItem.append("div").style("display", "flex").style("gap", "8px");
      
      btnContainer.append("button").style("padding", "6px 12px").style("background-color", "#007bff").style("color", "white").style("border", "none").style("border-radius", "4px").style("cursor", "pointer").style("font-size", "12px").text("Load")
        .on("click", () => loadFilter(filter))
        .on("mouseenter", function() { d3.select(this).style("background-color", "#0056b3"); }).on("mouseleave", function() { d3.select(this).style("background-color", "#007bff"); });
      
      btnContainer.append("button").style("padding", "6px 12px").style("background-color", "#dc3545").style("color", "white").style("border", "none").style("border-radius", "4px").style("cursor", "pointer").style("font-size", "12px").text("Delete")
        .on("click", () => deleteFilter(filter.id))
        .on("mouseenter", function() { d3.select(this).style("background-color", "#c82333"); }).on("mouseleave", function() { d3.select(this).style("background-color", "#dc3545"); });
    });
  }

  function loadFilter(filter) {
    startDate = new Date(filter.startDate); endDate = new Date(filter.endDate);
    startTime = filter.startTime; endTime = filter.endTime; daysOfWeek = [...filter.daysOfWeek];
    startDateInput.property("value", formatDateForInput(startDate)); endDateInput.property("value", formatDateForInput(endDate));
    dayButtons.forEach((btn, i) => { btn.style("background-color", daysOfWeek[i] ? "#007bff" : "white").style("color", daysOfWeek[i] ? "white" : "#007bff"); });
    updateTimeSlider(); updateDisplay();
  }

  function deleteFilter(id) { savedFilters = savedFilters.filter(f => f.id !== id); updateSavedList(); }

  updateTimeSlider(); updateDisplay(); updateSavedList();
  const node = container.node();
  node.getCurrentFilter = getCurrentFilter; node.getSavedFilters = () => savedFilters;
  return node;
}
