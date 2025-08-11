import React from 'react';
import {
  Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Box, List, ListItem, ListItemText,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const DailyActivityReport = ({ sections }) => {
  const allDates = sections.flatMap(section => {
    const dateColumn = section.columns.find(c => c.type === 'date');
    if (!dateColumn) {
      return [];
    }
    return section.entries.map(entry => entry[dateColumn.name]).filter(Boolean);
  });
  const uniqueDates = [...new Set(allDates)].sort((a, b) => new Date(b) - new Date(a));

  if (uniqueDates.length === 0) {
    return (
      <Box mt={5}>
        <Typography variant="h5" gutterBottom>
          Activity Report
        </Typography>
        <Typography>No entries found to generate a report.</Typography>
      </Box>
    );
  }

  return (
    <Box mt={5}>
      <Typography variant="h5" gutterBottom>
        Activity Report
      </Typography>
      {uniqueDates.map(date => {
        const dailyActivities = sections.map(section => {
          const dateColumn = section.columns.find(c => c.type === 'date');
          let entriesForDate = [];
          if (dateColumn) {
            entriesForDate = section.entries.filter(entry => entry[dateColumn.name] === date);
          }
          return {
            sectionTitle: section.title,
            entries: entriesForDate,
            columns: section.columns
          };
        });

        return (
          <Accordion key={date} defaultExpanded={date === new Date().toISOString().split('T')[0]}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">{new Date(date.replace(/-/g, '/')).toLocaleDateString()}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Section</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dailyActivities.map((activity, index) => (
                      <TableRow key={index}>
                        <TableCell>{activity.sectionTitle}</TableCell>
                        <TableCell>
                          {activity.entries.length > 0 ? (
                            <Typography color="green">Completed ({activity.entries.length})</Typography>
                          ) : (
                            <Typography color="red">No Entry</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {activity.entries.length > 0 ? (
                            <List dense>
                              {activity.entries.map((entry, entryIndex) => (
                                <ListItem key={entryIndex} disableGutters>
                                  <ListItemText
                                    primary={
                                      activity.columns
                                        .map(col => col.type !== 'date' && `${col.name}: ${entry[col.name] || 'N/A'}`)
                                        .filter(Boolean)
                                        .join(', ')
                                    }
                                  />
                                </ListItem>
                              ))}
                            </List>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

export default DailyActivityReport;
