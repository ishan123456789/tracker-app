import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Card,
  CardContent,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  FormGroup,
  FormControlLabel
} from '@mui/material';
import {
  GetApp,
  PictureAsPdf,
  TableChart,
  Code,
  Preview,
  DateRange,
  Assessment,
  Close,
  Download
} from '@mui/icons-material';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { MetricsCalculator } from '../utils/MetricsCalculator';

const ReportGenerator = () => {
  const [reportConfig, setReportConfig] = useState({
    type: 'productivity_summary',
    format: 'csv',
    dateRange: 'last30days',
    startDate: '',
    endDate: '',
    includeCharts: false,
    includedMetrics: {
      completionRate: true,
      timeEfficiency: true,
      categoryBreakdown: true,
      priorityDistribution: true,
      timePatterns: false,
      goals: false
    }
  });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Fetch data
  const todos = useQuery(api.todos.get) || [];
  const goals = useQuery(api.analytics.getGoals) || [];
  const productivityMetrics = useQuery(api.analytics.getProductivityMetrics, {
    startDate: getStartDate(reportConfig.dateRange, reportConfig.startDate),
    endDate: getEndDate(reportConfig.dateRange, reportConfig.endDate)
  });
  const categoryPerformance = useQuery(api.analytics.getCategoryPerformance, {
    period: getPeriodFromRange(reportConfig.dateRange)
  });
  const insights = useQuery(api.analytics.getProductivityInsights);

  // Calculate additional data for reports
  const reportData = useMemo(() => {
    if (!productivityMetrics || !todos.length) return null;

    const filteredTodos = todos.filter(todo => {
      const startDate = new Date(getStartDate(reportConfig.dateRange, reportConfig.startDate));
      const endDate = new Date(getEndDate(reportConfig.dateRange, reportConfig.endDate));
      const todoDate = todo.completedAt ? new Date(todo.completedAt) :
                      todo.createdAt ? new Date(todo.createdAt) :
                      new Date(todo._creationTime);
      return todoDate >= startDate && todoDate <= endDate;
    });

    const streakInfo = MetricsCalculator.calculateStreaks(filteredTodos);
    const timePatterns = MetricsCalculator.analyzeTimePatterns(filteredTodos);
    const categoryStats = MetricsCalculator.getCategoryStats(filteredTodos);

    return {
      summary: productivityMetrics,
      todos: filteredTodos,
      streakInfo,
      timePatterns,
      categoryStats,
      categoryPerformance: categoryPerformance || [],
      goals: goals.filter(goal => {
        const goalStart = new Date(goal.startDate);
        const goalEnd = new Date(goal.endDate);
        const reportStart = new Date(getStartDate(reportConfig.dateRange, reportConfig.startDate));
        const reportEnd = new Date(getEndDate(reportConfig.dateRange, reportConfig.endDate));
        return goalStart <= reportEnd && goalEnd >= reportStart;
      }),
      insights: insights || { insights: [], recommendations: [] }
    };
  }, [productivityMetrics, todos, goals, categoryPerformance, insights, reportConfig.dateRange, reportConfig.startDate, reportConfig.endDate]);

  const reportTypes = [
    { value: 'productivity_summary', label: 'Productivity Summary', description: 'Overview of tasks, time, and efficiency' },
    { value: 'detailed_analysis', label: 'Detailed Analysis', description: 'Comprehensive breakdown with insights' },
    { value: 'goal_progress', label: 'Goal Progress Report', description: 'Focus on goal achievements and progress' },
    { value: 'time_tracking', label: 'Time Tracking Report', description: 'Detailed time analysis and patterns' },
    { value: 'custom', label: 'Custom Report', description: 'Select specific metrics to include' }
  ];

  const formatOptions = [
    { value: 'csv', label: 'CSV', icon: <TableChart />, description: 'Spreadsheet format' },
    { value: 'json', label: 'JSON', icon: <Code />, description: 'Data format for developers' },
    { value: 'pdf', label: 'PDF', icon: <PictureAsPdf />, description: 'Formatted document (coming soon)', disabled: true }
  ];

  const handleConfigChange = (field, value) => {
    setReportConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleMetricToggle = (metric) => {
    setReportConfig(prev => ({
      ...prev,
      includedMetrics: {
        ...prev.includedMetrics,
        [metric]: !prev.includedMetrics[metric]
      }
    }));
  };

  const generateCSVReport = () => {
    if (!reportData) return '';

    const { summary, todos, streakInfo, categoryStats } = reportData;
    const config = reportConfig.includedMetrics;

    let csvContent = '';

    // Header
    csvContent += `Productivity Report\n`;
    csvContent += `Generated: ${new Date().toLocaleString()}\n`;
    csvContent += `Period: ${getStartDate(reportConfig.dateRange, reportConfig.startDate)} to ${getEndDate(reportConfig.dateRange, reportConfig.endDate)}\n\n`;

    // Summary metrics
    if (config.completionRate || config.timeEfficiency) {
      csvContent += `SUMMARY METRICS\n`;
      if (config.completionRate) csvContent += `Completion Rate,${summary.completionRate}%\n`;
      if (config.timeEfficiency) csvContent += `Time Efficiency,${summary.timeEfficiency}%\n`;
      csvContent += `Total Tasks,${summary.totalTodos}\n`;
      csvContent += `Completed Tasks,${summary.completedTodos}\n`;
      csvContent += `Total Time Spent,${MetricsCalculator.formatTime(summary.totalTimeSpent)}\n`;
      csvContent += `Productivity Score,${summary.productivityScore}\n`;
      csvContent += `Current Streak,${streakInfo.currentStreak} days\n`;
      csvContent += `Longest Streak,${streakInfo.longestStreak} days\n\n`;
    }

    // Priority distribution
    if (config.priorityDistribution) {
      csvContent += `PRIORITY DISTRIBUTION\n`;
      csvContent += `Priority,Count\n`;
      Object.entries(summary.priorityStats).forEach(([priority, count]) => {
        csvContent += `${priority.charAt(0).toUpperCase() + priority.slice(1)},${count}\n`;
      });
      csvContent += `\n`;
    }

    // Category breakdown
    if (config.categoryBreakdown) {
      csvContent += `CATEGORY PERFORMANCE\n`;
      csvContent += `Category,Total Tasks,Completed,Completion Rate,Time Spent,Avg Time per Task\n`;
      Object.entries(categoryStats).forEach(([category, stats]) => {
        csvContent += `${category},${stats.total},${stats.completed},${stats.completionRate}%,${MetricsCalculator.formatTime(stats.timeSpent)},${MetricsCalculator.formatTime(stats.avgTime)}\n`;
      });
      csvContent += `\n`;
    }

    // Individual tasks
    csvContent += `TASK DETAILS\n`;
    csvContent += `Title,Status,Priority,Category,Created,Completed,Time Spent,Estimated Time\n`;
    todos.forEach(todo => {
      const createdDate = new Date(todo._creationTime).toLocaleDateString();
      const completedDate = todo.completedAt ? new Date(todo.completedAt).toLocaleDateString() : '';
      csvContent += `"${todo.text}",${todo.done ? 'Completed' : 'Pending'},${todo.priority || 'None'},${todo.category || 'Uncategorized'},${createdDate},${completedDate},${MetricsCalculator.formatTime(todo.timeSpent || todo.actualMinutes || 0)},${MetricsCalculator.formatTime(todo.estimatedMinutes || 0)}\n`;
    });

    return csvContent;
  };

  const generateJSONReport = () => {
    if (!reportData) return '';

    const { summary, todos, streakInfo, timePatterns, categoryStats, goals, insights } = reportData;

    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        reportType: reportConfig.type,
        dateRange: {
          start: getStartDate(reportConfig.dateRange, reportConfig.startDate),
          end: getEndDate(reportConfig.dateRange, reportConfig.endDate),
          type: reportConfig.dateRange
        },
        includedMetrics: reportConfig.includedMetrics
      },
      summary: {
        ...summary,
        streakInfo,
        productivityScore: summary.productivityScore
      },
      analytics: {
        timePatterns: reportConfig.includedMetrics.timePatterns ? timePatterns : undefined,
        categoryStats: reportConfig.includedMetrics.categoryBreakdown ? categoryStats : undefined,
        insights: insights.insights,
        recommendations: insights.recommendations
      },
      goals: reportConfig.includedMetrics.goals ? goals.map(goal => ({
        ...goal,
        progress: MetricsCalculator.calculateGoalProgress(goal, todos)
      })) : undefined,
      tasks: todos.map(todo => ({
        id: todo._id,
        title: todo.text,
        status: todo.done ? 'completed' : 'pending',
        priority: todo.priority || 'none',
        category: todo.category || 'uncategorized',
        createdAt: todo._creationTime,
        completedAt: todo.completedAt,
        timeSpent: todo.timeSpent || todo.actualMinutes || 0,
        estimatedTime: todo.estimatedMinutes || 0,
        tags: todo.tags || []
      }))
    };

    return JSON.stringify(report, null, 2);
  };

  const handleGenerate = async () => {
    if (!reportData) return;

    setGenerating(true);

    try {
      let content = '';
      let filename = '';
      let mimeType = '';

      switch (reportConfig.format) {
        case 'csv':
          content = generateCSVReport();
          filename = `productivity-report-${new Date().toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
          break;
        case 'json':
          content = generateJSONReport();
          filename = `productivity-report-${new Date().toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
          break;
        default:
          throw new Error('Unsupported format');
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handlePreview = () => {
    setPreviewOpen(true);
  };

  const getPreviewContent = () => {
    if (!reportData) return 'No data available';

    switch (reportConfig.format) {
      case 'csv':
        return generateCSVReport();
      case 'json':
        return generateJSONReport();
      default:
        return 'Preview not available for this format';
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Assessment />
        Report Generator
      </Typography>

      <Grid container spacing={3}>
        {/* Configuration Panel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Report Configuration
            </Typography>

            {/* Report Type */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Report Type</InputLabel>
              <Select
                value={reportConfig.type}
                label="Report Type"
                onChange={(e) => handleConfigChange('type', e.target.value)}
              >
                {reportTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    <Box>
                      <Typography variant="body2">{type.label}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {type.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Date Range */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={reportConfig.dateRange}
                label="Date Range"
                onChange={(e) => handleConfigChange('dateRange', e.target.value)}
              >
                <MenuItem value="last7days">Last 7 Days</MenuItem>
                <MenuItem value="last30days">Last 30 Days</MenuItem>
                <MenuItem value="last90days">Last 90 Days</MenuItem>
                <MenuItem value="thisMonth">This Month</MenuItem>
                <MenuItem value="thisYear">This Year</MenuItem>
                <MenuItem value="custom">Custom Range</MenuItem>
              </Select>
            </FormControl>

            {reportConfig.dateRange === 'custom' && (
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={reportConfig.startDate}
                  onChange={(e) => handleConfigChange('startDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={reportConfig.endDate}
                  onChange={(e) => handleConfigChange('endDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            )}

            {/* Format Selection */}
            <Typography variant="subtitle2" gutterBottom>
              Export Format
            </Typography>
            <Grid container spacing={1} sx={{ mb: 3 }}>
              {formatOptions.map((format) => (
                <Grid item xs={12} key={format.value}>
                  <Card
                    sx={{
                      cursor: format.disabled ? 'not-allowed' : 'pointer',
                      opacity: format.disabled ? 0.5 : 1,
                      border: reportConfig.format === format.value ? '2px solid' : '1px solid',
                      borderColor: reportConfig.format === format.value ? 'primary.main' : 'divider'
                    }}
                    onClick={() => !format.disabled && handleConfigChange('format', format.value)}
                  >
                    <CardContent sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {format.icon}
                        <Box>
                          <Typography variant="body2">{format.label}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {format.description}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Metrics Selection */}
            {reportConfig.type === 'custom' && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Include Metrics
                </Typography>
                <FormGroup>
                  {Object.entries(reportConfig.includedMetrics).map(([metric, included]) => (
                    <FormControlLabel
                      key={metric}
                      control={
                        <Checkbox
                          checked={included}
                          onChange={() => handleMetricToggle(metric)}
                        />
                      }
                      label={metric.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    />
                  ))}
                </FormGroup>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Preview and Actions */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Report Preview
            </Typography>

            {reportData ? (
              <Box>
                {/* Summary Cards */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h5">{reportData.summary.completedTodos}</Typography>
                        <Typography variant="caption">Tasks Completed</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h5">{reportData.summary.completionRate}%</Typography>
                        <Typography variant="caption">Completion Rate</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h5">
                          {MetricsCalculator.formatTime(reportData.summary.totalTimeSpent)}
                        </Typography>
                        <Typography variant="caption">Time Spent</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h5">{reportData.summary.productivityScore}</Typography>
                        <Typography variant="caption">Productivity Score</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Report Details */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Report Details
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><DateRange /></ListItemIcon>
                      <ListItemText
                        primary="Date Range"
                        secondary={`${getStartDate(reportConfig.dateRange, reportConfig.startDate)} to ${getEndDate(reportConfig.dateRange, reportConfig.endDate)}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Assessment /></ListItemIcon>
                      <ListItemText
                        primary="Report Type"
                        secondary={reportTypes.find(t => t.value === reportConfig.type)?.label}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><GetApp /></ListItemIcon>
                      <ListItemText
                        primary="Export Format"
                        secondary={formatOptions.find(f => f.value === reportConfig.format)?.label}
                      />
                    </ListItem>
                  </List>
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Preview />}
                    onClick={handlePreview}
                  >
                    Preview
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={generating ? <CircularProgress size={20} /> : <Download />}
                    onClick={handleGenerate}
                    disabled={generating}
                  >
                    {generating ? 'Generating...' : 'Generate Report'}
                  </Button>
                </Box>
              </Box>
            ) : (
              <Alert severity="info">
                Complete some tasks to generate reports with meaningful data.
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Report Preview
          <Button onClick={() => setPreviewOpen(false)}>
            <Close />
          </Button>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={20}
            value={getPreviewContent()}
            variant="outlined"
            InputProps={{
              readOnly: true,
              sx: { fontFamily: 'monospace', fontSize: '0.875rem' }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          <Button variant="contained" onClick={handleGenerate}>
            Generate & Download
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Helper functions (same as in AnalyticsDashboard)
function getStartDate(range, customStart) {
  if (range === 'custom' && customStart) return customStart;

  const now = new Date();
  switch (range) {
    case 'last7days':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    case 'last30days':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    case 'last90days':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    case 'thisMonth':
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    case 'thisYear':
      return new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }
}

function getEndDate(range, customEnd) {
  if (range === 'custom' && customEnd) return customEnd;
  return new Date().toISOString().split('T')[0];
}

function getPeriodFromRange(range) {
  switch (range) {
    case 'last7days': return 'week';
    case 'last90days': return 'quarter';
    default: return 'month';
  }
}

export default ReportGenerator;
