import React from 'react';
import SectionList from './components/SectionList.jsx';
import DailyActivityReport from './components/DailyActivityReport.jsx';
import {
  Container, Typography, AppBar, Toolbar, CssBaseline, Box, Paper, Button
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

// A custom theme for this app
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f4f6f8',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
    h4: {
      fontWeight: 600,
    },
  },
});

function App() {
  const sections = useQuery(api.sections.get) || [];
  const addSection = useMutation(api.sections.add);
  const updateSection = useMutation(api.sections.update);
  const deleteSection = useMutation(api.sections.remove);

  const handleExportCsv = () => {
    const allHeaders = new Set();
    sections.forEach(section => {
      section.columns.forEach(col => allHeaders.add(col.name));
    });

    const headers = ['Section Title', ...Array.from(allHeaders)];
    const csvRows = [headers.join(',')];

    sections.forEach(section => {
      section.entries.forEach(entry => {
        const row = [section.title];
        Array.from(allHeaders).forEach(header => {
          row.push(entry[header] || '');
        });
        csvRows.push(row.join(','));
      });
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'activity_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Daily Activity Tracker
          </Typography>
          <Button color="inherit" onClick={handleExportCsv}>Export to CSV</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
          <SectionList
            sections={sections}
            addSection={addSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
          />
          <DailyActivityReport sections={sections} />
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

export default App;





