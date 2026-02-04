import React, { useState, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter
} from 'recharts';
import { Box, FormControl, InputLabel, Select, MenuItem, Button, IconButton } from '@mui/material';
import { Download, GetApp } from '@mui/icons-material';
import html2canvas from 'html2canvas';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff', '#00ffff', '#ff0000'];

const Graph = ({
  data,
  columns,
  chartType = 'line',
  onChartTypeChange,
  title,
  height = 300,
  showExport = false,
  xAxisKey,
  yAxisKeys
}) => {
  const [selectedLegend, setSelectedLegend] = useState(null);
  const chartRef = useRef(null);

  // Determine data keys
  const numericColumns = columns ?
    columns.filter(col => col.type === 'number').map(col => col.name) :
    yAxisKeys || Object.keys(data[0] || {}).filter(key => typeof data[0]?.[key] === 'number');

  const dateColumn = columns ?
    columns.find(col => col.type === 'date')?.name :
    xAxisKey || Object.keys(data[0] || {}).find(key => key.includes('date') || key.includes('Date'));

  const handleLegendClick = (e) => {
    if (selectedLegend === e.dataKey) {
      setSelectedLegend(null);
    } else {
      setSelectedLegend(e.dataKey);
    }
  };

  const exportChart = async (format = 'png') => {
    if (!chartRef.current) return;

    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      const link = document.createElement('a');
      link.download = `chart-${Date.now()}.${format}`;

      if (format === 'svg') {
        // For SVG, we'd need a different approach - for now, use PNG
        link.href = canvas.toDataURL('image/png');
      } else {
        link.href = canvas.toDataURL(`image/${format}`);
      }

      link.click();
    } catch (error) {
      console.error('Error exporting chart:', error);
    }
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'bar':
        // Custom tooltip for category charts
        const CustomTooltip = ({ active, payload, label }) => {
          if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
              <div style={{
                backgroundColor: 'white',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>
                  {data.fullName || label}
                </p>
                {payload.map((entry, index) => (
                  <p key={index} style={{ margin: '4px 0', color: entry.color }}>
                    {`${entry.name}: ${entry.value}`}
                  </p>
                ))}
              </div>
            );
          }
          return null;
        };

        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={dateColumn}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              fontSize={12}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend onClick={handleLegendClick} />
            {numericColumns.map((colName, index) => (
              <Bar
                key={index}
                dataKey={colName}
                fill={COLORS[index % COLORS.length]}
                fillOpacity={selectedLegend === null || selectedLegend === colName ? 1 : 0.3}
              />
            ))}
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={dateColumn} />
            <YAxis />
            <Tooltip />
            <Legend onClick={handleLegendClick} />
            {numericColumns.map((colName, index) => (
              <Area
                key={index}
                type="monotone"
                dataKey={colName}
                stackId="1"
                stroke={COLORS[index % COLORS.length]}
                fill={COLORS[index % COLORS.length]}
                fillOpacity={selectedLegend === null || selectedLegend === colName ? 0.6 : 0.1}
              />
            ))}
          </AreaChart>
        );

      case 'pie':
        // For pie chart, we'll use the first numeric column and create segments
        const pieData = data.map((item, index) => ({
          name: item[dateColumn] || `Item ${index + 1}`,
          value: item[numericColumns[0]] || 0,
          fill: COLORS[index % COLORS.length]
        }));

        return (
          <PieChart {...commonProps}>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        );

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={dateColumn} />
            <YAxis />
            <Tooltip />
            <Legend onClick={handleLegendClick} />
            {numericColumns.map((colName, index) => (
              <Scatter
                key={index}
                dataKey={colName}
                fill={COLORS[index % COLORS.length]}
                fillOpacity={selectedLegend === null || selectedLegend === colName ? 1 : 0.3}
              />
            ))}
          </ScatterChart>
        );

      default: // line
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={dateColumn} />
            <YAxis />
            <Tooltip />
            <Legend onClick={handleLegendClick} />
            {numericColumns.map((colName, index) => (
              <Line
                key={index}
                type="monotone"
                dataKey={colName}
                stroke={COLORS[index % COLORS.length]}
                strokeOpacity={selectedLegend === null || selectedLegend === colName ? 1 : 0.2}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        );
    }
  };

  if (!data || data.length === 0) {
    return (
      <Box sx={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px dashed #ccc',
        borderRadius: 1,
        color: 'text.secondary'
      }}>
        No data available for chart
      </Box>
    );
  }

  return (
    <Box>
      {/* Chart Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {title && (
            <Box sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
              {title}
            </Box>
          )}
          {onChartTypeChange && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Chart Type</InputLabel>
              <Select
                value={chartType}
                label="Chart Type"
                onChange={(e) => onChartTypeChange(e.target.value)}
              >
                <MenuItem value="line">Line Chart</MenuItem>
                <MenuItem value="bar">Bar Chart</MenuItem>
                <MenuItem value="area">Area Chart</MenuItem>
                <MenuItem value="pie">Pie Chart</MenuItem>
                <MenuItem value="scatter">Scatter Plot</MenuItem>
              </Select>
            </FormControl>
          )}
        </Box>

        {showExport && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              size="small"
              onClick={() => exportChart('png')}
              title="Export as PNG"
            >
              <Download />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => exportChart('svg')}
              title="Export as SVG"
            >
              <GetApp />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Chart Container */}
      <Box ref={chartRef} sx={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default Graph;
