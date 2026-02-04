import React, { useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  Paper,
  Grid,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider
} from '@mui/material';
import {
  Timeline,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  ShowChart,
  ScatterPlot,
  DateRange,
  FilterList
} from '@mui/icons-material';

const ChartSelector = ({
  chartType,
  onChartTypeChange,
  dateRange,
  onDateRangeChange,
  availableMetrics = [],
  selectedMetrics = [],
  onMetricsChange,
  showDateFilter = true,
  showMetricFilter = true,
  showChartOptions = true
}) => {
  const [customDateRange, setCustomDateRange] = useState(false);

  const chartTypes = [
    { value: 'line', label: 'Line Chart', icon: <Timeline />, description: 'Show trends over time' },
    { value: 'bar', label: 'Bar Chart', icon: <BarChartIcon />, description: 'Compare values across categories' },
    { value: 'area', label: 'Area Chart', icon: <ShowChart />, description: 'Show cumulative data over time' },
    { value: 'pie', label: 'Pie Chart', icon: <PieChartIcon />, description: 'Show proportions of a whole' },
    { value: 'scatter', label: 'Scatter Plot', icon: <ScatterPlot />, description: 'Show correlation between variables' }
  ];

  const dateRangeOptions = [
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'last90days', label: 'Last 90 Days' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const handleDateRangeChange = (value) => {
    if (value === 'custom') {
      setCustomDateRange(true);
    } else {
      setCustomDateRange(false);
      onDateRangeChange(value);
    }
  };

  const handleCustomDateSubmit = () => {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    if (startDate && endDate) {
      onDateRangeChange({
        type: 'custom',
        startDate,
        endDate
      });
      setCustomDateRange(false);
    }
  };

  const handleMetricToggle = (metric) => {
    const newMetrics = selectedMetrics.includes(metric)
      ? selectedMetrics.filter(m => m !== metric)
      : [...selectedMetrics, metric];
    onMetricsChange(newMetrics);
  };

  return (
    <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FilterList />
        Chart Configuration
      </Typography>

      <Grid container spacing={3}>
        {/* Chart Type Selection */}
        {showChartOptions && (
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Chart Type
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {chartTypes.map((type) => (
                <Paper
                  key={type.value}
                  elevation={chartType === type.value ? 2 : 0}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    border: chartType === type.value ? '2px solid' : '1px solid',
                    borderColor: chartType === type.value ? 'primary.main' : 'divider',
                    bgcolor: chartType === type.value ? 'primary.50' : 'background.paper',
                    '&:hover': {
                      bgcolor: chartType === type.value ? 'primary.100' : 'action.hover'
                    }
                  }}
                  onClick={() => onChartTypeChange(type.value)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ color: chartType === type.value ? 'primary.main' : 'text.secondary' }}>
                      {type.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {type.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {type.description}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Grid>
        )}

        {/* Date Range Selection */}
        {showDateFilter && (
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Date Range
            </Typography>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Select Date Range</InputLabel>
              <Select
                value={customDateRange ? 'custom' : (dateRange?.type || dateRange || 'last30days')}
                label="Select Date Range"
                onChange={(e) => handleDateRangeChange(e.target.value)}
                startAdornment={<DateRange sx={{ mr: 1, color: 'text.secondary' }} />}
              >
                {dateRangeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {customDateRange && (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  id="start-date"
                  label="Start Date"
                  type="date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  defaultValue={dateRange?.startDate || ''}
                />
                <TextField
                  id="end-date"
                  label="End Date"
                  type="date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  defaultValue={dateRange?.endDate || ''}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleCustomDateSubmit}
                >
                  Apply
                </Button>
              </Box>
            )}
          </Grid>
        )}

        {/* Metrics Selection */}
        {showMetricFilter && availableMetrics.length > 0 && (
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Metrics to Display
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {availableMetrics.map((metric) => (
                <Chip
                  key={metric.key || metric}
                  label={metric.label || metric}
                  variant={selectedMetrics.includes(metric.key || metric) ? 'filled' : 'outlined'}
                  color={selectedMetrics.includes(metric.key || metric) ? 'primary' : 'default'}
                  onClick={() => handleMetricToggle(metric.key || metric)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>

            {selectedMetrics.length === 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Select at least one metric to display in the chart
              </Typography>
            )}
          </Grid>
        )}
      </Grid>

      {/* Chart Preview Info */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          <strong>Selected Configuration:</strong>{' '}
          {chartTypes.find(t => t.value === chartType)?.label || 'Line Chart'} • {' '}
          {customDateRange ? 'Custom Date Range' :
           dateRangeOptions.find(d => d.value === (dateRange?.type || dateRange))?.label || 'Last 30 Days'}
          {selectedMetrics.length > 0 && ` • ${selectedMetrics.length} metric${selectedMetrics.length > 1 ? 's' : ''} selected`}
        </Typography>
      </Box>
    </Paper>
  );
};

export default ChartSelector;
