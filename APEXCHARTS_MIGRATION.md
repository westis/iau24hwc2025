# ApexCharts Migration Summary

## ✅ Final Working Solution (October 16, 2025)

### What Works

1. **No custom zoom buttons** - Removed time range buttons (1h, 3h, etc). Use ApexCharts' built-in toolbar instead!
2. **Pan works perfectly** - Click the pan/hand icon in the toolbar above the chart, then drag left/right
3. **Zoom is preserved** - When new data arrives every 30s, zoom/pan state is maintained
4. **Simple chart updates** - Using `window.ApexCharts.exec(chartId, 'updateSeries', data, false)` for live updates

### How to Use the Charts

1. **Zoom**:
   - Use scroll wheel / pinch to zoom in/out
   - Or use the zoom in/out buttons in the toolbar
   - Or click the selection tool and drag to select a time range
2. **Pan**:
   - Click the pan icon (hand) in the toolbar
   - Then drag left/right on the chart
3. **Reset**: Click the reset icon to return to full 24h view

### Key Implementation Details

- Chart ID is used instead of refs: `distance-pace-chart` and `gap-analysis-chart`
- Imperative updates via `window.ApexCharts.exec(chartId, 'updateSeries', newSeries, false)`
- The `false` parameter disables animations, which preserves zoom/pan
- `useMemo` for both `series` and `options` to prevent unnecessary re-renders
- `animations: { enabled: false }` in chart config is critical
- Dynamic import with `ssr: false` prevents hydration issues
- Simple conditional: `{series.length > 0 ? <Chart ... /> : <Loading />}`

---

## Overview

Successfully migrated both live race chart components from Recharts to ApexCharts for better zoom/pan functionality and improved user experience with live data updates.

## Changes Made

### 1. Package Updates

- **Installed**: `apexcharts` (v5.3.5) and `react-apexcharts` (v1.8.0)
- **Removed**: `recharts` (and its 35 dependencies)

### 2. Components Updated

#### DistancePaceChart (`components/live/DistancePaceChart.tsx`)

**Key Features**:

- **Interactive Zoom/Pan**: Native drag-to-pan and scroll-to-zoom via ApexCharts toolbar
- **Live Data Updates**: Data refreshes every 30 seconds without losing zoom/pan state
- **Custom Tooltips**: Shows time, runner name, projected distance, and pace
- **Dark Mode**: Automatically adapts to theme using `useTheme()` hook
- **Reference Lines**: Vertical lines at 6-hour intervals

**Data Transformation**:

```typescript
// Convert runner data to ApexCharts series format
series = runners.map((runner) => ({
  name: `#${bib} ${name}`,
  data: points.map((point) => ({
    x: time * 1000, // milliseconds
    y: projectedKm,
    pace: avgPace, // stored for tooltip
  })),
  color: runner.color,
}));
```

#### GapAnalysisChart (`components/live/GapAnalysisChart.tsx`)

**Key Features**:

- **Baseline Comparison**: Compare runners against World Records or manual baseline
- **Mode Selector**: Toggle between Men's WR (270.294 km), Women's WR (255.252 km), or manual distance
- **Gap Visualization**: Shows how far ahead/behind baseline each runner is
- **Same zoom/pan features** as DistancePaceChart

**Baseline Calculation**:

```typescript
gap = projectedKm - baselineDistance;
// Positive = ahead of baseline, Negative = behind baseline
```

### 3. Chart Configuration

**Common ApexCharts Options**:

```typescript
{
  chart: {
    id: "unique-chart-id", // For imperative updates
    type: "line",
    zoom: { enabled: true, type: "x", autoScaleYaxis: true },
    toolbar: {
      show: true,
      tools: {
        download: true,
        selection: true,
        zoom: true,
        zoomin: true,
        zoomout: true,
        pan: true,
        reset: true,
      },
    },
    animations: { enabled: false }, // Critical for preserving state
    pan: { enabled: true, mode: "x" },
  },
  theme: { mode: theme === "dark" ? "dark" : "light" },
  stroke: { width: 2, curve: "smooth" },
  xaxis: {
    type: "numeric",
    min: 0,
    max: 86400000, // 24 hours in ms
    labels: {
      formatter: (value) => `${Math.floor(value / 3600000)}h`,
    },
  },
  tooltip: {
    shared: false,
    custom: ({ series, seriesIndex, dataPointIndex, w }) => {
      // Custom HTML tooltip
    },
  },
}
```

### 4. Live Update Strategy

**Problem**: React prop updates cause chart to reinitialize, losing zoom/pan state.

**Solution**: Hybrid declarative/imperative approach

1. **First Render**: Let React render chart declaratively with initial `series`
2. **Subsequent Updates**: Use imperative `ApexCharts.exec()` to update data

```typescript
const hasInitialData = useRef(false);

