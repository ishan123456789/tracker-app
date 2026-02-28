import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Tooltip,
  Collapse,
  IconButton,
  Alert,
  Divider,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Loop as LoopIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

// ─── Mini Calendar Heatmap ────────────────────────────────────────────────────

const CELL_SIZE = 14;
const CELL_GAP = 2;

function HeatmapCell({ date, status, today }) {
  const isToday = date === today;
  const bgColor =
    status === 'completed' ? '#4caf50' :
    status === 'missed'    ? '#f44336' :
    '#e0e0e0';

  const label =
    status === 'completed' ? `✅ ${date}` :
    status === 'missed'    ? `❌ ${date} (missed)` :
    date;

  return (
    <Tooltip title={label} arrow placement="top">
      <Box
        sx={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          borderRadius: '2px',
          backgroundColor: bgColor,
          border: isToday ? '2px solid #1976d2' : 'none',
          cursor: 'default',
          flexShrink: 0,
        }}
      />
    </Tooltip>
  );
}

function CalendarHeatmap({ history, today }) {
  // history is an array of { date, status } for the last 30 days, oldest first
  const weeks = useMemo(() => {
    const result = [];
    let week = [];
    history.forEach((entry, i) => {
      week.push(entry);
      if (week.length === 7 || i === history.length - 1) {
        result.push(week);
        week = [];
      }
    });
    return result;
  }, [history]);

  return (
    <Box>
      {/* Day-of-week labels */}
      <Box sx={{ display: 'flex', gap: `${CELL_GAP}px`, mb: 0.5 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Box key={i} sx={{ width: CELL_SIZE, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.secondary' }}>
              {d}
            </Typography>
          </Box>
        ))}
      </Box>
      {/* Weeks */}
      {weeks.map((week, wi) => (
        <Box key={wi} sx={{ display: 'flex', gap: `${CELL_GAP}px`, mb: `${CELL_GAP}px` }}>
          {week.map((entry) => (
            <HeatmapCell key={entry.date} date={entry.date} status={entry.status} today={today} />
          ))}
        </Box>
      ))}
      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 1.5, mt: 1, alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: '#4caf50' }} />
          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>Done</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: '#f44336' }} />
          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>Missed</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: '#e0e0e0' }} />
          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>N/A</Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Pattern Label ────────────────────────────────────────────────────────────

function patternLabel(stat) {
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  switch (stat.pattern) {
    case 'daily':   return 'Daily';
    case 'weekly':
      if (stat.recurringDays && stat.recurringDays.length > 0) {
        return `Weekly (${stat.recurringDays.map(d => DAY_NAMES[d]).join(', ')})`;
      }
      return 'Weekly';
    case 'monthly': return 'Monthly';
    case 'custom':  return `Every ${stat.recurringInterval || 1} day(s)`;
    default:        return stat.pattern;
  }
}

// ─── Compliance color ─────────────────────────────────────────────────────────

function complianceColor(rate) {
  if (rate >= 80) return 'success';
  if (rate >= 50) return 'warning';
  return 'error';
}

// ─── Single Habit Card ────────────────────────────────────────────────────────

