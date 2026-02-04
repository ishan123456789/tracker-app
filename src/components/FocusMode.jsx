import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

const FocusMode = ({ isOpen, onClose, selectedTodo = null }) => {
  const [currentTodo, setCurrentTodo] = useState(selectedTodo);
  const [timerMode, setTimerMode] = useState('custom'); // 'pomodoro', 'custom', 'stopwatch'
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(25);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  const todos = useQuery(api.todos.get);
  const startTimer = useMutation(api.todos.startTimer);
  const stopTimer = useMutation(api.todos.stopTimer);

  const activeTodos = todos?.filter(todo => !todo.done) || [];

  useEffect(() => {
    if (selectedTodo) {
      setCurrentTodo(selectedTodo);
    }
  }, [selectedTodo]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleTimerComplete = () => {
    setIsRunning(false);
    playNotificationSound();

    if (timerMode === 'pomodoro') {
      if (isBreak) {
        // Break finished, start work session
        setIsBreak(false);
        setTimeLeft(25 * 60);
      } else {
        // Work session finished
        setPomodoroCount(prev => prev + 1);
        const newCount = pomodoroCount + 1;

        if (newCount % 4 === 0) {
          // Long break after 4 pomodoros
          setTimeLeft(15 * 60);
          setIsBreak(true);
        } else {
          // Short break
          setTimeLeft(5 * 60);
          setIsBreak(true);
        }
      }
    }
  };

  const playNotificationSound = () => {
    if (!soundEnabled) return;

    try {
      // Create a pleasant notification sound sequence
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Play a sequence of tones
      const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 - pleasant chord

      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = freq;
        oscillator.type = 'sine';

        const startTime = audioContext.currentTime + (index * 0.2);
        const endTime = startTime + 0.4;

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);

        oscillator.start(startTime);
        oscillator.stop(endTime);
      });

      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification('Focus Timer Complete!', {
          body: isBreak ? 'Break time is over!' : 'Work session completed!',
          icon: '/favicon.ico'
        });
      }
    } catch (error) {
      console.log('Audio notification failed:', error);
      // Fallback to browser alert
      alert('Timer completed!');
    }
  };

  const handleStartStop = async () => {
    if (isRunning) {
      setIsRunning(false);
      if (currentTodo && timerMode !== 'stopwatch') {
        await stopTimer({ id: currentTodo._id });
      }
    } else {
      setIsRunning(true);
      if (currentTodo && timerMode !== 'stopwatch') {
        await startTimer({ id: currentTodo._id });
      }
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    if (timerMode === 'pomodoro') {
      setTimeLeft(isBreak ? (pomodoroCount % 4 === 0 ? 15 * 60 : 5 * 60) : 25 * 60);
    } else if (timerMode === 'custom') {
      setTimeLeft(customMinutes * 60);
    } else {
      setTimeLeft(0);
    }
  };

  const handleModeChange = (mode) => {
    setTimerMode(mode);
    setIsRunning(false);
    setIsBreak(false);

    switch (mode) {
      case 'pomodoro':
        setTimeLeft(25 * 60);
        break;
      case 'custom':
        setTimeLeft(customMinutes * 60);
        break;
      case 'stopwatch':
        setTimeLeft(0);
        break;
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    const sign = seconds < 0 ? '-' : '';
    return `${sign}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (timerMode === 'stopwatch') return 0;

    const totalTime = timerMode === 'pomodoro'
      ? (isBreak ? (pomodoroCount % 4 === 0 ? 15 * 60 : 5 * 60) : 25 * 60)
      : customMinutes * 60;

    return ((totalTime - timeLeft) / totalTime) * 100;
  };

  if (!isOpen) return null;

  return (
    <div className="focus-mode-overlay">
      <div className="focus-mode-container">
        {/* Header */}
        <div className="focus-header">
          <h2>Focus Mode</h2>
          <div className="header-controls">
            <button
              className="settings-button"
              onClick={() => setShowSettings(!showSettings)}
            >
              ⚙️
            </button>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="settings-panel">
            <div className="timer-modes">
              <button
                className={`mode-button ${timerMode === 'pomodoro' ? 'active' : ''}`}
                onClick={() => handleModeChange('pomodoro')}
              >
                🍅 Pomodoro
              </button>
              <button
                className={`mode-button ${timerMode === 'custom' ? 'active' : ''}`}
                onClick={() => handleModeChange('custom')}
              >
                ⏱️ Custom Timer
              </button>
              <button
                className={`mode-button ${timerMode === 'stopwatch' ? 'active' : ''}`}
                onClick={() => handleModeChange('stopwatch')}
              >
                ⏲️ Stopwatch
              </button>
            </div>

            {timerMode === 'custom' && (
              <div className="custom-timer-settings">
                <label>
                  Duration (minutes):
                  <div className="timer-input-group">
                    <button
                      className="timer-adjust-btn"
                      onClick={() => {
                        const newMinutes = Math.max(1, customMinutes - 5);
                        setCustomMinutes(newMinutes);
                        if (!isRunning) setTimeLeft(newMinutes * 60);
                      }}
                    >
                      -5
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={customMinutes}
                      onChange={(e) => {
                        const minutes = parseInt(e.target.value) || 1;
                        setCustomMinutes(minutes);
                        if (!isRunning) {
                          setTimeLeft(minutes * 60);
                        }
                      }}
                    />
                    <button
                      className="timer-adjust-btn"
                      onClick={() => {
                        const newMinutes = Math.min(120, customMinutes + 5);
                        setCustomMinutes(newMinutes);
                        if (!isRunning) setTimeLeft(newMinutes * 60);
                      }}
                    >
                      +5
                    </button>
                  </div>
                </label>
              </div>
            )}

            <div className="sound-settings">
              <label className="sound-toggle">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                />
                <span className="sound-label">
                  {soundEnabled ? '🔊' : '🔇'} Sound notifications
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Current Task */}
        <div className="current-task-section">
          <h3>Current Task</h3>
          {currentTodo ? (
            <div className="current-task">
              <span className="task-text">{currentTodo.text}</span>
              <button
                className="change-task-button"
                onClick={() => setCurrentTodo(null)}
              >
                Change
              </button>
            </div>
          ) : (
            <div className="task-selector">
              <select
                onChange={(e) => {
                  const todoId = e.target.value;
                  const todo = activeTodos.find(t => t._id === todoId);
                  setCurrentTodo(todo);
                }}
                value=""
              >
                <option value="">Select a task to focus on...</option>
                {activeTodos.map(todo => (
                  <option key={todo._id} value={todo._id}>
                    {todo.text}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Timer Display */}
        <div className="timer-section">
          {timerMode === 'pomodoro' && (
            <div className="pomodoro-info">
              <div className="session-type">
                {isBreak ? (
                  pomodoroCount % 4 === 0 ? 'Long Break' : 'Short Break'
                ) : 'Focus Session'}
              </div>
              <div className="pomodoro-count">
                Pomodoros completed: {pomodoroCount}
              </div>
            </div>
          )}

          <div className="timer-display">
            <div className="time-text">
              {formatTime(timeLeft)}
            </div>

            {timerMode !== 'stopwatch' && (
              <div className="progress-ring">
                <svg className="progress-svg" viewBox="0 0 140 140">
                  <circle
                    className="progress-background"
                    cx="70"
                    cy="70"
                    r="60"
                  />
                  <circle
                    className="progress-foreground"
                    cx="70"
                    cy="70"
                    r="60"
                    style={{
                      strokeDasharray: `${2 * Math.PI * 60}`,
                      strokeDashoffset: `${2 * Math.PI * 60 * (1 - getProgressPercentage() / 100)}`
                    }}
                  />
                </svg>
              </div>
            )}
          </div>

          <div className="timer-controls">
            <button
              className={`control-button primary ${isRunning ? 'stop' : 'start'}`}
              onClick={handleStartStop}
            >
              {isRunning ? '⏸️ Pause' : '▶️ Start'}
            </button>
            <button
              className="control-button secondary"
              onClick={handleReset}
            >
              🔄 Reset
            </button>
          </div>
        </div>

        {/* Focus Tips */}
        <div className="focus-tips">
          <h4>Focus Tips</h4>
          <ul>
            <li>🔕 Turn off notifications</li>
            <li>📱 Put your phone in another room</li>
            <li>💧 Keep water nearby</li>
            <li>🎯 Focus on one task at a time</li>
            {timerMode === 'pomodoro' && (
              <li>🍅 Take breaks seriously - they're part of the technique</li>
            )}
          </ul>
        </div>

        <style jsx>{`
          .focus-mode-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
          }

          .focus-mode-container {
            background: var(--bg-primary);
            border-radius: 16px;
            padding: 32px;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          }

          .focus-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
          }

          .focus-header h2 {
            margin: 0;
            color: var(--text-primary);
            font-size: 1.5rem;
          }

          .header-controls {
            display: flex;
            gap: 8px;
          }

          .settings-button, .close-button {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: var(--text-secondary);
            padding: 8px;
            border-radius: 6px;
            transition: all 0.2s ease;
          }

          .settings-button:hover, .close-button:hover {
            background: var(--bg-hover);
          }

          .settings-panel {
            background: var(--bg-secondary);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
          }

          .timer-modes {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
          }

          .mode-button {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--bg-primary);
            color: var(--text-primary);
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.2s ease;
          }

          .mode-button:hover {
            background: var(--bg-hover);
          }

          .mode-button.active {
            background: var(--accent-color);
            color: white;
            border-color: var(--accent-color);
          }

          .custom-timer-settings {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .custom-timer-settings label {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--text-primary);
          }

          .custom-timer-settings input {
            width: 60px;
            padding: 4px 8px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            background: var(--bg-primary);
            color: var(--text-primary);
          }

          .current-task-section {
            margin-bottom: 32px;
          }

          .current-task-section h3 {
            margin: 0 0 12px 0;
            color: var(--text-primary);
            font-size: 1.1rem;
          }

          .current-task {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: var(--bg-secondary);
            border-radius: 8px;
            border: 1px solid var(--border-color);
          }

          .task-text {
            color: var(--text-primary);
            font-weight: 500;
          }

          .change-task-button {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 4px 8px;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 0.85rem;
          }

          .change-task-button:hover {
            background: var(--bg-hover);
          }

          .task-selector select {
            width: 100%;
            padding: 12px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            font-size: 1rem;
          }

          .timer-section {
            text-align: center;
            margin-bottom: 32px;
          }

          .pomodoro-info {
            margin-bottom: 16px;
          }

          .session-type {
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--accent-color);
            margin-bottom: 4px;
          }

          .pomodoro-count {
            font-size: 0.9rem;
            color: var(--text-secondary);
          }

          .timer-display {
            position: relative;
            display: inline-block;
            margin-bottom: 24px;
          }

          .time-text {
            font-size: 3rem;
            font-weight: 300;
            color: var(--text-primary);
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
          }

          .progress-ring {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 220px;
            height: 220px;
            pointer-events: none;
          }

          .progress-svg {
            width: 100%;
            height: 100%;
            transform: rotate(-90deg);
          }

          .progress-background {
            fill: none;
            stroke: var(--bg-tertiary);
            stroke-width: 4;
          }

          .progress-foreground {
            fill: none;
            stroke: var(--accent-color);
            stroke-width: 4;
            stroke-linecap: round;
            transition: stroke-dashoffset 1s ease;
          }

          .timer-controls {
            display: flex;
            gap: 16px;
            justify-content: center;
          }

          .control-button {
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
            font-size: 1rem;
          }

          .control-button.primary {
            background: var(--accent-color);
            color: white;
          }

          .control-button.primary:hover {
            background: var(--accent-hover);
            transform: translateY(-1px);
          }

          .control-button.primary.stop {
            background: #ef4444;
          }

          .control-button.secondary {
            background: var(--bg-secondary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
          }

          .control-button.secondary:hover {
            background: var(--bg-hover);
          }

          .focus-tips {
            background: var(--bg-secondary);
            border-radius: 8px;
            padding: 16px;
          }

          .focus-tips h4 {
            margin: 0 0 12px 0;
            color: var(--text-primary);
            font-size: 1rem;
          }

          .focus-tips ul {
            margin: 0;
            padding-left: 0;
            list-style: none;
          }

          .focus-tips li {
            margin-bottom: 8px;
            color: var(--text-secondary);
            font-size: 0.9rem;
          }

          .focus-tips li:last-child {
            margin-bottom: 0;
          }

          .timer-input-group {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 8px;
          }

          .timer-adjust-btn {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 4px 8px;
            color: var(--text-primary);
            cursor: pointer;
            font-size: 0.9rem;
            min-width: 32px;
            transition: all 0.2s ease;
          }

          .timer-adjust-btn:hover {
            background: var(--bg-hover);
          }

          .sound-settings {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--border-color);
          }

          .sound-toggle {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            color: var(--text-primary);
          }

          .sound-toggle input[type="checkbox"] {
            margin: 0;
          }

          .sound-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
          }
        `}</style>
      </div>
    </div>
  );
};

export default FocusMode;
