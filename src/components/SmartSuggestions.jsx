import React, { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  LinearProgress,
} from '@mui/material';
import { Psychology as PsychologyIcon, TrendingUp as TrendingUpIcon } from '@mui/icons-material';

const SmartSuggestions = ({ onSelectTask, timeAvailable = null }) => {
  const todos = useQuery(api.todos.get) || [];

  const scoredTasks = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();

    return todos
      .filter((t) => !t.done)
      .map((todo) => {
        let score = 0;

        // Priority weight (0-30 points)
        if (todo.priority === 'high') score += 30;
        else if (todo.priority === 'medium') score += 20;
        else score += 10;

        // Deadline urgency (0-25 points)
        if (todo.deadline) {
          const dueDate = new Date(todo.deadline);
          const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
          if (daysUntilDue <= 0) score += 25; // Overdue
          else if (daysUntilDue === 1) score += 20; // Due tomorrow
          else if (daysUntilDue <= 3) score += 15;
          else if (daysUntilDue <= 7) score += 10;
          else score += 5;
        }

        // Effort match with time available (0-20 points)
        if (timeAvailable) {
          if (timeAvailable <= 15 && todo.effortLevel === 'low') score += 20;
          else if (timeAvailable <= 60 && todo.effortLevel === 'medium') score += 20;
          else if (timeAvailable > 60 && todo.effortLevel === 'deep_work') score += 20;
          else if (todo.estimatedMinutes && todo.estimatedMinutes <= timeAvailable) score += 15;
        }

        // Time of day optimization (0-15 points)
        if (todo.effortLevel === 'deep_work' && currentHour >= 6 && currentHour <= 12) {
          score += 15; // Morning is best for deep work
        } else if (todo.effortLevel === 'low' && currentHour >= 14 && currentHour <= 17) {
          score += 10; // Afternoon for quick tasks
        }

        // Streak protection (0-10 points)
        if (todo.isRecurring && todo.currentStreak) {
          if (todo.currentStreak >= 7) score += 10;
          else if (todo.currentStreak >= 3) score += 5;
        }

        // Difficulty consideration (0-10 points)
        if (todo.difficulty === 'easy') score += 5;
        else if (todo.difficulty === 'medium') score += 7;
        else if (todo.difficulty === 'hard') score += 10;

        return { ...todo, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [todos, timeAvailable]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#d32f2f';
      case 'medium':
        return '#f57c00';
      case 'low':
        return '#388e3c';
      default:
        return '#757575';
    }
  };

  const getReasonings = (task) => {
    const reasons = [];
    if (task.priority === 'high') reasons.push('🔴 High Priority');
    if (task.deadline) {
      const daysUntilDue = Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 0) reasons.push('⚠️ Overdue');
      else if (daysUntilDue === 1) reasons.push('📅 Due Tomorrow');
    }
    if (task.isRecurring && task.currentStreak) reasons.push(`🔥 ${task.currentStreak} day streak`);
    if (task.effortLevel === 'deep_work') reasons.push('⚡⚡⚡ Deep Work');
    return reasons;
  };

  if (scoredTasks.length === 0) {
    return (
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary">No active tasks to suggest</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <PsychologyIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          🎯 Smart Suggestions
        </Typography>
      </Box>

      {scoredTasks.map((task, index) => {
        const reasons = getReasonings(task);
        const maxScore = 100;
        const scorePercent = (task.score / maxScore) * 100;

        return (
          <Card key={task._id} sx={{ position: 'relative', overflow: 'visible' }}>
            <Box
              sx={{
                position: 'absolute',
                top: -12,
                left: 16,
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              {index + 1}
            </Box>

            <CardContent sx={{ pt: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, pr: 2 }}>
                {task.text}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                {task.priority && (
                  <Chip
                    label={task.priority}
                    size="small"
                    sx={{
                      bgcolor: getPriorityColor(task.priority),
                      color: 'white',
                      fontWeight: 600,
                    }}
                  />
                )}
                {task.estimatedMinutes && (
                  <Chip label={`${task.estimatedMinutes}m`} size="small" variant="outlined" />
                )}
                {task.effortLevel && (
                  <Chip
                    label={
                      task.effortLevel === 'deep_work'
                        ? '⚡⚡⚡ Deep'
                        : task.effortLevel === 'medium'
                          ? '⚡⚡ Med'
                          : '⚡ Low'
                    }
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>

              {/* Reasoning */}
              {reasons.length > 0 && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Why this task:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {reasons.map((reason, i) => (
                      <Chip key={i} label={reason} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Score Bar */}
              <Box sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Match Score
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {Math.round(scorePercent)}%
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={scorePercent} />
              </Box>

              <Button
                variant="contained"
                fullWidth
                onClick={() => onSelectTask(task)}
                startIcon={<TrendingUpIcon />}
              >
                Start This Task
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};

export default SmartSuggestions;
