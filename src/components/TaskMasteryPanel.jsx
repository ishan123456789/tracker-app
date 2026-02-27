import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  LinearProgress,
  List,
  ListItem,
  Avatar,
  Tooltip,
  Button,
  Collapse,
  Divider,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  EmojiEvents,
  WorkspacePremium,
  MilitaryTech,
  ExpandMore,
  ExpandLess,
  Category,
} from '@mui/icons-material';
import { MetricsCalculator } from '../utils/MetricsCalculator';

// ─── Rank badge ───────────────────────────────────────────────────────────────
const RankBadge = ({ rank }) => {
  if (rank === 1) return (
    <Tooltip title="Top performer">
      <Avatar sx={{ width: 28, height: 28, bgcolor: '#FFD700', color: '#000', fontSize: 14 }}>
        <EmojiEvents sx={{ fontSize: 16 }} />
      </Avatar>
    </Tooltip>
  );
  if (rank === 2) return (
    <Tooltip title="2nd best">
      <Avatar sx={{ width: 28, height: 28, bgcolor: '#C0C0C0', color: '#000', fontSize: 14 }}>
        <WorkspacePremium sx={{ fontSize: 16 }} />
      </Avatar>
    </Tooltip>
  );
  if (rank === 3) return (
    <Tooltip title="3rd best">
      <Avatar sx={{ width: 28, height: 28, bgcolor: '#CD7F32', color: '#fff', fontSize: 14 }}>
        <MilitaryTech sx={{ fontSize: 16 }} />
      </Avatar>
    </Tooltip>
  );
  return (
    <Avatar sx={{ width: 28, height: 28, bgcolor: 'grey.200', color: 'text.secondary', fontSize: 12, fontWeight: 700 }}>
      {rank}
    </Avatar>
  );
};

// ─── Trend icon ───────────────────────────────────────────────────────────────
const TrendIcon = ({ trend }) => {
  if (trend === 'improving') return <TrendingUp sx={{ fontSize: 18, color: 'success.main' }} />;
  if (trend === 'declining') return <TrendingDown sx={{ fontSize: 18, color: 'error.main' }} />;
  return <TrendingFlat sx={{ fontSize: 18, color: 'text.disabled' }} />;
};

// ─── Mastery color for LinearProgress ────────────────────────────────────────
const masteryProgressColor = (label) => {
  switch (label) {
    case 'Expert':     return 'success';
    case 'Proficient': return 'primary';
    case 'Developing': return 'warning';
    default:           return 'error';
  }
};

// ─── Single mastery row ───────────────────────────────────────────────────────
const MasteryRow = ({ item, rank }) => {
  const label = MetricsCalculator.getMasteryLabel(item.masteryScore);
  const color = MetricsCalculator.getMasteryColor(label);
  const progressColor = masteryProgressColor(label);

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
      {/* Rank badge */}
      <Box sx={{ pt: 0.25, flexShrink: 0 }}>
        <RankBadge rank={rank} />
      </Box>

      {/* Main content */}
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
          <Tooltip title={`Trend: ${item.trend}`}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendIcon trend={item.trend} />
            </Box>
          </Tooltip>
        </Box>

        {/* Progress bar */}
        <Tooltip title={`Mastery score: ${item.masteryScore}/100`}>
          <LinearProgress
            variant="determinate"
            value={item.masteryScore}
            color={progressColor}
            sx={{ height: 6, borderRadius: 3, mb: 0.75 }}
          />
        </Tooltip>

        {/* Stats row */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary">
            ✅ {item.completed}/{item.total} tasks
          </Typography>
          <Typography variant="caption" color="text.secondary">
            📊 {item.completionRate}% done
          </Typography>
          <Typography variant="caption" color="text.secondary">
            🗓 {item.activeDays} active days
          </Typography>
          {item.avgTimeMinutes > 0 && (
            <Typography variant="caption" color="text.secondary">
              ⏱ {MetricsCalculator.formatTime(item.avgTimeMinutes)} avg
            </Typography>
          )}
        </Box>
      </Box>

      {/* Score badge */}
      <Box sx={{ flexShrink: 0, textAlign: 'center', pt: 0.25 }}>
        <Typography
          variant="h6"
          fontWeight={800}
          color={`${color}.main`}
          sx={{ lineHeight: 1 }}
        >
          {item.masteryScore}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
          /100
        </Typography>
      </Box>
    </ListItem>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const TaskMasteryPanel = ({ masteryStats, loading }) => {
  const [showAll, setShowAll] = useState(false);
  const DEFAULT_VISIBLE = 5;

  if (loading) {
    return (
      <Paper sx={{ p: 3, height: '100%' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmojiEvents color="warning" />
          Task Mastery
        </Typography>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} variant="rectangular" height={72} sx={{ mb: 1, borderRadius: 1 }} />
        ))}
      </Paper>
    );
  }

  if (!masteryStats || masteryStats.length === 0) {
    return (
      <Paper sx={{ p: 3, height: '100%' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmojiEvents color="warning" />
          Task Mastery
        </Typography>
        <Alert severity="info" sx={{ mt: 1 }}>
          Complete tasks across different categories to see your mastery rankings!
        </Alert>
      </Paper>
    );
  }

  const visible = showAll ? masteryStats : masteryStats.slice(0, DEFAULT_VISIBLE);
  const hasMore = masteryStats.length > DEFAULT_VISIBLE;

  // Summary chips
  const expertCount     = masteryStats.filter(s => MetricsCalculator.getMasteryLabel(s.masteryScore) === 'Expert').length;
  const strugglingCount = masteryStats.filter(s => MetricsCalculator.getMasteryLabel(s.masteryScore) === 'Struggling').length;

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmojiEvents color="warning" />
          Task Mastery
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          {expertCount > 0 && (
            <Chip label={`${expertCount} Expert`} color="success" size="small" variant="outlined" />
          )}
          {strugglingCount > 0 && (
            <Chip label={`${strugglingCount} Struggling`} color="error" size="small" variant="outlined" />
          )}
        </Box>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
        <Category sx={{ fontSize: 14 }} />
        Ranked by mastery score = completion rate + consistency + high-priority focus
      </Typography>

      <Divider sx={{ mb: 1 }} />

      {/* List */}
      <List disablePadding>
        {visible.map((item, idx) => (
          <MasteryRow key={item.category} item={item} rank={idx + 1} />
        ))}
      </List>

      {/* Show more / less */}
      {hasMore && (
        <Button
          size="small"
          onClick={() => setShowAll(prev => !prev)}
          endIcon={showAll ? <ExpandLess /> : <ExpandMore />}
          sx={{ mt: 1, textTransform: 'none' }}
          fullWidth
          variant="text"
          color="inherit"
        >
          {showAll
            ? 'Show less'
            : `Show ${masteryStats.length - DEFAULT_VISIBLE} more categories`}
        </Button>
      )}
    </Paper>
  );
};

export default TaskMasteryPanel;
