import React, { useState } from 'react';
import {
  Card, CardContent, Typography, Button, IconButton, TextField, Box,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TableFooter,
  FormControl, InputLabel, Select, MenuItem, Chip, Checkbox, FormControlLabel
} from '@mui/material';
import { Add, Delete, Edit, BarChart, Save, Cancel } from '@mui/icons-material';
import NewSectionForm from './NewSectionForm';
import ConfirmationDialog from './ConfirmationDialog';
import Graph from './Graph';

const Section = ({ section, updateSection, deleteSection }) => {
  const [newEntry, setNewEntry] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [isGraphOpen, setGraphOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editedEntry, setEditedEntry] = useState({});
  const [showAll, setShowAll] = useState(false);

  const handleInputChange = (colName, value) => {
    setNewEntry({ ...newEntry, [colName]: value });
  };

  const addEntry = () => {
    const dateColumn = section.columns.find(col => col.type === 'date');
    const entry = {
      id: new Date().getTime().toString(),
      ...newEntry,
    };

    if (dateColumn) {
      const dateValue = newEntry[dateColumn.name]
        ? newEntry[dateColumn.name]
        : new Date().toISOString().split('T')[0];
      entry[dateColumn.name] = dateValue;
    }

    const updatedEntries = [...section.entries, entry];

    updateSection({
      id: section._id,
      title: section.title,
      columns: section.columns,
      entries: updatedEntries
    });
    setNewEntry({});
    setIsAdding(false);
  };

  const deleteEntry = (entryId) => {
    const updatedEntries = section.entries.filter(entry => entry.id !== entryId);
    updateSection({
      id: section._id,
      title: section.title,
      columns: section.columns,
      entries: updatedEntries
    });
  };

  const handleUpdateSection = (updatedData) => {
    updateSection({
      id: section._id,
      title: updatedData.title,
      columns: updatedData.columns,
      entries: section.entries
    });
    setIsEditing(false);
  };

  const handleDeleteConfirm = () => {
    deleteSection({ id: section._id });
    setConfirmOpen(false);
  };

  const handleAddNewEntry = () => {
    const today = new Date().toISOString().split('T')[0];
    const initialEntry = {};
    section.columns.forEach(col => {
      if (col.type === 'date') {
        initialEntry[col.name] = today;
      } else if (col.type === 'dropdown' && col.allowMultiple) {
        initialEntry[col.name] = [];
      } else {
        initialEntry[col.name] = '';
      }
    });
    setNewEntry(initialEntry);
    setIsAdding(true);
  };

  const handleEditEntry = (entry) => {
    setEditingEntryId(entry.id);
    setEditedEntry({ ...entry });
  };

  const handleSaveEntry = () => {
    const updatedEntries = section.entries.map(entry =>
      entry.id === editingEntryId ? editedEntry : entry
    );
    updateSection({
      id: section._id,
      title: section.title,
      columns: section.columns,
      entries: updatedEntries
    });
    setEditingEntryId(null);
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
    setEditedEntry({});
  };

  const handleEditedInputChange = (colName, value) => {
    setEditedEntry({ ...editedEntry, [colName]: value });
  };

  const dateColumnName = section.columns.find(c => c.type === 'date')?.name;

  const sortedEntries = dateColumnName
    ? [...section.entries].sort((a, b) => new Date(b[dateColumnName]) - new Date(a[dateColumnName]))
    : section.entries;

  const handleQuickAdd = () => {
    const lastEntry = sortedEntries[0];
    if (!lastEntry) return;

    const newEntry = { ...lastEntry };
    newEntry.id = new Date().getTime().toString();

    if (dateColumnName) {
      newEntry[dateColumnName] = new Date().toISOString().split('T')[0];
    }

    const updatedEntries = [...section.entries, newEntry];

    updateSection({
      id: section._id,
      title: section.title,
      columns: section.columns,
      entries: updatedEntries
    });
  };

  const totals = section.columns.reduce((acc, col) => {
    if (col.type === 'number') {
      acc[col.name] = section.entries.reduce((sum, entry) => sum + (Number(entry[col.name]) || 0), 0);
    }
    return acc;
  }, {});

  const totalDays = dateColumnName ? new Set(section.entries.map(e => e[dateColumnName])).size : 0;

  if (isEditing) {
    return (
      <NewSectionForm
        initialData={section}
        onSubmit={handleUpdateSection}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  const renderCellContent = (col, value) => {
    if (col.type === 'date' && value) {
      return new Date(value).toLocaleDateString();
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return value;
  };

  const lastEntry = sortedEntries.length > 0 ? sortedEntries[0] : null;
  const lastEntryLabel = lastEntry
    ? `Quick Add: ${section.columns
        .filter(col => col.type !== 'date' && lastEntry[col.name])
        .map(col => `${col.name}: ${Array.isArray(lastEntry[col.name]) ? lastEntry[col.name].join(', ') : lastEntry[col.name]}`)
        .join(', ')}`
    : 'No entries to quick add';

  const visibleEntries = showAll ? sortedEntries : sortedEntries.slice(0, 3);

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5">{section.title}</Typography>
            <Box>
              <IconButton onClick={() => setGraphOpen(!isGraphOpen)} color="primary" sx={{ mr: 1 }}>
                <BarChart />
              </IconButton>
              <IconButton onClick={() => setIsEditing(true)} color="primary" sx={{ mr: 1 }}>
                <Edit />
              </IconButton>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={isAdding ? () => setIsAdding(false) : handleAddNewEntry}
                sx={{ mr: 1 }}
              >
                {isAdding ? 'Cancel' : 'Add Entry'}
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={() => setConfirmOpen(true)}
              >
                Delete Section
              </Button>
            </Box>
          </Box>

          {section.entries.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={<Checkbox onChange={handleQuickAdd} disabled={!lastEntry} />}
                label={lastEntryLabel}
              />
            </Box>
          )}

          {isGraphOpen && (
            <Box sx={{ mb: 2 }}>
              <Graph data={section.entries} columns={section.columns} />
            </Box>
          )}

          {isAdding && (
            <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>New Entry</Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                {section.columns.map((col, index) => {
                  if (col.type === 'dropdown') {
                    return (
                      <FormControl key={index} fullWidth>
                        <InputLabel>{col.name}</InputLabel>
                        <Select
                          multiple={col.allowMultiple}
                          value={newEntry[col.name] || (col.allowMultiple ? [] : '')}
                          onChange={(e) => handleInputChange(col.name, e.target.value)}
                          label={col.name}
                          renderValue={(selected) => {
                            if (col.allowMultiple) {
                              return (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {(selected || []).map((value) => (
                                    <Chip key={value} label={value} />
                                  ))}
                                </Box>
                              );
                            }
                            return selected;
                          }}
                        >
                          {(col.options || []).map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    );
                  }
                  return (
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
                  );
                })}
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
                  {visibleEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      {editingEntryId === entry.id ? (
                        <>
                          {section.columns.map((col, index) => (
                            <TableCell key={index}>
                              {col.type === 'dropdown' ? (
                                <FormControl fullWidth variant="standard">
                                  <Select
                                    multiple={col.allowMultiple}
                                    value={editedEntry[col.name] || (col.allowMultiple ? [] : '')}
                                    onChange={(e) => handleEditedInputChange(col.name, e.target.value)}
                                  >
                                    {(col.options || []).map(option => (
                                      <MenuItem key={option} value={option}>{option}</MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              ) : (
                                <TextField
                                  value={editedEntry[col.name] || ''}
                                  onChange={(e) => handleEditedInputChange(col.name, e.target.value)}
                                  type={col.type === 'duration' ? 'text' : col.type}
                                  fullWidth
                                  variant="standard"
                                />
                              )}
                            </TableCell>
                          ))}
                          <TableCell>
                            <IconButton onClick={handleSaveEntry} color="primary"><Save /></IconButton>
                            <IconButton onClick={handleCancelEdit} color="secondary"><Cancel /></IconButton>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          {section.columns.map((col, index) => (
                            <TableCell key={index}>
                              {renderCellContent(col, entry[col.name])}
                            </TableCell>
                          ))}
                          <TableCell>
                            <IconButton onClick={() => handleEditEntry(entry)} color="primary"><Edit /></IconButton>
                            <IconButton onClick={() => deleteEntry(entry.id)} color="error"><Delete /></IconButton>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell><strong>Total</strong></TableCell>
                    {section.columns.slice(1).map((col, index) => (
                      <TableCell key={index} align="right">
                        <strong>{totals[col.name] ? `${col.name}: ${totals[col.name]}` : ''}</strong>
                      </TableCell>
                    ))}
                    <TableCell align="right"><strong>Total Days: {totalDays}</strong></TableCell>
                    {sortedEntries.length > 3 && (
                      <TableCell colSpan={section.columns.length + 1} align="center">
                        <Button onClick={() => setShowAll(!showAll)}>
                          {showAll ? 'Show Less' : 'View All'}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                </TableFooter>
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