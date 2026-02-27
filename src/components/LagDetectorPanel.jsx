import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  List,
  ListItem,
  Badge,
  Card,
  CardContent,
  Grid,
  Tooltip,
  Divider,
  Alert,
  Skeleton,
  LinearProgress,
} from '@mui/material';
import {
  WarningAmber,
  ErrorOutline,
  CheckCircleOutline,
  InfoOutlined,
  AccessTime,
  Category,
  Flag,
} from '@mui/icons-material';
import { MetricsCalculator } from '../utils/MetricsCalculator';

// ─── Overall lag score gauge ──────────────────────────────────────────────────
const LagScoreGauge = ({ score }) => {
  const label = MetricsCalculator.getLagLabel(score);
  const color = MetricsCalculator.getLagColor(label);

  const bgColor = {
    error:   '#fff5f5',
    warning: '#fffbf0',
    info:    '#f0f7ff',
    success: '#f0fff4',
  }[color] || '#fafafa';

  const Icon = {
    error:   ErrorOutline,
    warning: WarningAmber,
    info:    InfoOutlined,
    success: CheckCircleOutline,
  }[color] || InfoOutlined;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        borderRadius: 2,
        bgcolor: bgColor,
        border: '1px solid',
        borderColor: `${color}.light`,
        mb: 2,
      }}
    >
      <Icon color={color} sx={{ fontSize: 36 }} />
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography variant="h4" fontWeight={800} color={`${color}.main`}>
            {score}
          </Typography>
          <Typography variant="body2" color="text.secondary">/100 overall lag</Typography>
          <Chip
            label={label}
            color={color}
            size="small"
            variant="filled"
            sx={{ fontWeight: 700, ml: 0.5 }}
          />
        </Box>
        <LinearProgress
          variant="determinate"
          value={score}
          color={color}
          sx={{ height: 6, borderRadius: 3, mt: 0.75 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {label === 'On Track'  && 'Great job! You\'re keeping up with your tasks.'}
          {label === 'Slight Lag' && 'A few areas need attention — review lagging categories below.'}
          {label === 'Behind'    && 'You\'re falling behind in several areas. Time to catch up!'}
          {label === 'Critical'  && '⚠️ Critical lag detected — immediate action needed on overdue tasks.'}
        </Typography>
      </Box>
    </Box>
  );
};

