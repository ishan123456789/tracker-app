import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Badge,
  Tooltip,
  Paper,
  InputAdornment,
} from '@mui/material';
import {
  Comment as CommentIcon,
  Send as SendIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Reply as ReplyIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

const CollaborationPanel = ({ todoId, sectionId }) => {
  const { currentUser } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedComment, setSelectedComment] = useState(null);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentions, setShowMentions] = useState(false);

  // Queries
  const comments = useQuery(
    api.comments.getComments,
    todoId ? { todoId } : sectionId ? { sectionId } : "skip"
  );

  const notifications = useQuery(
    api.comments.getUserNotifications,
    { limit: 10 }
  );

  // Mutations
  const addComment = useMutation(api.comments.addComment);
  const editComment = useMutation(api.comments.editComment);
  const deleteComment = useMutation(api.comments.deleteComment);
  const markNotificationRead = useMutation(api.comments.markNotificationRead);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      const mentions = extractMentions(newComment);
      await addComment({
        todoId,
        sectionId,
        content: newComment,
        mentions,
        parentCommentId: replyingTo,
      });
      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleEditComment = async () => {
    if (!editContent.trim()) return;

    try {
      const mentions = extractMentions(editContent);
      await editComment({
        commentId: editingComment,
        content: editContent,
        mentions,
      });
      setEditingComment(null);
      setEditContent('');
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment({ commentId });
      setMenuAnchor(null);
      setSelectedComment(null);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const extractMentions = (text) => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      // In a real implementation, you'd resolve usernames to user IDs
      mentions.push(match[1]);
    }
    return mentions;
  };

  const handleCommentChange = (value) => {
    setNewComment(value);

    // Check for @ mentions
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === value.length - 1) {
      setShowMentions(true);
      // In a real implementation, you'd fetch user suggestions here
    } else {
      setShowMentions(false);
    }
  };

  const formatCommentTime = (timestamp) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const renderComment = (comment, isReply = false) => (
    <Box key={comment._id} sx={{ ml: isReply ? 4 : 0, mb: 2 }}>
      <Paper elevation={1} sx={{ p: 2 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box display="flex" alignItems="flex-start" flex={1}>
            <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
              {comment.author?.name?.charAt(0).toUpperCase()}
            </Avatar>
            <Box flex={1}>
              <Box display="flex" alignItems="center" mb={1}>
                <Typography variant="subtitle2" sx={{ mr: 1 }}>
                  {comment.author?.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatCommentTime(comment.createdAt)}
                </Typography>
                {comment.isEdited && (
                  <Chip label="edited" size="small" variant="outlined" sx={{ ml: 1 }} />
                )}
              </Box>

              {editingComment === comment._id ? (
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    variant="outlined"
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <Box>
                    <Button size="small" onClick={handleEditComment} sx={{ mr: 1 }}>
                      Save
                    </Button>
                    <Button size="small" onClick={() => setEditingComment(null)}>
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {comment.content}
                </Typography>
              )}

              {comment.mentionedUsers?.length > 0 && (
                <Box display="flex" alignItems="center" mb={1}>
                  <PersonIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    Mentioned: {comment.mentionedUsers.map(u => u.name).join(', ')}
                  </Typography>
                </Box>
              )}

              <Box display="flex" alignItems="center">
                <Button
                  size="small"
                  startIcon={<ReplyIcon />}
                  onClick={() => setReplyingTo(comment._id)}
                >
                  Reply
                </Button>
              </Box>
            </Box>
          </Box>

          {comment.authorId === currentUser?._id && (
            <IconButton
              size="small"
              onClick={(e) => {
                setMenuAnchor(e.currentTarget);
                setSelectedComment(comment);
              }}
            >
              <MoreVertIcon />
            </IconButton>
          )}
        </Box>
      </Paper>

      {/* Render replies */}
      {comments
        ?.filter(c => c.parentCommentId === comment._id)
        ?.map(reply => renderComment(reply, true))}
    </Box>
  );

  return (
    <Box>
      {/* Notifications */}
      {notifications && notifications.filter(n => !n.isRead).length > 0 && (
        <Card sx={{ mb: 2, bgcolor: 'primary.50' }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <NotificationsIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="subtitle2">
                You have {notifications.filter(n => !n.isRead).length} unread notifications
              </Typography>
            </Box>
            {notifications
              .filter(n => !n.isRead)
              .slice(0, 3)
              .map(notification => (
                <Box key={notification._id} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    {notification.message}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => markNotificationRead({ notificationId: notification._id })}
                  >
                    Mark as read
                  </Button>
                </Box>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Comments Section */}
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <CommentIcon sx={{ mr: 1 }} />
            <Typography variant="h6">
              Comments ({comments?.length || 0})
            </Typography>
          </Box>

          {/* Comment Input */}
          <Box mb={3}>
            {replyingTo && (
              <Box mb={1}>
                <Chip
                  label={`Replying to ${comments?.find(c => c._id === replyingTo)?.author?.name}`}
                  onDelete={() => setReplyingTo(null)}
                  size="small"
                />
              </Box>
            )}
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Add a comment... Use @ to mention someone"
              value={newComment}
              onChange={(e) => handleCommentChange(e.target.value)}
              variant="outlined"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim()}
                      color="primary"
                    >
                      <SendIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Comments List */}
          <Box>
            {comments
              ?.filter(comment => !comment.parentCommentId)
              ?.map(comment => renderComment(comment))}

            {comments?.length === 0 && (
              <Box textAlign="center" py={4}>
                <CommentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No comments yet. Be the first to comment!
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Comment Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setEditingComment(selectedComment._id);
            setEditContent(selectedComment.content);
            setMenuAnchor(null);
          }}
        >
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => handleDeleteComment(selectedComment._id)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default CollaborationPanel;
