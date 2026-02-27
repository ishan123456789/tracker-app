import React, { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

const TimeTracker = ({ todo, onUpdate }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(!!todo.timerStarted);

  const startTimer = useMutation(api.todos.startTimer);
  const stopTimer = useMutation(api.todos.stopTimer);
  const updateTimeEstimate = useMutation(api.todos.updateTimeEstimate);

  useEffect(() => {
    let interval;
    if (isRunning && todo.timerStarted) {
      interval = setInterval(() => {
        setCurrentTime(Math.floor((Date.now() - todo.timerStarted) / 1000 / 60));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, todo.timerStarted]);

  useEffect(() => {
    setIsRunning(!!todo.timerStarted);
    if (todo.timerStarted) {
      setCurrentTime(Math.floor((Date.now() - todo.timerStarted) / 1000 / 60));
    } else {
      setCurrentTime(0);
    }
  }, [todo.timerStarted]);

  const handleStartStop = async () => {
    if (isRunning) {
      await stopTimer({ id: todo._id });
      setIsRunning(false);
      setCurrentTime(0);
      onUpdate?.();
    } else {
      await startTimer({ id: todo._id });
      setIsRunning(true);
    }
  };

  const handleEstimateChange = async (minutes) => {
    await updateTimeEstimate({ id: todo._id, estimatedMinutes: minutes });
    onUpdate?.();
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getProgressPercentage = () => {
    if (!todo.estimatedMinutes || todo.estimatedMinutes === 0) return 0;
    return Math.min(((todo.actualMinutes || 0) / todo.estimatedMinutes) * 100, 100);
  };

  const getProgressColor = () => {
    const percentage = getProgressPercentage();
    if (percentage <= 50) return '#10b981'; // green
    if (percentage <= 100) return '#f59e0b'; // yellow
    return '#ef4444'; // red (over estimate)
  };

  return (
    <div className="time-tracker">
      <div className="time-display">
        {/* Current Timer */}
        {isRunning && (
          <div className="current-timer">
            <span className="timer-icon">⏱️</span>
            <span className="timer-text">{formatTime(currentTime)}</span>
          </div>
        )}

        {/* Time Summary */}
        <div className="time-summary">
          {todo.estimatedMinutes && (
            <div className="estimate">
              <span className="label">Est:</span>
              <span className="value">{formatTime(todo.estimatedMinutes)}</span>
            </div>
          )}

          {todo.actualMinutes > 0 && (
            <div className="actual">
              <span className="label">Actual:</span>
              <span className="value">{formatTime(todo.actualMinutes)}</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {todo.estimatedMinutes && todo.actualMinutes > 0 && (
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(getProgressPercentage(), 100)}%`,
                backgroundColor: getProgressColor()
              }}
            />
            <span className="progress-text">
              {Math.round(getProgressPercentage())}%
            </span>
          </div>
        )}
      </div>

      <div className="time-controls">
        {/* Start/Stop Button */}
        <button
          onClick={handleStartStop}
          className={`timer-button ${isRunning ? 'stop' : 'start'}`}
          title={isRunning ? 'Stop Timer' : 'Start Timer'}
        >
          {isRunning ? '⏹️' : '▶️'}
        </button>

        {/* Quick Estimate Buttons */}
        <div className="quick-estimates">
          {[15, 30, 60, 120].map(minutes => (
            <button
              key={minutes}
              onClick={() => handleEstimateChange(minutes)}
              className={`estimate-button ${todo.estimatedMinutes === minutes ? 'active' : ''}`}
              title={`Set estimate to ${formatTime(minutes)}`}
            >
              {formatTime(minutes)}
            </button>
          ))}
        </div>
      </div>

      {/* Time Sessions History */}
      {todo.timerSessions && todo.timerSessions.length > 0 && (
        <details className="time-sessions">
          <summary>
            Time Sessions ({todo.timerSessions.length})
          </summary>
          <div className="sessions-list">
            {todo.timerSessions.map((session, index) => (
              <div key={index} className="session">
                <span className="session-date">
                  {new Date(session.startTime).toLocaleDateString()}
                </span>
                <span className="session-time">
                  {new Date(session.startTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })} - {new Date(session.endTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                <span className="session-duration">
                  {formatTime(session.duration)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      <style>{`
        .time-tracker {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 12px;
          margin: 8px 0;
          font-size: 0.9em;
        }

        .time-display {
          margin-bottom: 12px;
        }

        .current-timer {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
          color: var(--accent-color);
          margin-bottom: 8px;
        }

        .timer-icon {
          font-size: 1.2em;
        }

        .time-summary {
          display: flex;
          gap: 16px;
          margin-bottom: 8px;
        }

        .estimate, .actual {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .label {
          color: var(--text-secondary);
          font-size: 0.85em;
        }

        .value {
          font-weight: 500;
        }

        .progress-bar {
          position: relative;
          height: 6px;
          background: var(--bg-tertiary);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .progress-text {
          position: absolute;
          top: -20px;
          right: 0;
          font-size: 0.75em;
          color: var(--text-secondary);
        }

        .time-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .timer-button {
          background: var(--accent-color);
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 1.1em;
          transition: all 0.2s ease;
        }

        .timer-button:hover {
          transform: scale(1.05);
        }

        .timer-button.stop {
          background: #ef4444;
        }

        .quick-estimates {
          display: flex;
          gap: 4px;
        }

        .estimate-button {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 0.8em;
          transition: all 0.2s ease;
        }

        .estimate-button:hover {
          background: var(--bg-hover);
        }

        .estimate-button.active {
          background: var(--accent-color);
          color: white;
          border-color: var(--accent-color);
        }

        .time-sessions {
          margin-top: 12px;
          border-top: 1px solid var(--border-color);
          padding-top: 8px;
        }

        .time-sessions summary {
          cursor: pointer;
          font-size: 0.85em;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .sessions-list {
          max-height: 120px;
          overflow-y: auto;
        }

        .session {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
          font-size: 0.8em;
          border-bottom: 1px solid var(--border-light);
        }

        .session:last-child {
          border-bottom: none;
        }

        .session-date {
          color: var(--text-secondary);
        }

        .session-time {
          color: var(--text-primary);
        }

        .session-duration {
          font-weight: 500;
          color: var(--accent-color);
        }
      `}</style>
    </div>
  );
};

export default TimeTracker;