// ─── Priority lag cards ───────────────────────────────────────────────────────
const PriorityLagCards = ({ lagPriorities }) => {
  const priorityMeta = {
    high:   { label: 'High Priority',   color: 'error',   icon: '🔴' },
    medium: { label: 'Medium Priority', color: 'warning', icon: '🟡' },
    low:    { label: 'Low Priority',    color: 'info',    icon: '🔵' },
  };

  return (
    <Grid container spacing={1.5} sx={{ mb: 2 }}>
      {lagPriorities.map(p => {
        const meta = priorityMeta[p.priority] || { label: p.priority, color: 'default', icon: '⚪' };
        return (
          <Grid item xs={4} key={p.priority}>
            <Card
              variant="outlined"
              sx={{
                borderColor: p.overdueCount > 0 ? `${meta.color}.light` : 'divider',
                bgcolor: p.overdueCount > 0 ? `${meta.color}.50` : 'background.paper',
              }}
            >
              <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                  {meta.icon} {meta.label}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 0.5 }}>
                  <Typography variant="h6" fontWeight={800} color={`${meta.color}.main`}>
                    {p.pendingCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">pending</Typography>
                </Box>
                {p.overdueCount > 0 && (
                  <Chip
                    label={`${p.overdueCount} overdue`}
                    color={meta.color}
                    size="small"
                    variant="outlined"
                    sx={{ mt: 0.5, height: 18, fontSize: '0.65rem' }}
                  />
                )}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  {p.completionRate}% done
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

// ─── Category lag row ─────────────────────────────────────────────────────────
const CategoryLagRow = ({ item }) => {
  const label = MetricsCalculator.getLagLabel(item.lagScore);
  const color = MetricsCalculator.getLagColor(label);

  return (
    <ListItem
      disableGutters
      sx={{
        py: 1.25,
        px: 0,
        alignItems: 'flex-start',
        gap: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      {/* Lag score circle */}
      <Box
        sx={{
          flexShrink: 0,
          width: 40,
          height: 40,
          borderRadius: '50%',
          bgcolor: `${color}.100`,
          border: '2px solid',
          borderColor: `${color}.main`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <Typography variant="caption" fontWeight={800} color={`${color}.main`} sx={{ lineHeight: 1, fontSize: '0.75rem' }}>
          {item.lagScore}
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
          <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1, minWidth: 80 }}>
            {item.category}
          </Typography>
          <Chip
            label={label}
            color={color}
            size="small"
            variant="filled"
            sx={{ fontWeight: 700, fontSize: '0.68rem', height: 20 }}
          />
          {item.overdueCount > 0 && (
            <Tooltip title={`${item.overdueCount} overdue task${item.overdueCount > 1 ? 's' : ''}`}>
              <Badge badgeContent={item.overdueCount} color="error" sx={{ ml: 0.5 }}>
                <AccessTime sx={{ fontSize: 16, color: 'error.main' }} />
              </Badge>
            </Tooltip>
          )}
        </Box>

        {/* Progress bar — inverted: higher completion = less lag */}
        <Tooltip title={`${item.completionRate}% completion rate`}>
          <LinearProgress
            variant="determinate"
            value={item.completionRate}
            color={item.completionRate >= 70 ? 'success' : item.completionRate >= 40 ? 'warning' : 'error'}
            sx={{ height: 5, borderRadius: 3, mb: 0.75 }}
          />
        </Tooltip>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary">
            📋 {item.pendingCount} pending
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ✅ {item.completionRate}% done
          </Typography>
          {item.avgDaysOverdue > 0 && (
            <Typography variant="caption" color="error.main">
              ⏰ avg {item.avgDaysOverdue}d overdue
            </Typography>
          )}
          {item.daysSinceLastCompletion !== null && (
            <Typography variant="caption" color="text.secondary">
              🕐 last done {item.daysSinceLastCompletion}d ago
            </Typography>
          )}
          {item.daysSinceLastCompletion === null && (
            <Typography variant="caption" color="error.main">
              🚫 never completed
            </Typography>
          )}
        </Box>
      </Box>
    </ListItem>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const LagDetectorPanel = ({ lagData, loading }) => {
  if (loading) {
    return (
      <Paper sx={{ p: 3, height: '100%' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmber color="warning" />
          Lag Detector
        </Typography>
        <Skeleton variant="rectangular" height={80} sx={{ mb: 2, borderRadius: 1 }} />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} variant="rectangular" height={64} sx={{ mb: 1, borderRadius: 1 }} />
        ))}
      </Paper>
    );
  }

  if (!lagData) {
    return (
      <Paper sx={{ p: 3, height: '100%' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmber color="warning" />
          Lag Detector
        </Typography>
        <Alert severity="info">Loading lag analysis...</Alert>
      </Paper>
    );
  }

  const { lagCategories, lagPriorities, overallLagScore } = lagData;

  // Only show categories that are actually lagging (lagScore >= 30)
  const laggingCategories = lagCategories.filter(c => c.lagScore >= 30);
  const onTrackCategories = lagCategories.filter(c => c.lagScore < 30);

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmber color="warning" />
          Lag Detector
        </Typography>
        {onTrackCategories.length > 0 && (
          <Chip
            label={`${onTrackCategories.length} on track`}
            color="success"
            size="small"
            variant="outlined"
          />
        )}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
        <Flag sx={{ fontSize: 14 }} />
        Lag score = overdue ratio + low completion + days overdue
      </Typography>

      {/* Overall gauge */}
      <LagScoreGauge score={overallLagScore} />

      {/* Priority breakdown */}
      {lagPriorities && lagPriorities.length > 0 && (
        <>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Flag sx={{ fontSize: 14 }} /> By Priority
          </Typography>
          <PriorityLagCards lagPriorities={lagPriorities} />
        </>
      )}

      <Divider sx={{ mb: 1.5 }} />

      {/* Lagging categories */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Category sx={{ fontSize: 14 }} /> Lagging Categories
      </Typography>

      {laggingCategories.length === 0 ? (
        <Alert severity="success" icon={<CheckCircleOutline />}>
          You're on track! No significant lag detected across your categories 🎉
        </Alert>
      ) : (
        <List disablePadding>
          {laggingCategories.map(item => (
            <CategoryLagRow key={item.category} item={item} />
          ))}
        </List>
      )}
    </Paper>
  );
};

export default LagDetectorPanel;
