import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tabs,
  Tab,
  Alert,
  Skeleton,
  Divider,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  AccessTime,
  FiberNew,
  DoNotDisturb,
  ErrorOutline,
  WarningAmber,
  HourglassEmpty,
  Repeat,
} from '@mui/icons-material';

// ─── Priority chip ────────────────────────────────────────────────────────────
const PriorityChip = ({ priority }) => {
  const map = {
    high:   { color: 'error',   label: 'High' },
    medium: { color: 'warning', label: 'Med' },
    low:    { color: 'info',    label: 'Low' },
    none:   { color: 'default', label: 'None' },
  };
  const { color, label } = map[priority] || map.none;
  return (
    <Chip
      label={label}
      color={color}
      size="small"
      variant="outlined"
      sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
    />
  );
};

// ─── Overdue tab content ──────────────────────────────────────────────────────
const OverdueList = ({ tasks }) => {
  if (tasks.length === 0) {
    return (
      <Alert severity="success" sx={{ mt: 1 }}>
        No overdue tasks — you're all caught up! 🎉
      </Alert>
    );
  }

  return (
    <List disablePadding>
      {tasks.map((task, idx) => (
        <ListItem
          key={String(task.id)}
          disableGutters
          sx={{
            py: 1,
            px: 0,
            alignItems: 'flex-start',
            gap: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            '&:last-child': { borderBottom: 'none' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 32, pt: 0.25 }}>
            <Tooltip title={`${task.daysOverdue} day${task.daysOverdue > 1 ? 's' : ''} overdue`}>
              <ErrorOutline
                color={task.daysOverdue >= 7 ? 'error' : 'warning'}
                sx={{ fontSize: 20 }}
              />
            </Tooltip>
          </ListItemIcon>

          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 100 }}>
                  {task.text}
                </Typography>
                <PriorityChip priority={task.priority} />
              </Box>
            }
            secondary={
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 0.25 }}>
                <Typography variant="caption" color="error.main" fontWeight={600}>
                  ⏰ {task.daysOverdue}d overdue
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  📅 due {task.deadline}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  🏷 {task.category}
                </Typography>
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  );
};

// ─── Never started tab content ────────────────────────────────────────────────
const NeverStartedList = ({ tasks }) => {
  if (tasks.length === 0) {
    return (
      <Alert severity="success" sx={{ mt: 1 }}>
        All your tasks have been started — great momentum! 🚀
      </Alert>
    );
  }

  return (
    <List disablePadding>
      {tasks.map((task) => (
        <ListItem
          key={String(task.id)}
          disableGutters
          sx={{
            py: 1,
            px: 0,
            alignItems: 'flex-start',
            gap: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            '&:last-child': { borderBottom: 'none' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 32, pt: 0.25 }}>
            <Tooltip title="Never started">
              <HourglassEmpty
                color={task.createdDaysAgo >= 14 ? 'error' : 'warning'}
                sx={{ fontSize: 20 }}
              />
            </Tooltip>
          </ListItemIcon>

          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 100 }}>
                  {task.text}
                </Typography>
                <PriorityChip priority={task.priority} />
              </Box>
            }
            secondary={
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 0.25 }}>
                <Typography
                  variant="caption"
                  color={task.createdDaysAgo >= 14 ? 'error.main' : 'warning.main'}
                  fontWeight={600}
                >
                  🕐 created {task.createdDaysAgo}d ago
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  🏷 {task.category}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ⏱ no time logged
                </Typography>
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  );
};

