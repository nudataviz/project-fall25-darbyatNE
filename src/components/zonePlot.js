// components/zonePlot.js
import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";

export class ZonePlotManager {
  constructor() {
    this.selectedZones = new Set();
    this.plotContainer = null;
    this.currentFilter = null;
    this.timeSeriesData = null;
    this.currentPriceType = 'da';
  }

  initialize(map, filter, priceType = 'da') {
    this.currentFilter = filter;
    this.currentPriceType = priceType;
    this.setupPlotContainer();
    
    // Wait a bit for the zone list to be populated
    setTimeout(() => {
      this.setupZoneCheckboxes();
    }, 100);
  }

  setupPlotContainer() {
    const panel = document.createElement('div');
    panel.id = 'plot-panel';
    panel.className = 'plot-panel hidden';
    panel.innerHTML = `
      <div class="plot-header">
        <h3>Price Analysis</h3>
        <div class="plot-controls">
          <span id="selected-zones-count">0 zones selected</span>
          <button id="clear-zones-btn">Clear Selection</button>
          <button id="close-plot-btn">×</button>
        </div>
      </div>
      <div id="plot-content">
        <p class="empty-state">Select zones using checkboxes in the sidebar to begin</p>
      </div>
    `;
    document.body.appendChild(panel);

    this.plotContainer = document.getElementById('plot-content');

    document.getElementById('clear-zones-btn').addEventListener('click', () => {
      this.clearSelection();
    });

    document.getElementById('close-plot-btn').addEventListener('click', () => {
      panel.classList.add('hidden');
    });
  }

