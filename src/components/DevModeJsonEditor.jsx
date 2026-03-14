import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  Chip,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

// Template shown when user clicks "+ Add New Todo"
const NEW_TODO_TEMPLATE = {
  text: "New todo title",
  done: false,
  priority: "medium",
  deadline: null,
  dueTime: null,
  notes: null,
  tags: [],
  isRecurring: false,
  recurringPattern: null,
  recurringInterval: null,
  recurringDays: null,
  mainCategory: null,
  subcategory: null,
  activityType: null,
  estimatedMinutes: null,
  effortLevel: null,
  difficulty: null,
  lifeArea: null,
  scheduledStart: null,
  scheduledEnd: null,
  timeBlockDate: null,
  countLabel: null,
  count: null,
  timeSpentMinutes: null,
  distance: null,
  distanceUnit: null,
};

// Fields that are read-only (system-managed) — shown in JSON but not patchable
const READ_ONLY_FIELDS = new Set([
  '_id', '_creationTime', 'timerStarted', 'timerSessions', 'doneAt',
  'completedAt', 'parentRecurringId', 'parentId', 'subtasks', 'dependencies',
  'productivityScore', 'lastEditedBy', 'actualMinutes',
]);

// Get filtered todos based on filter type and search text
const getFilteredTodos = (todoList, filterType, searchText) => {
  let filtered = todoList;

  if (filterType === 'active') {
    filtered = filtered.filter(t => !t.done);
  } else if (filterType === 'recurring') {
    filtered = filtered.filter(t => t.isRecurring);
  }

  if (searchText.trim()) {
    const lowerSearch = searchText.toLowerCase();
    filtered = filtered.filter(t =>
      (t.text && t.text.toLowerCase().includes(lowerSearch)) ||
      (t.notes && t.notes.toLowerCase().includes(lowerSearch))
    );
  }

  return filtered;
};

