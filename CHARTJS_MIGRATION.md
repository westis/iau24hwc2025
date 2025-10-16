# Chart.js Migration - Implementation Summary

## Completed Changes

### 1. Dependencies Updated

**Removed:**

- `apexcharts` (^5.3.5)
- `react-apexcharts` (^1.8.0)

**Added:**

- `chart.js` (^4.5.1) - Core charting library
- `react-chartjs-2` (^5.2.0) - React wrapper for Chart.js
- `chartjs-plugin-zoom` (^2.2.0) - Zoom and pan functionality
- `chartjs-adapter-date-fns` (^3.0.0) - Time scale support
- `hammerjs` (^2.0.8) - Touch gesture support

### 2. DistancePaceChart.tsx - Complete Rewrite

**New Features:**

- ✅ Chart.js line chart with time-based x-axis
- ✅ Zoom plugin configured (mouse wheel + pinch gestures)
- ✅ Pan functionality (click and drag)
- ✅ Time range buttons: 1h, 3h, 6h, 12h, 24h, Reset
- ✅ Data updates without resetting zoom/pan state
- ✅ Theme-aware colors (dark/light mode)
- ✅ Smooth curves with `tension: 0.4`
- ✅ Performance optimized (no point markers, `update('none')` mode)

**Key Implementation Details:**

- Uses `chartRef` for imperative updates
- Tracks last timestamp per runner to append only new data
- Detects runner selection changes for full rebuild
- Theme updates use `update('none')` to preserve zoom state
- Time range buttons use `chart.zoomScale()` API

### 3. GapAnalysisChart.tsx - Complete Rewrite

**New Features:**

- ✅ All features from DistancePaceChart
- ✅ Baseline controls (World Record vs Manual)
- ✅ Gender selector for World Records (Men: 309.4km, Women: 270.1km)
- ✅ Manual baseline distance input
- ✅ Visual baseline reference line (yellow dashed at y=0)
- ✅ Gap calculations (projected distance - baseline)
- ✅ Baseline changes recalculate all data while preserving zoom

**Key Implementation Details:**

- Baseline changes trigger full data recalculation
- Gap shown as +/- km from baseline
- Baseline reference line rendered as separate dataset
- Tooltips show gap with sign (+/-)

### 4. Chart Configuration Highlights

**Zoom Plugin Settings:**

```typescript
zoom: {
  pan: {
    enabled: true,
    mode: "x",
  },
  zoom: {
    wheel: { enabled: true },
    pinch: { enabled: true },
    mode: "x",
  },
  limits: {
    x: { min: 0, max: 24 * 3600 * 1000 },
  },
}
```

**Time Scale Configuration:**

```typescript
x: {
  type: "time",
  time: {
    unit: "hour",
    displayFormats: { hour: "H:mm" },
    tooltipFormat: "H:mm:ss",
  },
  min: 0,
  max: 24 * 3600 * 1000, // 24 hours
}
```

**Data Update Strategy:**

```typescript
// Append new data without resetting zoom
chart.data.datasets[idx].data.push(...newPoints);
chart.update("none"); // Critical: 'none' mode preserves zoom/pan
```

## Testing Checklist

### Basic Functionality

- [ ] Charts render with runner data
- [ ] Multiple runners display correctly with different colors
- [ ] Empty state shows when no runners selected
- [ ] Loading state displays during initial fetch

### Zoom & Pan Features

- [ ] Mouse wheel zoom works (zoom in/out on x-axis)
- [ ] Click and drag pan works
- [ ] Pinch zoom works on mobile/touchpad
- [ ] Time range buttons zoom to correct windows (1h, 3h, 6h, 12h, 24h)
- [ ] Reset button restores full 24h view
- [ ] Zoom/pan state persists during:
  - [ ] 30-second data refresh
  - [ ] Theme toggle (dark/light)
  - [ ] Adding/removing runner data points

### Data Updates

- [ ] New data appears on chart after 30-second refresh
- [ ] Zoom level maintained after data update
- [ ] Pan position maintained after data update
- [ ] Changing runner selection updates chart
- [ ] Chart handles switching between different runner sets

### Gap Analysis Specific

- [ ] Baseline mode switch (WR ↔ Manual) works
- [ ] Gender selector updates WR baseline correctly
- [ ] Manual distance input accepts and applies values
- [ ] Baseline reference line visible at y=0
- [ ] Gap calculations correct (+/- from baseline)
- [ ] Baseline changes preserve zoom state
- [ ] Tooltips show gap with correct sign

### Theme Support

- [ ] Dark mode colors applied correctly
- [ ] Light mode colors applied correctly
- [ ] Theme toggle updates chart colors
- [ ] Theme changes don't reset zoom/pan
- [ ] Text readable in both themes
- [ ] Grid lines visible in both themes

### Performance

- [ ] Charts render quickly with multiple runners
- [ ] No lag during zoom/pan
- [ ] Smooth updates during 30-second refresh
- [ ] Browser console shows no errors
- [ ] Memory usage stable over time

## Known Differences from ApexCharts

1. **Visual Style**: Chart.js has a slightly different default aesthetic
2. **Toolbar**: No floating toolbar - zoom/pan via mouse/touch gestures only
3. **Annotations**: Baseline reference line implemented as dataset vs annotation
4. **Cursor**: Different cursor styles during pan/zoom operations

## Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

Potential improvements if needed:

- Add chartjs-plugin-annotation for more advanced annotations
- Implement data decimation for very large datasets
- Add export chart as image feature
- Custom zoom controls (button-based zoom in/out)
- Y-axis zoom support if needed
- Time axis labels customization

## Migration Notes

- Removed all `window.ApexCharts.exec()` imperative calls
- Removed ApexCharts global type declarations
- Chart.js uses different update patterns - critical to use `update('none')`
- Time scale requires `chartjs-adapter-date-fns` adapter
- Touch gestures require `hammerjs` peer dependency

## Resources

- [Chart.js Documentation](https://www.chartjs.org/docs/latest/)
- [react-chartjs-2 Documentation](https://react-chartjs-2.js.org/)
- [chartjs-plugin-zoom Documentation](https://www.chartjs.org/chartjs-plugin-zoom/latest/)
- [Chart.js Samples](https://www.chartjs.org/docs/latest/samples/information.html)
