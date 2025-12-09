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
    const zoneItems = document.querySelectorAll('.zone-item');
    
    zoneItems.forEach(item => {
      const zoneName = item.dataset.zoneName;
      if (zoneName === 'PJM') return;
      if (item.querySelector('.zone-checkbox')) return;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'zone-checkbox';
      checkbox.dataset.zone = zoneName;
      
      item.insertBefore(checkbox, item.firstChild);
      
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
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
    
    if (!map.getLayer('zone-selected')) {
      map.addLayer({
        id: 'zone-selected',
        type: 'line',
        source: 'zoneShapes',
        paint: {
          'line-color': '#cdd1d1ff',
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

    // Map the UI "mode" to possible data keys in your JSON
    const keyMap = {
        'da': ['da', 'total_lmp_da'],
        'rt': ['rt', 'total_lmp_rt'],
        'net': ['net', 'net_load'],
        'congestion': ['congestion_price_rt', 'cong', 'congestion'] // Check all these
    };

    // Get the list of keys to look for based on current mode
    const potentialKeys = keyMap[this.currentPriceType] || [this.currentPriceType];

    timeSeriesData.forEach(timeStep => {
      const timestamp = new Date(timeStep.datetime);
      selectedZonesArray.forEach(zoneName => {
        if (timeStep.readings && timeStep.readings[zoneName]) {
          const zoneInfo = timeStep.readings[zoneName];
          
          // Find the first key that actually exists in the data
          let price;
          for (const k of potentialKeys) {
              if (zoneInfo[k] !== undefined && zoneInfo[k] !== null) {
                  price = zoneInfo[k];
                  break;
              }
          }

          if (price !== undefined) {
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

    this.plotContainer.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '10px';
    wrapper.style.padding = '10px';
    
    const containerWidth = Math.min(window.innerWidth - 80, 1400);
    const focusHeight = 400;
    const contextHeight = 80;
    const marginLeft = 70;
    const marginRight = 20;
    const marginTop = 40;
    const marginBottom = 60; 

    const uniqueTimestamps = Array.from(new Set(data.map(d => d.timestamp.getTime())))
      .sort((a, b) => a - b)
      .map(t => new Date(t));

    const xScale = d3.scalePoint()
      .domain(uniqueTimestamps.map(d => d.getTime()))
      .range([marginLeft, containerWidth - marginRight])
      .padding(0.1);

    const yExtent = d3.extent(data, d => d.price);
    const yScale = d3.scaleLinear()
      .domain(yExtent)
      .range([focusHeight - marginBottom, marginTop]);

    const xScaleContext = d3.scalePoint()
      .domain(uniqueTimestamps.map(d => d.getTime()))
      .range([marginLeft, containerWidth - marginRight])
      .padding(0.1);

    const yScaleContext = d3.scaleLinear()
      .domain(yExtent)
      .range([contextHeight - 20, 10]);

    const colorScale = d3.scaleOrdinal(d3.schemeTableau10)
      .domain(Array.from(this.selectedZones));

    const svg = d3.create("svg")
      .attr("width", containerWidth)
      .attr("height", focusHeight + contextHeight + 40)
      .attr("viewBox", [0, 0, containerWidth, focusHeight + contextHeight + 40])
      .style("max-width", "100%")
      .style("height", "auto");

    svg.append("defs").append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("x", marginLeft)
      .attr("y", marginTop)
      .attr("width", containerWidth - marginLeft - marginRight)
      .attr("height", focusHeight - marginTop - marginBottom);

    const focus = svg.append("g").attr("class", "focus");
    const context = svg.append("g").attr("class", "context").attr("transform", `translate(0,${focusHeight + 20})`);

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

    const dataByZone = d3.group(data, d => d.zone);
    const focusLines = focus.append("g").attr("clip-path", "url(#clip)");

    const line = d3.line()
      .x(d => xScale(d.timestamp.getTime()))
      .y(d => yScale(d.price))
      .curve(d3.curveMonotoneX);

    dataByZone.forEach((zoneData, zoneName) => {
      const sortedData = zoneData.sort((a, b) => a.timestamp - b.timestamp);
      
      focusLines.append("path")
        .datum(sortedData)
        .attr("class", `line-${zoneName.replace(/\W/g, '_')}`)
        .attr("fill", "none")
        .attr("stroke", colorScale(zoneName))
        .attr("stroke-width", 2)
        .attr("opacity", 0.8)
        .attr("d", line);

      focusLines.selectAll(`.dot-${zoneName.replace(/\W/g, '_')}`)
        .data(sortedData)
        .join("circle")
        .attr("class", `dot-${zoneName.replace(/\W/g, '_')}`)
        .attr("cx", d => xScale(d.timestamp.getTime()))
        .attr("cy", d => yScale(d.price))
        .attr("r", 3)
        .attr("fill", colorScale(zoneName))
        .attr("stroke", "white")
        .attr("stroke-width", 1);
    });
    
    const xAxisGroup = focus.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${focusHeight - marginBottom})`);
    
    const renderXAxis = (group, scale) => {
      group.call(d3.axisBottom(scale)
        .tickValues(scale.domain()) 
        .tickFormat(d => d3.timeFormat("%m/%d %H:%M")(new Date(d)))
      )
      .selectAll("text")
        .style("font-size", "9px")  
        .attr("transform", "rotate(-90)") 
        .attr("dx", "-0.8em")
        .attr("dy", "-0.5em")
        .style("text-anchor", "end");
    };

    renderXAxis(xAxisGroup, xScale);

    focus.append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("font-size", "11px");

    focus.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(focusHeight / 2))
      .attr("y", 15)
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .text(`${priceTypeLabels[this.currentPriceType]} Price ($/MWh)`);

    const lineContext = d3.line()
      .x(d => xScaleContext(d.timestamp.getTime()))
      .y(d => yScaleContext(d.price))
      .curve(d3.curveMonotoneX);

    dataByZone.forEach((zoneData, zoneName) => {
      const sortedData = zoneData.sort((a, b) => a.timestamp - b.timestamp);
      context.append("path")
        .datum(sortedData)
        .attr("class", `line-context-${zoneName.replace(/\W/g, '_')}`)
        .attr("fill", "none")
        .attr("stroke", colorScale(zoneName))
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.7)
        .attr("d", lineContext);
    });

    context.append("g")
      .attr("transform", `translate(0,${contextHeight - 20})`)
      .call(d3.axisBottom(xScaleContext)
        .tickValues(xScaleContext.domain().filter((d, i) => {
          const totalTicks = xScaleContext.domain().length;
          const interval = Math.max(1, Math.floor(totalTicks / 8));
          return i % interval === 0;
        }))
        .tickFormat(d => d3.timeFormat("%m/%d")(new Date(d))))
      .selectAll("text")
      .style("font-size", "10px");

    const brush = d3.brushX()
      .extent([[marginLeft, 0], [containerWidth - marginRight, contextHeight - 20]])
      .on("brush end", brushed);

    const brushG = context.append("g")
      .attr("class", "brush")
      .call(brush);

    brushG.selectAll(".selection")
      .attr("fill", "#007bff")
      .attr("fill-opacity", 0.2)
      .attr("stroke", "#007bff");

    function brushed(event) {
      if (!event.selection) return;
      
      const [x0Px, x1Px] = event.selection;
      
      const selectedTimestamps = uniqueTimestamps.filter(t => {
        const pos = xScaleContext(t.getTime());
        return pos >= x0Px && pos <= x1Px;
      });

      if (selectedTimestamps.length === 0) return;

      xScale.domain(selectedTimestamps.map(d => d.getTime()));

      dataByZone.forEach((zoneData, zoneName) => {
        const sortedData = zoneData
          .filter(d => selectedTimestamps.some(t => t.getTime() === d.timestamp.getTime()))
          .sort((a, b) => a.timestamp - b.timestamp);
        
        focusLines.select(`.line-${zoneName.replace(/\W/g, '_')}`)
          .datum(sortedData)
          .attr("d", line);

        focusLines.selectAll(`.dot-${zoneName.replace(/\W/g, '_')}`)
          .data(sortedData, d => d.timestamp.getTime())
          .join("circle")
          .attr("class", `dot-${zoneName.replace(/\W/g, '_')}`)
          .attr("cx", d => xScale(d.timestamp.getTime()))
          .attr("cy", d => yScale(d.price))
          .attr("r", 3)
          .attr("fill", colorScale(zoneName))
          .attr("stroke", "white")
          .attr("stroke-width", 1);
      });

      xAxisGroup.selectAll("*").remove();
      renderXAxis(xAxisGroup, xScale);
    }

    const legendContainer = svg.append("foreignObject")
      .attr("x", containerWidth - 150)
      .attr("y", marginTop)
      .attr("width", 140)
      .attr("height", 400);

    const legendDiv = legendContainer.append("xhtml:div")
      .style("background-color", "rgba(255, 255, 255, 0.95)")
      .style("padding", "10px")
      .style("border-radius", "5px")
      .style("box-shadow", "0 2px 8px rgba(0, 0, 0, 0.2)")
      .style("font-family", "sans-serif")
      .style("font-size", "12px")
      .style("line-height", "1.4");

    legendDiv.append("xhtml:strong")
      .style("display", "block")
      .style("margin-bottom", "6px")
      .style("font-size", "13px")
      .style("border-bottom", "1px solid #ccc")
      .style("padding-bottom", "4px")
      .style("color", "#333")
      .text("Selected Zones");

    this.selectedZones.forEach(zoneName => {
      const legendItem = legendDiv.append("xhtml:div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "3px");

      legendItem.append("xhtml:span")
        .style("width", "16px")
        .style("height", "16px")
        .style("border-radius", "3px")
        .style("margin-right", "8px")
        .style("border", "1px solid rgba(0,0,0,0.2)")
        .style("flex-shrink", "0")
        .style("background-color", colorScale(zoneName));

      legendItem.append("xhtml:span")
        .text(zoneName);
    });

    svg.append("text")
      .attr("x", containerWidth / 2)
      .attr("y", 20)
      .style("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "600")
      .text("Price Analysis - Brush to Zoom");

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
