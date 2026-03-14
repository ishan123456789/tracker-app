import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Alert,
  Grid,
} from '@mui/material';
import { Schedule as ClockIcon } from '@mui/icons-material';

const TimeBlockPicker = ({ todo, onSave, onClose }) => {
  const [date, setDate] = useState(todo?.timeBlockDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(todo?.scheduledStart || '09:00');
  const [endTime, setEndTime] = useState(todo?.scheduledEnd || '10:00');
  const [error, setError] = useState('');

  const calculateDuration = () => {
    try {
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const startTotalMin = startHour * 60 + startMin;
      const endTotalMin = endHour * 60 + endMin;
      const duration = endTotalMin - startTotalMin;
      return duration > 0 ? duration : 0;
    } catch {
      return 0;
    }
  };

  const handleSave = () => {
    setError('');

    if (!date) {
      setError('Please select a date');
      return;
    }

    if (!startTime || !endTime) {
      setError('Please select both start and end times');
      return;
    }

    const duration = calculateDuration();
    if (duration <= 0) {
      setError('End time must be after start time');
      return;
    }

    onSave({
      timeBlockDate: date,
      scheduledStart: startTime,
      scheduledEnd: endTime,
    });
  };

  const duration = calculateDuration();
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ClockIcon />
          Schedule Time Block
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {todo?.text}
          </Typography>

          <TextField
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Start Time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="End Time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
          </Grid>

          {duration > 0 && (
            <Box sx={{ p: 1.5, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                ⏱️ Duration: {hours > 0 ? `${hours}h ` : ''}{minutes}m
              </Typography>
            </Box>
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save Time Block
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TimeBlockPicker;
