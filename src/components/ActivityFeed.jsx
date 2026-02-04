import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Button,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Paper,
  Divider,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
  Comment as CommentIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Business as BusinessIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

const ActivityFeed = () => {
  const { currentWorkspace, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [filter, setFilter] = useState('all');

  // Queries
  const workspaceActivity = useQuery(
    api.comments.getActivityFeed,
    currentWorkspace ? { workspaceId: currentWorkspace._id, limit: 50 } : "skip"
  );

  const personalActivity = useQuery(
    api.comments.getActivityFeed,
    { limit: 50 }
  );

  const getActivityIcon = (type) => {
    const icons = {
      todo_created: <AssignmentIcon />,
      todo_completed: <CheckCircleIcon />,
      todo_assigned: <PersonIcon />,
      comment_added: <CommentIcon />,
      user_mentioned: <PersonIcon />,
      team_joined: <GroupIcon />,
      workspace_created: <BusinessIcon />,
    };
    return icons[type] || <AssignmentIcon />;
  };

  const getActivityColor = (type) => {
    const colors = {
      todo_created: 'primary',
      todo_completed: 'success',
      todo_assigned: 'info',
      comment_added: 'secondary',
      user_mentioned: 'warning',
      team_joined: 'info',
      workspace_created: 'primary',
    };
    return colors[type] || 'default';
  };

  const getActivityMessage = (activity) => {
    const actorName = activity.actor?.name || 'Someone';

    switch (activity.type) {
      case 'todo_created':
        return `${actorName} created a new task`;
      case 'todo_completed':
        return `${actorName} completed a task`;
      case 'todo_assigned':
        return `${actorName} assigned a task`;
      case 'comment_added':
        return `${actorName} added a comment`;
      case 'user_mentioned':
        return `${actorName} mentioned you`;
      case 'team_joined':
        return `${actorName} joined the team`;
      case 'workspace_created':
        return `${actorName} created the workspace`;
      default:
        return `${actorName} performed an action`;
    }
  };

  const getActivityDetails = (activity) => {
    if (activity.metadata) {
      switch (activity.type) {
        case 'comment_added':
          return activity.metadata.content;
        case 'todo_created':
        case 'todo_completed':
          return activity.metadata.todoText;
        default:
          return null;
      }
    }
    return null;
  };

  const formatActivityTime = (timestamp) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const filteredActivities = (activities) => {
    if (!activities) return [];

    switch (filter) {
      case 'todos':
        return activities.filter(a =>
          ['todo_created', 'todo_completed', 'todo_assigned'].includes(a.type)
        );
      case 'comments':
        return activities.filter(a =>
          ['comment_added', 'user_mentioned'].includes(a.type)
        );
      case 'team':
        return activities.filter(a =>
          ['team_joined', 'workspace_created'].includes(a.type)
        );
      default:
        return activities;
    }
  };

  const renderActivityItem = (activity) => (
    <ListItem key={activity._id} alignItems="flex-start" sx={{ px: 0 }}>
      <ListItemAvatar>
        <Avatar
          sx={{
            bgcolor: `${getActivityColor(activity.type)}.main`,
            width: 40,
            height: 40,
          }}
        >
          {getActivityIcon(activity.type)}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="body2">
              {getActivityMessage(activity)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatActivityTime(activity.createdAt)}
            </Typography>
          </Box>
        }
        secondary={
          <Box>
            {getActivityDetails(activity) && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 0.5,
                  fontStyle: 'italic',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                "{getActivityDetails(activity)}"
              </Typography>
            )}
            <Box display="flex" alignItems="center" mt={1}>
              <Avatar sx={{ width: 20, height: 20, mr: 1 }}>
                {activity.actor?.name?.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="caption" color="text.secondary">
                {activity.actor?.name}
              </Typography>
            </Box>
          </Box>
        }
      />
    </ListItem>
  );

  const currentActivities = activeTab === 0 ? workspaceActivity : personalActivity;
  const displayActivities = filteredActivities(currentActivities);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Activity Feed
        </Typography>
        <Box>
          <Tooltip title="Filter activities">
            <IconButton onClick={() => {/* Implement filter menu */}}>
              <FilterListIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={() => window.location.reload()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Workspace Activity" />
            <Tab label="My Activity" />
          </Tabs>

          <Box sx={{ p: 2 }}>
            <Box display="flex" gap={1} mb={2}>
              <Chip
                label="All"
                variant={filter === 'all' ? 'filled' : 'outlined'}
                onClick={() => setFilter('all')}
                size="small"
              />
              <Chip
                label="Tasks"
                variant={filter === 'todos' ? 'filled' : 'outlined'}
                onClick={() => setFilter('todos')}
                size="small"
              />
              <Chip
                label="Comments"
                variant={filter === 'comments' ? 'filled' : 'outlined'}
                onClick={() => setFilter('comments')}
                size="small"
              />
              <Chip
                label="Team"
                variant={filter === 'team' ? 'filled' : 'outlined'}
                onClick={() => setFilter('team')}
                size="small"
              />
            </Box>

            {displayActivities?.length > 0 ? (
              <List sx={{ width: '100%' }}>
                {displayActivities.map((activity, index) => (
                  <React.Fragment key={activity._id}>
                    {renderActivityItem(activity)}
                    {index < displayActivities.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  bgcolor: 'grey.50',
                  border: '1px dashed',
                  borderColor: 'grey.300',
                }}
              >
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No activity yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {activeTab === 0
                    ? 'Start collaborating with your team to see activity here'
                    : 'Your personal activity will appear here as you work'}
                </Typography>
              </Paper>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Activity Summary */}
      {currentActivities?.length > 0 && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Activity Summary
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Box textAlign="center">
                <Typography variant="h4" color="primary.main">
                  {currentActivities.filter(a => a.type === 'todo_completed').length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Tasks Completed
                </Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="h4" color="secondary.main">
                  {currentActivities.filter(a => a.type === 'comment_added').length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Comments Added
                </Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="h4" color="info.main">
                  {currentActivities.filter(a => a.type === 'todo_created').length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Tasks Created
                </Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="h4" color="warning.main">
                  {currentActivities.filter(a => a.type === 'user_mentioned').length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Mentions
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ActivityFeed;