  setupZoneCheckboxes() {
    // Add checkboxes to existing zone list items
    const zoneItems = document.querySelectorAll('.zone-item');
    
    zoneItems.forEach(item => {
      const zoneName = item.dataset.zoneName;
      
      // Skip PJM aggregate
      if (zoneName === 'PJM') return;
      
      // Check if checkbox already exists
      if (item.querySelector('.zone-checkbox')) return;
      
      // Create checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'zone-checkbox';
      checkbox.dataset.zone = zoneName;
      
      // Insert checkbox at the beginning
      item.insertBefore(checkbox, item.firstChild);
      
      // Handle checkbox changes
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation(); // Prevent zone selection click
        this.handleZoneCheckbox(zoneName, checkbox.checked);
      });
    });
  }

  handleZoneCheckbox(zoneName, isChecked) {
    if (isChecked) {
      this.selectedZones.add(zoneName);
    } else {
      this.selectedZones.delete(zoneName);
    }

    this.updateZoneHighlights();
    this.updateSelectionCount();
    
    if (this.selectedZones.size > 0 && this.timeSeriesData) {
      this.plotDataFromExisting(this.timeSeriesData);
      document.getElementById('plot-panel').classList.remove('hidden');
    } else if (this.selectedZones.size === 0) {
      this.plotContainer.innerHTML = '<p class="empty-state">Select zones using checkboxes in the sidebar to begin</p>';
      document.getElementById('plot-panel').classList.add('hidden');
    }
  }

  updateZoneHighlights() {
    const map = window.mapInstance;
    if (!map) return;
    
    // Add highlight layer if it doesn't exist
    if (!map.getLayer('zone-selected')) {
      map.addLayer({
        id: 'zone-selected',
        type: 'line',
        source: 'zoneShapes',
        paint: {
          'line-color': '#ff6b6b',
          'line-width': 4
        },
        filter: ['in', ['get', 'Zone_Name'], ['literal', []]]
      }, 'zoneLabels');
    }

    const selectedArray = Array.from(this.selectedZones);
    map.setFilter('zone-selected', ['in', ['get', 'Zone_Name'], ['literal', selectedArray]]);
  }

  updateSelectionCount() {
    const count = this.selectedZones.size;
    document.getElementById('selected-zones-count').textContent = 
      `${count} zone${count !== 1 ? 's' : ''} selected`;
  }

  clearSelection() {
    this.selectedZones.clear();
    
    // Uncheck all checkboxes
    document.querySelectorAll('.zone-checkbox').forEach(cb => {
      cb.checked = false;
    });
    
    this.updateSelectionCount();
    this.updateZoneHighlights();
    this.plotContainer.innerHTML = '<p class="empty-state">Select zones using checkboxes in the sidebar to begin</p>';
    document.getElementById('plot-panel').classList.add('hidden');
  }

  plotDataFromExisting(timeSeriesData) {
    if (this.selectedZones.size === 0) return;

    try {
      this.plotContainer.innerHTML = '<div class="loading">Processing data...</div>';

      const plotData = this.transformDataForPlot(timeSeriesData);
      this.renderFocusContextPlot(plotData);
    } catch (error) {
      console.error('Error preparing plot data:', error);
      this.plotContainer.innerHTML = '<p class="error">Error processing data</p>';
    }
  }

  transformDataForPlot(timeSeriesData) {
    const plotData = [];
    const selectedZonesArray = Array.from(this.selectedZones);

    timeSeriesData.forEach(timeStep => {
      const timestamp = new Date(timeStep.datetime);
      
      selectedZonesArray.forEach(zoneName => {
        if (timeStep.readings && timeStep.readings[zoneName]) {
          const zoneInfo = timeStep.readings[zoneName];
          const price = zoneInfo[this.currentPriceType];
          
          if (price !== null && price !== undefined) {
            plotData.push({
              timestamp: timestamp,
              zone: zoneName,
              price: price,
              priceType: this.currentPriceType
            });
          }
        }
      });
    });

    return plotData;
  }

  renderFocusContextPlot(data) {
    if (!data || data.length === 0) {
      this.plotContainer.innerHTML = '<p class="empty-state">No data available for selected zones</p>';
      return;
    }

    const priceTypeLabels = {
      da: 'Day-Ahead',
      rt: 'Real-Time',
      net: 'NET',
      congestion: 'Congestion'
    };

    // Clear container and create wrapper
    this.plotContainer.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '10px';
    wrapper.style.padding = '10px';
    
    // Calculate dimensions
    const containerWidth = Math.min(window.innerWidth - 80, 1400);
    const focusHeight = 400;
    const contextHeight = 80;
    const marginLeft = 70;
    const marginRight = 20;
    const marginTop = 40;
    const marginBottom = 30;

    // Get data extent
    const xExtent = d3.extent(data, d => d.timestamp);
    const yExtent = d3.extent(data, d => d.price);

    // Create scales
    const xScale = d3.scaleUtc()
      .domain(xExtent)
      .range([marginLeft, containerWidth - marginRight]);

    const yScale = d3.scaleLinear()
      .domain(yExtent)
      .range([focusHeight - marginBottom, marginTop]);

    const xScaleContext = d3.scaleUtc()
      .domain(xExtent)
      .range([marginLeft, containerWidth - marginRight]);

    const yScaleContext = d3.scaleLinear()
      .domain(yExtent)
      .range([contextHeight - 20, 10]);

    // Color scale for zones
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10)
      .domain(Array.from(this.selectedZones));

    // Create SVG
    const svg = d3.create("svg")
      .attr("width", containerWidth)
      .attr("height", focusHeight + contextHeight + 40)
      .attr("viewBox", [0, 0, containerWidth, focusHeight + contextHeight + 40])
      .style("max-width", "100%")
      .style("height", "auto");

    // Add clip path for focus area
    svg.append("defs").append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("x", marginLeft)
      .attr("y", marginTop)
      .attr("width", containerWidth - marginLeft - marginRight)
      .attr("height", focusHeight - marginTop - marginBottom);

    // Focus chart group
    const focus = svg.append("g")
      .attr("class", "focus");

    // Context chart group
    const context = svg.append("g")
      .attr("class", "context")
      .attr("transform", `translate(0,${focusHeight + 20})`);

    // Add grid lines to focus
    focus.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${focusHeight - marginBottom})`)
      .call(d3.axisBottom(xScale).tickSize(-(focusHeight - marginTop - marginBottom)).tickFormat(""))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").attr("stroke", "#e0e0e0"));

    focus.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(yScale).tickSize(-(containerWidth - marginLeft - marginRight)).tickFormat(""))
      .call(g => g.select(".domain").remove())
      .call(g => g.selectAll(".tick line").attr("stroke", "#e0e0e0"));

    // Group data by zone
    const dataByZone = d3.group(data, d => d.zone);

    // Draw scatter points in focus (clipped)
    const focusScatter = focus.append("g")
      .attr("clip-path", "url(#clip)");

    dataByZone.forEach((zoneData, zoneName) => {
      focusScatter.selectAll(`.dot-${zoneName.replace(/\W/g, '_')}`)
        .data(zoneData)
        .join("circle")
        .attr("class", `dot-${zoneName.replace(/\W/g, '_')}`)
        .attr("cx", d => xScale(d.timestamp))
        .attr("cy", d => yScale(d.price))
        .attr("r", 3)
        .attr("fill", colorScale(zoneName))
        .attr("opacity", 0.7)
        .attr("stroke", "white")
        .attr("stroke-width", 0.5);
    });

    // Add axes to focus
    focus.append("g")
      .attr("transform", `translate(0,${focusHeight - marginBottom})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%m/%d %H:%M")))
      .selectAll("text")
      .style("font-size", "11px");

    focus.append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("font-size", "11px");

    // Add Y-axis label
    focus.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(focusHeight / 2))
      .attr("y", 15)
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .text(`${priceTypeLabels[this.currentPriceType]} Price ($/MWh)`);

    // Draw scatter in context
    dataByZone.forEach((zoneData, zoneName) => {
      context.selectAll(`.dot-context-${zoneName.replace(/\W/g, '_')}`)
        .data(zoneData)
        .join("circle")
        .attr("class", `dot-context-${zoneName.replace(/\W/g, '_')}`)
        .attr("cx", d => xScaleContext(d.timestamp))
        .attr("cy", d => yScaleContext(d.price))
        .attr("r", 1.5)
        .attr("fill", colorScale(zoneName))
        .attr("opacity", 0.6);
    });

    // Add axis to context
    context.append("g")
      .attr("transform", `translate(0,${contextHeight - 20})`)
      .call(d3.axisBottom(xScaleContext).ticks(8).tickFormat(d3.timeFormat("%m/%d")))
      .selectAll("text")
      .style("font-size", "10px");

    // Add brush to context
    const brush = d3.brushX()
      .extent([[marginLeft, 0], [containerWidth - marginRight, contextHeight - 20]])
      .on("brush end", brushed);

    const brushG = context.append("g")
      .attr("class", "brush")
      .call(brush);

    // Style the brush
    brushG.selectAll(".selection")
      .attr("fill", "#007bff")
      .attr("fill-opacity", 0.2)
      .attr("stroke", "#007bff");

    // Brush handler
    function brushed(event) {
      if (!event.selection) return;
      
      const [x0, x1] = event.selection.map(xScaleContext.invert);
      xScale.domain([x0, x1]);

      // Update focus scatter
      dataByZone.forEach((zoneData, zoneName) => {
        focusScatter.selectAll(`.dot-${zoneName.replace(/\W/g, '_')}`)
          .attr("cx", d => xScale(d.timestamp))
          .attr("cy", d => yScale(d.price));
      });

      // Update focus x-axis
      focus.select("g")
        .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%m/%d %H:%M")))
        .selectAll("text")
        .style("font-size", "11px");
    }

    // Add legend
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${containerWidth - 150}, ${marginTop})`);

    let legendY = 0;
    this.selectedZones.forEach(zoneName => {
      const legendItem = legend.append("g")
        .attr("transform", `translate(0, ${legendY})`);

      legendItem.append("circle")
        .attr("cx", 6)
        .attr("cy", 0)
        .attr("r", 4)
        .attr("fill", colorScale(zoneName));

      legendItem.append("text")
        .attr("x", 15)
        .attr("y", 4)
        .style("font-size", "11px")
        .text(zoneName);

      legendY += 18;
    });

    // Add title
    svg.append("text")
      .attr("x", containerWidth / 2)
      .attr("y", 20)
      .style("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "600")
      .text("Price Analysis - Brush to Zoom");

    // Add instruction text
    context.append("text")
      .attr("x", containerWidth / 2)
      .attr("y", contextHeight + 5)
      .style("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#666")
      .text("Drag to select time range");

    wrapper.appendChild(svg.node());
    this.plotContainer.appendChild(wrapper);
  }

  updateData(newTimeSeriesData) {
    this.timeSeriesData = newTimeSeriesData;
    if (this.selectedZones.size > 0) {
      this.plotDataFromExisting(newTimeSeriesData);
    }
  }

  updatePriceType(newPriceType) {
    this.currentPriceType = newPriceType;
    if (this.selectedZones.size > 0 && this.timeSeriesData) {
      this.plotDataFromExisting(this.timeSeriesData);
    }
  }

  updateFilter(newFilter) {
    this.currentFilter = newFilter;
  }
}

export const zonePlotManager = new ZonePlotManager();