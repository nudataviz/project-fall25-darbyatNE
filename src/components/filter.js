// src/lib/filter.js

const FILTER_STORAGE_KEY = 'pjm-map-filter';

const DEFAULT_FILTER = {
  startDate: new Date('2025-07-13'),
  endDate: new Date('2025-07-19'),
  startTime: 15,
  endTime: 20,
  daysOfWeek: [false, true, true, true, true, true, false], // Mon-Fri
};

function loadFilter() {
  const saved = localStorage.getItem(FILTER_STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    parsed.startDate = new Date(parsed.startDate);
    parsed.endDate = new Date(parsed.endDate);
    return parsed;
  }
  return DEFAULT_FILTER;
}

export function saveFilter(newFilter) {
  Object.assign(filter, newFilter);
  localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(newFilter));
}

export let filter = loadFilter();