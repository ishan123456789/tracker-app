import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  IconButton,
  Menu,
  MenuItem,
  Collapse,
  Chip,
  TextField,
  Typography,
  Box,
  Divider,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Flag as FlagIcon,
  Timer as TimerIcon,
  Schedule as ScheduleIcon,
  Category as CategoryIcon,
  Notes as NotesIcon,
  DragIndicator as DragIndicatorIcon
} from '@mui/icons-material';
import TimeTracker from './TimeTracker';
import SubtaskList from './SubtaskList';
import RecurringTaskDialog from './RecurringTaskDialog';
import ConfirmationDialog from './ConfirmationDialog';
import { AutoTrackingPreviewModal, AutoTrackingInlinePreview } from './AutoTrackingPreview';
import { extractMetrics, detectActivityCategory } from '../utils/MetricExtractor';
import CategorySelector from './CategorySelector';

export const TodoItem = ({
  todo,
  handleToggleTodo,
  removeTodo,
  handleUpdateDeadline,
  onUpdate,
  onFocus,
  onDuplicate
}) => {
  // Main state
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Inline editing states
  const [editingText, setEditingText] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingCategories, setEditingCategories] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [editingPriority, setEditingPriority] = useState(false);

  // Edit values
  const [editText, setEditText] = useState(todo.text);
  const [editDeadline, setEditDeadline] = useState(todo.deadline || '');
  const [editDueTime, setEditDueTime] = useState(todo.dueTime || '');
  const [editNotes, setEditNotes] = useState(todo.notes || '');
  const [editMainCategory, setEditMainCategory] = useState(todo.mainCategory || '');
  const [editSubcategory, setEditSubcategory] = useState(todo.subcategory || '');
  const [editActivityType, setEditActivityType] = useState(todo.activityType || '');
  const [editCategory, setEditCategory] = useState(todo.category || '');
  const [editTags, setEditTags] = useState(todo.tags || []);
  const [editPriority, setEditPriority] = useState(todo.priority || 'medium');
  const [tagInput, setTagInput] = useState('');

  // Action menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  // Auto-tracking state
  const [showAutoTrackingPreview, setShowAutoTrackingPreview] = useState(false);
  const [extractedMetrics, setExtractedMetrics] = useState(null);
  const [activityCategory, setActivityCategory] = useState(null);

  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: todo._id });

  const updateTodo = useMutation(api.todos.update);
  const completeRecurringTask = useMutation(api.todos.completeRecurringTask);
  const duplicateTodo = useMutation(api.todos.duplicateTodo);
  const completeWithAutoTracking = useMutation(api.todos.completeWithAutoTracking);

  // Query for auto-tracking mappings (hierarchical)
  const autoTrackingMappings = useQuery(
    api.activityCategories.getMappingsByHierarchicalCategory,
    todo.mainCategory || todo.subcategory || todo.activityType ? {
      mainCategory: todo.mainCategory,
      subcategory: todo.subcategory,
      activityType: todo.activityType
    } : "skip"
  );

  // Fallback to legacy category mapping if no hierarchical categories
  const legacyAutoTrackingMappings = useQuery(
    api.activityCategories.getMappingsByCategory,
    !todo.mainCategory && todo.category ? { category: todo.category } : "skip"
  );

  const isPastDeadline = todo.deadline && new Date(todo.deadline) < new Date();
  const isRunning = !!todo.timerStarted;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Extract metrics when todo text changes
  useEffect(() => {
    if (todo.text && todo.category) {
      const metrics = extractMetrics(todo.text);
      const category = detectActivityCategory(todo.text) || todo.category;

      setExtractedMetrics(metrics);
      setActivityCategory(category);
    }
  }, [todo.text, todo.category]);

  // Update local edit states when todo changes
  useEffect(() => {
    setEditText(todo.text);
    setEditDeadline(todo.deadline || '');
    setEditDueTime(todo.dueTime || '');
    setEditNotes(todo.notes || '');
    setEditMainCategory(todo.mainCategory || '');
    setEditSubcategory(todo.subcategory || '');
    setEditActivityType(todo.activityType || '');
    setEditCategory(todo.category || '');
    setEditTags(todo.tags || []);
    setEditPriority(todo.priority || 'medium');
  }, [todo.text, todo.deadline, todo.dueTime, todo.notes, todo.mainCategory, todo.subcategory, todo.activityType, todo.category, todo.tags, todo.priority]);

  const handleToggle = async () => {
    if (todo.done) {
      // If unchecking a completed task, just mark as not done (don't create new recurring instances)
      await handleToggleTodo(todo._id, todo.done);
      onUpdate?.();
      return;
    }

    // If checking and has auto-tracking potential, show preview
    if (!todo.done && autoTrackingMappings && autoTrackingMappings.length > 0 && extractedMetrics?.metrics?.length > 0) {
      setShowAutoTrackingPreview(true);
      return;
    }

    // When completing a task, use recurring logic if it's a recurring task
    if (todo.isRecurring) {
      await completeRecurringTask({ id: todo._id });
    } else {
      await handleToggleTodo(todo._id, todo.done);
    }
    onUpdate?.();
  };

  const handleAutoTrackingConfirm = async (trackingData) => {
    try {
      await completeWithAutoTracking({
        id: todo._id,
        sectionId: trackingData.sectionId,
        entry: trackingData.entry,
        mappingId: trackingData.mapping._id,
      });
      setShowAutoTrackingPreview(false);
      onUpdate?.();
    } catch (error) {
      console.error('Auto-tracking failed:', error);
      // Fall back to normal completion
      await handleToggleTodo(todo._id, todo.done);
      onUpdate?.();
    }
  };

  const handleAutoTrackingCancel = async () => {
    setShowAutoTrackingPreview(false);
    // Complete todo normally without auto-tracking
    await handleToggleTodo(todo._id, todo.done);
    onUpdate?.();
  };

  // Inline editing handlers
  const handleSaveText = async () => {
    if (editText.trim() !== todo.text) {
      try {
        await updateTodo({ id: todo._id, text: editText.trim() });
        onUpdate?.();
      } catch (error) {
        console.error('Failed to update text:', error);
        alert('Failed to update text. Please try again.');
        return;
      }
    }
    setEditingText(false);
  };

  const handleSaveDeadline = async () => {
    if (editDeadline !== todo.deadline || editDueTime !== todo.dueTime) {
      try {
        await updateTodo({
          id: todo._id,
          deadline: editDeadline || null,
          dueTime: editDueTime || null
        });
        onUpdate?.();
      } catch (error) {
        console.error('Failed to update deadline:', error);
        alert('Failed to update deadline. Please try again.');
        return;
      }
    }
    setEditingDeadline(false);
  };

  const handleSaveNotes = async () => {
    if (editNotes !== todo.notes) {
      try {
        await updateTodo({ id: todo._id, notes: editNotes || null });
        onUpdate?.();
      } catch (error) {
        console.error('Failed to update notes:', error);
        alert('Failed to update notes. Please try again.');
        return;
      }
    }
    setEditingNotes(false);
  };

  const handleSaveCategories = async () => {
    const updates = {};
    let hasChanges = false;

    if (editMainCategory !== (todo.mainCategory || '')) {
      updates.mainCategory = editMainCategory || undefined;
      hasChanges = true;
    }
    if (editSubcategory !== (todo.subcategory || '')) {
      updates.subcategory = editSubcategory || undefined;
      hasChanges = true;
    }
    if (editActivityType !== (todo.activityType || '')) {
      updates.activityType = editActivityType || undefined;
      hasChanges = true;
    }

    if (hasChanges) {
      try {
        await updateTodo({ id: todo._id, ...updates });
        onUpdate?.();
      } catch (error) {
        console.error('Failed to update categories:', error);
        alert('Failed to update categories. Please try again.');
        return;
      }
    }
    setEditingCategories(false);
  };

  const handleSaveTags = async () => {
    if (JSON.stringify(editTags) !== JSON.stringify(todo.tags || [])) {
      try {
        await updateTodo({ id: todo._id, tags: editTags.length > 0 ? editTags : null });
        onUpdate?.();
      } catch (error) {
        console.error('Failed to update tags:', error);
        alert('Failed to update tags. Please try again.');
        return;
      }
    }
    setEditingTags(false);
  };

  const handleSavePriority = async () => {
    if (editPriority !== todo.priority) {
      try {
        await updateTodo({ id: todo._id, priority: editPriority });
        onUpdate?.();
      } catch (error) {
        console.error('Failed to update priority:', error);
        alert('Failed to update priority. Please try again.');
        return;
      }
    }
    setEditingPriority(false);
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!editTags.includes(tagInput.trim())) {
        setEditTags([...editTags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setEditTags(editTags.filter(tag => tag !== tagToRemove));
  };

  const handleUpdateField = async (field, value) => {
    await updateTodo({ id: todo._id, [field]: value });
    onUpdate?.();
  };

  const handleRecurringSave = async (recurringData) => {
    // If setting as recurring and no deadline exists, set today as deadline
    const updateData = { ...recurringData };
    if (recurringData.isRecurring && !todo.deadline) {
      updateData.deadline = new Date().toISOString().split('T')[0];
    }

    await updateTodo({ id: todo._id, ...updateData });
    onUpdate?.();
  };

  // Action menu handlers
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    setEditingText(true);
    handleMenuClose();
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
    handleMenuClose();
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await removeTodo({ id: todo._id });
      onUpdate?.();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete todo:', error);
      alert('Failed to delete todo. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    if (!isDeleting) {
      setShowDeleteConfirm(false);
    }
  };

  const handleDuplicate = async () => {
    if (isDuplicating) return;
    setIsDuplicating(true);
    try {
      await duplicateTodo({ id: todo._id });
      onDuplicate?.();
    } catch (error) {
      console.error('Failed to duplicate todo:', error);
      alert('Failed to duplicate todo. Please try again.');
    } finally {
      setIsDuplicating(false);
    }
    handleMenuClose();
  };

  const handleFocus = () => {
    onFocus?.(todo);
    handleMenuClose();
  };

  const handleRecurring = () => {
    setShowRecurringDialog(true);
    handleMenuClose();
  };

  const formatTime = (minutes) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const handleItemClick = (e) => {
    // Don't expand if clicking on interactive elements
    if (e.target.closest('.todo-checkbox') ||
        e.target.closest('.todo-actions') ||
        e.target.closest('.MuiTextField-root') ||
        e.target.closest('input') ||
        e.target.closest('button')) {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`todo-item ${todo.done ? 'completed' : ''} ${isPastDeadline && !todo.done ? 'overdue' : ''}`}
    >
      {/* Main Todo Row */}
      <div className="todo-main" onClick={handleItemClick}>
        {/* Drag Handle — hidden on mobile (touch drag works natively via dnd-kit) */}
        <IconButton
          size="small"
          {...attributes}
          {...listeners}
          className="todo-drag-handle"
          sx={{
            color: 'text.secondary',
            cursor: 'grab',
            mr: 0.5,
            display: { xs: 'none', sm: 'inline-flex' },
            '&:active': {
              cursor: 'grabbing'
            }
          }}
          title="Drag to reorder"
        >
          <DragIndicatorIcon sx={{ fontSize: 16 }} />
        </IconButton>

        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          className={`todo-checkbox ${todo.done ? 'checked' : ''}`}
        >
          {todo.done && '✓'}
        </button>

        {/* Priority Flag */}
        {todo.priority && todo.priority !== 'none' && (
          <FlagIcon
            sx={{
              color: getPriorityColor(todo.priority),
              fontSize: 16,
              mr: 1
            }}
          />
        )}

        {/* Todo Content */}
        <div className="todo-content">
          {/* Todo Text */}
          <div className="todo-text-container">
            {editingText ? (
              <TextField
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={handleSaveText}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveText();
                  if (e.key === 'Escape') {
                    setEditText(todo.text);
                    setEditingText(false);
                  }
                }}
                variant="standard"
                fullWidth
                autoFocus
                sx={{
                  '& .MuiInput-root': {
                    fontSize: '1rem',
                    fontWeight: 500
                  }
                }}
              />
            ) : (
              <Typography
                variant="body1"
                className={`todo-text ${todo.done ? 'done' : ''}`}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingText(true);
                }}
                sx={{
                  fontWeight: 500,
                  cursor: 'pointer',
                  textDecoration: todo.done ? 'line-through' : 'none',
                  color: todo.done ? 'text.secondary' : 'text.primary',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                    borderRadius: 1,
                    px: 0.5
                  }
                }}
              >
                {todo.text}
              </Typography>
            )}

            {/* Auto-tracking inline preview */}
            {!todo.done && extractedMetrics && activityCategory && (
              <AutoTrackingInlinePreview
                todo={todo}
                extractedMetrics={extractedMetrics}
                activityCategory={activityCategory}
              />
            )}

            {/* Category Display */}
            {editingCategories ? (
              <Box sx={{ mt: 1, p: 2, border: 1, borderColor: 'primary.main', borderRadius: 1, backgroundColor: 'background.paper' }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>Edit Categories</Typography>
                <CategorySelector
                  mainCategory={editMainCategory}
                  subcategory={editSubcategory}
                  activityType={editActivityType}
                  onCategoryChange={setEditMainCategory}
                  onSubcategoryChange={setEditSubcategory}
                  onActivityTypeChange={setEditActivityType}
                  showActivityType={true}
                />
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <button
                    onClick={handleSaveCategories}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Save Categories
                  </button>
                  <button
                    onClick={() => {
                      setEditMainCategory(todo.mainCategory || '');
                      setEditSubcategory(todo.subcategory || '');
                      setEditActivityType(todo.activityType || '');
                      setEditingCategories(false);
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#666',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </Box>
              </Box>
            ) : (
              (todo.mainCategory || todo.subcategory || todo.activityType || todo.category) && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    mt: 0.5,
                    flexWrap: 'wrap',
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'action.hover', borderRadius: 1, p: 0.5 }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingCategories(true);
                  }}
                >
                  {todo.mainCategory && (
                    <Chip
                      label={todo.mainCategory}
                      size="small"
                      sx={{
                        backgroundColor: '#FF6B6B',
                        color: 'white',
                        fontSize: '0.7rem',
                        height: 20
                      }}
                    />
                  )}
                  {todo.subcategory && (
                    <>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>›</Typography>
                      <Chip
                        label={todo.subcategory}
                        size="small"
                        sx={{
                          backgroundColor: '#4ECDC4',
                          color: 'white',
                          fontSize: '0.7rem',
                          height: 20
                        }}
                      />
                    </>
                  )}
                  {todo.activityType && (
                    <>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>›</Typography>
                      <Chip
                        label={todo.activityType}
                        size="small"
                        sx={{
                          backgroundColor: '#45B7D1',
                          color: 'white',
                          fontSize: '0.7rem',
                          height: 20
                        }}
                      />
                    </>
                  )}
                  {!todo.mainCategory && todo.category && (
                    <Chip
                      label={todo.category}
                      size="small"
                      sx={{
                        backgroundColor: '#96CEB4',
                        color: 'white',
                        fontSize: '0.7rem',
                        height: 20
                      }}
                    />
                  )}
                </Box>
              )
            )}
          </div>

          {/* Metadata Row — wraps on mobile */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1, sm: 2 },
            mt: 0.75,
            flexWrap: 'wrap',
            rowGap: 0.5
          }}>
            {/* Deadline */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              <ScheduleIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              {editingDeadline ? (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  <TextField
                    type="date"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    onBlur={handleSaveDeadline}
                    size="small"
                    variant="standard"
                    sx={{ minWidth: 120 }}
                  />
                  <TextField
                    type="time"
                    value={editDueTime}
                    onChange={(e) => setEditDueTime(e.target.value)}
                    onBlur={handleSaveDeadline}
                    size="small"
                    variant="standard"
                    sx={{ minWidth: 90 }}
                  />
                </Box>
              ) : (
                <Typography
                  variant="caption"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingDeadline(true);
                  }}
                  sx={{
                    cursor: 'pointer',
                    color: todo.deadline ? (isPastDeadline ? 'error.main' : 'text.secondary') : 'text.disabled',
                    fontStyle: todo.deadline ? 'normal' : 'italic',
                    fontSize: { xs: '0.72rem', sm: '0.75rem' },
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      borderRadius: 1,
                      px: 0.5
                    }
                  }}
                >
                  {todo.deadline ? (
                    <>
                      {new Date(todo.deadline).toLocaleDateString()}
                      {todo.dueTime && ` ${todo.dueTime}`}
                    </>
                  ) : (
                    isMobile ? 'No date' : 'No deadline set'
                  )}
                </Typography>
              )}
            </Box>

            {/* Timer Status */}
            {isRunning && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                <TimerIcon sx={{ fontSize: 13, color: 'primary.main' }} />
                <Typography variant="caption" sx={{ color: 'primary.main', fontSize: { xs: '0.72rem', sm: '0.75rem' } }}>
                  Running
                </Typography>
              </Box>
            )}

            {/* Time Info */}
            {(todo.estimatedMinutes || todo.actualMinutes) && (
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: { xs: '0.72rem', sm: '0.75rem' }, flexShrink: 0 }}>
                {todo.estimatedMinutes && `Est: ${formatTime(todo.estimatedMinutes)}`}
                {todo.estimatedMinutes && todo.actualMinutes && ' · '}
                {todo.actualMinutes && `${formatTime(todo.actualMinutes)}`}
              </Typography>
            )}

            {/* Indicators */}
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
              {todo.isRecurring && (
                <>
                  <Typography variant="caption" title="Recurring task" sx={{ fontSize: '0.8rem' }}>🔄</Typography>
                  {(todo.currentStreak > 0) && (
                    <Chip
                      label={`🔥 ${todo.currentStreak}`}
                      size="small"
                      title={`Current streak: ${todo.currentStreak} completion(s) in a row`}
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        backgroundColor: todo.currentStreak >= 7 ? '#ff6d00' : todo.currentStreak >= 3 ? '#ff9800' : '#ffe0b2',
                        color: todo.currentStreak >= 3 ? 'white' : 'text.primary',
                        '& .MuiChip-label': { px: 0.75 }
                      }}
                    />
                  )}
                  {(todo.totalMissed > 0) && (
                    <Chip
                      label={`❌ ${todo.totalMissed}`}
                      size="small"
                      title={`Missed ${todo.totalMissed} time(s)`}
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        backgroundColor: '#ffebee',
                        color: '#c62828',
                        '& .MuiChip-label': { px: 0.75 }
                      }}
                    />
                  )}
                </>
              )}
              {todo.notes && (
                <Typography variant="caption" title="Has notes" sx={{ fontSize: '0.8rem' }}>📝</Typography>
              )}
              {todo.tags && todo.tags.length > 0 && (
                <Typography variant="caption" title={`Tags: ${todo.tags.join(', ')}`} sx={{ fontSize: '0.8rem' }}>🏷️</Typography>
              )}
              {todo.subtasks && todo.subtasks.length > 0 && (
                <Typography variant="caption" title={`${todo.subtasks.length} subtasks`} sx={{ fontSize: '0.8rem' }}>📋</Typography>
              )}
            </Box>
          </Box>
        </div>

        {/* Actions */}
        <div className="todo-actions" onClick={(e) => e.stopPropagation()}>
          {/* Expand/Collapse Button */}
          <IconButton
            size={isMobile ? 'medium' : 'small'}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            sx={{
              color: 'text.secondary',
              p: isMobile ? 1 : 0.5,
            }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>

          {/* Action Menu */}
          <IconButton
            size={isMobile ? 'medium' : 'small'}
            onClick={handleMenuOpen}
            sx={{
              color: 'text.secondary',
              p: isMobile ? 1 : 0.5,
            }}
            aria-label="More actions"
          >
            <MoreVertIcon />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            slotProps={{
              paper: {
                style: {
                  maxHeight: '400px',
                  width: '200px',
                  zIndex: 9999
                }
              }
            }}
            disablePortal={false}
          >
            <MenuItem onClick={handleEdit}>
              <NotesIcon sx={{ mr: 1, fontSize: 16 }} />
              Edit Text
            </MenuItem>
            <MenuItem onClick={() => { setEditingCategories(true); handleMenuClose(); }}>
              <CategoryIcon sx={{ mr: 1, fontSize: 16 }} />
              Edit Categories
            </MenuItem>
            <MenuItem onClick={() => { setEditingTags(true); handleMenuClose(); }}>
              🏷️ Edit Tags
            </MenuItem>
            <MenuItem onClick={() => { setEditingPriority(true); handleMenuClose(); }}>
              <FlagIcon sx={{ mr: 1, fontSize: 16 }} />
              Edit Priority
            </MenuItem>
            <MenuItem onClick={() => { setEditingDeadline(true); handleMenuClose(); }}>
              <ScheduleIcon sx={{ mr: 1, fontSize: 16 }} />
              Edit Deadline
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleDuplicate} disabled={isDuplicating}>
              📋 Duplicate
            </MenuItem>
            <MenuItem onClick={handleFocus}>
              🎯 Focus
            </MenuItem>
            <MenuItem onClick={handleRecurring}>
              🔄 Recurring
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
              🗑️ Delete
            </MenuItem>
          </Menu>
        </div>
      </div>

      {/* Expanded Details */}
      <Collapse in={isExpanded}>
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', backgroundColor: 'background.default' }}>

          {/* Habit Stats — only for recurring tasks */}
          {todo.isRecurring && (
            <Box sx={{ mb: 2, p: 1.5, borderRadius: 1, backgroundColor: 'background.paper', border: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                🔄 Habit Stats
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ lineHeight: 1, color: todo.currentStreak > 0 ? 'warning.main' : 'text.disabled' }}>
                    🔥 {todo.currentStreak || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Current Streak</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ lineHeight: 1, color: 'success.main' }}>
                    🏆 {todo.longestStreak || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Best Streak</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ lineHeight: 1, color: 'success.dark' }}>
                    ✅ {todo.totalCompleted || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Completed</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ lineHeight: 1, color: todo.totalMissed > 0 ? 'error.main' : 'text.disabled' }}>
                    ❌ {todo.totalMissed || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Missed</Typography>
                </Box>
                {((todo.totalCompleted || 0) + (todo.totalMissed || 0)) > 0 && (
                  <Box sx={{ textAlign: 'center' }}>
                    {(() => {
                      const total = (todo.totalCompleted || 0) + (todo.totalMissed || 0);
                      const rate = Math.round(((todo.totalCompleted || 0) / total) * 100);
                      const color = rate >= 80 ? 'success.main' : rate >= 50 ? 'warning.main' : 'error.main';
                      return (
                        <>
                          <Typography variant="h6" sx={{ lineHeight: 1, color }}>
                            {rate}%
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Compliance</Typography>
                        </>
                      );
                    })()}
                  </Box>
                )}
              </Box>
              {todo.lastCompletedDate && (
                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
                  Last completed: {todo.lastCompletedDate}
                </Typography>
              )}
            </Box>
          )}

          {/* Notes Section */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <NotesIcon sx={{ fontSize: 16 }} />
              Notes
            </Typography>
            {editingNotes ? (
              <TextField
                multiline
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                onBlur={handleSaveNotes}
                placeholder="Add notes..."
                fullWidth
                variant="outlined"
                size="small"
                autoFocus
              />
            ) : (
              <Box
                onClick={() => setEditingNotes(true)}
                sx={{
                  minHeight: 40,
                  p: 1,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  cursor: 'pointer',
                  backgroundColor: 'background.paper',
                  '&:hover': {
                    borderColor: 'primary.main'
                  }
                }}
              >
                <Typography variant="body2" sx={{ color: todo.notes ? 'text.primary' : 'text.secondary' }}>
                  {todo.notes || 'Click to add notes...'}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Time Tracker */}
          <TimeTracker todo={todo} onUpdate={onUpdate} />

          {/* Tags */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              🏷️ Tags
              {!editingTags && (
                <button
                  onClick={() => setEditingTags(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    color: '#1976d2'
                  }}
                >
                  ✏️
                </button>
              )}
            </Typography>
            {editingTags ? (
              <Box sx={{ p: 2, border: 1, borderColor: 'primary.main', borderRadius: 1, backgroundColor: 'background.paper' }}>
                <TextField
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Add tag and press Enter"
                  size="small"
                  fullWidth
                  sx={{ mb: 1 }}
                />
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                  {editTags.map(tag => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      onDelete={() => handleRemoveTag(tag)}
                      sx={{ backgroundColor: '#e3f2fd' }}
                    />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <button
                    onClick={handleSaveTags}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditTags(todo.tags || []);
                      setTagInput('');
                      setEditingTags(false);
                    }}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#666',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </Box>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  gap: 0.5,
                  flexWrap: 'wrap',
                  minHeight: 32,
                  alignItems: 'center',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.hover', borderRadius: 1, p: 0.5 }
                }}
                onClick={() => setEditingTags(true)}
              >
                {todo.tags && todo.tags.length > 0 ? (
                  todo.tags.map(tag => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    Click to add tags...
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          {/* Subtasks */}
          <SubtaskList parentTodo={todo} onUpdate={onUpdate} />

          {/* Priority Quick Actions */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <FlagIcon sx={{ fontSize: 16 }} />
              Priority
              {!editingPriority && (
                <button
                  onClick={() => setEditingPriority(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    color: '#1976d2'
                  }}
                >
                  ✏️
                </button>
              )}
            </Typography>
            {editingPriority ? (
              <Box sx={{ p: 2, border: 1, borderColor: 'primary.main', borderRadius: 1, backgroundColor: 'background.paper' }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {['high', 'medium', 'low'].map(priority => (
                    <Chip
                      key={priority}
                      label={priority.charAt(0).toUpperCase() + priority.slice(1)}
                      onClick={() => setEditPriority(priority)}
                      color={editPriority === priority ? 'primary' : 'default'}
                      variant={editPriority === priority ? 'filled' : 'outlined'}
                      size="small"
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <button
                    onClick={handleSavePriority}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditPriority(todo.priority || 'medium');
                      setEditingPriority(false);
                    }}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#666',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {['high', 'medium', 'low'].map(priority => (
                  <Chip
                    key={priority}
                    label={priority.charAt(0).toUpperCase() + priority.slice(1)}
                    onClick={() => handleUpdateField('priority', priority)}
                    color={todo.priority === priority ? 'primary' : 'default'}
                    variant={todo.priority === priority ? 'filled' : 'outlined'}
                    size="small"
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Collapse>

      {/* Dialogs */}
      <RecurringTaskDialog
        isOpen={showRecurringDialog}
        onClose={() => setShowRecurringDialog(false)}
        onSave={handleRecurringSave}
        initialData={todo}
      />

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${todo.text}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
      />

      <AutoTrackingPreviewModal
        isOpen={showAutoTrackingPreview}
        todo={todo}
        extractedMetrics={extractedMetrics}
        activityCategory={activityCategory}
        onConfirm={handleAutoTrackingConfirm}
        onCancel={handleAutoTrackingCancel}
      />

    </div>
  );
};
