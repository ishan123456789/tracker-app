import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  IconButton,
  Grid,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Star as StarIcon,
  StarOutline as StarOutlineIcon,
  Close as CloseIcon,
  Add as AddIcon,
} from '@mui/icons-material';

const Top3Focus = () => {
  const todos = useQuery(api.todos.get) || [];
  const top3Todos = useQuery(api.todos.getTop3Today) || [];
  const setTop3 = useMutation(api.todos.setTop3);
  const removeFromTop3 = useMutation(api.todos.removeFromTop3);

  const [openDialog, setOpenDialog] = useState(false);
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  const activeTodos = useMemo(
    () => todos.filter(t => !t.done && !t.isTop3),
    [todos]
  );

  const handleAddToTop3 = async (todoId, order) => {
    await setTop3({ id: todoId, top3Order: order });
  };

  const handleRemoveFromTop3 = async (todoId) => {
    await removeFromTop3({ id: todoId });
  };

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

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Paper
      elevation={2}
      sx={{
        p: isMobile ? 2 : 3,
        mb: 3,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 700, mb: 0.5 }}>
            🎯 Today's Focus
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            {today}
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="inherit"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ color: '#667eea', fontWeight: 600 }}
        >
          {isMobile ? 'Add' : 'Add Task'}
        </Button>
      </Box>

      <Grid container spacing={2}>
        {[1, 2, 3].map((order) => {
          const task = top3Todos.find(t => t.top3Order === order);
          return (
            <Grid item xs={12} sm={6} md={4} key={order}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: 'rgba(255, 255, 255, 0.95)',
                  color: 'text.primary',
                  position: 'relative',
                  overflow: 'visible',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: -12,
                    left: 16,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: '#667eea',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                  }}
                >
                  {order}
                </Box>

                <CardContent sx={{ pt: 3, pb: 1, flexGrow: 1 }}>
                  {task ? (
                    <>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 600,
                          mb: 1,
                          wordBreak: 'break-word',
                          pr: 3,
                        }}
                      >
                        {task.text}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                        {task.priority && (
                          <Chip
                            label={task.priority}
                            size="small"
                            sx={{
                              bgcolor: getPriorityColor(task.priority),
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                            }}
                          />
                        )}
                        {task.estimatedMinutes && (
                          <Chip
                            label={`${task.estimatedMinutes}m`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>

                      {task.deadline && (
                        <Typography variant="caption" color="text.secondary">
                          📅 {new Date(task.deadline).toLocaleDateString()}
                        </Typography>
                      )}
                    </>
                  ) : (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ textAlign: 'center', py: 2 }}
                    >
                      Click "Add Task" to select
                    </Typography>
                  )}
                </CardContent>

                {task && (
                  <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveFromTop3(task._id)}
                      sx={{ color: '#d32f2f' }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Add Task Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Task to Top 3</DialogTitle>
        <DialogContent>
          <List sx={{ mt: 1 }}>
            {activeTodos.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                No active tasks available
              </Typography>
            ) : (
              activeTodos.map((todo) => (
                <ListItem key={todo._id} disablePadding>
                  <Box sx={{ width: '100%', p: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {todo.text}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      {[1, 2, 3].map((order) => (
                        <Button
                          key={order}
                          variant={
                            top3Todos.some(t => t._id === todo._id && t.top3Order === order)
                              ? 'contained'
                              : 'outlined'
                          }
                          size="small"
                          onClick={() => {
                            handleAddToTop3(todo._id, order);
                            setOpenDialog(false);
                          }}
                          sx={{ minWidth: 40 }}
                        >
                          #{order}
                        </Button>
                      ))}
                    </Box>
                  </Box>
                </ListItem>
              ))
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default Top3Focus;