function HabitCard({ stat, today }) {
  const [expanded, setExpanded] = useState(false);
  const total = stat.totalCompleted + stat.totalMissed;
  const color = complianceColor(stat.completionRate);

  const recentMisses = stat.history
    ? stat.history.filter(h => h.status === 'missed').slice(-5).reverse()
    : [];

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ pb: '12px !important' }}>
        {/* Header row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ flex: 1, mr: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
              {stat.taskText}
            </Typography>
            <Chip
              label={patternLabel(stat)}
              size="small"
              icon={<LoopIcon sx={{ fontSize: '12px !important' }} />}
              sx={{ mt: 0.5, height: 20, fontSize: '0.65rem' }}
            />
          </Box>
          <IconButton size="small" onClick={() => setExpanded(e => !e)}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        {/* Stat chips row */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
          <Tooltip title="Current streak (consecutive completions)">
            <Chip
              label={`🔥 ${stat.currentStreak}`}
              size="small"
              sx={{
                backgroundColor: stat.currentStreak >= 7 ? '#ff6d00' : stat.currentStreak >= 3 ? '#ff9800' : '#fff3e0',
                color: stat.currentStreak >= 3 ? 'white' : 'text.primary',
                fontWeight: 600,
              }}
            />
          </Tooltip>
          <Tooltip title="All-time best streak">
            <Chip
              label={`🏆 ${stat.longestStreak}`}
              size="small"
              sx={{ backgroundColor: '#e8f5e9', color: '#2e7d32', fontWeight: 600 }}
            />
          </Tooltip>
          <Tooltip title="Total completions">
            <Chip
              label={`✅ ${stat.totalCompleted}`}
              size="small"
              sx={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}
            />
          </Tooltip>
          <Tooltip title="Total misses">
            <Chip
              label={`❌ ${stat.totalMissed}`}
              size="small"
              sx={{
                backgroundColor: stat.totalMissed > 0 ? '#ffebee' : '#f5f5f5',
                color: stat.totalMissed > 0 ? '#c62828' : 'text.secondary',
              }}
            />
          </Tooltip>
        </Box>

        {/* Metric aggregates row */}
        {(stat.totalCount > 0 || stat.totalTimeMinutes > 0 || stat.totalDistance > 0) && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
            {stat.totalCount > 0 && (
              <>
                <Tooltip title={`Total ${stat.countLabel || 'count'} overall`}>
                  <Chip
                    label={`📊 ${stat.totalCount} ${stat.countLabel || ''} total`}
                    size="small"
                    sx={{ backgroundColor: '#e3f2fd', color: '#1565c0', fontSize: '0.65rem', height: 20 }}
                  />
                </Tooltip>
                <Tooltip title={`${stat.countLabel || 'Count'} logged today`}>
                  <Chip
                    label={`📊 ${stat.todayCount} today`}
                    size="small"
                    sx={{ backgroundColor: '#bbdefb', color: '#1565c0', fontSize: '0.65rem', height: 20 }}
                  />
                </Tooltip>
              </>
            )}
            {stat.totalTimeMinutes > 0 && (
              <>
                <Tooltip title="Total time spent overall">
                  <Chip
                    label={`⏱ ${stat.totalTimeMinutes >= 60 ? `${Math.floor(stat.totalTimeMinutes / 60)}h ${stat.totalTimeMinutes % 60}m` : `${stat.totalTimeMinutes}m`} total`}
                    size="small"
                    sx={{ backgroundColor: '#f3e5f5', color: '#6a1b9a', fontSize: '0.65rem', height: 20 }}
                  />
                </Tooltip>
                <Tooltip title="Time spent today">
                  <Chip
                    label={`⏱ ${stat.todayTimeMinutes >= 60 ? `${Math.floor(stat.todayTimeMinutes / 60)}h ${stat.todayTimeMinutes % 60}m` : `${stat.todayTimeMinutes}m`} today`}
                    size="small"
                    sx={{ backgroundColor: '#e1bee7', color: '#6a1b9a', fontSize: '0.65rem', height: 20 }}
                  />
                </Tooltip>
              </>
            )}
            {stat.totalDistance > 0 && (
              <>
                <Tooltip title="Total distance overall">
                  <Chip
                    label={`📍 ${stat.totalDistance}${stat.distanceUnit} total`}
                    size="small"
                    sx={{ backgroundColor: '#e8f5e9', color: '#2e7d32', fontSize: '0.65rem', height: 20 }}
                  />
                </Tooltip>
                <Tooltip title="Distance today">
                  <Chip
                    label={`📍 ${stat.todayDistance}${stat.distanceUnit} today`}
                    size="small"
                    sx={{ backgroundColor: '#c8e6c9', color: '#2e7d32', fontSize: '0.65rem', height: 20 }}
                  />
                </Tooltip>
              </>
            )}
          </Box>
        )}

        {/* Compliance bar */}
        {total > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Compliance rate
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: `${color}.main` }}>
                {stat.completionRate}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={stat.completionRate}
              color={color}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        )}

        {/* Heatmap */}
        {stat.history && stat.history.length > 0 && (
          <CalendarHeatmap history={stat.history} today={today} />
        )}

        {/* Expanded: missed history */}
        <Collapse in={expanded}>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
            MISSED HISTORY (last 30 days)
          </Typography>
          {recentMisses.length === 0 ? (
            <Typography variant="caption" sx={{ color: 'success.main' }}>
              🎉 No misses in the last 30 days!
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {recentMisses.map(m => (
                <Box key={m.date} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f44336', flexShrink: 0 }} />
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {m.date}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
          {stat.lastCompletedDate && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
              Last completed: <strong>{stat.lastCompletedDate}</strong>
            </Typography>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, color = 'text.primary', bgColor = 'background.paper' }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', backgroundColor: bgColor }}>
      <Typography variant="h4" sx={{ mb: 0.5 }}>{icon}</Typography>
      <Typography variant="h5" sx={{ fontWeight: 700, color, lineHeight: 1 }}>{value}</Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
    </Paper>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const RecurringHabitTracker = () => {
  const allStats = useQuery(api.recurringMissed.getAllRecurringStats) || [];
  const checkAllMissedRecurring = useMutation(api.recurringMissed.checkAllMissedRecurring);
  const [checking, setChecking] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState(null);
  const today = new Date().toISOString().split('T')[0];

  const handleForceCheck = async () => {
    setChecking(true);
    setLastCheckResult(null);
    try {
      const result = await checkAllMissedRecurring();
      setLastCheckResult(result);
      // Reset throttle so next page load also runs fresh
      localStorage.removeItem('lastMissedRecurringCheck');
    } catch (err) {
      console.error('Force check failed:', err);
    } finally {
      setChecking(false);
    }
  };

  // Summary metrics
  const summary = useMemo(() => {
    if (!allStats.length) return null;

    const totalHabits = allStats.length;
    const bestStreak = Math.max(...allStats.map(s => s.longestStreak || 0));
    const worstCompliance = allStats.length > 0 ? allStats[0] : null; // already sorted worst-first
    const missesThisWeek = allStats.reduce((sum, s) => {
      if (!s.history) return sum;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const weekStart = sevenDaysAgo.toISOString().split('T')[0];
      return sum + s.history.filter(h => h.status === 'missed' && h.date >= weekStart).length;
    }, 0);

    return { totalHabits, bestStreak, worstCompliance, missesThisWeek };
  }, [allStats]);

  if (allStats.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <LoopIcon /> Habit Tracker
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          No recurring habits found. Create a recurring task in the Dashboard tab to start tracking your habits.
        </Alert>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          To create a recurring habit:
        </Typography>
        <Box component="ol" sx={{ color: 'text.secondary', mt: 1 }}>
          <li>Go to the <strong>Dashboard</strong> tab</li>
          <li>Add a new todo item</li>
          <li>Click the ⋮ menu on the item → <strong>🔄 Recurring</strong></li>
          <li>Set your recurrence pattern (daily, weekly, etc.)</li>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
          <LoopIcon color="primary" /> Habit Tracker
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={checking ? <CircularProgress size={14} /> : <RefreshIcon />}
          onClick={handleForceCheck}
          disabled={checking}
        >
          {checking ? 'Checking…' : 'Check for Misses'}
        </Button>
      </Box>

      {/* Last check result */}
      {lastCheckResult && (
        <Alert
          severity={lastCheckResult.totalNewMisses > 0 ? 'warning' : 'success'}
          sx={{ mb: 2 }}
          onClose={() => setLastCheckResult(null)}
        >
          {lastCheckResult.totalNewMisses > 0
            ? `Found ${lastCheckResult.totalNewMisses} new missed occurrence(s) across ${lastCheckResult.processed} habit(s). Stats updated.`
            : `All habits are up to date — no new misses found.`}
        </Alert>
      )}

      {/* Summary cards */}
      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <SummaryCard
              icon="🔄"
              label="Active Habits"
              value={summary.totalHabits}
              color="primary.main"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <SummaryCard
              icon="🏆"
              label="Best Streak Ever"
              value={summary.bestStreak}
              color="success.main"
              bgColor="#f1f8e9"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <SummaryCard
              icon="❌"
              label="Misses This Week"
              value={summary.missesThisWeek}
              color={summary.missesThisWeek > 0 ? 'error.main' : 'success.main'}
              bgColor={summary.missesThisWeek > 0 ? '#fff8f8' : '#f1f8e9'}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <SummaryCard
              icon={summary.worstCompliance?.completionRate < 50 ? '⚠️' : '📊'}
              label="Lowest Compliance"
              value={summary.worstCompliance ? `${summary.worstCompliance.completionRate}%` : 'N/A'}
              color={
                summary.worstCompliance
                  ? `${complianceColor(summary.worstCompliance.completionRate)}.main`
                  : 'text.secondary'
              }
            />
          </Grid>
        </Grid>
      )}

      {/* Needs attention alert */}
      {allStats.some(s => s.completionRate < 50 && (s.totalCompleted + s.totalMissed) >= 3) && (
        <Alert
          severity="warning"
          icon={<WarningIcon />}
          sx={{ mb: 2 }}
        >
          <strong>Needs attention:</strong> Some habits have a compliance rate below 50%. Check the cards below.
        </Alert>
      )}

      {/* Habit cards — sorted worst compliance first (from query) */}
      <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        All Habits · Sorted by compliance (worst first)
      </Typography>

      {allStats.map((stat) => (
        <HabitCard key={stat.recurringRootId} stat={stat} today={today} />
      ))}
    </Box>
  );
};

export default RecurringHabitTracker;
