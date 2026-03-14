import React, { useState, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  Box,
  TextField,
  Paper,
  Typography,
  Button,
  Collapse,
  Chip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { parseQuickCapture, formatParsedResult } from '../utils/QuickCaptureParser';

const QuickCapture = () => {
  const [input, setInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addTodo = useMutation(api.todos.add);

  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  const parsed = parseQuickCapture(input);
  const _preview = formatParsedResult(parsed);

  const handleSubmit = useCallback(async () => {
    if (!input.trim()) return;

    setIsSubmitting(true);
    try {
      await addTodo({
        text: parsed.text,
        deadline: parsed.deadline,
        dueTime: parsed.dueTime,
        priority: parsed.priority,
        mainCategory: parsed.mainCategory,
        effortLevel: parsed.effortLevel,
      });
      setInput('');
      setShowPreview(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [input, parsed, addTodo]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  return (
    <Paper
      elevation={1}
      sx={{
        p: isMobile ? 1.5 : 2,
        mb: 2,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box>
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontWeight: 600,
              display: 'block',
              mb: 0.5,
            }}
          >
            ⚡ Quick Capture
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              display: 'block',
              mb: 1,
            }}
          >
            Example: "algorithms tomorrow 7am p1 @learning #deep"
          </Typography>
        </Box>

        <TextField
          fullWidth
          placeholder="Type task with optional: time, priority (p1-p3), category (@), effort (#deep)"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowPreview(e.target.value.length > 0);
          }}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'white',
              '&:hover fieldset': {
                borderColor: 'primary.main',
              },
            },
          }}
          size={isMobile ? 'small' : 'medium'}
        />

        {/* Preview */}
        <Collapse in={showPreview && input.length > 0}>
          <Paper
            sx={{
              p: 1.5,
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 1,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
              📋 Preview:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {parsed.text && (
                <Chip
                  label={`📝 ${parsed.text}`}
                  size="small"
                  variant="outlined"
                  sx={{ maxWidth: '100%' }}
                />
              )}
              {parsed.deadline && (
                <Chip
                  label={`📅 ${new Date(parsed.deadline).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}`}
                  size="small"
                  variant="outlined"
                />
              )}
              {parsed.dueTime && <Chip label={`🕐 ${parsed.dueTime}`} size="small" variant="outlined" />}
              {parsed.priority && (
                <Chip
                  label={`${parsed.priority === 'high' ? '🔴' : parsed.priority === 'medium' ? '🟡' : '🟢'} ${parsed.priority}`}
                  size="small"
                  variant="outlined"
                />
              )}
              {parsed.mainCategory && (
                <Chip label={`📂 ${parsed.mainCategory}`} size="small" variant="outlined" />
              )}
              {parsed.effortLevel && (
                <Chip
                  label={`${
                    parsed.effortLevel === 'deep_work' ? '⚡⚡⚡' : parsed.effortLevel === 'medium' ? '⚡⚡' : '⚡'
                  } ${parsed.effortLevel}`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Paper>
        </Collapse>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          {input && (
            <Button
              size="small"
              onClick={() => {
                setInput('');
                setShowPreview(false);
              }}
              sx={{ color: 'white' }}
            >
              Clear
            </Button>
          )}
          <Button
            variant="contained"
            color="inherit"
            size="small"
            onClick={handleSubmit}
            disabled={!input.trim() || isSubmitting}
            sx={{
              color: '#667eea',
              fontWeight: 600,
            }}
          >
            {isSubmitting ? 'Adding...' : 'Add Task'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default QuickCapture;
