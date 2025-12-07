import * as d3 from "npm:d3";

export function dateTimeRangePicker(options = {}) {
  const {
    width = 800,
    height = 400,
    initialStartTime = 0,
    initialEndTime = 24,
    initialStartDate = new Date(), 
    initialEndDate = new Date(),
    initialDaysOfWeek = [true, true, true, true, true, true, true],
    constraintList = [],
    initialConstraint = ""
  } = options;

  const container = d3.create("div")
    .style("font-family", "system-ui, -apple-system, sans-serif")
    .style("max-width", `${width}px`);
  
  // 🛡️ HELPER: Force "Local Midnight" regardless of input format
  function parseLocal(input) {
      if (!input) return new Date();
      
      // 1. String Input ("2025-06-30")
      if (typeof input === 'string') {
          const [y, m, d] = input.split('-').map(Number);
          return new Date(y, m - 1, d); 
      }

      // 2. Date Object Input -> 
      if (input instanceof Date) {
          if (input.getUTCHours() === 0 && input.getUTCMinutes() === 0) {
               return new Date(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate());
          }
          return new Date(input.getFullYear(), input.getMonth(), input.getDate());
      }
      return new Date();
  }

  // State management
  let startTime = Math.round(initialStartTime ?? 0);
  let endTime = Math.round(initialEndTime ?? 24);
  
  // Apply fix immediately on load
  let startDate = parseLocal(initialStartDate);
  let endDate = parseLocal(initialEndDate);
  
  let daysOfWeek = [...(initialDaysOfWeek || [true, true, true, true, true, true, true])];
  let selectedConstraint = initialConstraint || "";
  let savedFilters = [];

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const header = container.append("div").style("margin-bottom", "20px");
  const controlFrame = container.append("div")
    .style("background-color", "#f4f4f4") 
    .style("border", "2px solid black")    
    .style("border-radius", "8px")
    .style("padding", "15px")
    .style("margin-bottom", "20px");

  // Constraint Section
  const constraintSection = controlFrame.append("div").style("margin-bottom", "10px").style("padding", "10px").style("background-color", "#e6f7ff").style("border", "1px solid #ccc").style("border-radius", "5px");
  constraintSection.append("div").style("font-weight", "bold").style("font-size", "18px").style("margin-bottom", "4px").style("color", "#333").text("PJM Transmission Constraints");
  const constraintSelect = constraintSection.append("select").style("width", "100%").style("font-size", "16px").style("padding", "4px").on("change", function() { selectedConstraint = this.value; updateDisplay(); });
  
  let displayList = [...constraintList];
  if (displayList.length === 0 || displayList[0] !== "") displayList.unshift("");
  constraintSelect.selectAll("option").data(displayList).enter().append("option").attr("value", d => d).text(d => d === "" ? "-- Select a Constraint OR Leave Empty --" : d).property("selected", d => d === selectedConstraint);

  // Date Section
  const dateSection = controlFrame.append("div").style("margin-bottom", "10px").style("padding", "10px").style("background-color", "#e6f7ff").style("border", "1px solid #ccc").style("border-radius", "5px");
  dateSection.append("h4").style("margin", "0 0 10px 0").style("font-size", "18px").text("Date Range");
  const dateInputs = dateSection.append("div").style("display", "flex").style("gap", "15px").style("align-items", "center");

  dateInputs.append("label").style("font-weight", "500").text("Start:");
  const startDateInput = dateInputs.append("input")
    .attr("type", "date")
    .attr("value", formatDateForInput(startDate))
    .style("font-size", "16px").style("padding", "6px").style("border", "1px solid #ccc").style("border-radius", "4px")
    .on("change", function() {
      startDate = parseLocal(this.value); 
      updateDisplay();
    });

  dateInputs.append("label").style("font-weight", "500").style("margin-left", "15px").text("End:");
  const endDateInput = dateInputs.append("input")
    .attr("type", "date")
    .attr("value", formatDateForInput(endDate))
    .style("font-size", "16px").style("padding", "6px").style("border", "1px solid #ccc").style("border-radius", "4px")
    .on("change", function() {
      endDate = parseLocal(this.value);
      updateDisplay();
    });

  // Days Section
  const daysSection = controlFrame.append("div").style("margin-bottom", "10px").style("padding", "10px").style("background-color", "#e6f7ff").style("border", "1px solid #ccc").style("border-radius", "5px");
  daysSection.append("h4").style("margin", "0 0 10px 0").style("font-size", "18px").text("Days of Week");
  const daysContainer = daysSection.append("div").style("display", "flex").style("gap", "10px").style("flex-wrap", "wrap");
  const dayButtons = dayLabels.map((label, i) => {
    return daysContainer.append("button").style("padding", "8px 16px").style("border", "2px solid #007bff").style("border-radius", "20px").style("background-color", daysOfWeek[i] ? "#007bff" : "white").style("color", daysOfWeek[i] ? "white" : "#007bff").style("cursor", "pointer").style("font-weight", "500").text(label)
      .on("click", function() { daysOfWeek[i] = !daysOfWeek[i]; d3.select(this).style("background-color", daysOfWeek[i] ? "#007bff" : "white").style("color", daysOfWeek[i] ? "white" : "#007bff"); updateDisplay(); });
  });

  // Time Section
  const timeSection = controlFrame.append("div").style("margin-bottom", "10px").style("padding", "10px").style("background-color", "#e6f7ff").style("border", "1px solid #ccc").style("border-radius", "5px");
  const timeHeaderBox = timeSection.append("div").style("display", "flex").style("gap", "10px").style("padding-bottom", "4px");
  timeHeaderBox.append("div").style("width", "100%").style("font-size", "18px").style("font-weight", "bold").text("Time Range");
  const timeDisplay = timeHeaderBox.append("div").style("flex", "1").style("min-width", "150px").style("font-size", "18px").style("font-weight", "500").style("color", "#333");

  const svgWidth = (width - 30) - 40, svgHeight = 40, margin = { top: 15, right: 20, bottom: 20, left: 20 };
  const innerWidth = svgWidth - margin.left - margin.right, innerHeight = svgHeight - margin.top - margin.bottom;
  const svg = timeSection.append("svg").attr("width", svgWidth).attr("height", svgHeight);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const timeScale = d3.scaleLinear().domain([0, 24]).range([0, innerWidth]);
  g.append("g").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(timeScale).ticks(24).tickFormat(d => `${d}:00`)).selectAll("text").style("font-size", "10px");
  g.append("line").attr("x1", 0).attr("x2", innerWidth).attr("y1", innerHeight / 2).attr("y2", innerHeight / 2).attr("stroke", "#ddd").attr("stroke-width", 4);
  const rangeRect = g.append("rect").attr("y", innerHeight / 2 - 2).attr("height", 4).attr("fill", "#007bff").attr("rx", 2);
  
  const startHandle = g.append("circle").attr("cy", innerHeight / 2).attr("r", 10).attr("fill", "#007bff").attr("stroke", "white").attr("stroke-width", 2).attr("cursor", "ew-resize")
    .call(d3.drag().on("drag", function(event) { const newTime = Math.round(timeScale.invert(Math.max(0, Math.min(innerWidth, event.x)))); if (newTime < endTime) { startTime = newTime; updateTimeSlider(); updateDisplay(); } }));
  const endHandle = g.append("circle").attr("cy", innerHeight / 2).attr("r", 10).attr("fill", "#007bff").attr("stroke", "white").attr("stroke-width", 2).attr("cursor", "ew-resize")
    .call(d3.drag().on("drag", function(event) { const newTime = Math.round(timeScale.invert(Math.max(0, Math.min(innerWidth, event.x)))); if (newTime > startTime) { endTime = newTime; updateTimeSlider(); updateDisplay(); } }));

  function updateTimeSlider() {
    const x1 = timeScale(startTime), x2 = timeScale(endTime);
    startHandle.attr("cx", x1); endHandle.attr("cx", x2);
    rangeRect.attr("x", x1).attr("width", x2 - x1);
  }

  // Display & Actions
  const currentFilterDisplay = controlFrame.append("div").style("margin-bottom", "10px").style("padding", "10px").style("background-color", "#dbeafe").style("border-radius", "8px").style("border", "1px solid #007bff");
  const actionContainer = controlFrame.append("div").style("display", "flex").style("gap", "20px");

  actionContainer.append("button").style("width", "140px").style("padding", "10px").style("background-color", "#28a745").style("color", "white").style("border", "none").style("border-radius", "6px").style("font-weight", "600").style("cursor", "pointer").text("💾 Save Filter").on("click", saveFilter);
  
  actionContainer.append("button").style("width", "140px").style("padding", "10px").style("background-color", "#17a2b8").style("color", "white").style("border", "none").style("border-radius", "6px").style("font-weight", "600").style("cursor", "pointer").text("🗺️ Map Data")
    .on("click", function() {
        // Dispatch event with CLEAN strings
        container.node().dispatchEvent(new CustomEvent('apply', { detail: getCurrentFilter(), bubbles: true }));
    });

  const savedSection = container.append("div").style("margin-top", "20px");
  savedSection.append("h4").style("margin", "0 0 10px 0").style("font-size", "14px").text("Saved Filters");
  const savedList = savedSection.append("div").style("display", "flex").style("flex-direction", "column").style("gap", "10px");

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
      startDate: formatDateForInput(startDate), // Returns "YYYY-MM-DD"
      endDate: formatDateForInput(endDate),     // Returns "YYYY-MM-DD"
      startTime: startTime, endTime: endTime, daysOfWeek: [...daysOfWeek],
      selectedConstraint: selectedConstraint || null
    };
  }

  function updateDisplay() {
    const selectedDays = dayLabels.filter((_, i) => daysOfWeek[i]).join(", ") || "None";
    timeDisplay.html(`<span style="color: #007bff;">${formatTime(startTime)}</span> — <span style="color: #007bff;">${formatTime(endTime)}</span>`);
    currentFilterDisplay.html(`
        <div style="font-size: 18px; font-weight: bold;">Current Selection:</div>
        <div style="margin-top: 8px; line-height: 1.6;">
        📅 Dates: ${formatDateForInput(startDate)} — ${formatDateForInput(endDate)}<br>
        ⏰ Time: ${formatTime(startTime)} — ${formatTime(endTime)}<br>
        ☀️ Days: ${selectedDays}<br>
        ⚡ Constraint: ${selectedConstraint || "None"}
        </div>
    `);
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
      const filterItem = savedList.append("div").style("padding", "12px").style("background-color", "white").style("border", "1px solid #ddd").style("border-radius", "6px").style("display", "flex").style("justify-content", "space-between");
      filterItem.append("div").html(`<b>Filter #${savedFilters.length - index}</b><br><small>${filter.startDate} — ${filter.endDate}</small>`);
      const btnContainer = filterItem.append("div").style("display", "flex").style("gap", "8px");
      btnContainer.append("button").style("padding", "6px").style("background-color", "#007bff").style("color", "white").style("border", "none").style("border-radius", "4px").text("Load").on("click", () => loadFilter(filter));
      btnContainer.append("button").style("padding", "6px").style("background-color", "#dc3545").style("color", "white").style("border", "none").style("border-radius", "4px").text("Delete").on("click", () => { savedFilters = savedFilters.filter(f => f.id !== filter.id); updateSavedList(); });
    });
  }

  function loadFilter(filter) {
    startDate = parseLocal(filter.startDate);
    endDate = parseLocal(filter.endDate);
    startTime = filter.startTime; endTime = filter.endTime; daysOfWeek = [...filter.daysOfWeek];
    selectedConstraint = filter.selectedConstraint || "";
    
    startDateInput.property("value", formatDateForInput(startDate)); 
    endDateInput.property("value", formatDateForInput(endDate));
    constraintSelect.property("value", selectedConstraint);
    dayButtons.forEach((btn, i) => { d3.select(btn).style("background-color", daysOfWeek[i] ? "#007bff" : "white").style("color", daysOfWeek[i] ? "white" : "#007bff"); });
    updateTimeSlider(); updateDisplay();
  }

  updateTimeSlider(); updateDisplay(); updateSavedList();
  const node = container.node();
  node.getCurrentFilter = getCurrentFilter; node.getSavedFilters = () => savedFilters;
  return node;
}
