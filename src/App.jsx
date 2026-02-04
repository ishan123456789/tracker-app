import React, { useState } from 'react';
import SectionList from './components/SectionList.jsx';
import TodoList from './components/TodoList.jsx';
import FocusMode from './components/FocusMode.jsx';
import AnalyticsDashboard from './components/AnalyticsDashboard.jsx';
import ProductivityInsights from './components/ProductivityInsights.jsx';
import GoalTracker from './components/GoalTracker.jsx';
import ReportGenerator from './components/ReportGenerator.jsx';
import ActivityCategorySettings from './components/ActivityCategorySettings.jsx';
import {
  Container, Typography, AppBar, Toolbar, CssBaseline, Box, Paper, Button, IconButton, Tabs, Tab,
  useMediaQuery, useTheme, Drawer, List, ListItem, ListItemIcon, ListItemText, Menu, MenuItem
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import {
  Brightness4, Brightness7, CenterFocusStrong, Analytics, Psychology, EmojiEvents, Assessment, Home,
  Menu as MenuIcon, MoreVert
} from '@mui/icons-material';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { ThemeContextProvider, useThemeMode } from './contexts/ThemeContext.jsx';

const AppContent = () => {
  const [focusMode, setFocusMode] = useState(false);
  const [focusedTodo, setFocusedTodo] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showActivitySettings, setShowActivitySettings] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileStatsMenuAnchor, setMobileStatsMenuAnchor] = useState(null);

  const sections = useQuery(api.sections.get) || [];
  const todos = useQuery(api.todos.get) || [];
  const addSection = useMutation(api.sections.add);
  const updateSection = useMutation(api.sections.update);
  const deleteSection = useMutation(api.sections.remove);
  const { darkMode, toggleDarkMode, theme } = useThemeMode();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  const tabs = [
    { label: 'Dashboard', icon: <Home />, component: 'dashboard' },
    { label: 'Analytics', icon: <Analytics />, component: 'analytics' },
    { label: 'Insights', icon: <Psychology />, component: 'insights' },
    { label: 'Goals', icon: <EmojiEvents />, component: 'goals' },
    { label: 'Reports', icon: <Assessment />, component: 'reports' }
  ];

  const handleFocusMode = (todo = null) => {
    setFocusedTodo(todo);
    setFocusMode(true);
  };

  const handleCloseFocusMode = () => {
    setFocusMode(false);
    setFocusedTodo(null);
  };

  const handleExportCsv = () => {
    const allHeaders = new Set();
    sections.forEach(section => {
      section.columns.forEach(col => allHeaders.add(col.name));
    });

    const headers = ['Section Title', ...Array.from(allHeaders)];

    const escapeCsvCell = (cell) => {
      if (cell === null || cell === undefined) {
        return '';
      }
      let cellString = Array.isArray(cell) ? cell.join('; ') : String(cell);
      if (cellString.includes(',') || cellString.includes('"') || cellString.includes('\n')) {
        cellString = `"${cellString.replace(/"/g, '""')}"`;
      }
      return cellString;
    };

    const csvRows = [headers.map(escapeCsvCell).join(',')];

    sections.forEach(section => {
      section.entries.forEach(entry => {
        const row = [section.title];
        Array.from(allHeaders).forEach(header => {
          row.push(entry[header]);
        });
        csvRows.push(row.map(escapeCsvCell).join(','));
      });
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'activity_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getProductivityStats = () => {
    const activeTodos = todos.filter(todo => !todo.done);
    const completedTodos = todos.filter(todo => todo.done);
    const overdueTodos = activeTodos.filter(todo =>
      todo.deadline && new Date(todo.deadline) < new Date()
    );
    const recurringTodos = todos.filter(todo => todo.isRecurring);
    const todosWithTimer = todos.filter(todo =>
      todo.timerStarted || (todo.actualMinutes && todo.actualMinutes > 0)
    );

    const totalEstimatedTime = activeTodos.reduce((sum, todo) =>
      sum + (todo.estimatedMinutes || 0), 0
    );
    const totalActualTime = todos.reduce((sum, todo) =>
      sum + (todo.actualMinutes || 0), 0
    );

    return {
      active: activeTodos.length,
      completed: completedTodos.length,
      overdue: overdueTodos.length,
      recurring: recurringTodos.length,
      withTimer: todosWithTimer.length,
      totalEstimatedTime,
      totalActualTime
    };
  };

  const stats = getProductivityStats();

  const formatTime = (minutes) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar sx={{ minHeight: isMobile ? 56 : 64 }}>
          <Typography
            variant={isMobile ? "h6" : "h6"}
            component="div"
            sx={{
              flexGrow: 1,
              fontSize: isMobile ? '1.1rem' : '1.25rem',
              fontWeight: 500
            }}
          >
            {isMobile ? "Tracker" : "Productivity Tracker"}
          </Typography>

          {/* Desktop Productivity Stats */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 2, mr: 2, fontSize: '0.9rem' }}>
              <span>Active: {stats.active}</span>
              <span>Completed: {stats.completed}</span>
              {stats.overdue > 0 && (
                <span style={{ color: '#ff5252' }}>Overdue: {stats.overdue}</span>
              )}
              <span>Time: {formatTime(stats.totalActualTime)}</span>
            </Box>
          )}

          {/* Mobile Stats Menu */}
          {isMobile && (
            <IconButton
              color="inherit"
              onClick={(e) => setMobileStatsMenuAnchor(e.currentTarget)}
              sx={{ mr: 1 }}
              aria-label="view stats"
            >
              <MoreVert />
            </IconButton>
          )}

          <IconButton
            color="inherit"
            onClick={() => handleFocusMode()}
            sx={{ mr: isMobile ? 1 : 2 }}
            aria-label="focus mode"
            title="Focus Mode (F)"
          >
            <CenterFocusStrong />
          </IconButton>

          <IconButton
            color="inherit"
            onClick={toggleDarkMode}
            sx={{ mr: isMobile ? 0 : 2 }}
            aria-label="toggle dark mode"
          >
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>

          {/* Desktop Buttons */}
          {!isMobile && (
            <>
              <Button color="inherit" onClick={handleExportCsv}>
                Export to CSV
              </Button>

              <Button color="inherit" onClick={() => setShowActivitySettings(true)}>
                Activity Settings
              </Button>
            </>
          )}

          {/* Mobile Menu */}
          {isMobile && (
            <IconButton
              color="inherit"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="open menu"
            >
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Stats Menu */}
      <Menu
        anchorEl={mobileStatsMenuAnchor}
        open={Boolean(mobileStatsMenuAnchor)}
        onClose={() => setMobileStatsMenuAnchor(null)}
        PaperProps={{
          sx: { minWidth: 200 }
        }}
      >
        <MenuItem disabled>
          <Typography variant="body2">Active: {stats.active}</Typography>
        </MenuItem>
        <MenuItem disabled>
          <Typography variant="body2">Completed: {stats.completed}</Typography>
        </MenuItem>
        {stats.overdue > 0 && (
          <MenuItem disabled>
            <Typography variant="body2" color="error">Overdue: {stats.overdue}</Typography>
          </MenuItem>
        )}
        <MenuItem disabled>
          <Typography variant="body2">Time: {formatTime(stats.totalActualTime)}</Typography>
        </MenuItem>
      </Menu>

      {/* Mobile Drawer Menu */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      >
        <Box sx={{ width: 250, pt: 2 }}>
          <List>
            <ListItem button onClick={() => { handleExportCsv(); setMobileMenuOpen(false); }}>
              <ListItemText primary="Export to CSV" />
            </ListItem>
            <ListItem button onClick={() => { setShowActivitySettings(true); setMobileMenuOpen(false); }}>
              <ListItemText primary="Activity Settings" />
            </ListItem>
          </List>
        </Box>
      </Drawer>

      <Container
        maxWidth="lg"
        sx={{
          mt: isMobile ? 2 : 4,
          mb: isMobile ? 2 : 4,
          px: isMobile ? 1 : 3
        }}
      >
        {/* Navigation Tabs */}
        <Paper sx={{ mb: isMobile ? 2 : 3 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons={isMobile ? "auto" : false}
            allowScrollButtonsMobile={isMobile}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                minHeight: isMobile ? 48 : 64,
                fontSize: isMobile ? '0.875rem' : '0.9375rem',
                minWidth: isMobile ? 'auto' : 'inherit',
                px: isMobile ? 1 : 2
              }
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={isMobile ? null : tab.icon}
                label={isMobile ? tab.label.split(' ')[0] : tab.label}
                iconPosition={isMobile ? "top" : "start"}
                sx={{
                  minHeight: isMobile ? 48 : 64,
                  '& .MuiTab-iconWrapper': {
                    marginBottom: isMobile ? 0.5 : 0,
                    marginRight: isMobile ? 0 : 1
                  }
                }}
              />
            ))}
          </Tabs>
        </Paper>

        {/* Tab Content */}
        {activeTab === 0 && (
          <Paper
            elevation={0}
            sx={{
              p: isMobile ? 2 : 3,
              borderRadius: 2,
              bgcolor: 'background.paper'
            }}
          >
            {/* Productivity Dashboard */}
            <Box sx={{
              mb: isMobile ? 2 : 3,
              p: isMobile ? 1.5 : 2,
              bgcolor: 'background.default',
              borderRadius: 1
            }}>
              <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ mb: 2 }}>
                📊 Productivity Dashboard
              </Typography>
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: isMobile
                  ? 'repeat(2, 1fr)'
                  : 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: isMobile ? 1.5 : 2
              }}>
                <Box sx={{ textAlign: 'center', p: isMobile ? 1 : 0 }}>
                  <Typography variant={isMobile ? "h5" : "h4"} color="primary">{stats.active}</Typography>
                  <Typography variant={isMobile ? "caption" : "body2"} color="text.secondary">Active Tasks</Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: isMobile ? 1 : 0 }}>
                  <Typography variant={isMobile ? "h5" : "h4"} color="success.main">{stats.completed}</Typography>
                  <Typography variant={isMobile ? "caption" : "body2"} color="text.secondary">Completed</Typography>
                </Box>
                {stats.overdue > 0 && (
                  <Box sx={{ textAlign: 'center', p: isMobile ? 1 : 0 }}>
                    <Typography variant={isMobile ? "h5" : "h4"} color="error.main">{stats.overdue}</Typography>
                    <Typography variant={isMobile ? "caption" : "body2"} color="text.secondary">Overdue</Typography>
                  </Box>
                )}
                <Box sx={{ textAlign: 'center', p: isMobile ? 1 : 0 }}>
                  <Typography variant={isMobile ? "h5" : "h4"} color="info.main">{stats.recurring}</Typography>
                  <Typography variant={isMobile ? "caption" : "body2"} color="text.secondary">Recurring</Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: isMobile ? 1 : 0 }}>
                  <Typography variant={isMobile ? "h5" : "h4"} color="warning.main">{formatTime(stats.totalEstimatedTime)}</Typography>
                  <Typography variant={isMobile ? "caption" : "body2"} color="text.secondary">Est. Time Left</Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: isMobile ? 1 : 0 }}>
                  <Typography variant={isMobile ? "h5" : "h4"} color="secondary.main">{formatTime(stats.totalActualTime)}</Typography>
                  <Typography variant={isMobile ? "caption" : "body2"} color="text.secondary">Time Tracked</Typography>
                </Box>
              </Box>
            </Box>

            {/* Quick Actions */}
            <Box sx={{
              mb: isMobile ? 2 : 3,
              display: 'flex',
              gap: isMobile ? 1 : 2,
              flexWrap: 'wrap',
              flexDirection: isMobile ? 'column' : 'row'
            }}>
              <Button
                variant="contained"
                onClick={() => handleFocusMode()}
                startIcon={!isMobile ? <CenterFocusStrong /> : null}
                fullWidth={isMobile}
                sx={{
                  minHeight: isMobile ? 48 : 'auto',
                  fontSize: isMobile ? '1rem' : 'inherit'
                }}
              >
                {isMobile ? '🎯 Focus Mode' : 'Focus Mode'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  const activeTodos = todos.filter(todo => !todo.done);
                  if (activeTodos.length > 0) {
                    const randomTodo = activeTodos[Math.floor(Math.random() * activeTodos.length)];
                    handleFocusMode(randomTodo);
                  }
                }}
                fullWidth={isMobile}
                sx={{
                  minHeight: isMobile ? 48 : 'auto',
                  fontSize: isMobile ? '1rem' : 'inherit'
                }}
              >
                🎲 Random Task
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  const highPriorityTodos = todos.filter(todo => !todo.done && todo.priority === 'high');
                  if (highPriorityTodos.length > 0) {
                    handleFocusMode(highPriorityTodos[0]);
                  }
                }}
                disabled={!todos.some(todo => !todo.done && todo.priority === 'high')}
                fullWidth={isMobile}
                sx={{
                  minHeight: isMobile ? 48 : 'auto',
                  fontSize: isMobile ? '1rem' : 'inherit'
                }}
              >
                🔥 High Priority
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  const overdueTodos = todos.filter(todo =>
                    !todo.done && todo.deadline && new Date(todo.deadline) < new Date()
                  );
                  if (overdueTodos.length > 0) {
                    handleFocusMode(overdueTodos[0]);
                  }
                }}
                disabled={stats.overdue === 0}
                fullWidth={isMobile}
                sx={{
                  minHeight: isMobile ? 48 : 'auto',
                  fontSize: isMobile ? '1rem' : 'inherit'
                }}
              >
                ⚠️ Overdue
              </Button>
            </Box>

            {/* Main Content */}
            <TodoList onFocusMode={handleFocusMode} />

            <Box sx={{ mt: 4 }}>
              <SectionList
                sections={sections}
                addSection={addSection}
                updateSection={updateSection}
                deleteSection={deleteSection}
              />
            </Box>
          </Paper>
        )}

        {/* Analytics Tab */}
        {activeTab === 1 && <AnalyticsDashboard />}

        {/* Insights Tab */}
        {activeTab === 2 && <ProductivityInsights />}

        {/* Goals Tab */}
        {activeTab === 3 && <GoalTracker />}

        {/* Reports Tab */}
        {activeTab === 4 && <ReportGenerator />}
      </Container>

      {/* Focus Mode */}
      <FocusMode
        isOpen={focusMode}
        onClose={handleCloseFocusMode}
        selectedTodo={focusedTodo}
      />

      {/* Activity Category Settings */}
      <ActivityCategorySettings
        isOpen={showActivitySettings}
        onClose={() => setShowActivitySettings(false)}
      />

      {/* Global Keyboard Shortcuts */}
      <Box
        component="div"
        onKeyDown={(e) => {
          // Global shortcuts
          if (e.key === 'F' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const isInInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
            if (!isInInput) {
              e.preventDefault();
              handleFocusMode();
            }
          }
        }}
        tabIndex={-1}
        sx={{ outline: 'none' }}
      />
    </ThemeProvider>
  );
};

function App() {
  return (
    <ThemeContextProvider>
      <AppContent />
    </ThemeContextProvider>
  );
}

export default App;
