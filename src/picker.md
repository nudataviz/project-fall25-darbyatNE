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

```js
const toDateStr = (d) => d instanceof Date ? d.toISOString().split('T')[0] : d;
const currentFilter = view(
  Inputs.input((() => {
    const f = picker.getCurrentFilter();
    return {
      ...f,
      startDate: toDateStr(f.startDate),
      endDate: toDateStr(f.endDate)
    };
  })())
);
```
```js
const filterChanges = Generators.observe((change) => {
  function handleFilterChange(event) {
    const f = event.detail;
    const newFilterState = {
      ...f,
      startDate: toDateStr(f.startDate),
      endDate: toDateStr(f.endDate)
    };

    saveFilter(newFilterState);
    change(newFilterState);
  }
  picker.addEventListener('filterchange', handleFilterChange);
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
