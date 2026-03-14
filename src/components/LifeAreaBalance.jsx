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
  LinearProgress,
  Chip,
  Alert,
} from '@mui/material';
import { TrendingUp as TrendingUpIcon, Warning as WarningIcon } from '@mui/icons-material';

const LifeAreaBalance = () => {
  const todos = useQuery(api.todos.get) || [];
  const lifeAreas = useQuery(api.lifeAreas.getActive) || [];

  const balance = useMemo(() => {
    const completedByArea = {};
    const totalByArea = {};

    // Initialize
    lifeAreas.forEach((area) => {
      completedByArea[area.name] = 0;
      totalByArea[area.name] = 0;
    });

    // Count tasks
    todos.forEach((todo) => {
      if (todo.lifeArea && lifeAreas.some((a) => a.name === todo.lifeArea)) {
        totalByArea[todo.lifeArea]++;
        if (todo.done) {
          completedByArea[todo.lifeArea]++;
        }
      }
    });

    // Calculate percentages
    const results = lifeAreas.map((area) => {
      const total = totalByArea[area.name] || 0;
      const completed = completedByArea[area.name] || 0;
      const actual = total > 0 ? (completed / total) * 100 : 0;
      const target = area.targetPercentage || 20;
      const diff = actual - target;
      const status = Math.abs(diff) <= 10 ? 'good' : diff > 10 ? 'over' : 'under';

      return {
        ...area,
        total,
        completed,
        actual: Math.round(actual),
        target,
        diff: Math.round(diff),
        status,
      };
    });

    return results;
  }, [todos, lifeAreas]);

  const overallBalance = useMemo(() => {
    if (balance.length === 0) return 0;
    const avgDiff = balance.reduce((sum, area) => sum + Math.abs(area.diff), 0) / balance.length;
    return Math.max(0, 100 - avgDiff);
  }, [balance]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'good':
        return '#4caf50';
      case 'over':
        return '#ff9800';
      case 'under':
        return '#f44336';
      default:
        return '#757575';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'good':
        return '✅ Balanced';
      case 'over':
        return '⬆️ Over Target';
      case 'under':
        return '⬇️ Under Target';
      default:
        return 'Unknown';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Overall Balance Score */}
      <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            🎯 Life Balance Score
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
            {Math.round(overallBalance)}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={overallBalance}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'rgba(255, 255, 255, 0.3)',
              '& .MuiLinearProgress-bar': {
                bgcolor: 'white',
              },
            }}
          />
          <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.9 }}>
            {overallBalance >= 80
              ? '🌟 Excellent balance!'
              : overallBalance >= 60
                ? '👍 Good balance'
                : '⚠️ Needs adjustment'}
          </Typography>
        </CardContent>
      </Card>

      {/* Life Areas Grid */}
      <Grid container spacing={2}>
        {balance.map((area) => (
          <Grid item xs={12} sm={6} md={4} key={area._id}>
            <Card
              sx={{
                height: '100%',
                borderLeft: `4px solid ${area.color}`,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Typography variant="h5">{area.icon}</Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {area.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {area.total} task{area.total !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </Box>

                {/* Actual vs Target */}
                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      Actual
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: getStatusColor(area.status) }}>
                      {area.actual}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={area.actual}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: '#e0e0e0',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: getStatusColor(area.status),
                      },
                    }}
                  />
                </Box>

                {/* Target */}
                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      Target
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {area.target}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={area.target}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: '#f0f0f0',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: '#9e9e9e',
                      },
                    }}
                  />
                </Box>

                {/* Status */}
                <Chip
                  label={getStatusLabel(area.status)}
                  size="small"
                  sx={{
                    bgcolor: getStatusColor(area.status),
                    color: 'white',
                    fontWeight: 600,
                    width: '100%',
                  }}
                />

                {/* Difference */}
                {area.diff !== 0 && (
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 1,
                      color: getStatusColor(area.status),
                      fontWeight: 600,
                    }}
                  >
                    {area.diff > 0 ? '+' : ''}{area.diff}% from target
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recommendations */}
      {balance.some((a) => a.status !== 'good') && (
        <Alert severity="info" icon={<WarningIcon />}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            💡 Recommendations:
          </Typography>
          <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
            {balance
              .filter((a) => a.status === 'under')
              .map((a) => (
                <li key={a._id}>
                  <Typography variant="body2">
                    Focus more on <strong>{a.name}</strong> ({a.actual}% vs {a.target}% target)
                  </Typography>
                </li>
              ))}
            {balance
              .filter((a) => a.status === 'over')
              .map((a) => (
                <li key={a._id}>
                  <Typography variant="body2">
                    Consider reducing <strong>{a.name}</strong> ({a.actual}% vs {a.target}% target)
                  </Typography>
                </li>
              ))}
          </ul>
        </Alert>
      )}
    </Box>
  );
};

export default LifeAreaBalance;