const DevModeJsonEditor = ({ open, onClose }) => {
  // useQuery returns undefined while loading, then the array
  const todosRaw = useQuery(api.todos.get);
  const todos = todosRaw || [];
  const updateFromJson = useMutation(api.todos.updateFromJson);
  const addTodo = useMutation(api.todos.add);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // State
  const [jsonText, setJsonText] = useState('');
  const [originalJson, setOriginalJson] = useState('');
  const [parseError, setParseError] = useState(null);
  const [changedCount, setChangedCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveResults, setSaveResults] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Track whether the editor has been initialized for the current open session
  const initializedRef = useRef(false);
  // Flag set after a successful save — triggers refresh when Convex pushes updated data
  const pendingRefreshRef = useRef(false);
  // Store filter/search in refs so the refresh effect can read current values without stale closure
  const filterRef = useRef(filter);
  const searchRef = useRef(search);
  useEffect(() => { filterRef.current = filter; }, [filter]);
  useEffect(() => { searchRef.current = search; }, [search]);

  // Initialize JSON only when dialog first opens AND Convex has returned data.
  // Also handles post-save refresh: when pendingRefreshRef is set and todosRaw updates,
  // we re-serialize the fresh data into the editor.
  useEffect(() => {
    if (!open) {
      // Reset so next open re-initializes fresh
      initializedRef.current = false;
      pendingRefreshRef.current = false;
      return;
    }

    if (todosRaw === undefined) return; // Still loading

    if (pendingRefreshRef.current) {
      // Post-save refresh: Convex has pushed updated data — re-serialize into editor
      pendingRefreshRef.current = false;
      const filtered = getFilteredTodos(todosRaw, filterRef.current, searchRef.current);
      const json = JSON.stringify(filtered, null, 2);
      setJsonText(json);
      setOriginalJson(json);
      setChangedCount(0);
      setNewCount(0);
      return;
    }

    if (!initializedRef.current) {
      // First open — initialize editor with current todos
      const filtered = getFilteredTodos(todosRaw, filterRef.current, searchRef.current);
      const json = JSON.stringify(filtered, null, 2);
      setJsonText(json);
      setOriginalJson(json);
      setParseError(null);
      setChangedCount(0);
      setNewCount(0);
      setSaveResults([]);
      initializedRef.current = true;
    }
  }, [open, todosRaw]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: filter/search read via refs to avoid stale closures without re-triggering this effect

  // Re-initialize when filter or search changes (only while open and not mid-edit)
  const handleFilterChange = useCallback((newFilter) => {
    setFilter(newFilter);
    const filtered = getFilteredTodos(todos, newFilter, search);
    const json = JSON.stringify(filtered, null, 2);
    setJsonText(json);
    setOriginalJson(json);
    setParseError(null);
    setChangedCount(0);
    setNewCount(0);
    setSaveResults([]);
  }, [todos, search]);

  const handleSearchChange = useCallback((newSearch) => {
    setSearch(newSearch);
    const filtered = getFilteredTodos(todos, filter, newSearch);
    const json = JSON.stringify(filtered, null, 2);
    setJsonText(json);
    setOriginalJson(json);
    setParseError(null);
    setChangedCount(0);
    setNewCount(0);
    setSaveResults([]);
  }, [todos, filter]);

  // Append a new blank todo template to the JSON editor
  const handleAddNewTodo = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) return;
      const updated = [...parsed, { ...NEW_TODO_TEMPLATE }];
      const newJson = JSON.stringify(updated, null, 2);
      setJsonText(newJson);
      // Re-run diff detection on the new value
      const originalParsed = JSON.parse(originalJson);
      const originalMap = new Map(originalParsed.map(t => [t._id, t]));
      let changed = 0;
      let newItems = 0;
      for (const item of updated) {
        if (!item._id) {
          newItems++;
        } else {
          const old = originalMap.get(item._id);
          if (old && JSON.stringify(old) !== JSON.stringify(item)) changed++;
        }
      }
      setChangedCount(changed);
      setNewCount(newItems);
      setParseError(null);
    } catch {
      // If current JSON is invalid, replace with just the template
      const newJson = JSON.stringify([{ ...NEW_TODO_TEMPLATE }], null, 2);
      setJsonText(newJson);
      setNewCount(1);
      setChangedCount(0);
      setParseError(null);
    }
  }, [jsonText, originalJson]);

  // Parse JSON and detect changes on every keystroke
  const handleJsonChange = useCallback((value) => {
    setJsonText(value);
    setSaveResults([]);

    if (!value.trim()) {
      setParseError('JSON cannot be empty');
      setChangedCount(0);
      return;
    }

    try {
      const parsed = JSON.parse(value);

      if (!Array.isArray(parsed)) {
        setParseError('JSON must be an array of todo objects');
        setChangedCount(0);
        return;
      }

      setParseError(null);

      // Detect changes and new items
      const originalParsed = JSON.parse(originalJson);
      const originalMap = new Map(originalParsed.map(t => [t._id, t]));

      let changed = 0;
      let newItems = 0;
      for (const newTodo of parsed) {
        if (!newTodo._id) {
          // No _id = new item to be created
          newItems++;
        } else {
          const oldTodo = originalMap.get(newTodo._id);
          if (oldTodo && JSON.stringify(oldTodo) !== JSON.stringify(newTodo)) {
            changed++;
          }
        }
      }

      setChangedCount(changed);
      setNewCount(newItems);
    } catch (err) {
      // Extract line number from error message if possible
      const match = err.message.match(/position (\d+)/);
      const lineNum = match
        ? value.substring(0, parseInt(match[1])).split('\n').length
        : 'unknown';
      setParseError(`Invalid JSON at line ${lineNum}: ${err.message}`);
      setChangedCount(0);
    }
  }, [originalJson]);

  // Reset to original
  const handleReset = useCallback(() => {
    setJsonText(originalJson);
    setParseError(null);
    setChangedCount(0);
    setNewCount(0);
    setSaveResults([]);
  }, [originalJson]);

  // Apply changes to database — handles both updates (has _id) and creates (no _id)
  const handleApply = useCallback(async () => {
    if (parseError || (changedCount === 0 && newCount === 0) || saving) return;

    setSaving(true);
    setSaveResults([]);

    try {
      const parsed = JSON.parse(jsonText);
      const originalParsed = JSON.parse(originalJson);
      const originalMap = new Map(originalParsed.map(t => [t._id, t]));

      const results = [];

      for (const newTodo of parsed) {
        // ── CREATE: item has no _id ──────────────────────────────────────────
        if (!newTodo._id) {
          if (!newTodo.text || !newTodo.text.trim()) {
            results.push({
              text: '(new item)',
              success: false,
              error: 'New todo must have a non-empty "text" field',
            });
            continue;
          }
          try {
            // Build create args — only pass fields that api.todos.add accepts
            const createArgs = {
              text: newTodo.text,
              deadline: newTodo.deadline || undefined,
              dueTime: newTodo.dueTime || undefined,
              priority: newTodo.priority || 'medium',
              mainCategory: newTodo.mainCategory || undefined,
              subcategory: newTodo.subcategory || undefined,
              activityType: newTodo.activityType || undefined,
              category: newTodo.category || undefined,
              estimatedMinutes: newTodo.estimatedMinutes || undefined,
              notes: newTodo.notes || undefined,
              tags: newTodo.tags && newTodo.tags.length > 0 ? newTodo.tags : undefined,
              isRecurring: newTodo.isRecurring || undefined,
              recurringPattern: newTodo.recurringPattern || undefined,
              recurringInterval: newTodo.recurringInterval || undefined,
              recurringDays: newTodo.recurringDays && newTodo.recurringDays.length > 0 ? newTodo.recurringDays : undefined,
              countLabel: newTodo.countLabel || undefined,
              count: newTodo.count != null ? newTodo.count : undefined,
              timeSpentMinutes: newTodo.timeSpentMinutes != null ? newTodo.timeSpentMinutes : undefined,
              distance: newTodo.distance != null ? newTodo.distance : undefined,
              distanceUnit: newTodo.distanceUnit || undefined,
              effortLevel: newTodo.effortLevel || undefined,
              difficulty: newTodo.difficulty || undefined,
              scheduledStart: newTodo.scheduledStart || undefined,
              scheduledEnd: newTodo.scheduledEnd || undefined,
              timeBlockDate: newTodo.timeBlockDate || undefined,
              lifeArea: newTodo.lifeArea || undefined,
            };
            // Remove undefined keys so Convex doesn't complain
            Object.keys(createArgs).forEach(k => createArgs[k] === undefined && delete createArgs[k]);

            await addTodo(createArgs);
            results.push({ text: newTodo.text, success: true, action: 'created' });
          } catch (err) {
            results.push({ text: newTodo.text, success: false, error: err.message });
          }
          continue;
        }

        // ── UPDATE: item has _id ─────────────────────────────────────────────
        const oldTodo = originalMap.get(newTodo._id);
        if (oldTodo && JSON.stringify(oldTodo) !== JSON.stringify(newTodo)) {
          try {
            // Build editable fields object — exclude read-only fields
            const editableFields = {};
            for (const [key, value] of Object.entries(newTodo)) {
              if (!READ_ONLY_FIELDS.has(key)) {
                editableFields[key] = value;
              }
            }

            await updateFromJson({
              id: newTodo._id,
              fields: editableFields,
            });

            results.push({ id: newTodo._id, text: newTodo.text, success: true, action: 'updated' });
          } catch (err) {
            results.push({ id: newTodo._id, text: newTodo.text, success: false, error: err.message });
          }
        }
      }

      setSaveResults(results);

      // Signal that the next Convex subscription update should refresh the editor.
      // The useEffect watching todosRaw will pick this up and re-serialize fresh data.
      pendingRefreshRef.current = true;
    } catch (err) {
      setSaveResults([{
        success: false,
        error: `Failed to apply changes: ${err.message}`,
      }]);
    } finally {
      setSaving(false);
    }
  }, [parseError, changedCount, newCount, saving, jsonText, originalJson, updateFromJson, addTodo, todos, filter, search]);

  // Keyboard shortcut: Ctrl+S / Cmd+S to apply
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleApply();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleApply]);

  const successCount = saveResults.filter(r => r.success).length;
  const errorCount = saveResults.filter(r => !r.success).length;

  // Theme-aware editor colors
  const editorBg = isDark ? '#1e1e1e' : '#f5f5f5';
  const editorColor = isDark ? '#d4d4d4' : '#333';
  const borderColor = parseError
    ? theme.palette.error.main
    : theme.palette.divider;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen
      PaperProps={{
        sx: {
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" component="div">🛠 Developer Mode — JSON Editor</Typography>
        <Button
          onClick={onClose}
          size="small"
          variant="outlined"
          startIcon={<CloseIcon />}
        >
          Close
        </Button>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflow: 'hidden', pt: 1 }}>
        {/* Warning Banner */}
        <Alert severity="warning" sx={{ flexShrink: 0 }}>
          ⚠️ <strong>Developer Mode:</strong> Direct database edits. System fields (_id, timerSessions, etc.) are shown but ignored on save.
        </Alert>

        {/* Filter and Search Controls */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>Filter:</Typography>
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(e, newFilter) => {
              if (newFilter !== null) handleFilterChange(newFilter);
            }}
            size="small"
          >
            <ToggleButton value="all">All ({todos.length})</ToggleButton>
            <ToggleButton value="active">Active ({todos.filter(t => !t.done).length})</ToggleButton>
            <ToggleButton value="recurring">Recurring ({todos.filter(t => t.isRecurring).length})</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            placeholder="Search by text or notes..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 200 }}
          />
        </Box>

        {/* JSON Editor — takes remaining height */}
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderColor,
            borderWidth: parseError ? 2 : 1,
          }}
        >
          <textarea
            value={jsonText}
            onChange={(e) => handleJsonChange(e.target.value)}
            spellCheck={false}
            style={{
              flex: 1,
              width: '100%',
              height: '100%',
              padding: '12px',
              fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
              fontSize: '12px',
              lineHeight: '1.6',
              border: 'none',
              outline: 'none',
              resize: 'none',
              backgroundColor: editorBg,
              color: editorColor,
              boxSizing: 'border-box',
            }}
          />
        </Paper>

        {/* Status Bar */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
          {parseError ? (
            <Alert severity="error" sx={{ flex: 1, py: 0.5 }}>
              {parseError}
            </Alert>
          ) : (
            <>
              <Chip
                label="✅ JSON valid"
                color="success"
                variant="outlined"
                size="small"
              />
              {changedCount > 0 && (
                <Chip
                  label={`${changedCount} todo${changedCount !== 1 ? 's' : ''} changed`}
                  color="primary"
                  variant="filled"
                  size="small"
                />
              )}
              {newCount > 0 && (
                <Chip
                  label={`${newCount} new todo${newCount !== 1 ? 's' : ''} to create`}
                  color="success"
                  variant="filled"
                  size="small"
                />
              )}
              {changedCount === 0 && newCount === 0 && (
                <Typography variant="caption" color="text.secondary">
                  No changes detected — tip: remove "_id" from an object to create it as a new todo
                </Typography>
              )}
            </>
          )}
        </Box>

        {/* Save Results */}
        {saveResults.length > 0 && (
          <Paper
            variant="outlined"
            sx={{ p: 1.5, flexShrink: 0, maxHeight: 120, overflow: 'auto' }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
              Results: {successCount} saved, {errorCount} failed
            </Typography>
            {saveResults.map((result, idx) => (
              <Typography
                key={idx}
                variant="caption"
                sx={{
                  display: 'block',
                  color: result.success ? 'success.main' : 'error.main',
                  mb: 0.25,
                }}
              >
                {result.success ? '✅' : '❌'}{' '}
                {result.action === 'created' ? '🆕 ' : ''}{result.text || '(unknown)'}
                {result.action && result.success ? ` — ${result.action}` : ''}
                {result.error ? `: ${result.error}` : ''}
              </Typography>
            ))}
          </Paper>
        )}

        {saving && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <CircularProgress size={16} />
            <Typography variant="body2">Saving changes to database...</Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1, borderTop: 1, borderColor: 'divider', flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 120 }}>
          Tip: Press Ctrl+S / ⌘+S to apply · Remove "_id" to create a new todo
        </Typography>
        <Button
          onClick={handleAddNewTodo}
          variant="outlined"
          color="success"
          disabled={saving}
          size="small"
        >
          + Add New Todo
        </Button>
        <Button
          onClick={handleReset}
          variant="outlined"
          disabled={saving || (jsonText === originalJson)}
          size="small"
        >
          Reset to Original
        </Button>
        <Button
          onClick={handleApply}
          variant="contained"
          color="primary"
          disabled={!!parseError || (changedCount === 0 && newCount === 0) || saving}
        >
          {saving
            ? 'Applying…'
            : `Apply to DB${changedCount + newCount > 0 ? ` (${changedCount > 0 ? `${changedCount} update${changedCount !== 1 ? 's' : ''}` : ''}${changedCount > 0 && newCount > 0 ? ', ' : ''}${newCount > 0 ? `${newCount} new` : ''})` : ''}`
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DevModeJsonEditor;
