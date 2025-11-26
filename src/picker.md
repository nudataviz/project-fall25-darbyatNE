# Date & Time Range Picker

<button id="apply-btn" style="padding: 8px 16px; font-size: 16px; cursor: pointer;">Apply Filter & Fetch Data</button>

```js
import { filter, saveFilter } from "./lib/filter.js";
import {dateTimeRangePicker} from "./components/dateTimeRangePicker.js";
```

```js
const picker = dateTimeRangePicker({
  width: 800,
  initialStartTime: filter.startTime,
  initialEndTime: filter.endTime,
  initialStartDate: filter.startDate,
  initialEndDate: filter.endDate,
  initialDaysOfWeek: filter.daysOfWeek
});

display(picker);
```

## Current Filter Data

This view will update in real-time as you change the picker settings.

```js
const currentFilter = view(
  Inputs.input(picker.getCurrentFilter())
);
```

```js
const filterChanges = Generators.observe((change) => {
  function handleFilterChange(event) {
    const newFilterState = event.detail;
    saveFilter(newFilterState);
    change(newFilterState);
  }
  // Listen
  picker.addEventListener('filterchange', handleFilterChange);
  
  // Cleanup 
  return () => picker.removeEventListener('filterchange', handleFilterChange);
});
```

```js
display(filterChanges);
```

```js
// Listener 
document.getElementById('apply-btn').addEventListener('click', () => {
  window.location.href = '/index?fetch=true';
});
```
