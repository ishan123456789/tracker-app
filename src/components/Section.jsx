import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Card, CardContent, Typography, Button, IconButton, TextField, Box,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';

const Section = ({ section, updateSection, deleteSection }) => {
  const [newEntry, setNewEntry] = useState({});
  const [isAdding, setIsAdding] = useState(false);

  const handleInputChange = (colName, value) => {
    setNewEntry({ ...newEntry, [colName]: value });
  };

  const addEntry = () => {
    const entry = {
      id: uuidv4(),
      ...newEntry,
      date: newEntry.date || new Date().toISOString().split('T')[0]
    };

    const updatedSection = {
      ...section,
      entries: [...section.entries, entry]
    };

    updateSection(section.id, updatedSection);
    setNewEntry({});
    setIsAdding(false);
  };

  const deleteEntry = (entryId) => {
    const updatedSection = {
      ...section,
      entries: section.entries.filter(entry => entry.id !== entryId)
    };
    updateSection(section.id, updatedSection);
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">{section.title}</Typography>
          <Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setIsAdding(!isAdding)}
              sx={{ mr: 1 }}
            >
              {isAdding ? 'Cancel' : 'Add Entry'}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => deleteSection(section.id)}
            >
              Delete Section
            </Button>
          </Box>
        </Box>

        {isAdding && (
          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>New Entry</Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              {section.columns.map((col, index) => (
                <TextField
                  key={index}
                  label={col.name}
                  type={col.type}
                  value={newEntry[col.name] || ''}
                  onChange={(e) => handleInputChange(col.name, e.target.value)}
                  variant="outlined"
                  fullWidth
                  InputLabelProps={col.type === 'date' ? { shrink: true } : {}}
                />
              ))}
              <Button onClick={addEntry} variant="contained" color="primary">
                Save Entry
              </Button>
            </Box>
          </Paper>
        )}

        {section.entries.length > 0 ? (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  {section.columns.map((col, index) => (
                    <TableCell key={index}>{col.name}</TableCell>
                  ))}
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {section.entries.map((entry) => (
                  <TableRow key={entry.id}>
                    {section.columns.map((col, index) => (
                      <TableCell key={index}>
                        {col.type === 'date'
                          ? new Date(entry[col.name]).toLocaleDateString()
                          : entry[col.name]}
                      </TableCell>
                    ))}
                    <TableCell>
                      <IconButton onClick={() => deleteEntry(entry.id)} color="error">
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography>No entries yet. Click "Add Entry" to get started.</Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default Section;

