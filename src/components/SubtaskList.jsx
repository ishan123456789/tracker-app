import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

const SubtaskList = ({ parentTodo, onUpdate }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [newSubtaskPriority, setNewSubtaskPriority] = useState('medium');

  const subtasks = useQuery(api.todos.getSubtasks, { parentId: parentTodo._id });
  const addSubtask = useMutation(api.todos.addSubtask);
  const updateTodo = useMutation(api.todos.update);
  const removeTodo = useMutation(api.todos.remove);

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtaskText.trim()) return;

    await addSubtask({
      parentId: parentTodo._id,
      text: newSubtaskText,
      priority: newSubtaskPriority
    });

    setNewSubtaskText('');
    setNewSubtaskPriority('medium');
    setShowAddForm(false);
    onUpdate?.();
  };

  const handleToggleSubtask = async (subtask) => {
    await updateTodo({
      id: subtask._id,
      done: !subtask.done
    });
    onUpdate?.();
  };

  const handleDeleteSubtask = async (subtaskId) => {
    await removeTodo({ id: subtaskId });
    onUpdate?.();
  };

  const getCompletionStats = () => {
    if (!subtasks || subtasks.length === 0) return { completed: 0, total: 0, percentage: 0 };

    const completed = subtasks.filter(subtask => subtask.done).length;
    const total = subtasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  };

  const stats = getCompletionStats();

  return (
    <div className="subtask-list">
      {/* Progress Header */}
      <div className="subtask-header">
        <div className="subtask-title">
          <span className="subtask-icon">📋</span>
          <span>Subtasks</span>
          {subtasks && subtasks.length > 0 && (
            <span className="subtask-count">
              {stats.completed}/{stats.total}
            </span>
          )}
        </div>

        {subtasks && subtasks.length > 0 && (
          <div className="progress-indicator">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
            <span className="progress-text">{stats.percentage}%</span>
          </div>
        )}
      </div>

      {/* Subtasks List */}
      {subtasks && subtasks.length > 0 && (
        <div className="subtasks">
          {subtasks.map(subtask => (
            <div key={subtask._id} className={`subtask-item ${subtask.done ? 'completed' : ''}`}>
              <div className="subtask-content">
                <button
                  onClick={() => handleToggleSubtask(subtask)}
                  className={`subtask-checkbox ${subtask.done ? 'checked' : ''}`}
                >
                  {subtask.done && '✓'}
                </button>

                <span className={`subtask-text ${subtask.done ? 'done' : ''}`}>
                  {subtask.text}
                </span>

                {subtask.priority && subtask.priority !== 'medium' && (
                  <span className={`priority-indicator ${subtask.priority}`}>
                    {subtask.priority === 'high' ? '🔴' : '🟡'}
                  </span>
                )}
              </div>

              <button
                onClick={() => handleDeleteSubtask(subtask._id)}
                className="delete-subtask"
                title="Delete subtask"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Subtask Form */}
      {showAddForm ? (
        <form onSubmit={handleAddSubtask} className="add-subtask-form">
          <div className="form-row">
            <input
              type="text"
              value={newSubtaskText}
              onChange={(e) => setNewSubtaskText(e.target.value)}
              placeholder="Enter subtask..."
              className="subtask-input"
              autoFocus
            />
            <select
              value={newSubtaskPriority}
              onChange={(e) => setNewSubtaskPriority(e.target.value)}
              className="priority-select"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" className="add-button" disabled={!newSubtaskText.trim()}>
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewSubtaskText('');
                setNewSubtaskPriority('medium');
              }}
              className="cancel-button"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="add-subtask-button"
        >
          + Add Subtask
        </button>
      )}

      <style jsx>{`
        .subtask-list {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 12px;
          margin: 8px 0;
        }

        .subtask-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .subtask-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .subtask-icon {
          font-size: 1.1em;
        }

        .subtask-count {
          background: var(--accent-color);
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 0.75em;
          font-weight: 600;
        }

        .progress-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .progress-bar {
          width: 60px;
          height: 6px;
          background: var(--bg-tertiary);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--accent-color);
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 0.8em;
          color: var(--text-secondary);
          min-width: 30px;
        }

        .subtasks {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }

        .subtask-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: var(--bg-primary);
          border: 1px solid var(--border-light);
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .subtask-item:hover {
          border-color: var(--border-color);
        }

        .subtask-item.completed {
          opacity: 0.7;
        }

        .subtask-content {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }

        .subtask-checkbox {
          width: 18px;
          height: 18px;
          border: 2px solid var(--border-color);
          border-radius: 3px;
          background: var(--bg-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: white;
          transition: all 0.2s ease;
        }

        .subtask-checkbox:hover {
          border-color: var(--accent-color);
        }

        .subtask-checkbox.checked {
          background: var(--accent-color);
          border-color: var(--accent-color);
        }

        .subtask-text {
          flex: 1;
          color: var(--text-primary);
          font-size: 0.9em;
        }

        .subtask-text.done {
          text-decoration: line-through;
          color: var(--text-secondary);
        }

        .priority-indicator {
          font-size: 0.8em;
        }

        .delete-subtask {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 3px;
          font-size: 16px;
          line-height: 1;
          opacity: 0;
          transition: all 0.2s ease;
        }

        .subtask-item:hover .delete-subtask {
          opacity: 1;
        }

        .delete-subtask:hover {
          background: var(--bg-hover);
          color: var(--danger-color);
        }

        .add-subtask-form {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 12px;
        }

        .form-row {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
        }

        .subtask-input {
          flex: 1;
          padding: 8px 10px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.9em;
        }

        .subtask-input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }

        .priority-select {
          padding: 8px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.85em;
          min-width: 80px;
        }

        .form-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .add-button, .cancel-button {
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 0.85em;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .add-button {
          background: var(--accent-color);
          color: white;
          border: none;
        }

        .add-button:hover:not(:disabled) {
          background: var(--accent-hover);
        }

        .add-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .cancel-button {
          background: var(--bg-secondary);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
        }

        .cancel-button:hover {
          background: var(--bg-hover);
        }

        .add-subtask-button {
          width: 100%;
          padding: 8px;
          background: var(--bg-primary);
          border: 1px dashed var(--border-color);
          border-radius: 6px;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.9em;
          transition: all 0.2s ease;
        }

        .add-subtask-button:hover {
          border-color: var(--accent-color);
          color: var(--accent-color);
          background: var(--bg-hover);
        }
      `}</style>
    </div>
  );
};

export default SubtaskList;