// ─── Skipped recurring tab content ────────────────────────────────────────────
const SkippedRecurringList = ({ tasks }) => {
  if (tasks.length === 0) {
    return (
      <Alert severity="success" sx={{ mt: 1 }}>
        All recurring tasks are up to date — great consistency! 🔄
      </Alert>
    );
  }

  const patternLabel = (pattern, interval) => {
    if (pattern === 'daily')   return interval > 1 ? `Every ${interval} days` : 'Daily';
    if (pattern === 'weekly')  return interval > 1 ? `Every ${interval} weeks` : 'Weekly';
    if (pattern === 'monthly') return interval > 1 ? `Every ${interval} months` : 'Monthly';
    return 'Custom';
  };

  return (
    <List disablePadding>
      {tasks.map((task) => (
        <ListItem
          key={String(task.id)}
          disableGutters
          sx={{
            py: 1,
            px: 0,
            alignItems: 'flex-start',
            gap: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            '&:last-child': { borderBottom: 'none' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 32, pt: 0.25 }}>
            <Tooltip title="Recurring task skipped">
              <DoNotDisturb
                color={task.daysSinceLastCompletion === null || task.daysSinceLastCompletion >= 14 ? 'error' : 'warning'}
                sx={{ fontSize: 20 }}
              />
            </Tooltip>
          </ListItemIcon>

          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 100 }}>
                  {task.text}
                </Typography>
                <PriorityChip priority={task.priority} />
                <Chip
                  icon={<Repeat sx={{ fontSize: 12 }} />}
                  label={patternLabel(task.recurringPattern, task.recurringInterval)}
                  size="small"
                  variant="outlined"
                  color="secondary"
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
              </Box>
            }
            secondary={
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 0.25 }}>
                {task.daysSinceLastCompletion !== null ? (
                  <Typography
                    variant="caption"
                    color={task.daysSinceLastCompletion >= 14 ? 'error.main' : 'warning.main'}
                    fontWeight={600}
                  >
                    🕐 last done {task.daysSinceLastCompletion}d ago
                  </Typography>
                ) : (
                  <Typography variant="caption" color="error.main" fontWeight={600}>
                    🚫 never completed
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  🏷 {task.category}
                </Typography>
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  );
};

// ─── Summary bar ──────────────────────────────────────────────────────────────
const SummaryBar = ({ summary }) => {
  if (!summary || summary.totalMissed === 0) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        flexWrap: 'wrap',
        p: 1.5,
        bgcolor: summary.criticalMissed > 0 ? 'error.50' : 'warning.50',
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: summary.criticalMissed > 0 ? 'error.light' : 'warning.light',
        mb: 2,
      }}
    >
      <Typography variant="caption" fontWeight={700} color="text.primary">
        {summary.totalMissed} total missed:
      </Typography>
      {summary.overdueCount > 0 && (
        <Typography variant="caption" color="error.main" fontWeight={600}>
          ⏰ {summary.overdueCount} overdue
        </Typography>
      )}
      {summary.neverStartedCount > 0 && (
        <Typography variant="caption" color="warning.main" fontWeight={600}>
          🕐 {summary.neverStartedCount} never started
        </Typography>
      )}
      {summary.recurringMissed > 0 && (
        <Typography variant="caption" color="secondary.main" fontWeight={600}>
          🔄 {summary.recurringMissed} recurring skipped
        </Typography>
      )}
      {summary.criticalMissed > 0 && (
        <Chip
          label={`${summary.criticalMissed} critical!`}
          color="error"
          size="small"
          variant="filled"
          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
        />
      )}
    </Box>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const MissedTasksPanel = ({ missedData, loading }) => {
  const [activeTab, setActiveTab] = useState(0);

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccessTime color="error" />
          Missed &amp; Overdue Tasks
        </Typography>
        <Skeleton variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 1 }} />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} variant="rectangular" height={56} sx={{ mb: 1, borderRadius: 1 }} />
        ))}
      </Paper>
    );
  }

  if (!missedData) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccessTime color="error" />
          Missed &amp; Overdue Tasks
        </Typography>
        <Alert severity="info">Loading missed tasks analysis...</Alert>
      </Paper>
    );
  }

  const { overdueTasks, neverStartedTasks, skippedRecurring, summary } = missedData;
  const totalMissed = summary?.totalMissed ?? 0;

  // If nothing is missed, show a positive state
  if (totalMissed === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccessTime color="success" />
          Missed &amp; Overdue Tasks
        </Typography>
        <Alert severity="success" icon={<AccessTime />}>
          🎉 Nothing missed! You're completely on top of your tasks. Keep it up!
        </Alert>
      </Paper>
    );
  }

  const tabs = [
    {
      label: 'Overdue',
      icon: <ErrorOutline sx={{ fontSize: 16 }} />,
      count: overdueTasks.length,
      color: overdueTasks.length > 0 ? 'error' : 'default',
    },
    {
      label: 'Never Started',
      icon: <HourglassEmpty sx={{ fontSize: 16 }} />,
      count: neverStartedTasks.length,
      color: neverStartedTasks.length > 0 ? 'warning' : 'default',
    },
    {
      label: 'Recurring Skipped',
      icon: <DoNotDisturb sx={{ fontSize: 16 }} />,
      count: skippedRecurring.length,
      color: skippedRecurring.length > 0 ? 'secondary' : 'default',
    },
  ];

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccessTime color="error" />
          Missed &amp; Overdue Tasks
        </Typography>
        <Chip
          label={`${totalMissed} total`}
          color={summary?.criticalMissed > 0 ? 'error' : 'warning'}
          variant="filled"
          size="small"
          sx={{ fontWeight: 700 }}
        />
      </Box>

      {/* Summary bar */}
      <SummaryBar summary={summary} />

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
        variant="fullWidth"
      >
        {tabs.map((tab, idx) => (
          <Tab
            key={tab.label}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <Badge
                    badgeContent={tab.count}
                    color={tab.color}
                    sx={{ ml: 0.5 }}
                  />
                )}
              </Box>
            }
            sx={{ textTransform: 'none', minHeight: 44, fontSize: '0.8rem' }}
          />
        ))}
      </Tabs>

      {/* Tab content */}
      {activeTab === 0 && <OverdueList tasks={overdueTasks} />}
      {activeTab === 1 && <NeverStartedList tasks={neverStartedTasks} />}
      {activeTab === 2 && <SkippedRecurringList tasks={skippedRecurring} />}
    </Paper>
  );
};

export default MissedTasksPanel;
