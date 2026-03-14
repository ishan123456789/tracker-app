import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';

const WeeklyReview = () => {
  const todos = useQuery(api.todos.get) || [];
  const [weekStartDate, setWeekStartDate] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff)).toISOString().split('T')[0];
  });
  const [showReflectionDialog, setShowReflectionDialog] = useState(false);
  const [reflection, setReflection] = useState('');

  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  const getWeekRange = (startDate) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  };

  const { start, end } = getWeekRange(weekStartDate);

  const weekTodos = useMemo(() => {
    return todos.filter((todo) => {
      if (!todo.completedAt && !todo.deadline) return false;
      const completedDate = todo.completedAt ? new Date(todo.completedAt) : null;
      const dueDate = todo.deadline ? new Date(todo.deadline) : null;
      const checkDate = completedDate || dueDate;
      return checkDate >= start && checkDate <= end;
    });
  }, [todos, start, end]);

  const completed = weekTodos.filter((t) => t.done).length;
  const missed = weekTodos.filter((t) => !t.done && t.deadline && new Date(t.deadline) < new Date()).length;
  const focusScore = weekTodos.length > 0 ? Math.round((completed / weekTodos.length) * 100) : 0;

  const categoryBreakdown = useMemo(() => {
    const breakdown = {};
    weekTodos.filter((t) => t.done).forEach((todo) => {
      const cat = todo.mainCategory || todo.category || 'Uncategorized';
      breakdown[cat] = (breakdown[cat] || 0) + 1;
    });
    return Object.entries(breakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [weekTodos]);

  const timeSpent = weekTodos.reduce((sum, t) => sum + (t.actualMinutes || 0), 0);
  const hours = Math.floor(timeSpent / 60);
  const minutes = timeSpent % 60;

  const handlePrevWeek = () => {
    const prev = new Date(weekStartDate);
    prev.setDate(prev.getDate() - 7);
    setWeekStartDate(prev.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const next = new Date(weekStartDate);
    next.setDate(next.getDate() + 7);
    setWeekStartDate(next.toISOString().split('T')[0]);
  };

  const weekLabel = `${start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <Box sx={{ p: isMobile ? 1.5 : 3 }}>
      {/* Week Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button startIcon={<NavigateBeforeIcon />} onClick={handlePrevWeek}>
          Previous
        </Button>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          📊 Weekly Review — {weekLabel}
        </Typography>
        <Button endIcon={<NavigateNextIcon />} onClick={handleNextWeek}>
          Next
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="text.secondary" variant="caption">
                Tasks Completed
              </Typography>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 700, my: 1 }}>
                {completed}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                of {weekTodos.length} total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="text.secondary" variant="caption">
                Tasks Missed
              </Typography>
              <Typography variant="h4" color="error.main" sx={{ fontWeight: 700, my: 1 }}>
                {missed}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Overdue tasks
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="text.secondary" variant="caption">
                Focus Score
              </Typography>
              <Typography variant="h4" color="primary" sx={{ fontWeight: 700, my: 1 }}>
                {focusScore}%
              </Typography>
              <LinearProgress variant="determinate" value={focusScore} sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="text.secondary" variant="caption">
                Time Tracked
              </Typography>
              <Typography variant="h4" color="info.main" sx={{ fontWeight: 700, my: 1 }}>
                {hours}h {minutes}m
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total tracked
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Category Breakdown */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              📂 Top Categories
            </Typography>
            <List>
              {categoryBreakdown.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  No completed tasks this week
                </Typography>
              ) : (
                categoryBreakdown.map(([category, count]) => (
                  <ListItem key={category} disablePadding sx={{ mb: 1 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Typography variant="h6">📌</Typography>
                    </ListItemIcon>
                    <ListItemText
                      primary={category}
                      secondary={`${count} task${count !== 1 ? 's' : ''}`}
                    />
                    <Chip label={count} color="primary" size="small" />
                  </ListItem>
                ))
              )}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              🎯 Achievements
            </Typography>
            <List>
              {completed > 0 && (
                <ListItem disablePadding sx={{ mb: 1 }}>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Great Progress!"
                    secondary={`Completed ${completed} task${completed !== 1 ? 's' : ''}`}
                  />
                </ListItem>
              )}
              {focusScore >= 80 && (
                <ListItem disablePadding sx={{ mb: 1 }}>
                  <ListItemIcon>
                    <TrendingUpIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Excellent Focus"
                    secondary={`${focusScore}% completion rate`}
                  />
                </ListItem>
              )}
              {missed > 0 && (
                <ListItem disablePadding sx={{ mb: 1 }}>
                  <ListItemIcon>
                    <CancelIcon color="error" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Areas to Improve"
                    secondary={`${missed} missed task${missed !== 1 ? 's' : ''}`}
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Reflection */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            💭 Weekly Reflection
          </Typography>
          <Button variant="outlined" size="small" onClick={() => setShowReflectionDialog(true)}>
            Add Note
          </Button>
        </Box>
        {reflection ? (
          <Typography variant="body2" sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            {reflection}
          </Typography>
        ) : (
          <Typography color="text.secondary" variant="body2">
            No reflection added yet. Click "Add Note" to reflect on this week.
          </Typography>
        )}
      </Paper>

      {/* Reflection Dialog */}
      <Dialog open={showReflectionDialog} onClose={() => setShowReflectionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Weekly Reflection</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={4}
            fullWidth
            placeholder="What went well? What could improve? Any insights?"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReflectionDialog(false)}>Cancel</Button>
          <Button onClick={() => setShowReflectionDialog(false)} variant="contained">
            Save Reflection
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WeeklyReview;
