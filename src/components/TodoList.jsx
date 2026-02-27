import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
// recurringMissed is imported via api below
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { TodoItem } from './TodoItem';
import TodoTemplates from './TodoTemplates';
import CategorySelector from './CategorySelector';

const TodoList = ({ onFocusMode }) => {
  const todos = useQuery(api.todos.get) || [];
  const addTodo = useMutation(api.todos.add);
  const updateTodo = useMutation(api.todos.update);
  const updateTodoOrder = useMutation(api.todos.updateOrder);
  const removeTodo = useMutation(api.todos.remove);
  const removeOldDoneTodos = useMutation(api.todos.removeOldDone);
  const bulkComplete = useMutation(api.todos.bulkComplete);
  const bulkDelete = useMutation(api.todos.bulkDelete);
  const checkAllMissedRecurring = useMutation(api.recurringMissed.checkAllMissedRecurring);

  const [newTodo, setNewTodo] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newDueTime, setNewDueTime] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  // Hierarchical category state
  const [newMainCategory, setNewMainCategory] = useState('');
  const [newSubcategory, setNewSubcategory] = useState('');
  const [newActivityType, setNewActivityType] = useState('');
  // Legacy category field for backward compatibility
  const [newCategory, setNewCategory] = useState('');
  const [newEstimatedMinutes, setNewEstimatedMinutes] = useState('');
  const [newTags, setNewTags] = useState([]);
  const [newNotes, setNewNotes] = useState('');
  const [tagInput, setTagInput] = useState('');

  const [showHistory, setShowHistory] = useState(false);
  const [sortBy, setSortBy] = useState('position');
  const [searchText, setSearchText] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [focusedTodoIndex, setFocusedTodoIndex] = useState(-1);
  const [selectedTodos, setSelectedTodos] = useState(new Set());
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);

  // Refs for keyboard shortcuts
  const newTodoRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      removeOldDoneTodos();
    }, 60 * 60 * 1000); // Run every hour to clean up old done todos
    return () => clearInterval(interval);
  }, [removeOldDoneTodos]);

  // On mount: detect and log any missed recurring tasks (throttled to once per hour)
  useEffect(() => {
    const STORAGE_KEY = 'lastMissedRecurringCheck';
    const ONE_HOUR = 60 * 60 * 1000;
    const lastCheck = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();
    if (!lastCheck || now - parseInt(lastCheck, 10) > ONE_HOUR) {
      checkAllMissedRecurring()
        .then((result) => {
          if (result && result.totalNewMisses > 0) {
            console.info(`[RecurringMiss] Logged ${result.totalNewMisses} new missed occurrence(s) across ${result.processed} habit(s).`);
          }
        })
        .catch((err) => console.warn('[RecurringMiss] Check failed:', err));
      localStorage.setItem(STORAGE_KEY, now.toString());
    }
  }, [checkAllMissedRecurring]);

  const handleAddTodo = useCallback(async () => {
    if (newTodo.trim() === '') return;

    await addTodo({
      text: newTodo,
      deadline: newDeadline || undefined,
      dueTime: newDueTime || undefined,
      priority: newPriority,
      // Hierarchical categories
      mainCategory: newMainCategory.trim() || undefined,
      subcategory: newSubcategory.trim() || undefined,
      activityType: newActivityType.trim() || undefined,
      // Legacy category field for backward compatibility
      category: newCategory.trim() || undefined,
      estimatedMinutes: newEstimatedMinutes ? parseInt(newEstimatedMinutes) : undefined,
      tags: newTags.length > 0 ? newTags : undefined,
      notes: newNotes.trim() || undefined,
    });

    // Reset form
    setNewTodo('');
    setNewDeadline('');
    setNewDueTime('');
    setNewPriority('medium');
    // Reset hierarchical categories
    setNewMainCategory('');
    setNewSubcategory('');
    setNewActivityType('');
    // Reset legacy category
    setNewCategory('');
    setNewEstimatedMinutes('');
    setNewTags([]);
    setNewNotes('');
    setTagInput('');
  }, [addTodo, newTodo, newDeadline, newDueTime, newPriority, newMainCategory, newSubcategory, newActivityType, newCategory, newEstimatedMinutes, newTags, newNotes]);

  const handleToggleTodo = useCallback((id, done) => {
    updateTodo({ id, done: !done });
  }, [updateTodo]);

  const handleUpdateDeadline = useCallback((id, deadline) => {
    updateTodo({ id, deadline });
  }, [updateTodo]);

  // Optimized input handlers
  const handleNewTodoChange = useCallback((e) => {
    setNewTodo(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleAddTodo();
    }
  }, [handleAddTodo]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = activeTodos.findIndex(todo => todo._id === active.id);
      const newIndex = activeTodos.findIndex(todo => todo._id === over.id);
      const newOrder = arrayMove(activeTodos, oldIndex, newIndex);
      const updatedOrder = newOrder.map((todo, index) => ({ ...todo, position: index }));
      updateTodoOrder({ todos: updatedOrder.map(({_id, position}) => ({_id, position})) });
    }
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!newTags.includes(tagInput.trim())) {
        setNewTags([...newTags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setNewTags(newTags.filter(tag => tag !== tagToRemove));
  };

  const handleBulkAction = async (action) => {
    const selectedIds = Array.from(selectedTodos);
    if (selectedIds.length === 0) return;

    switch (action) {
      case 'complete':
        await bulkComplete({ ids: selectedIds });
        break;
      case 'delete':
        if (window.confirm(`Delete ${selectedIds.length} selected todos?`)) {
          await bulkDelete({ ids: selectedIds });
        }
        break;
    }
    setSelectedTodos(new Set());
  };

  const handleSelectTodo = (todoId, selected) => {
    const newSelected = new Set(selectedTodos);
    if (selected) {
      newSelected.add(todoId);
    } else {
      newSelected.delete(todoId);
    }
    setSelectedTodos(newSelected);
  };

  // Memoized filtered todos for performance
  const filteredTodos = useMemo(() => {
    let filtered = todos;

    // Apply search filter
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(todo =>
        todo.text.toLowerCase().includes(searchLower) ||
        (todo.category && todo.category.toLowerCase().includes(searchLower)) ||
        (todo.tags && todo.tags.some(tag => tag.toLowerCase().includes(searchLower))) ||
        (todo.notes && todo.notes.toLowerCase().includes(searchLower))
      );
    }

    // Apply status filter
    switch (filterBy) {
      case 'active':
        filtered = filtered.filter(todo => !todo.done);
        break;
      case 'completed':
        filtered = filtered.filter(todo => todo.done);
        break;
      case 'overdue':
        filtered = filtered.filter(todo => {
          if (todo.done) return false;
          return todo.deadline && new Date(todo.deadline) < new Date();
        });
        break;
      case 'recurring':
        filtered = filtered.filter(todo => todo.isRecurring);
        break;
      case 'with-timer':
        filtered = filtered.filter(todo => todo.timerStarted || (todo.actualMinutes && todo.actualMinutes > 0));
        break;
      case 'high-priority':
        filtered = filtered.filter(todo => todo.priority === 'high');
        break;
      case 'all':
      default:
        // Show all todos
        break;
    }

    return filtered;
  }, [todos, searchText, filterBy]);

  // Memoized sorted active todos
  const activeTodos = useMemo(() => {
    return filteredTodos
      .filter(todo => !todo.done)
      .sort((a, b) => {
        if (sortBy === 'text') {
          return a.text.localeCompare(b.text);
        } else if (sortBy === 'date') {
          return b._creationTime - a._creationTime;
        } else if (sortBy === 'priority') {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.priority || 'medium'];
          const bPriority = priorityOrder[b.priority || 'medium'];
          return bPriority - aPriority; // High priority first
        } else if (sortBy === 'deadline') {
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline) - new Date(b.deadline);
        } else if (sortBy === 'time-estimate') {
          return (b.estimatedMinutes || 0) - (a.estimatedMinutes || 0);
        } else {
          return (a.position || 0) - (b.position || 0);
        }
      });
  }, [filteredTodos, sortBy]);

  // Memoized done todos
  const doneTodos = useMemo(() => {
    return filteredTodos.filter(todo => todo.done);
  }, [filteredTodos]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      const isInInput = event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA';

      // Ctrl/Cmd + Enter: Quick add new todo
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (newTodo.trim()) {
          handleAddTodo();
        } else {
          newTodoRef.current?.focus();
        }
        return;
      }

      // Ctrl/Cmd + F: Focus search field
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }

      // Ctrl/Cmd + T: Open templates
      if ((event.ctrlKey || event.metaKey) && event.key === 't') {
        event.preventDefault();
        setShowTemplates(true);
        return;
      }

      // Escape: Clear search field or cancel editing
      if (event.key === 'Escape') {
        if (searchText) {
          setSearchText('');
          searchRef.current?.blur();
        } else if (isInInput) {
          event.target.blur();
        }
        setFocusedTodoIndex(-1);
        return;
      }

      if (isInInput) return;

      // Tab: Navigate between todos
      if (event.key === 'Tab') {
        event.preventDefault();
        const maxIndex = activeTodos.length - 1;
        if (event.shiftKey) {
          setFocusedTodoIndex(prev => prev <= 0 ? maxIndex : prev - 1);
        } else {
          setFocusedTodoIndex(prev => prev >= maxIndex ? 0 : prev + 1);
        }
        return;
      }

      // Delete: Delete focused todo
      if (event.key === 'Delete' && focusedTodoIndex >= 0 && focusedTodoIndex < activeTodos.length) {
        const todoToDelete = activeTodos[focusedTodoIndex];
        if (window.confirm(`Are you sure you want to delete "${todoToDelete.text}"?`)) {
          removeTodo({ id: todoToDelete._id });
          setFocusedTodoIndex(-1);
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [newTodo, searchText, focusedTodoIndex, activeTodos]);

  return (
    <div className="todo-list">
      {/* Header */}
      <div className="todo-header">
        <h2>Todo List</h2>
        <div className="header-actions">
          <button
            className="action-button"
            onClick={() => setShowTemplates(true)}
            title="Templates (Ctrl+T)"
          >
            📋 Templates
          </button>
          <button
            className="action-button"
            onClick={() => setShowAdvancedForm(!showAdvancedForm)}
            title="Toggle advanced form"
          >
            {showAdvancedForm ? '📝 Simple' : '⚙️ Advanced'}
          </button>
        </div>
      </div>

      {/* Add Todo Form */}
      <div className="add-todo-form">
        <div className="form-row">
          <input
            ref={newTodoRef}
            type="text"
            value={newTodo}
            onChange={handleNewTodoChange}
            onKeyDown={handleKeyDown}
            placeholder="Add a new todo... (Ctrl+Enter to add)"
            className="todo-input"
          />

          <input
            type="date"
            value={newDeadline}
            onChange={(e) => setNewDeadline(e.target.value)}
            className="date-input"
          />

          {showAdvancedForm && (
            <input
              type="time"
              value={newDueTime}
              onChange={(e) => setNewDueTime(e.target.value)}
              className="time-input"
            />
          )}

          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
            className="priority-select"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <button onClick={handleAddTodo} className="add-button">
            Add Todo
          </button>
        </div>

        {showAdvancedForm && (
          <div className="advanced-form">
            <div className="form-row">
              <CategorySelector
                mainCategory={newMainCategory}
                subcategory={newSubcategory}
                activityType={newActivityType}
                onCategoryChange={setNewMainCategory}
                onSubcategoryChange={setNewSubcategory}
                onActivityTypeChange={setNewActivityType}
                className="category-selector-form"
              />

              <input
                type="number"
                value={newEstimatedMinutes}
                onChange={(e) => setNewEstimatedMinutes(e.target.value)}
                placeholder="Est. minutes"
                className="time-estimate-input"
                min="1"
              />
            </div>

            <div className="form-row">
              <div className="tags-input-container">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Add tags (press Enter)"
                  className="tags-input"
                />
                {newTags.length > 0 && (
                  <div className="tags-display">
                    {newTags.map(tag => (
                      <span key={tag} className="tag-badge">
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="remove-tag">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-row">
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="notes-input"
                rows="2"
              />
            </div>
          </div>
        )}
      </div>

      {/* Search and Filter Controls */}
      <div className="controls">
        <div className="search-section">
          <input
            ref={searchRef}
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search todos... (Ctrl+F)"
            className="search-input"
          />
        </div>

        <div className="filter-section">
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
            <option value="recurring">Recurring</option>
            <option value="with-timer">With Timer</option>
            <option value="high-priority">High Priority</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="position">Default Order</option>
            <option value="priority">Priority</option>
            <option value="deadline">Deadline</option>
            <option value="date">Date Created</option>
            <option value="text">Alphabetical</option>
            <option value="time-estimate">Time Estimate</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedTodos.size > 0 && (
          <div className="bulk-actions">
            <span className="selected-count">{selectedTodos.size} selected</span>
            <button onClick={() => handleBulkAction('complete')} className="bulk-button">
              ✓ Complete All
            </button>
            <button onClick={() => handleBulkAction('delete')} className="bulk-button delete">
              🗑️ Delete All
            </button>
            <button onClick={() => setSelectedTodos(new Set())} className="bulk-button">
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="stats">
        <span>Active: {activeTodos.length}</span>
        <span>Completed: {doneTodos.length}</span>
        <span>Total: {todos.length}</span>
      </div>

      {/* Active Todos */}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={activeTodos.map(todo => todo._id)} strategy={verticalListSortingStrategy}>
          <div className="todos-container">
            {activeTodos.map(todo => (
              <TodoItem
                key={todo._id}
                todo={todo}
                handleToggleTodo={handleToggleTodo}
                removeTodo={removeTodo}
                handleUpdateDeadline={handleUpdateDeadline}
                onUpdate={() => {}} // Trigger re-render if needed
                onFocus={(todo) => onFocusMode?.(todo)}
                onDuplicate={() => {}} // Trigger re-render if needed
              />
            ))}

            {activeTodos.length === 0 && (
              <div className="empty-state">
                <p>No todos found.</p>
                {searchText && <p>Try adjusting your search or filters.</p>}
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Completed Todos */}
      {doneTodos.length > 0 && (
        <div className="completed-section">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="section-toggle"
          >
            {showHistory ? '▼' : '▶'} Completed ({doneTodos.length})
          </button>

          {showHistory && (
            <div className="completed-todos">
              {doneTodos.map(todo => (
                <div key={todo._id} className="completed-todo">
                  <input
                    type="checkbox"
                    checked={todo.done}
                    onChange={() => handleToggleTodo(todo._id, todo.done)}
                    className="todo-checkbox"
                  />
                  <span className="completed-text">{todo.text}</span>
                  <button
                    onClick={() => removeTodo({ id: todo._id })}
                    className="delete-completed"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Templates Dialog */}
      <TodoTemplates
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onCreateFromTemplate={() => {}} // Trigger re-render if needed
      />

      <style>{`
        .todo-list {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .todo-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          gap: 8px;
        }

        .todo-header h2 {
          margin: 0;
          color: var(--text-primary);
          font-size: 1.25rem;
        }

        .header-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .action-button {
          padding: 8px 14px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .action-button:hover {
          background: var(--bg-hover);
        }

        /* ── Add-todo form ── */
        .add-todo-form {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .form-row {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .form-row:last-child {
          margin-bottom: 0;
        }

        .todo-input {
          flex: 1 1 100%;
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 1rem;
          min-width: 0;
        }

        .date-input, .time-input, .priority-select {
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-primary);
          color: var(--text-primary);
          flex: 1 1 auto;
          min-width: 0;
        }

        .time-input {
          min-width: 90px;
        }

        .priority-select {
          min-width: 100px;
        }

        .add-button {
          padding: 10px 20px;
          background: var(--accent-color, #1976d2);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          font-size: 1rem;
          transition: all 0.2s ease;
          flex: 1 1 auto;
          white-space: nowrap;
        }

        .add-button:hover {
          background: var(--accent-hover, #1565c0);
        }

        .advanced-form {
          border-top: 1px solid var(--border-color);
          padding-top: 14px;
          margin-top: 14px;
        }

        .category-input, .time-estimate-input {
          flex: 1 1 auto;
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-primary);
          color: var(--text-primary);
          min-width: 0;
        }

        .tags-input-container {
          flex: 1 1 100%;
        }

        .tags-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-primary);
          color: var(--text-primary);
        }

        .tags-display {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .tag-badge {
          background: var(--accent-color, #1976d2);
          color: white;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .remove-tag {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 1rem;
          padding: 0;
          line-height: 1;
          min-width: unset;
          min-height: unset;
        }

        .notes-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-primary);
          color: var(--text-primary);
          resize: vertical;
          font-family: inherit;
          font-size: 1rem;
        }

        /* ── Controls bar ── */
        .controls {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }

        .search-section {
          width: 100%;
        }

        .search-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 1rem;
          box-sizing: border-box;
        }

        .filter-section {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-select, .sort-select {
          flex: 1 1 calc(50% - 4px);
          padding: 10px 8px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.9rem;
          min-width: 0;
        }

        /* ── Bulk actions ── */
        .bulk-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          padding: 10px 12px;
          background: var(--accent-color, #1976d2);
          border-radius: 6px;
          color: white;
          flex-wrap: wrap;
        }

        .selected-count {
          font-weight: 500;
          flex: 1 1 auto;
        }

        .bulk-button {
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          font-size: 0.85rem;
          white-space: nowrap;
        }

        .bulk-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .bulk-button.delete:hover {
          background: #ef4444;
        }

        /* ── Stats bar ── */
        .stats {
          display: flex;
          gap: 12px;
          margin-bottom: 14px;
          font-size: 0.85rem;
          color: var(--text-secondary);
          flex-wrap: wrap;
        }

        /* ── Todo list ── */
        .todos-container {
          margin-bottom: 20px;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: var(--text-secondary);
        }

        /* ── Completed section ── */
        .completed-section {
          border-top: 1px solid var(--border-color);
          padding-top: 16px;
        }

        .section-toggle {
          background: none;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          font-size: 1rem;
          font-weight: 500;
          padding: 10px 0;
          width: 100%;
          text-align: left;
        }

        .completed-todos {
          margin-top: 12px;
        }

        .completed-todo {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 4px;
          border-bottom: 1px solid var(--border-light);
        }

        .completed-todo:last-child {
          border-bottom: none;
        }

        .completed-text {
          flex: 1;
          text-decoration: line-through;
          color: var(--text-secondary);
          font-size: 0.95rem;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .delete-completed {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 6px;
          border-radius: 4px;
          font-size: 1rem;
          flex-shrink: 0;
          min-width: unset;
          min-height: unset;
        }

        .delete-completed:hover {
          background: var(--bg-hover);
          color: #ef4444;
        }

        /* Completed-section native checkbox */
        .completed-todo .todo-checkbox {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          cursor: pointer;
        }

        /* ── Desktop overrides (768px+) ── */
        @media (min-width: 768px) {
          .todo-list {
            padding: 20px;
          }

          .todo-input {
            flex: 1 1 auto;
          }

          .controls {
            flex-direction: row;
            align-items: center;
          }

          .search-section {
            flex: 1;
            min-width: 200px;
            width: auto;
          }

          .filter-section {
            flex-wrap: nowrap;
          }

          .filter-select, .sort-select {
            flex: 0 0 auto;
            width: auto;
          }

          .add-button {
            flex: 0 0 auto;
          }
        }

        /* ── Small phone overrides (max 479px) ── */
        @media (max-width: 479px) {
          .todo-list {
            padding: 12px;
          }

          .todo-header h2 {
            font-size: 1.1rem;
          }

          .action-button {
            padding: 6px 10px;
            font-size: 0.8rem;
          }

          .add-todo-form {
            padding: 12px;
          }

          .stats {
            font-size: 0.8rem;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default TodoList;
