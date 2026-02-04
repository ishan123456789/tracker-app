import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Chip,
  IconButton,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Fab,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Flag,
  Add,
  Edit,
  Delete,
  CheckCircle,
  Schedule,
  TrendingUp,
  Assignment,
  Category,
  Timer,
  EmojiEvents,
  Close,
  Star
} from '@mui/icons-material';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { MetricsCalculator } from '../utils/MetricsCalculator';

const GoalTracker = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    type: 'weekly',
    targetType: 'tasks_completed',
    targetValue: 10,
    targetCategory: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });

  // Fetch data
  const goals = useQuery(api.analytics.getGoals) || [];
  const todos = useQuery(api.todos.get) || [];
  const createGoal = useMutation(api.analytics.createGoal);
  const updateGoalProgress = useMutation(api.analytics.updateGoalProgress);

  // Get unique categories for goal targeting
  const categories = useMemo(() => {
    const cats = new Set(todos.map(todo => todo.category).filter(Boolean));
    return Array.from(cats);
  }, [todos]);

  // Calculate goal progress
  const goalsWithProgress = useMemo(() => {
    return goals.map(goal => {
      const progress = MetricsCalculator.calculateGoalProgress(goal, todos);
      return { ...goal, ...progress };
    });
  }, [goals, todos]);

  // Separate active and completed goals
  const activeGoals = goalsWithProgress.filter(goal => goal.isActive && !goal.isCompleted);
  const completedGoals = goalsWithProgress.filter(goal => goal.isCompleted);

  const handleOpenDialog = (goal = null) => {
    if (goal) {
      setEditingGoal(goal);
      setGoalForm({
        title: goal.title,
        description: goal.description || '',
        type: goal.type,
        targetType: goal.targetType,
        targetValue: goal.targetValue,
        targetCategory: goal.targetCategory || '',
        startDate: goal.startDate,
        endDate: goal.endDate
      });
    } else {
      setEditingGoal(null);
      const today = new Date();
      const endDate = new Date();

      // Set default end date based on goal type
      switch (goalForm.type) {
        case 'daily':
          endDate.setDate(today.getDate() + 1);
          break;
        case 'weekly':
          endDate.setDate(today.getDate() + 7);
          break;
        case 'monthly':
          endDate.setMonth(today.getMonth() + 1);
          break;
      }

      setGoalForm(prev => ({
        ...prev,
        startDate: today.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }));
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingGoal(null);
    setGoalForm({
      title: '',
      description: '',
      type: 'weekly',
      targetType: 'tasks_completed',
      targetValue: 10,
      targetCategory: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: ''
    });
  };

  const handleFormChange = (field, value) => {
    setGoalForm(prev => ({ ...prev, [field]: value }));

    // Auto-adjust end date when type changes
    if (field === 'type') {
      const startDate = new Date(goalForm.startDate);
      const endDate = new Date(startDate);

      switch (value) {
        case 'daily':
          endDate.setDate(startDate.getDate() + 1);
          break;
        case 'weekly':
          endDate.setDate(startDate.getDate() + 7);
          break;
        case 'monthly':
          endDate.setMonth(startDate.getMonth() + 1);
          break;
      }

      setGoalForm(prev => ({ ...prev, endDate: endDate.toISOString().split('T')[0] }));
    }
  };

  const handleSubmit = async () => {
    try {
      await createGoal(goalForm);
      handleCloseDialog();
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const getGoalTypeIcon = (type) => {
    switch (type) {
      case 'daily': return <Schedule />;
      case 'weekly': return <Assignment />;
      case 'monthly': return <Flag />;
      default: return <Flag />;
    }
  };

  const getTargetTypeLabel = (targetType) => {
    switch (targetType) {
      case 'tasks_completed': return 'Tasks Completed';
      case 'time_spent': return 'Time Spent (minutes)';
      case 'category_focus': return 'Category Tasks';
      default: return targetType;
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'success';
    if (percentage >= 75) return 'info';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  const formatGoalValue = (value, targetType) => {
    if (targetType === 'time_spent') {
      return MetricsCalculator.formatTime(value);
    }
    return value.toString();
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmojiEvents />
          Goal Tracker
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          New Goal
        </Button>
      </Box>

      {/* Active Goals */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp />
          Active Goals
          <Badge badgeContent={activeGoals.length} color="primary" />
        </Typography>

        {activeGoals.length > 0 ? (
          <Grid container spacing={3}>
            {activeGoals.map((goal) => (
              <Grid item xs={12} md={6} lg={4} key={goal._id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getGoalTypeIcon(goal.type)}
                        <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                          {goal.title}
                        </Typography>
                      </Box>
                      <Chip
                        label={goal.type}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>

                    {goal.description && (
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        {goal.description}
                      </Typography>
                    )}

                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">
                          {getTargetTypeLabel(goal.targetType)}
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatGoalValue(goal.currentProgress, goal.targetType)} / {formatGoalValue(goal.targetValue, goal.targetType)}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={goal.progressPercentage}
                        color={getProgressColor(goal.progressPercentage)}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                        {goal.progressPercentage}% complete
                      </Typography>
                    </Box>

                    {goal.targetCategory && (
                      <Chip
                        icon={<Category />}
                        label={goal.targetCategory}
                        size="small"
                        variant="outlined"
                        sx={{ mb: 2 }}
                      />
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="textSecondary">
                        {goal.daysRemaining > 0 ? `${goal.daysRemaining} days left` :
                         goal.isOverdue ? 'Overdue' : 'Due today'}
                      </Typography>
                      <Box>
                        <IconButton size="small" onClick={() => handleOpenDialog(goal)}>
                          <Edit />
                        </IconButton>
                        {goal.progressPercentage >= 100 && (
                          <IconButton size="small" color="success">
                            <CheckCircle />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            No active goals. Create your first goal to start tracking your progress!
          </Alert>
        )}
      </Paper>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Star />
            Completed Goals
            <Badge badgeContent={completedGoals.length} color="success" />
          </Typography>

          <List>
            {completedGoals.slice(0, 5).map((goal) => (
              <ListItem key={goal._id} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle color="success" />
                      {goal.title}
                      <Chip label={goal.type} size="small" variant="outlined" />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        {getTargetTypeLabel(goal.targetType)}: {formatGoalValue(goal.targetValue, goal.targetType)}
                        {goal.targetCategory && ` in ${goal.targetCategory}`}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Completed on {new Date(goal.completedAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Chip
                    icon={<EmojiEvents />}
                    label={`${goal.streak || 1} streak`}
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          {completedGoals.length > 5 && (
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
              Showing 5 of {completedGoals.length} completed goals
            </Typography>
          )}
        </Paper>
      )}

      {/* Goal Creation Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingGoal ? 'Edit Goal' : 'Create New Goal'}
          <IconButton onClick={handleCloseDialog}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Goal Title"
                value={goalForm.title}
                onChange={(e) => handleFormChange('title', e.target.value)}
                placeholder="e.g., Complete 10 tasks this week"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description (optional)"
                value={goalForm.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                multiline
                rows={2}
                placeholder="Add more details about your goal..."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Goal Type</InputLabel>
                <Select
                  value={goalForm.type}
                  label="Goal Type"
                  onChange={(e) => handleFormChange('type', e.target.value)}
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Target Type</InputLabel>
                <Select
                  value={goalForm.targetType}
                  label="Target Type"
                  onChange={(e) => handleFormChange('targetType', e.target.value)}
                >
                  <MenuItem value="tasks_completed">Tasks Completed</MenuItem>
                  <MenuItem value="time_spent">Time Spent</MenuItem>
                  <MenuItem value="category_focus">Category Focus</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Target Value"
                type="number"
                value={goalForm.targetValue}
                onChange={(e) => handleFormChange('targetValue', parseInt(e.target.value) || 0)}
                helperText={
                  goalForm.targetType === 'time_spent' ? 'Minutes' :
                  goalForm.targetType === 'tasks_completed' ? 'Number of tasks' :
                  'Number of tasks in category'
                }
              />
            </Grid>

            {goalForm.targetType === 'category_focus' && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Target Category</InputLabel>
                  <Select
                    value={goalForm.targetCategory}
                    label="Target Category"
                    onChange={(e) => handleFormChange('targetCategory', e.target.value)}
                  >
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={goalForm.startDate}
                onChange={(e) => handleFormChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={goalForm.endDate}
                onChange={(e) => handleFormChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!goalForm.title || !goalForm.targetValue}
          >
            {editingGoal ? 'Update Goal' : 'Create Goal'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="add goal"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' }
        }}
        onClick={() => handleOpenDialog()}
      >
        <Add />
      </Fab>
    </Box>
  );
};

export default GoalTracker;
