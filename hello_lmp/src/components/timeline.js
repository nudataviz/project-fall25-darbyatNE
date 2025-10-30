import React, { useState } from 'react';

export default function DateRangePicker() {
  const [filterList, setFilterList] = useState([]);
  
  // Current picker state (single instance)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [timeIntervals, setTimeIntervals] = useState([{ id: Date.now(), start: 18, end: 34 }]);
  const [isDragging, setIsDragging] = useState(null);

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleDay = (day) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const addTimeInterval = () => {
    setTimeIntervals([...timeIntervals, { id: Date.now(), start: 18, end: 34 }]);
  };

  const removeTimeInterval = (intervalId) => {
    setTimeIntervals(timeIntervals.filter(i => i.id !== intervalId));
  };

  const updateTimeInterval = (intervalId, field, value) => {
    setTimeIntervals(timeIntervals.map(i =>
      i.id === intervalId ? { ...i, [field]: value } : i
    ));
  };

  const handleMouseDown = (intervalId, field, e) => {
    e.preventDefault();
    setIsDragging({ intervalId, field });
  };

  const handleMouseMove = (e, intervalId) => {
    if (!isDragging || isDragging.intervalId !== intervalId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const halfHour = Math.round((x / rect.width) * 48);
    
    updateTimeInterval(intervalId, isDragging.field, halfHour);
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  // Global mouse up listener
  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(null);
    };
    
    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging]);

  const formatTime = (halfHour) => {
    const hour = Math.floor(halfHour / 2);
    const minute = (halfHour % 2) * 30;
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const parseTimeInput = (timeStr) => {
    // Parse format like "9:30 AM" or "14:30"
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return null;
    
    let hour = parseInt(match[1]);
    const minute = parseInt(match[2]);
    const period = match[3]?.toUpperCase();
    
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    
    const halfHour = hour * 2 + (minute >= 30 ? 1 : 0);
    return Math.max(0, Math.min(48, halfHour));
  };

  const addToFilterList = () => {
    const newFilter = {
      id: Date.now(),
      startDate,
      endDate,
      selectedDays: [...selectedDays],
      timeIntervals: timeIntervals.map(({ id, ...rest }) => rest)
    };
    
    setFilterList([...filterList, newFilter]);
    
    // Reset picker
    setStartDate('');
    setEndDate('');
    setSelectedDays([]);
    setTimeIntervals([{ id: Date.now(), start: 18, end: 34 }]);
  };

  const removeFromFilterList = (filterId) => {
    setFilterList(filterList.filter(f => f.id !== filterId));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-6">Time Filter Builder</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Picker (left side) */}
        <div className="border-2 border-gray-300 p-4">
          <h2 className="font-bold mb-4">Create Filter</h2>

          {/* Date Range */}
          <div className="mb-4">
            <label className="block text-sm mb-2">Date Range</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border px-2 py-1 flex-1"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border px-2 py-1 flex-1"
              />
            </div>
          </div>

          {/* Days of Week */}
          <div className="mb-4">
            <label className="block text-sm mb-2">Days of Week</label>
            <div className="flex gap-2 flex-wrap">
              {daysOfWeek.map((day) => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1 border ${
                    selectedDays.includes(day) ? 'bg-blue-500 text-white' : 'bg-white'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Time Intervals */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm">Time Intervals</label>
              <button
                onClick={addTimeInterval}
                className="px-2 py-1 bg-gray-200 text-sm"
              >
                Add Interval
              </button>
            </div>

            <div className="space-y-3">
              {timeIntervals.map((interval) => (
                <div key={interval.id} className="border p-2">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex gap-2 items-center text-sm">
                      <input
                        type="text"
                        value={formatTime(interval.start)}
                        onChange={(e) => {
                          const halfHour = parseTimeInput(e.target.value);
                          if (halfHour !== null) {
                            updateTimeInterval(interval.id, 'start', halfHour);
                          }
                        }}
                        className="border px-2 py-1 w-24"
                        placeholder="9:00 AM"
                      />
                      <span>-</span>
                      <input
                        type="text"
                        value={formatTime(interval.end)}
                        onChange={(e) => {
                          const halfHour = parseTimeInput(e.target.value);
                          if (halfHour !== null) {
                            updateTimeInterval(interval.id, 'end', halfHour);
                          }
                        }}
                        className="border px-2 py-1 w-24"
                        placeholder="5:00 PM"
                      />
                    </div>
                    {timeIntervals.length > 1 && (
                      <button
                        onClick={() => removeTimeInterval(interval.id)}
                        className="text-red-500 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Simple line with labels */}
                  <div className="text-xs text-gray-500 flex justify-between mb-1">
                    <span>0</span>
                    <span>6</span>
                    <span>12</span>
                    <span>18</span>
                    <span>24</span>
                  </div>

                  <div
                    className="relative h-2 bg-gray-300 cursor-pointer select-none"
                    onMouseDown={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                      const halfHour = Math.round((x / rect.width) * 48);
                      
                      const distToStart = Math.abs(halfHour - interval.start);
                      const distToEnd = Math.abs(halfHour - interval.end);
                      
                      if (distToStart < distToEnd) {
                        handleMouseDown(interval.id, 'start', e);
                      } else {
                        handleMouseDown(interval.id, 'end', e);
                      }
                    }}
                    onMouseMove={(e) => isDragging && handleMouseMove(e, interval.id)}
                  >
                    {/* Selected range */}
                    <div
                      className="absolute top-0 bottom-0 bg-blue-500 pointer-events-none"
                      style={{
                        left: `${(Math.min(interval.start, interval.end) / 48) * 100}%`,
                        right: `${100 - (Math.max(interval.start, interval.end) / 48) * 100}%`,
                      }}
                    />

                    {/* Start marker */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 cursor-grab active:cursor-grabbing"
                      style={{ left: `calc(${(interval.start / 48) * 100}% - 6px)` }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleMouseDown(interval.id, 'start', e);
                      }}
                    />

                    {/* End marker */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 cursor-grab active:cursor-grabbing"
                      style={{ left: `calc(${(interval.end / 48) * 100}% - 6px)` }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleMouseDown(interval.id, 'end', e);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={addToFilterList}
            className="mt-4 w-full px-4 py-2 bg-blue-500 text-white"
          >
            Add to Filter List
          </button>
        </div>

        {/* Filter List (right side) */}
        <div className="border-2 border-gray-300 p-4">
          <h2 className="font-bold mb-4">Filter List ({filterList.length})</h2>
          
          {filterList.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No filters yet. Create one using the form on the left.
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filterList.map((filter, index) => (
                <div key={filter.id} className="border p-3 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold">Filter {index + 1}</span>
                    <button
                      onClick={() => removeFromFilterList(filter.id)}
                      className="text-red-500 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                  
                  {filter.startDate && filter.endDate && (
                    <div className="text-sm mb-1">
                      <span className="font-medium">Dates:</span> {filter.startDate} to {filter.endDate}
                    </div>
                  )}
                  
                  {filter.selectedDays.length > 0 && (
                    <div className="text-sm mb-1">
                      <span className="font-medium">Days:</span> {filter.selectedDays.join(', ')}
                    </div>
                  )}
                  
                  {filter.timeIntervals.length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">Times:</span>
                      {filter.timeIntervals.map((interval, idx) => (
                        <div key={idx} className="ml-2">
                          • {formatTime(interval.start)} - {formatTime(interval.end)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {filterList.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200">
              <div className="text-sm font-mono text-xs overflow-x-auto">
                <pre>{JSON.stringify(filterList, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}