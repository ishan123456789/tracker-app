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
  Tooltip,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
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
  Flag,
} from '@mui/icons-material';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { MetricsCalculator } from '../utils/MetricsCalculator';
import TaskMasteryPanel from './TaskMasteryPanel';
import LagDetectorPanel from './LagDetectorPanel';
import MissedTasksPanel from './MissedTasksPanel';

const ProductivityInsights = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [period, setPeriod] = useState('month');

  // ── Existing queries ────────────────────────────────────────────────────────
  const todos = useQuery(api.todos.get) || [];
  const insights = useQuery(api.analytics.getProductivityInsights);
  const productivityMetrics = useQuery(api.analytics.getProductivityMetrics);
  const categoryPerformance = useQuery(api.analytics.getCategoryPerformance);

  // ── New queries ─────────────────────────────────────────────────────────────
  const masteryStats   = useQuery(api.analytics.getTaskMasteryStats,   { period });
  const lagData        = useQuery(api.analytics.getLagIndicators,       { period });
  const missedData     = useQuery(api.analytics.getMissedTasksAnalysis);

  // ── Derived metrics (existing) ──────────────────────────────────────────────
  const streakInfo = useMemo(() => MetricsCalculator.calculateStreaks(todos), [todos]);
  const timePatterns = useMemo(() => MetricsCalculator.analyzeTimePatterns(todos), [todos]);
  const categoryStats = useMemo(() => MetricsCalculator.getCategoryStats(todos), [todos]);
  const priorityStats = useMemo(() => MetricsCalculator.getPriorityStats(todos.filter(t => t.done)), [todos]);
  const generatedInsights = useMemo(() => MetricsCalculator.generateInsights(todos), [todos]);

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  // Loading states
  const masteryLoading = masteryStats === undefined;
  const lagLoading     = lagData      === undefined;
  const missedLoading  = missedData   === undefined;

  // Missed tasks count for header badge
  const missedCount = missedData?.summary?.totalMissed ?? 0;

  // ── Helpers (existing) ──────────────────────────────────────────────────────
  const getInsightSeverity = (insight) => {
    const l = insight.toLowerCase();
    if (l.includes('excellent') || l.includes('great') || l.includes('impressive')) return 'success';
    if (l.includes('consider') || l.includes('only') || l.includes('longer')) return 'warning';
    return 'info';
  };

  const getRecommendationPriority = (rec) => {
    const l = rec.toLowerCase();
    if (l.includes('important') || l.includes('critical') || l.includes('urgent')) return 'high';
    if (l.includes('consider') || l.includes('try')) return 'medium';
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

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Psychology />
          Productivity Insights
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Period selector — controls Mastery + Lag panels */}
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={period}
              label="Period"
              onChange={e => setPeriod(e.target.value)}
            >
              <MenuItem value="week">Last 7 days</MenuItem>
              <MenuItem value="month">Last 30 days</MenuItem>
              <MenuItem value="quarter">Last 90 days</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Refresh Insights">
            <IconButton onClick={handleRefresh}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Quick Stats ─────────────────────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'primary.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Star color="primary" />
                <Box>
                  <Typography variant="h6">{productivityMetrics.productivityScore}</Typography>
                  <Typography variant="caption" color="textSecondary">Productivity Score</Typography>
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
                  <Typography variant="caption" color="textSecondary">Current Streak (days)</Typography>
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
                  <Typography variant="caption" color="textSecondary">Time Efficiency</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: missedCount > 0 ? 'error.50' : 'info.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Assignment color={missedCount > 0 ? 'error' : 'info'} />
                <Box>
                  <Typography variant="h6">{productivityMetrics.completedTodos}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    Tasks Completed
                    {missedCount > 0 && (
                      <Chip
                        label={`${missedCount} missed`}
                        color="error"
                        size="small"
                        sx={{ ml: 0.75, height: 16, fontSize: '0.6rem' }}
                      />
                    )}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── NEW: Missed Tasks Panel (full width, top priority) ──────────────── */}
      <Box sx={{ mb: 4 }}>
        <MissedTasksPanel missedData={missedData} loading={missedLoading} />
      </Box>

      {/* ── NEW: Task Mastery + Lag Detector (side by side) ─────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <TaskMasteryPanel masteryStats={masteryStats} loading={masteryLoading} />
        </Grid>
        <Grid item xs={12} md={6}>
          <LagDetectorPanel lagData={lagData} loading={lagLoading} />
        </Grid>
      </Grid>

      {/* ── Existing: Smart Insights + Recommendations ──────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Smart Insights */}
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
                          p: 0,
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
      </Grid>

      {/* ── Existing: Detailed Analysis accordion ───────────────────────────── */}
      <Grid container spacing={3}>
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
                          <strong>Best Day:</strong>{' '}
                          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][timePatterns.peakDay]}
                          {' '}({timePatterns.peakDayCount} tasks)
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
                        <Typography
                          variant="h4"
                          color={
                            priority === 'high'   ? 'error.main' :
                            priority === 'medium' ? 'warning.main' :
                            priority === 'low'    ? 'info.main' : 'text.secondary'
                          }
                        >
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
                      <Typography
                        variant="h5"
                        color={
                          productivityMetrics.timeEfficiency > 100 ? 'success.main' :
                          productivityMetrics.timeEfficiency < 80  ? 'error.main' : 'warning.main'
                        }
                      >
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
