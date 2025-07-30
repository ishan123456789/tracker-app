import React, { useState, useEffect } from 'react';
import {
  TextField, Button, Select, MenuItem, IconButton, Box, Typography,
  Paper, FormControl, InputLabel
} from '@mui/material';
import { AddCircleOutline, RemoveCircleOutline } from '@mui/icons-material';

const NewSectionForm = ({ onSubmit, onCancel, initialData }) => {
  const [title, setTitle] = useState('');
  const [columns, setColumns] = useState([
    { name: 'Date', type: 'date' }
  ]);

  const isEditMode = Boolean(initialData);

  useEffect(() => {
    if (isEditMode) {
      setTitle(initialData.title);
      setColumns(initialData.columns);
    }
  }, [initialData, isEditMode]);

  const addColumn = () => {
    setColumns([...columns, { name: '', type: 'text' }]);
  };

  const updateColumn = (index, field, value) => {
    const updatedColumns = [...columns];
    updatedColumns[index][field] = value;
    setColumns(updatedColumns);
  };

  const removeColumn = (index) => {
    if (columns.length <= 1) return;
    setColumns(columns.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ title, columns });
  };

  return (
    <Paper elevation={3} sx={{ padding: 4, margin: 'auto', maxWidth: 600, mt: 2, mb: 2 }}>
      <Typography variant="h5" component="h3" gutterBottom>
        {isEditMode ? 'Edit Section' : 'Create New Section'}
      </Typography>
      <form onSubmit={handleSubmit}>
        <Box mb={3}>
          <TextField
            label="Section Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            variant="outlined"
          />
        </Box>

        <Typography variant="h6" gutterBottom>
          Columns
        </Typography>
        {columns.map((col, index) => (
          <Box key={index} display="flex" alignItems="center" mb={2}>
            <TextField
              label="Column Name"
              value={col.name}
              onChange={(e) => updateColumn(index, 'name', e.target.value)}
              placeholder="E.g., Exercise, Duration"
              required
              variant="outlined"
              sx={{ flexGrow: 1, mr: 1 }}
            />
            <FormControl variant="outlined" sx={{ minWidth: 120, mr: 1 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={col.type}
                onChange={(e) => updateColumn(index, 'type', e.target.value)}
                label="Type"
              >
                <MenuItem value="text">Text</MenuItem>
                <MenuItem value="number">Number</MenuItem>
                <MenuItem value="date">Date</MenuItem>
                <MenuItem value="duration">Duration</MenuItem>
              </Select>
            </FormControl>
            <IconButton
              onClick={() => removeColumn(index)}
              disabled={columns.length <= 1}
              color="error"
            >
              <RemoveCircleOutline />
            </IconButton>
          </Box>
        ))}

        <Button
          type="button"
          onClick={addColumn}
          startIcon={<AddCircleOutline />}
          variant="outlined"
          sx={{ mb: 3 }}
        >
          Add Column
        </Button>

        <Box display="flex" justifyContent="flex-end" gap={1}>
          <Button type="button" onClick={onCancel} variant="outlined">
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="primary">
            {isEditMode ? 'Save Changes' : 'Create'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default NewSectionForm;

