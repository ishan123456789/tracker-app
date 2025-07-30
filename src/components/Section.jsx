import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Card, CardContent, Typography, Button, IconButton, TextField, Box,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import NewSectionForm from './NewSectionForm';
import ConfirmationDialog from './ConfirmationDialog'; // Import the dialog

const Section = ({ section, updateSection, deleteSection }) => {
  const [newEntry, setNewEntry] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmOpen, setConfirmOpen] = useState(false); // State for confirm dialog

  const handleInputChange = (colName, value) => {
    setNewEntry({ ...newEntry, [colName]: value });
  };

  const addEntry = () => {
    const dateColumn = section.columns.find(col => col.type === 'date');
    const dateValue = dateColumn && newEntry[dateColumn.name]
      ? newEntry[dateColumn.name]
      : new Date().toISOString().split('T')[0];

    const entry = {
      id: uuidv4(),
      ...newEntry,
      date: dateValue,
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

  const handleUpdateSection = (updatedData) => {
    const updatedSection = {
      ...section,
      title: updatedData.title,
      columns: updatedData.columns,
    };
    updateSection(section.id, updatedSection);
    setIsEditing(false);
  };

  const handleDeleteConfirm = () => {
    deleteSection(section.id);
    setConfirmOpen(false);
  };

  if (isEditing) {
    return (
      <NewSectionForm
        initialData={section}
        onSubmit={handleUpdateSection}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5">{section.title}</Typography>
            <Box>
              <IconButton onClick={() => setIsEditing(true)} color="primary" sx={{ mr: 1 }}>
                <Edit />
              </IconButton>
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
                onClick={() => setConfirmOpen(true)} // Open confirm dialog
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
                    type={col.type === 'duration' ? 'text' : col.type}
                    value={newEntry[col.name] || ''}
                    onChange={(e) => handleInputChange(col.name, e.target.value)}
                    variant="outlined"
                    fullWidth
                    InputLabelProps={col.type === 'date' || col.type === 'time' ? { shrink: true } : {}}
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
                    <tr key={entry.id}>
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
                    </tr>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography>No entries yet. Click "Add Entry" to get started.</Typography>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={isConfirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirm Deletion"
        description={`Are you sure you want to delete the "${section.title}" section? This action cannot be undone.`}
      />
    </>
  );
};

export default Section;

