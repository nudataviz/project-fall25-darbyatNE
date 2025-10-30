# Date & Time Range Picker


```js
import {dateTimeRangePicker} from "./components/dateTimeRangePicker.js";
```

```js
const picker = dateTimeRangePicker({
  width: 800,
  initialStartTime: 9,
  initialEndTime: 17,
  initialStartDate: new Date(),
  initialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  initialDaysOfWeek: [false, true, true, true, true, true, false] // 
});

display(picker);
```

## Current Filter Data


```js
const currentFilter = view(
  Inputs.input(picker.getCurrentFilter())
);
```


```js
const filterChanges = Generators.observe((change) => {
  picker.addEventListener('filterchange', (e) => change(e.detail));
});
```

```js
display(filterChanges);
```




