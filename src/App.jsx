import React from 'react';
import SectionList from './components/SectionList.jsx';
import DailyActivityReport from './components/DailyActivityReport.jsx';
import {
  Container, Typography, AppBar, Toolbar, CssBaseline, Box, Paper
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div">
            Activity Tracker
          </Typography>
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





