# Zones

```js
const lmpData = FileAttachment("data/da_hrl_lmps (1).csv").csv()
```

```js
// Parse dates and get range
const parsedData = lmpData.map(d => ({
  ...d,
  date: new Date(d.datetime_beginning_utc)
}));

const allDates = parsedData.map(d => d.date);
const minDate = new Date(Math.min(...allDates));
const maxDate = new Date(Math.max(...allDates));


const dateRange = view(Inputs.form({
  start: Inputs.date({
    label: "Start Date",
    value: minDate.toISOString().split('T')[0],
    min: minDate.toISOString().split('T')[0],
    max: maxDate.toISOString().split('T')[0]
  }),
  end: Inputs.date({
    label: "End Date",
    value: maxDate.toISOString().split('T')[0],
    min: minDate.toISOString().split('T')[0],
    max: maxDate.toISOString().split('T')[0]
  })
}));
```

```js
// Filter the data based on the date
const filteredData = parsedData.filter(d => {
  return d.date >= new Date(dateRange.start) && 
         d.date <= new Date(dateRange.end);
});
```

From **${new Date(dateRange.start).toLocaleDateString()}** to **${new Date(dateRange.end).toLocaleDateString()}**

```js 
// Function that transforms listed data into tabular 
function transformListedData(data) {
  const transformedData = [];

  // For each row in the data, package just the zone name and the price
  for (const row of data) {
    transformedData.push({
        zone: row.pnode_name,
        price: parseFloat(row.total_lmp_da)
    })
  }

  // Create a set with one row per unique zone
  const zoneSet = [...new Set(transformedData.map(d => d.zone))];
  const aggregatedData = [];

  // Aggregate the data into sums
  for (const zoneId of zoneSet)
  {
    // Filter
    const filteredData = transformedData.filter((d) => (d.zone === zoneId))
    
    // Pull relevant stats from the data
    let priceMean = d3.mean(filteredData, (d) => (d.price));

    aggregatedData.push({
      zoneId,
      priceMean
    })
  }

  return aggregatedData;
}
```

```js
Plot.plot({
  marginTop: 60,
  marginRight: 20,
  marginBottom: 100,
  marginLeft: 80,
  
  x: {
    label: "Zone ID",
    tickRotate: -45
  },
  
  y: {
    label: "Mean Price ($)",
    grid: true
  },
  
  marks: [
    Plot.barY(transformListedData(filteredData), {
      x: "zoneId",
      y: "priceMean",
      fill: "zoneId",
      tip: true,
      title: d => `Zone ID: ${d.zoneId}\nMean Price: $${d.priceMean.toFixed(2)}`,
      insetLeft: 8
          }),
  ]
})
```