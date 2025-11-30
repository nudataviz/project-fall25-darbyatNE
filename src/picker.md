# Date & Time Range Picker

```js
import { filter, saveFilter } from "./lib/filter.js";
import { dateTimeRangePicker } from "./components/dateTimeRangePicker.js";
import { API_BASE_URL } from "./lib/config.js";
```
```js
(async () => {
  // 1. Fetch Constraints
  const constraintData = await fetch(`${API_BASE_URL}/api/constraints/list`)
    .then(r => r.json())
    .catch(e => ({ constraints: [] }));
  const constraintList = constraintData.constraints || [];

  // 2. Create the Constraint Input
  const constraintInput = Inputs.text({
    label: null,
    placeholder: "Search Constraints...",
    datalist: constraintList,
    value: filter.selectedConstraint || "",
    width: "100%"
  });

  const inputField = constraintInput.querySelector('input');
  if (inputField) {
    inputField.style.fontSize = "14px";
    inputField.style.padding = "2px 0";
    inputField.style.margin = "0";
  }

  // 3. Create the Container
  const constraintContainer = html`
    <div style="font-family: sans-serif; overflow: hidden;">
      <div style="font-weight: bold; font-size: 13px; margin-bottom: 4px; color: #333;">
        Filter By Constraint
      </div>
      ${constraintInput}
    </div>
  `;

  // 4. Initialize Picker
  const picker = dateTimeRangePicker({
    width: 800,
    initialStartTime: filter.startTime,
    initialEndTime: filter.endTime,
    initialStartDate: filter.startDate,
    initialEndDate: filter.endDate,
    initialDaysOfWeek: filter.daysOfWeek
  });

  // Inject Constraint Input into Picker
  if (picker.children.length >= 1) {
    picker.insertBefore(constraintContainer, picker.children[1]);
  } else {
    picker.append(constraintContainer);
  }

  // 5. Custom Box Styling
  for (const child of picker.children) {
    child.style.backgroundColor = "#f0f0f0";
    child.style.border = "1px solid #ccc";
    child.style.borderRadius = "5px";
    child.style.padding = "8px";
    child.style.marginBottom = "5px";
    child.style.boxSizing = "border-box";
    child.style.display = "block"; 
  }

  // Time Range Box Styling
  const timeBox = picker.lastElementChild;
  if (timeBox) {
    timeBox.style.display = "flex";
    timeBox.style.flexWrap = "wrap";
    timeBox.style.alignItems = "center";
    timeBox.style.gap = "10px";
    timeBox.style.paddingBottom = "4px";

    Array.from(timeBox.children).forEach((child, index) => {
      if (index === 0) { 
        child.style.width = "100%";
        child.style.marginBottom = "2px";
        child.style.fontSize = "13px";
        child.style.fontWeight = "bold";
      } else { 
        child.style.flex = "1";
        child.style.minWidth = "150px";
        child.style.marginTop = "0";
      }
    });
  }

  // 6. State Management
  const toDateStr = (d) => d instanceof Date ? d.toISOString().split('T')[0] : d;

  function updateState() {
    const f = picker.getCurrentFilter(); 
    const c = constraintInput.value;     
    const isFullDay = (f.startTime === 0 && f.endTime === 24);
    const isAllDays = (f.daysOfWeek && f.daysOfWeek.length === 7); // Fixed check for array length

    // Filter states assigned with optionals nulled
    const newFilterState = {
      ...f,
      startDate: toDateStr(f.startDate),
      endDate: toDateStr(f.endDate),
      startHour: isFullDay ? null : f.startTime,
      endHour:   isFullDay ? null : f.endTime,
      daysOfWeek: isAllDays ? null : f.daysOfWeek,
      selectedConstraint: c || null 
    };
    saveFilter(newFilterState);
  }

  // 7. Event Listeners
  picker.addEventListener('filterchange', updateState);
  if (inputField) inputField.addEventListener('input', updateState);
  picker.addEventListener('apply', () => {
    updateState();
    window.location.href = '/index?fetch=true';
  });

  updateState();
  display(picker);
})();
```
