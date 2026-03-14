import React, { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Grid,
} from '@mui/material';

const DailyTimeline = ({ date = null }) => {
  const todos = useQuery(api.todos.get) || [];
  const selectedDate = date || new Date().toISOString().split('T')[0];
  const timeBlocks = useQuery(api.todos.getTimeBlocksForDate, { date: selectedDate }) || [];


  const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to 11 PM

  const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const getBlockPosition = (startTime) => {
    const minutes = timeToMinutes(startTime);
    const startMinutes = 6 * 60; // 6 AM
    return ((minutes - startMinutes) / (18 * 60)) * 100;
  };

  const getBlockHeight = (startTime, endTime) => {
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    const duration = endMin - startMin;
    return (duration / (18 * 60)) * 100;
  };

  const unscheduledTodos = useMemo(
    () => todos.filter(t => !t.done && !t.scheduledStart),
    [todos]
  );

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

  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      {/* Timeline */}
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2, position: 'relative', minHeight: 600 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            📅 Daily Timeline — {new Date(selectedDate).toLocaleDateString()}
          </Typography>

          <Box sx={{ position: 'relative', height: 500, bgcolor: '#f5f5f5', borderRadius: 1, p: 1 }}>
            {/* Hour markers */}
            {hours.map((hour) => (
              <Box
                key={hour}
                sx={{
                  position: 'absolute',
                  top: `${((hour - 6) / 18) * 100}%`,
                  left: 0,
                  right: 0,
                  height: 1,
                  bgcolor: '#e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    position: 'absolute',
                    left: -40,
                    fontWeight: 500,
                    color: 'text.secondary',
                  }}
                >
                  {hour}:00
                </Typography>
              </Box>
            ))}

            {/* Time blocks */}
            {timeBlocks.map((block) => {
              const top = getBlockPosition(block.scheduledStart);
              const height = getBlockHeight(block.scheduledStart, block.scheduledEnd);
              return (
                <Box
                  key={block._id}
                  sx={{
                    position: 'absolute',
                    top: `${top}%`,
                    height: `${height}%`,
                    left: '50px',
                    right: '10px',
                    bgcolor: getPriorityColor(block.priority),
                    color: 'white',
                    borderRadius: 1,
                    p: 1,
                    overflow: 'hidden',
                    boxShadow: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: 4,
                      transform: 'scale(1.02)',
                    },
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                    {block.scheduledStart} - {block.scheduledEnd}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      mt: 0.5,
                    }}
                  >
                    {block.text}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Paper>
      </Grid>

      {/* Unscheduled Tasks */}
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            📋 Unscheduled ({unscheduledTodos.length})
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 500, overflowY: 'auto' }}>
            {unscheduledTodos.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                All tasks scheduled! 🎉
              </Typography>
            ) : (
              unscheduledTodos.map((todo) => (
                <Card key={todo._id} variant="outlined" sx={{ p: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                    {todo.text}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {todo.priority && (
                      <Chip
                        label={todo.priority}
                        size="small"
                        sx={{
                          bgcolor: getPriorityColor(todo.priority),
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.65rem',
                        }}
                      />
                    )}
                    {todo.estimatedMinutes && (
                      <Chip
                        label={`${todo.estimatedMinutes}m`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Card>
              ))
            )}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default DailyTimeline;
