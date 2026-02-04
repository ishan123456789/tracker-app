import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Chip
} from '@mui/material';
import {
  Analytics,
  TrendingUp,
  Schedule,
  Assignment,
  Speed,
  Category,
  Refresh,
  GetApp,
  FilterList
} from '@mui/icons-material';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import Graph from './Graph';
import ChartSelector from './ChartSelector';
import CategorySelector from './CategorySelector';
import AdvancedCategoryFilter from './AdvancedCategoryFilter';
import { MetricsCalculator } from '../utils/MetricsCalculator';

const AnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [chartType, setChartType] = useState('line');
  const [dateRange, setDateRange] = useState('last30days');
  const [selectedMetrics, setSelectedMetrics] = useState(['completed', 'timeSpent']);

  // Advanced category filter state
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [selectedActivityTypes, setSelectedActivityTypes] = useState([]);

  // Fetch data with filters
  const todos = useQuery(api.todos.get) || [];
  const productivityMetrics = useQuery(api.analytics.getProductivityMetrics, {
    startDate: getStartDate(dateRange),
    endDate: getEndDate(dateRange)
  });
  const dailyData = useQuery(api.analytics.getDailyProductivityData, {
    days: getDaysFromRange(dateRange)
  });

  // Use new filtered category performance query
  const categoryPerformance = useQuery(api.analytics.getCategoryPerformance, {
    period: getPeriodFromRange(dateRange),
    categories: selectedCategories.length > 0 ? selectedCategories : undefined,
    subcategories: selectedSubcategories.length > 0 ? selectedSubcategories : undefined,
    activityTypes: selectedActivityTypes.length > 0 ? selectedActivityTypes : undefined,
  });

  // Calculate statistics from category performance data
  const categoryStatistics = useMemo(() => {
    if (!categoryPerformance) return null;

    const mainCategories = categoryPerformance.filter(c => c.type === 'main');
    const subcategories = categoryPerformance.filter(c => c.type === 'subcategory');
    const activityTypes = categoryPerformance.filter(c => c.type === 'activity');

    const totals = {
      completed: categoryPerformance.reduce((sum, c) => sum + c.completed, 0),
      timeSpent: categoryPerformance.reduce((sum, c) => sum + c.timeSpent, 0),
      highPriority: categoryPerformance.reduce((sum, c) => sum + c.highPriority, 0),
      mediumPriority: categoryPerformance.reduce((sum, c) => sum + c.mediumPriority, 0),
      lowPriority: categoryPerformance.reduce((sum, c) => sum + c.lowPriority, 0),
    };

    return {
      mainCategories,
      subcategories,
      activityTypes,
      totals
    };
  }, [categoryPerformance]);

  const insights = useQuery(api.analytics.getProductivityInsights);

  // Check if any filters are active
  const hasActiveFilters = selectedCategories.length > 0 || selectedSubcategories.length > 0 || selectedActivityTypes.length > 0;

  // Clear all filters
  const handleClearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedSubcategories([]);
    setSelectedActivityTypes([]);
  };

  // Calculate additional metrics
  const streakInfo = useMemo(() => {
    return MetricsCalculator.calculateStreaks(todos);
  }, [todos]);

  const timePatterns = useMemo(() => {
    return MetricsCalculator.analyzeTimePatterns(todos);
  }, [todos]);

  // Available metrics for chart selection
  const availableMetrics = [
    { key: 'completed', label: 'Tasks Completed' },
    { key: 'timeSpent', label: 'Time Spent (minutes)' },
    { key: 'highPriority', label: 'High Priority Tasks' },
    { key: 'mediumPriority', label: 'Medium Priority Tasks' },
    { key: 'lowPriority', label: 'Low Priority Tasks' },
    { key: 'productivityScore', label: 'Productivity Score' }
  ];

  // Filter chart data based on selected metrics
  const chartData = useMemo(() => {
    if (!dailyData) return [];
    return dailyData.map(day => {
      const filteredDay = { date: day.date };
      selectedMetrics.forEach(metric => {
        filteredDay[metric] = day[metric] || 0;
      });
      return filteredDay;
    });
  }, [dailyData, selectedMetrics]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    // Force refresh by changing a query parameter
    window.location.reload();
  };

  if (!productivityMetrics || !dailyData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Analytics />
          Analytics Dashboard
        </Typography>
        <Box>
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export Report">
            <IconButton>
              <GetApp />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Completion Rate
                  </Typography>
                  <Typography variant="h4">
                    {productivityMetrics.completionRate}%
                  </Typography>
                </Box>
                <Assignment color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Time Efficiency
                  </Typography>
                  <Typography variant="h4">
                    {productivityMetrics.timeEfficiency}%
                  </Typography>
                </Box>
                <Speed color="secondary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Productivity Score
                  </Typography>
                  <Typography variant="h4">
                    {productivityMetrics.productivityScore}
                  </Typography>
                </Box>
                <TrendingUp color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Current Streak
                  </Typography>
                  <Typography variant="h4">
                    {streakInfo.currentStreak}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    days
                  </Typography>
                </Box>
                <Schedule color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for different views */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
          <Tab label="Productivity Trends" />
          <Tab label="Category Analysis" />
          <Tab label="Time Patterns" />
          <Tab label="Priority Distribution" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box>
          <ChartSelector
            chartType={chartType}
            onChartTypeChange={setChartType}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            availableMetrics={availableMetrics}
            selectedMetrics={selectedMetrics}
            onMetricsChange={setSelectedMetrics}
          />

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Productivity Trends Over Time
            </Typography>
            {chartData.length > 0 ? (
              <Graph
                data={chartData}
                chartType={chartType}
                title="Daily Productivity Metrics"
                height={400}
                showExport={true}
                xAxisKey="date"
                yAxisKeys={selectedMetrics}
              />
            ) : (
              <Alert severity="info">
                No data available for the selected date range. Complete some tasks to see trends!
              </Alert>
            )}
          </Paper>
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          {/* Advanced Category Filter */}
          <AdvancedCategoryFilter
            selectedCategories={selectedCategories}
            selectedSubcategories={selectedSubcategories}
            selectedActivityTypes={selectedActivityTypes}
            onCategoriesChange={setSelectedCategories}
            onSubcategoriesChange={setSelectedSubcategories}
            onActivityTypesChange={setSelectedActivityTypes}
            onClearAll={handleClearAllFilters}
            showCompact={false}
          />

          {/* Filter Status Indicator */}
          {hasActiveFilters && (
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterList color="primary" />
                <Typography variant="body2" color="primary.main">
                  <strong>Filtered View:</strong> Showing data for {selectedCategories.length + selectedSubcategories.length + selectedActivityTypes.length} selected filter(s)
                </Typography>
              </Box>
            </Paper>
          )}

          {/* Category Performance Analysis */}
          <Grid container spacing={3}>
            {/* Main Chart */}
            <Grid item xs={12} lg={8}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Category />
                  Category Performance Analysis
                  {hasActiveFilters && (
                    <Chip label="Filtered" color="primary" size="small" sx={{ ml: 1 }} />
                  )}
                </Typography>
                {categoryPerformance && categoryPerformance.length > 0 ? (
                  <Graph
                    data={categoryPerformance.slice(0, 10).map(category => ({
                      ...category,
                      // Shorten long category names for better x-axis display
                      displayName: category.name.length > 20
                        ? category.name.substring(0, 17) + '...'
                        : category.name,
                      // Keep original name for tooltips
                      fullName: category.name
                    }))}
                    chartType="bar"
                    title={hasActiveFilters ? "Tasks Completed (Filtered)" : "Top 10 Categories by Tasks Completed"}
                    height={400}
                    showExport={true}
                    xAxisKey="displayName"
                    yAxisKeys={['completed']}
                  />
                ) : (
                  <Alert severity="info">
                    {hasActiveFilters
                      ? "No data available for the selected filters. Try adjusting your filter criteria."
                      : "No category data available. Add categories to your tasks to see performance analysis!"
                    }
                  </Alert>
                )}
              </Paper>
            </Grid>

            {/* Statistics Panel */}
            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Category Statistics
                </Typography>

                {categoryStatistics && (
                  <Box>
                    {/* Summary Stats */}
                    <Card sx={{ mb: 2, bgcolor: 'grey.50' }}>
                      <CardContent sx={{ py: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Summary
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" color="textSecondary">
                            Total Completed:
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {categoryStatistics.totals.completed}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" color="textSecondary">
                            Total Time:
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {MetricsCalculator.formatTime(categoryStatistics.totals.timeSpent)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">
                            Categories:
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {categoryStatistics.mainCategories.length}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>

                    {/* Top Categories */}
                    <Typography variant="subtitle2" gutterBottom>
                      Top Performing Categories
                    </Typography>
                    {categoryPerformance && categoryPerformance.slice(0, 5).map((category, index) => (
                      <Card
                        key={category.id || index}
                        sx={{
                          mb: 2,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            boxShadow: 3,
                            transform: 'translateY(-2px)'
                          }
                        }}
                        onClick={() => {
                          // Filter by this specific category
                          if (category.type === 'main') {
                            setSelectedCategories([category.mainCategory]);
                            setSelectedSubcategories([]);
                            setSelectedActivityTypes([]);
                          } else if (category.type === 'subcategory') {
                            setSelectedCategories(category.mainCategory ? [category.mainCategory] : []);
                            setSelectedSubcategories([category.subcategory]);
                            setSelectedActivityTypes([]);
                          } else if (category.type === 'activity') {
                            setSelectedCategories(category.mainCategory ? [category.mainCategory] : []);
                            setSelectedSubcategories(category.subcategory ? [category.subcategory] : []);
                            setSelectedActivityTypes([category.activityType]);
                          }
                        }}
                      >
                        <CardContent sx={{ py: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ flex: 1 }}>
                              {category.name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={category.type}
                                size="small"
                                color={category.type === 'main' ? 'primary' : category.type === 'subcategory' ? 'secondary' : 'success'}
                              />
                              <Tooltip title="Click to filter by this category">
                                <FilterList fontSize="small" color="action" />
                              </Tooltip>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" color="textSecondary">
                              Completed:
                            </Typography>
                            <Typography variant="body2">
                              {category.completed}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" color="textSecondary">
                              Time Spent:
                            </Typography>
                            <Typography variant="body2">
                              {MetricsCalculator.formatTime(category.timeSpent)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="textSecondary">
                              Avg Time/Task:
                            </Typography>
                            <Typography variant="body2">
                              {MetricsCalculator.formatTime(category.avgTimePerTask)}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Productivity by Hour of Day
                </Typography>
                {timePatterns.hourOfDay.some(h => h > 0) ? (
                  <Graph
                    data={timePatterns.hourOfDay.map((count, hour) => ({
                      hour: `${hour}:00`,
                      tasks: count
                    }))}
                    chartType="bar"
                    height={300}
                    xAxisKey="hour"
                    yAxisKeys={['tasks']}
                  />
                ) : (
                  <Alert severity="info">Complete tasks to see hourly patterns!</Alert>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Productivity by Day of Week
                </Typography>
                {timePatterns.dayOfWeek.some(d => d > 0) ? (
                  <Graph
                    data={timePatterns.dayOfWeek.map((count, day) => ({
                      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
                      tasks: count
                    }))}
                    chartType="bar"
                    height={300}
                    xAxisKey="day"
                    yAxisKeys={['tasks']}
                  />
                ) : (
                  <Alert severity="info">Complete tasks to see daily patterns!</Alert>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {activeTab === 3 && (
        <Box>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Priority Distribution
            </Typography>
            {productivityMetrics.priorityStats && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Graph
                    data={[
                      { priority: 'High', count: productivityMetrics.priorityStats.high },
                      { priority: 'Medium', count: productivityMetrics.priorityStats.medium },
                      { priority: 'Low', count: productivityMetrics.priorityStats.low },
                      { priority: 'None', count: productivityMetrics.priorityStats.none }
                    ].filter(item => item.count > 0)}
                    chartType="pie"
                    height={350}
                    xAxisKey="priority"
                    yAxisKeys={['count']}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1" gutterBottom>
                    Priority Breakdown
                  </Typography>
                  {Object.entries(productivityMetrics.priorityStats).map(([priority, count]) => (
                    count > 0 && (
                      <Box key={priority} sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {priority} Priority:
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {count} tasks
                        </Typography>
                      </Box>
                    )
                  ))}
                </Grid>
              </Grid>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
};

// Helper functions
function getStartDate(range) {
  const now = new Date();
  switch (range) {
    case 'last7days':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    case 'last30days':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    case 'last90days':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    case 'thisWeek':
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      return startOfWeek.toISOString().split('T')[0];
    case 'thisMonth':
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    case 'thisYear':
      return new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    default:
      if (range?.startDate) return range.startDate;
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }
}

function getEndDate(range) {
  const now = new Date();
  if (range?.endDate) return range.endDate;
  return now.toISOString().split('T')[0];
}

function getDaysFromRange(range) {
  switch (range) {
    case 'last7days': return 7;
    case 'last30days': return 30;
    case 'last90days': return 90;
    case 'thisWeek': return 7;
    case 'thisMonth': return 30;
    case 'thisYear': return 365;
    default: return 30;
  }
}

function getPeriodFromRange(range) {
  switch (range) {
    case 'last7days':
    case 'thisWeek':
      return 'week';
    case 'last90days':
      return 'quarter';
    default:
      return 'month';
  }
}

export default AnalyticsDashboard;
