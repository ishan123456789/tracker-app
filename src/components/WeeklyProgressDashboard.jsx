import React, { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

const WeeklyProgressDashboard = () => {
  const todos = useQuery(api.todos.get) || [];
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  const weekData = useMemo(() => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - today.getDay() + 1);

    const dailyData = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayTodos = todos.filter((t) => {
        if (!t.completedAt) return false;
        const completedDate = new Date(t.completedAt).toISOString().split('T')[0];
        return completedDate === dateStr;
      });

      dailyData.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        completed: dayTodos.filter((t) => t.done).length,
        total: dayTodos.length,
        deepWork: dayTodos.filter((t) => t.effortLevel === 'deep_work').length,
      });
    }

    return dailyData;
  }, [todos]);

  const categoryData = useMemo(() => {
    const categories = {};
    todos
      .filter((t) => t.done)
      .forEach((todo) => {
        const cat = todo.mainCategory || todo.category || 'Other';
        categories[cat] = (categories[cat] || 0) + 1;
      });

    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [todos]);

  const habitStreaks = useMemo(() => {
    return todos
      .filter((t) => t.isRecurring && t.currentStreak)
      .sort((a, b) => (b.currentStreak || 0) - (a.currentStreak || 0))
      .slice(0, 5)
      .map((t) => ({
        name: t.text.substring(0, 20),
        streak: t.currentStreak || 0,
        longest: t.longestStreak || 0,
      }));
  }, [todos]);

  const stats = useMemo(() => {
    const completed = todos.filter((t) => t.done).length;
    const deepWorkTodos = todos.filter((t) => t.done && t.effortLevel === 'deep_work');
    const deepWorkHours = deepWorkTodos.reduce((sum, t) => sum + (t.actualMinutes || 0), 0) / 60;
    const habitsActive = todos.filter((t) => t.isRecurring && t.currentStreak && t.currentStreak > 0).length;

    return {
      completed,
      deepWorkHours: Math.round(deepWorkHours * 10) / 10,
      habitsActive,
    };
  }, [todos]);

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe'];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Summary Stats */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="text.secondary" variant="caption">
                This Week
              </Typography>
              <Typography variant="h4" color="primary" sx={{ fontWeight: 700, my: 1 }}>
                {stats.completed}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tasks Completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="text.secondary" variant="caption">
                Deep Work
              </Typography>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 700, my: 1 }}>
                {stats.deepWorkHours}h
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Focus Hours
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="text.secondary" variant="caption">
                Habits
              </Typography>
              <Typography variant="h4" color="warning.main" sx={{ fontWeight: 700, my: 1 }}>
                {stats.habitsActive}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Active Streaks
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="text.secondary" variant="caption">
                Completion
              </Typography>
              <Typography variant="h4" color="info.main" sx={{ fontWeight: 700, my: 1 }}>
                {todos.length > 0 ? Math.round((stats.completed / todos.length) * 100) : 0}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Overall Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={2}>
        {/* Daily Completion Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              📊 Daily Completion
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#667eea" name="Completed" />
                <Bar dataKey="deepWork" fill="#764ba2" name="Deep Work" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Category Breakdown */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              📂 Category Breakdown
            </Typography>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary" variant="body2" sx={{ textAlign: 'center', py: 4 }}>
                No completed tasks yet
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Habit Streaks Leaderboard */}
      {habitStreaks.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            🔥 Top Habit Streaks
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {habitStreaks.map((habit, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1.5,
                  bgcolor: '#f5f5f5',
                  borderRadius: 1,
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {index + 1}. {habit.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Best: {habit.longest} days
                  </Typography>
                </Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: habit.streak >= 7 ? '#4caf50' : habit.streak >= 3 ? '#ff9800' : '#f44336',
                  }}
                >
                  🔥 {habit.streak}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default WeeklyProgressDashboard;
