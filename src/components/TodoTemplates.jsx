import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

const TodoTemplates = ({ isOpen, onClose, onCreateFromTemplate }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    text: '',
    priority: 'medium',
    category: '',
    estimatedMinutes: '',
    tags: [],
    notes: ''
  });
  const [tagInput, setTagInput] = useState('');

  const templates = useQuery(api.todos.getTemplates);
  const createTemplate = useMutation(api.todos.createTemplate);
  const createFromTemplate = useMutation(api.todos.createFromTemplate);

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (!newTemplate.name.trim() || !newTemplate.text.trim()) return;

    await createTemplate({
      name: newTemplate.name,
      text: newTemplate.text,
      priority: newTemplate.priority,
      category: newTemplate.category || undefined,
      estimatedMinutes: newTemplate.estimatedMinutes ? parseInt(newTemplate.estimatedMinutes) : undefined,
      tags: newTemplate.tags.length > 0 ? newTemplate.tags : undefined,
      notes: newTemplate.notes || undefined,
    });

    setNewTemplate({
      name: '',
      text: '',
      priority: 'medium',
      category: '',
      estimatedMinutes: '',
      tags: [],
      notes: ''
    });
    setShowCreateForm(false);
  };

  const handleUseTemplate = async (template) => {
    await createFromTemplate({ templateId: template._id });
    onCreateFromTemplate?.();
    onClose();
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!newTemplate.tags.includes(tagInput.trim())) {
        setNewTemplate(prev => ({
          ...prev,
          tags: [...prev.tags, tagInput.trim()]
        }));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setNewTemplate(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
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

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>Todo Templates</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="dialog-body">
          {!showCreateForm ? (
            <>
              {/* Templates List */}
              <div className="templates-section">
                <div className="section-header">
                  <h4>Available Templates</h4>
                  <button
                    className="button primary small"
                    onClick={() => setShowCreateForm(true)}
                  >
                    + Create Template
                  </button>
                </div>

                {templates && templates.length > 0 ? (
                  <div className="templates-list">
                    {templates.map(template => (
                      <div key={template._id} className="template-card">
                        <div className="template-header">
                          <h5 className="template-name">{template.name}</h5>
                          <div className="template-meta">
                            {template.priority && (
                              <span className={`priority-badge ${template.priority}`}>
                                {template.priority}
                              </span>
                            )}
                            {template.estimatedMinutes && (
                              <span className="time-badge">
                                {formatTime(template.estimatedMinutes)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="template-content">
                          <p className="template-text">{template.text}</p>

                          {template.category && (
                            <div className="template-detail">
                              <span className="detail-label">Category:</span>
                              <span className="category-badge">{template.category}</span>
                            </div>
                          )}

                          {template.tags && template.tags.length > 0 && (
                            <div className="template-detail">
                              <span className="detail-label">Tags:</span>
                              <div className="tags-list">
                                {template.tags.map(tag => (
                                  <span key={tag} className="tag-badge">{tag}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {template.notes && (
                            <div className="template-detail">
                              <span className="detail-label">Notes:</span>
                              <p className="template-notes">{template.notes}</p>
                            </div>
                          )}
                        </div>

                        <div className="template-actions">
                          <button
                            className="button primary"
                            onClick={() => handleUseTemplate(template)}
                          >
                            Use Template
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No templates created yet.</p>
                    <p>Create your first template to save time on recurring tasks!</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Create Template Form */
            <form onSubmit={handleCreateTemplate} className="create-template-form">
              <div className="form-header">
                <h4>Create New Template</h4>
                <button
                  type="button"
                  className="button secondary small"
                  onClick={() => setShowCreateForm(false)}
                >
                  Back to Templates
                </button>
              </div>

              <div className="form-group">
                <label>Template Name *</label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Weekly Review, Daily Standup"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>Task Text *</label>
                <input
                  type="text"
                  value={newTemplate.text}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="e.g., Review weekly goals and plan next week"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={newTemplate.priority}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, priority: e.target.value }))}
                    className="form-select"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g., Work, Personal"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Estimated Time (minutes)</label>
                  <input
                    type="number"
                    value={newTemplate.estimatedMinutes}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, estimatedMinutes: e.target.value }))}
                    placeholder="30"
                    className="form-input"
                    min="1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Tags</label>
                <div className="tags-input-container">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Type tag and press Enter"
                    className="form-input"
                  />
                  {newTemplate.tags.length > 0 && (
                    <div className="tags-display">
                      {newTemplate.tags.map(tag => (
                        <span key={tag} className="tag-badge removable">
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="remove-tag"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={newTemplate.notes}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional details or instructions..."
                  className="form-textarea"
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="button primary">
                  Create Template
                </button>
              </div>
            </form>
          )}
        </div>

        <style jsx>{`
          .dialog-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .dialog-content {
            background: var(--bg-primary);
            border-radius: 12px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            max-width: 700px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
          }

          .dialog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px 16px;
            border-bottom: 1px solid var(--border-color);
          }

          .dialog-header h3 {
            margin: 0;
            color: var(--text-primary);
            font-size: 1.25rem;
          }

          .close-button {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--text-secondary);
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
          }

          .close-button:hover {
            background: var(--bg-hover);
          }

          .dialog-body {
            padding: 24px;
          }

          .section-header, .form-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }

          .section-header h4, .form-header h4 {
            margin: 0;
            color: var(--text-primary);
          }

          .templates-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .template-card {
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 16px;
            background: var(--bg-secondary);
          }

          .template-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
          }

          .template-name {
            margin: 0;
            color: var(--text-primary);
            font-size: 1.1rem;
          }

          .template-meta {
            display: flex;
            gap: 8px;
            align-items: center;
          }

          .priority-badge {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
          }

          .priority-badge.high {
            background: #fee2e2;
            color: #dc2626;
          }

          .priority-badge.medium {
            background: #fef3c7;
            color: #d97706;
          }

          .priority-badge.low {
            background: #dcfce7;
            color: #16a34a;
          }

          .time-badge {
            background: var(--accent-color);
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 500;
          }

          .template-content {
            margin-bottom: 16px;
          }

          .template-text {
            margin: 0 0 12px 0;
            color: var(--text-primary);
            font-weight: 500;
          }

          .template-detail {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
          }

          .detail-label {
            font-size: 0.85rem;
            color: var(--text-secondary);
            min-width: 60px;
          }

          .category-badge {
            background: var(--bg-tertiary);
            color: var(--text-primary);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
          }

          .tags-list {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
          }

          .tag-badge {
            background: var(--accent-color);
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.75rem;
          }

          .tag-badge.removable {
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .remove-tag {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 0.9rem;
            padding: 0;
            line-height: 1;
          }

          .template-notes {
            margin: 0;
            font-size: 0.9rem;
            color: var(--text-secondary);
            font-style: italic;
          }

          .template-actions {
            display: flex;
            justify-content: flex-end;
          }

          .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--text-secondary);
          }

          .empty-state p {
            margin: 8px 0;
          }

          .create-template-form {
            max-width: 100%;
          }

          .form-group {
            margin-bottom: 20px;
          }

          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 16px;
          }

          .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: var(--text-primary);
          }

          .form-input, .form-select, .form-textarea {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--bg-primary);
            color: var(--text-primary);
            font-size: 14px;
          }

          .form-input:focus, .form-select:focus, .form-textarea:focus {
            outline: none;
            border-color: var(--accent-color);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .tags-input-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .tags-display {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
          }

          .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 24px;
          }

          .button {
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
          }

          .button.small {
            padding: 6px 12px;
            font-size: 0.9rem;
          }

          .button.secondary {
            background: var(--bg-secondary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
          }

          .button.secondary:hover {
            background: var(--bg-hover);
          }

          .button.primary {
            background: var(--accent-color);
            color: white;
          }

          .button.primary:hover {
            background: var(--accent-hover);
          }
        `}</style>
      </div>
    </div>
  );
};

export default TodoTemplates;
