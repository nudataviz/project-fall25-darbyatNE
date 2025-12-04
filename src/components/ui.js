// src/components/ui.js

// --- 1. HTML Templates ---

export const CONGESTION_POPUP_HTML = `
    <div class="congestion-popup-content">
        <strong class="congestion-header">
            Load Congestion View
        </strong>
        <div class="congestion-body">
            The <span class="congestion-highlight">Yellow Bordered Zone</span> is the selected Load Zone.<br>
            Prices displayed are the cost to "deliver" from each zone to the selected Load Zone.
        </div>
    </div>
`;

export function createZonePopupHTML(zoneName, priceType, value) {
    const formattedPrice = value !== null ? `$${value.toFixed(2)}` : 'N/A';
    
    // Map technical keys to readable labels
    let label = priceType;
    if (priceType === 'da') label = 'Day-Ahead';
    if (priceType === 'rt') label = 'Real-Time';
    if (priceType === 'net') label = 'NET';
    if (priceType === 'congestion') label = 'Congestion';

    return `
        <div class="zone-popup-content">
            <strong class="zone-popup-header">${zoneName}</strong>
            <div>
                <span class="zone-popup-label">${label}:</span> 
                <span class="zone-popup-value">${formattedPrice}</span>
            </div>
        </div>
    `;
}

// --- 2. Sidebar: Constraints List ---

export function renderConstraintList(listItems, labelType) {
    const container = document.getElementById('constraint-list');
    if (!container) return;
    
    container.innerHTML = '';

    if (!listItems || listItems.length === 0) {
        container.innerHTML = '<div class="empty-state">No active constraints</div>';
        return;
    }

    const listHtml = listItems.map(item => `
        <div class="constraint-row">
            <div style="flex: 1; padding-right: 10px;">
                <div class="c-name">${item.name}</div>
            </div>
            <div style="text-align: right;">
                <div class="c-price">$${item.price.toFixed(2)}</div>
                <div style="font-size: 9px; color: #000000;">${labelType}</div>
            </div>
        </div>
    `).join('');

    container.innerHTML = listHtml;
}

export function setConstraintModeUI(mode) {
    const radio = document.querySelector(`input[name="c-mode"][value="${mode}"]`);
    if (radio) radio.checked = true;
}

// --- 3. Top Bar: Filter Display ---

export function displayCurrentFilter(filter, resultCount = null) {
    const container = document.getElementById('top-filter-display');
    if (!container || !filter.startDate) return;

    const formatDate = (d) => {
        const date = new Date(d);
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    };

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayFlags = filter.daysOfWeek || Array(7).fill(true);
    const selectedDaysList = dayFlags.map((isSelected, i) => isSelected ? days[i] : null).filter(d => d);
    
    let dayString = selectedDaysList.join(', ');
    if (selectedDaysList.length === 7) dayString = "All Days";
    if (selectedDaysList.length === 0) dayString = "None";

    let constraintHtml = '';
    if (filter.selectedConstraint) {
        constraintHtml = `<li><strong>Constraint:</strong> ${filter.selectedConstraint}</li>`;
    }

    let hoursValue = 0;
    let hoursColor = "#333"; 
    let labelText = "Total Hours";

    if (resultCount === 0) {
        hoursValue = "0";
        hoursColor = "#dc3545"; 
    } 
    else if (typeof resultCount === 'number') {
        hoursValue = resultCount;
        hoursColor = "#007bff"; 
    } 
    else {
        let estimated = 0;
        const start = new Date(filter.startDate);
        const end = new Date(filter.endDate);
        
        let dailyHours = 24;
        if (filter.selectedHours && Array.isArray(filter.selectedHours)) {
            dailyHours = filter.selectedHours.length;
        } else {
            dailyHours = (parseInt(filter.endTime) || 24) - (parseInt(filter.startTime) || 0);
        }

        let current = new Date(start);
        while (current <= end) {
            if (dayFlags[current.getDay()]) estimated += dailyHours;
            current.setDate(current.getDate() + 1);
        }
        hoursValue = estimated;
        labelText = "Est. Hours"; 
    }

    container.style.display = "flex";
    container.style.justifyContent = "space-between";
    container.style.alignItems = "center";
    container.innerHTML = `
        <div style="flex: 1; min-width: 0; padding-right: 10px;">
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 4px 20px;">
                <li><strong>Dates:</strong> ${formatDate(filter.startDate)} - ${formatDate(filter.endDate)}</li>
                <li><strong>Days:</strong> ${dayString}</li>
                <li><strong>Time:</strong> ${filter.startTime}:00 - ${filter.endTime}:00</li>
                ${constraintHtml}
            </ul>
        </div>

        <div style="
            flex-shrink: 0; 
            border-left: 1px solid #ccc; 
            padding-left: 15px; 
            margin-left: 5px; 
            text-align: center; 
            display: flex; 
            flex-direction: column; 
            justify-content: center;
            min-width: 70px;
        ">
            <span style="font-size: 10px; color: #666; text-transform: uppercase; font-weight: bold; line-height: 1; margin-bottom: 2px;">
                ${labelText}
            </span>
            <span style="font-size: 22px; font-weight: bold; color: ${hoursColor}; line-height: 1;">
                ${hoursValue}
            </span>
        </div>`;
}

// --- 4. Map Legend ---

export function buildLegend(currentScale) {
    const container = document.getElementById('legend');
    if (!container) return;
    
    let html = '<strong>LMP ($/MWh)</strong>';
    
    currentScale.forEach((item, index) => {
        const prev = index > 0 ? currentScale[index - 1].threshold : null;
        let label = index === 0 ? `≥ $${item.threshold}` : `$${item.threshold} – $${prev}`;
        if (item.threshold === -Infinity) label = `< $${prev}`;
        
        html += `
            <div class="legend-item">
                <span class="legend-color" style="background-color: ${item.color};"></span>
                <span>${label}</span>
            </div>`;
    });
    
    container.innerHTML = html;
}
