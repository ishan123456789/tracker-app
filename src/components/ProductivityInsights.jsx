import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Schedule,
  Assignment,
  Speed,
  Star,
  Warning,
  CheckCircle,
  ExpandMore,
  Refresh,
  Psychology,
  Timeline,
  Category,
  Flag
} from '@mui/icons-material';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { MetricsCalculator } from '../utils/MetricsCalculator';

const ProductivityInsights = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch data
  const todos = useQuery(api.todos.get) || [];
  const insights = useQuery(api.analytics.getProductivityInsights);
  const productivityMetrics = useQuery(api.analytics.getProductivityMetrics);
  const categoryPerformance = useQuery(api.analytics.getCategoryPerformance);

  // Calculate additional insights
  const streakInfo = useMemo(() => {
    return MetricsCalculator.calculateStreaks(todos);
  }, [todos]);

  const timePatterns = useMemo(() => {
    return MetricsCalculator.analyzeTimePatterns(todos);
  }, [todos]);

  const categoryStats = useMemo(() => {
    return MetricsCalculator.getCategoryStats(todos);
  }, [todos]);

  const priorityStats = useMemo(() => {
    return MetricsCalculator.getPriorityStats(todos.filter(todo => todo.done));
  }, [todos]);

  const generatedInsights = useMemo(() => {
    return MetricsCalculator.generateInsights(todos);
  }, [todos]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Get performance trends
  const getPerformanceTrend = (current, previous) => {
    if (!previous || previous === 0) return { trend: 'neutral', percentage: 0 };
    const change = ((current - previous) / previous) * 100;
    return {
      trend: change > 5 ? 'up' : change < -5 ? 'down' : 'neutral',
      percentage: Math.abs(Math.round(change))
    };
  };

  // Get insight severity
  const getInsightSeverity = (insight) => {
    const lowerInsight = insight.toLowerCase();
    if (lowerInsight.includes('excellent') || lowerInsight.includes('great') || lowerInsight.includes('impressive')) {
      return 'success';
    }
    if (lowerInsight.includes('consider') || lowerInsight.includes('only') || lowerInsight.includes('longer')) {
      return 'warning';
    }
    return 'info';
  };

  // Get recommendation priority
  const getRecommendationPriority = (recommendation) => {
    const lowerRec = recommendation.toLowerCase();
    if (lowerRec.includes('important') || lowerRec.includes('critical') || lowerRec.includes('urgent')) {
      return 'high';
    }
    if (lowerRec.includes('consider') || lowerRec.includes('try')) {
      return 'medium';
    }
    return 'low';
  };

  if (!insights || !productivityMetrics) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <Typography>Loading insights...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Psychology />
          Productivity Insights
        </Typography>
        <Tooltip title="Refresh Insights">
          <IconButton onClick={handleRefresh}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'primary.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Star color="primary" />
                <Box>
                  <Typography variant="h6">{productivityMetrics.productivityScore}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    Productivity Score
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckCircle color="success" />
                <Box>
                  <Typography variant="h6">{streakInfo.currentStreak}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    Current Streak (days)
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'warning.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Speed color="warning" />
                <Box>
                  <Typography variant="h6">{productivityMetrics.timeEfficiency}%</Typography>
                  <Typography variant="caption" color="textSecondary">
                    Time Efficiency
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'info.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Assignment color="info" />
                <Box>
                  <Typography variant="h6">{productivityMetrics.completedTodos}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    Tasks Completed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Insights */}
      <Grid container spacing={3}>
        {/* AI-Generated Insights */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 'fit-content' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Lightbulb />
              Smart Insights
            </Typography>

            {generatedInsights.length > 0 ? (
              <List>
                {generatedInsights.map((insight, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <Alert
                        severity={getInsightSeverity(insight)}
                        sx={{
                          '& .MuiAlert-icon': { fontSize: '1rem' },
                          minWidth: 'auto',
                          bgcolor: 'transparent',
                          p: 0
                        }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={insight}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info">
                Complete more tasks to generate personalized insights!
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Recommendations */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 'fit-content' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp />
              Recommendations
            </Typography>

            {insights?.recommendations && insights.recommendations.length > 0 ? (
              <List>
                {insights.recommendations.map((recommendation, index) => {
                  const priority = getRecommendationPriority(recommendation);
                  return (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon>
                        <Chip
                          size="small"
                          label={priority}
                          color={priority === 'high' ? 'error' : priority === 'medium' ? 'warning' : 'default'}
                          variant="outlined"
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={recommendation}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            ) : (
              <Alert severity="info">
                Keep tracking your productivity to receive personalized recommendations!
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Detailed Analysis */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Detailed Analysis
            </Typography>

            {/* Time Patterns */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Schedule />
                  <Typography>Time Patterns</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Peak Productivity
                    </Typography>
                    {timePatterns.peakHour !== null ? (
                      <Box>
                        <Typography variant="body2">
                          <strong>Best Hour:</strong> {timePatterns.peakHour}:00
                          ({timePatterns.peakHourCount} tasks)
                        </Typography>
                        <Typography variant="body2">
                          <strong>Best Day:</strong> {
                            ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][timePatterns.peakDay]
                          } ({timePatterns.peakDayCount} tasks)
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        Complete more tasks to identify patterns
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Activity Distribution
                    </Typography>
                    <Typography variant="body2">
                      <strong>Total Active Days:</strong> {streakInfo.totalActiveDays}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Longest Streak:</strong> {streakInfo.longestStreak} days
                    </Typography>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Priority Analysis */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Flag />
                  <Typography>Priority Analysis</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {Object.entries(priorityStats).map(([priority, count]) => (
                    <Grid item xs={6} sm={3} key={priority}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color={
                          priority === 'high' ? 'error.main' :
                          priority === 'medium' ? 'warning.main' :
                          priority === 'low' ? 'info.main' : 'text.secondary'
                        }>
                          {count}
                        </Typography>
                        <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                          {priority === 'none' ? 'No Priority' : `${priority} Priority`}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Category Performance */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Category />
                  <Typography>Category Performance</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {Object.entries(categoryStats).length > 0 ? (
                  <Grid container spacing={2}>
                    {Object.entries(categoryStats).map(([category, stats]) => (
                      <Grid item xs={12} sm={6} md={4} key={category}>
                        <Card variant="outlined">
                          <CardContent sx={{ py: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              {category}
                            </Typography>
                            <Box sx={{ mb: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption">Completion Rate</Typography>
                                <Typography variant="caption">{stats.completionRate}%</Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={stats.completionRate}
                                sx={{ height: 4, borderRadius: 2 }}
                              />
                            </Box>
                            <Typography variant="body2" color="textSecondary">
                              {stats.completed}/{stats.total} tasks • {MetricsCalculator.formatTime(stats.avgTime)} avg
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Alert severity="info">
                    Add categories to your tasks to see performance breakdown!
                  </Alert>
                )}
              </AccordionDetails>
            </Accordion>

            {/* Efficiency Trends */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Timeline />
                  <Typography>Efficiency Trends</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="primary">
                        {MetricsCalculator.formatTime(productivityMetrics.avgTimePerTask)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Average Time per Task
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="secondary">
                        {MetricsCalculator.formatTime(productivityMetrics.totalTimeSpent)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Total Time Tracked
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color={
                        productivityMetrics.timeEfficiency > 100 ? 'success.main' :
                        productivityMetrics.timeEfficiency < 80 ? 'error.main' : 'warning.main'
                      }>
                        {productivityMetrics.timeEfficiency}%
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Time Efficiency
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProductivityInsights;
