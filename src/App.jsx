import React, { useState } from 'react';
import SectionList from './components/SectionList.jsx';
import TodoList from './components/TodoList.jsx';
import FocusMode from './components/FocusMode.jsx';
import AnalyticsDashboard from './components/AnalyticsDashboard.jsx';
import ProductivityInsights from './components/ProductivityInsights.jsx';
import GoalTracker from './components/GoalTracker.jsx';
import ReportGenerator from './components/ReportGenerator.jsx';
import ActivityCategorySettings from './components/ActivityCategorySettings.jsx';
import RecurringHabitTracker from './components/RecurringHabitTracker.jsx';
import {
  Container, Typography, AppBar, Toolbar, CssBaseline, Box, Paper, Button, IconButton, Tabs, Tab,
  useMediaQuery, useTheme, Drawer, List, ListItem, ListItemIcon, ListItemText, Menu, MenuItem,
  BottomNavigation, BottomNavigationAction
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import {
  Brightness4, Brightness7, CenterFocusStrong, Analytics, Psychology, EmojiEvents, Assessment, Home,
  Menu as MenuIcon, MoreVert, Loop as LoopIcon
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
    { label: 'Habits', icon: <LoopIcon />, component: 'habits' },
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
          mt: isMobile ? 1.5 : 4,
          mb: isMobile ? 2 : 4,
          px: isMobile ? 1 : 3,
          /* Push content above fixed bottom nav on mobile */
          pb: isMobile ? '72px' : 0
        }}
        className={isMobile ? 'mobile-content-padding' : ''}
      >
        {/* Desktop Navigation Tabs — hidden on mobile (bottom nav used instead) */}
        {!isMobile && (
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="fullWidth"
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': {
                  minHeight: 64,
                  fontSize: '0.9375rem',
                  px: 2
                }
              }}
            >
              {tabs.map((tab, index) => (
                <Tab
                  key={index}
                  icon={tab.icon}
                  label={tab.label}
                  iconPosition="start"
                  sx={{
                    minHeight: 64,
                    '& .MuiTab-iconWrapper': { marginRight: 1 }
                  }}
                />
              ))}
            </Tabs>
          </Paper>
        )}

        {/* Tab Content */}
        {activeTab === 0 && (
          <Paper
            elevation={0}
            sx={{
              p: isMobile ? 1.5 : 3,
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
              <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ mb: 1.5, fontWeight: 600 }}>
                📊 Productivity Dashboard
              </Typography>
              {/* Stats grid — 2 cols on mobile, auto-fit on desktop */}
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                  md: 'repeat(auto-fit, minmax(160px, 1fr))'
                },
                gap: { xs: 1, sm: 1.5, md: 2 }
              }}>
                <Box sx={{
                  textAlign: 'center',
                  p: { xs: 1, sm: 1.5 },
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  boxShadow: 1
                }}>
                  <Typography variant={isMobile ? "h5" : "h4"} color="primary" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{stats.active}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Active Tasks</Typography>
                </Box>
                <Box sx={{
                  textAlign: 'center',
                  p: { xs: 1, sm: 1.5 },
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  boxShadow: 1
                }}>
                  <Typography variant={isMobile ? "h5" : "h4"} color="success.main" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{stats.completed}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Completed</Typography>
                </Box>
                <Box sx={{
                  textAlign: 'center',
                  p: { xs: 1, sm: 1.5 },
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  boxShadow: 1
                }}>
                  <Typography variant={isMobile ? "h5" : "h4"} color="error.main" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{stats.overdue}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Overdue</Typography>
                </Box>
                <Box sx={{
                  textAlign: 'center',
                  p: { xs: 1, sm: 1.5 },
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  boxShadow: 1
                }}>
                  <Typography variant={isMobile ? "h5" : "h4"} color="info.main" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{stats.recurring}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Recurring</Typography>
                </Box>
                <Box sx={{
                  textAlign: 'center',
                  p: { xs: 1, sm: 1.5 },
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  boxShadow: 1
                }}>
                  <Typography variant={isMobile ? "h5" : "h4"} color="warning.main" sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: { xs: '1.1rem', sm: '1.5rem', md: '2rem' } }}>{formatTime(stats.totalEstimatedTime)}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Est. Left</Typography>
                </Box>
                <Box sx={{
                  textAlign: 'center',
                  p: { xs: 1, sm: 1.5 },
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  boxShadow: 1
                }}>
                  <Typography variant={isMobile ? "h5" : "h4"} color="secondary.main" sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: { xs: '1.1rem', sm: '1.5rem', md: '2rem' } }}>{formatTime(stats.totalActualTime)}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>Tracked</Typography>
                </Box>
              </Box>
            </Box>

            {/* Quick Actions — 2×2 grid on mobile, row on desktop */}
            <Box sx={{
              mb: isMobile ? 2 : 3,
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)'
              },
              gap: { xs: 1, sm: 1.5, md: 2 }
            }}>
              <Button
                variant="contained"
                onClick={() => handleFocusMode()}
                startIcon={<CenterFocusStrong />}
                sx={{ minHeight: 48, fontSize: { xs: '0.85rem', sm: '0.9rem' } }}
              >
                Focus Mode
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
                sx={{ minHeight: 48, fontSize: { xs: '0.85rem', sm: '0.9rem' } }}
              >
                🎲 Random
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
                sx={{ minHeight: 48, fontSize: { xs: '0.85rem', sm: '0.9rem' } }}
              >
                🔥 Priority
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
                sx={{ minHeight: 48, fontSize: { xs: '0.85rem', sm: '0.9rem' } }}
              >
                ⚠️ Overdue
              </Button>
            </Box>

            {/* Main Content */}
            <TodoList onFocusMode={handleFocusMode} />

            <Box sx={{ mt: 3 }}>
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

        {/* Habits Tab */}
        {activeTab === 4 && <RecurringHabitTracker />}

        {/* Reports Tab */}
        {activeTab === 5 && <ReportGenerator />}
      </Container>

      {/* Mobile Bottom Navigation Bar */}
      {isMobile && (
        <Paper
          className="mobile-bottom-nav"
          elevation={3}
        >
          <BottomNavigation
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            showLabels
            sx={{
              height: 56,
              '& .MuiBottomNavigationAction-root': {
                minWidth: 0,
                padding: '6px 4px 8px',
                fontSize: '0.65rem',
                color: 'text.secondary',
              },
              '& .MuiBottomNavigationAction-root.Mui-selected': {
                color: 'primary.main',
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.65rem !important',
                marginTop: '2px',
              },
            }}
          >
            <BottomNavigationAction label="Tasks" icon={<Home sx={{ fontSize: 22 }} />} />
            <BottomNavigationAction label="Analytics" icon={<Analytics sx={{ fontSize: 22 }} />} />
            <BottomNavigationAction label="Insights" icon={<Psychology sx={{ fontSize: 22 }} />} />
            <BottomNavigationAction label="Goals" icon={<EmojiEvents sx={{ fontSize: 22 }} />} />
            <BottomNavigationAction label="Habits" icon={<LoopIcon sx={{ fontSize: 22 }} />} />
            <BottomNavigationAction label="Reports" icon={<Assessment sx={{ fontSize: 22 }} />} />
          </BottomNavigation>
        </Paper>
      )}

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