useEffect(() => {
  if (series.length === 0) return;

  if (!hasInitialData.current) {
    hasInitialData.current = true; // First render
    return;
  }

  // Update imperatively to preserve zoom/pan
  if (typeof window !== "undefined" && window.ApexCharts) {
    setTimeout(() => {
      window.ApexCharts.exec(chartId, "updateSeries", series, false);
    }, 50);
  }
}, [series]);
```

**Why it works**:

- `useMemo` prevents unnecessary recalculations of `series` and `options`
- `animations: { enabled: false }` prevents visual jumps during updates
- `updateSeries(..., false)` tells ApexCharts to NOT animate the update
- Small `setTimeout` ensures chart is mounted before update
- Chart ID (not ref!) is used for imperative updates

## Bugs Fixed

### 1. Tooltip Color Access Error

**Error**: `Cannot read properties of undefined (reading '2')`

**Cause**: `w.config.colors[seriesIndex]` wasn't populated when colors set on series

**Fix**: Changed to `w.config.series[seriesIndex].color || w.globals.colors[seriesIndex]`

### 2. Chart State Lost on Update

**Error**: Zoom/pan reset when data updated every 30s

**Cause**: Directly updating `series` prop caused React to re-render, reinitializing chart

**Fix**: Imperative `ApexCharts.exec('updateSeries')` with `animations: false`

### 3. Pan Not Working

**Error**: Pan tool not functioning even when enabled

**Cause**: Complex mounting logic and ref-based updates interfered with ApexCharts' internal state

**Fix**:

- Removed custom time range buttons that interfered with pan
- Simplified to use ApexCharts' built-in toolbar exclusively
- Use chart ID for updates instead of refs

### 4. parentNode Error (Hydration)

**Error**: `Cannot read properties of null (reading 'parentNode')`

**Cause**: ApexCharts trying to access DOM before it was ready, exacerbated by complex mounting guards and ref manipulation

**Fix**:

- Simplified mounting: just `dynamic` import with `ssr: false` + `series.length > 0` check
- NO refs for chart rendering
- NO complex mounting state machines
- Let ApexCharts handle its own initialization

## Key Learnings

1. **Don't fight the library** - ApexCharts has a great built-in toolbar. Use it!
2. **Imperative updates for live data** - Use chart ID + `ApexCharts.exec()`, not props
3. **Keep mounting simple** - Over-engineering mounting logic causes more problems than it solves
4. **useMemo is critical** - Prevents unnecessary re-renders that break state
5. **Disable animations** - For live updates, `animations: false` is essential

## Migration Checklist

- [x] Install ApexCharts packages
- [x] Convert DistancePaceChart to ApexCharts
- [x] Convert GapAnalysisChart to ApexCharts
- [x] Remove Recharts dependency
- [x] Fix tooltip color access
- [x] Implement zoom/pan preservation
- [x] Fix pan functionality
- [x] Remove non-working custom buttons
- [x] Test with simulation mode
- [x] Test with live data updates
- [x] Verify dark mode support
- [x] Update documentation

## Testing

### Manual Testing Checklist

- [x] Charts render without errors
- [x] Zoom in/out works (scroll wheel, toolbar buttons, selection)
- [x] Pan works (hand icon tool in toolbar)
- [x] Reset button returns to full view
- [x] Data updates every 30s without losing zoom/pan
- [x] Tooltips show correct data with proper colors
- [x] Dark mode switches correctly
- [x] Multiple runners display with different colors
- [x] Baseline mode toggle works (Gap Analysis)
- [x] Manual baseline input works (Gap Analysis)

### Browser Testing

- Modern browsers with ES6+ support (Chrome, Firefox, Edge, Safari)
- ApexCharts requires client-side JavaScript (handled via `dynamic` import)

## Performance

- **Bundle Size**: ApexCharts is ~430KB (minified), but provides rich features
- **Render Time**: Fast even with 20+ runners and thousands of data points
- **Updates**: Smooth 30-second refresh with preserved state
- **Memory**: No memory leaks observed during extended testing

## Future Enhancements

- Consider adding download chart data as CSV feature
- Add option to compare with previous year's race
- Add annotations for race events (e.g., "90km mark", "Record pace")
- Add statistical overlays (median, quartiles)

## References

- [ApexCharts Official Docs](https://apexcharts.com/docs/)
- [React ApexCharts](https://apexcharts.com/docs/react-charts/)
- [Zoomable Timeseries Demo](https://apexcharts.com/react-chart-demos/line-charts/zoomable-timeseries/)
- [Realtime Updates Demo](https://apexcharts.com/react-chart-demos/line-charts/realtime/)
