import React, { useState } from 'react';

const RecurringTaskDialog = ({ isOpen, onClose, onSave, initialData = {} }) => {
  const [recurringData, setRecurringData] = useState({
    isRecurring: initialData.isRecurring || false,
    recurringPattern: initialData.recurringPattern || 'daily',
    recurringInterval: initialData.recurringInterval || 1,
    recurringDays: initialData.recurringDays || [],
    ...initialData
  });

  const daysOfWeek = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' }
  ];

  const handleSave = () => {
    onSave(recurringData);
    onClose();
  };

  const handleDayToggle = (dayValue) => {
    const newDays = recurringData.recurringDays.includes(dayValue)
      ? recurringData.recurringDays.filter(d => d !== dayValue)
      : [...recurringData.recurringDays, dayValue];

    setRecurringData(prev => ({
      ...prev,
      recurringDays: newDays
    }));
  };

  const getRecurrenceDescription = () => {
    if (!recurringData.isRecurring) return 'Not recurring';

    switch (recurringData.recurringPattern) {
      case 'daily':
        return 'Every day';
      case 'weekly':
        if (recurringData.recurringDays.length === 0) {
          return 'Every week';
        }
        const dayNames = recurringData.recurringDays
          .sort()
          .map(d => daysOfWeek.find(day => day.value === d)?.label)
          .join(', ');
        return `Every week on ${dayNames}`;
      case 'monthly':
        return 'Every month';
      case 'custom':
        return `Every ${recurringData.recurringInterval} day${recurringData.recurringInterval > 1 ? 's' : ''}`;
      default:
        return 'Custom recurrence';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>Recurring Task Settings</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="dialog-body">
          {/* Enable Recurring */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={recurringData.isRecurring}
                onChange={(e) => setRecurringData(prev => ({
                  ...prev,
                  isRecurring: e.target.checked
                }))}
              />
              <span className="checkmark"></span>
              Make this task recurring
            </label>
          </div>

          {recurringData.isRecurring && (
            <>
              {/* Recurrence Pattern */}
              <div className="form-group">
                <label>Repeat Pattern</label>
                <select
                  value={recurringData.recurringPattern}
                  onChange={(e) => setRecurringData(prev => ({
                    ...prev,
                    recurringPattern: e.target.value,
                    recurringDays: e.target.value === 'weekly' ? prev.recurringDays : []
                  }))}
                  className="form-select"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Weekly Days Selection */}
              {recurringData.recurringPattern === 'weekly' && (
                <div className="form-group">
                  <label>Repeat on days</label>
                  <div className="days-selector">
                    {daysOfWeek.map(day => (
                      <button
                        key={day.value}
                        type="button"
                        className={`day-button ${
                          recurringData.recurringDays.includes(day.value) ? 'selected' : ''
                        }`}
                        onClick={() => handleDayToggle(day.value)}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  <small className="form-hint">
                    Leave empty to repeat every week on the same day
                  </small>
                </div>
              )}

              {/* Custom Interval */}
              {recurringData.recurringPattern === 'custom' && (
                <div className="form-group">
                  <label>Repeat every</label>
                  <div className="interval-input">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={recurringData.recurringInterval}
                      onChange={(e) => setRecurringData(prev => ({
                        ...prev,
                        recurringInterval: parseInt(e.target.value) || 1
                      }))}
                      className="form-input"
                    />
                    <span>day{recurringData.recurringInterval > 1 ? 's' : ''}</span>
                  </div>
                </div>
              )}

              {/* Preview */}
              <div className="form-group">
                <label>Preview</label>
                <div className="recurrence-preview">
                  {getRecurrenceDescription()}
                </div>
              </div>

              {/* Additional Options */}
              <div className="form-group">
                <label className="section-label">When completing recurring tasks:</label>
                <div className="recurring-options">
                  <div className="option-info">
                    <strong>Complete:</strong> Mark this instance done and create the next one
                  </div>
                  <div className="option-info">
                    <strong>Skip:</strong> Mark done without creating next instance
                  </div>
                  <div className="option-info">
                    <strong>Complete All:</strong> Mark the entire series as complete
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="dialog-footer">
          <button className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" onClick={handleSave}>
            Save Settings
          </button>
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
            max-width: 500px;
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

          .form-group {
            margin-bottom: 20px;
          }

          .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: var(--text-primary);
          }

          .section-label {
            font-size: 0.95em;
            color: var(--text-secondary);
            margin-bottom: 12px !important;
          }

          .checkbox-label {
            display: flex;
            align-items: center;
            cursor: pointer;
            font-weight: normal;
          }

          .checkbox-label input[type="checkbox"] {
            margin-right: 12px;
            transform: scale(1.2);
          }

          .form-select, .form-input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            font-size: 14px;
          }

          .form-select:focus, .form-input:focus {
            outline: none;
            border-color: var(--accent-color);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .days-selector {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 8px;
          }

          .day-button {
            padding: 8px 12px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
          }

          .day-button:hover {
            background: var(--bg-hover);
          }

          .day-button.selected {
            background: var(--accent-color);
            color: white;
            border-color: var(--accent-color);
          }

          .interval-input {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .interval-input input {
            width: 80px;
          }

          .form-hint {
            color: var(--text-secondary);
            font-size: 0.85em;
            margin-top: 4px;
          }

          .recurrence-preview {
            padding: 12px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            color: var(--text-primary);
            font-weight: 500;
          }

          .recurring-options {
            background: var(--bg-secondary);
            border-radius: 6px;
            padding: 16px;
          }

          .option-info {
            margin-bottom: 8px;
            font-size: 0.9em;
            color: var(--text-secondary);
          }

          .option-info:last-child {
            margin-bottom: 0;
          }

          .option-info strong {
            color: var(--text-primary);
          }

          .dialog-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 16px 24px 24px;
            border-top: 1px solid var(--border-color);
          }

          .button {
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
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

export default RecurringTaskDialog;
