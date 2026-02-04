import React, { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  Tabs,
  Tab,
  Paper,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  SmartToy as SmartToyIcon,
  AutoAwesome as AutoAwesomeIcon,
  Schedule as ScheduleIcon,
  Category as CategoryIcon,
  Priority as PriorityIcon,
  ExpandMore as ExpandMoreIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  Lightbulb as LightbulbIcon,
} from '@mui/icons-material';

const AutomationRules = () => {
  const { currentWorkspace, currentUser, hasWorkspaceRole } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [ruleDialog, setRuleDialog] = useState({ open: false, rule: null });
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    trigger: { type: 'todo_created', conditions: {} },
    actions: [{ type: 'set_category', parameters: {} }],
  });

  // Queries
  const automationRules = useQuery(
    api.automation.getWorkspaceAutomationRules,
    currentWorkspace ? { workspaceId: currentWorkspace._id } : "skip"
  );

  const aiSuggestions = useQuery(
    api.automation.getUserAISuggestions,
    { limit: 10 }
  );

  // Mutations
  const createAutomationRule = useMutation(api.automation.createAutomationRule);
  const updateAutomationRule = useMutation(api.automation.updateAutomationRule);
  const deleteAutomationRule = useMutation(api.automation.deleteAutomationRule);
  const acceptAISuggestion = useMutation(api.automation.acceptAISuggestion);

  // Actions
  const generateTaskSuggestions = useAction(api.automation.generateTaskSuggestions);
  const analyzeTaskPatterns = useAction(api.automation.analyzeTaskPatterns);
  const categorizeTask = useAction(api.automation.categorizeTask);

  const triggerTypes = [
    { value: 'todo_created', label: 'When a task is created' },
    { value: 'todo_completed', label: 'When a task is completed' },
    { value: 'deadline_approaching', label: 'When deadline is approaching' },
    { value: 'task_overdue', label: 'When a task becomes overdue' },
    { value: 'user_assigned', label: 'When a user is assigned' },
  ];

  const actionTypes = [
    { value: 'set_category', label: 'Set category' },
    { value: 'set_priority', label: 'Set priority' },
    { value: 'assign_user', label: 'Assign to user' },
    { value: 'send_notification', label: 'Send notification' },
    { value: 'create_subtask', label: 'Create subtask' },
    { value: 'set_deadline', label: 'Set deadline' },
  ];

  const handleCreateRule = async () => {
    try {
      await createAutomationRule({
        workspaceId: currentWorkspace._id,
        name: newRule.name,
        description: newRule.description,
        trigger: newRule.trigger,
        actions: newRule.actions,
      });
      setRuleDialog({ open: false, rule: null });
      setNewRule({
        name: '',
        description: '',
        trigger: { type: 'todo_created', conditions: {} },
        actions: [{ type: 'set_category', parameters: {} }],
      });
    } catch (error) {
      console.error('Error creating automation rule:', error);
    }
  };

  const handleToggleRule = async (ruleId, isActive) => {
    try {
      await updateAutomationRule({
        ruleId,
        isActive,
      });
    } catch (error) {
      console.error('Error toggling automation rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (window.confirm('Are you sure you want to delete this automation rule?')) {
      try {
        await deleteAutomationRule({ ruleId });
      } catch (error) {
        console.error('Error deleting automation rule:', error);
      }
    }
  };

  const handleAcceptSuggestion = async (suggestionId) => {
    try {
      await acceptAISuggestion({ suggestionId });
    } catch (error) {
      console.error('Error accepting suggestion:', error);
    }
  };

  const handleGenerateSuggestions = async () => {
    try {
      await generateTaskSuggestions({
        workspaceId: currentWorkspace._id,
        userId: currentUser._id,
      });
    } catch (error) {
      console.error('Error generating suggestions:', error);
    }
  };

  const handleAnalyzePatterns = async () => {
    try {
      const insights = await analyzeTaskPatterns({
        workspaceId: currentWorkspace._id,
        userId: currentUser._id,
      });
      console.log('Task patterns:', insights);
    } catch (error) {
      console.error('Error analyzing patterns:', error);
    }
  };

  const getSuggestionIcon = (type) => {
    const icons = {
      task_categorization: <CategoryIcon />,
      deadline_suggestion: <ScheduleIcon />,
      priority_suggestion: <PriorityIcon />,
      similar_tasks: <TrendingUpIcon />,
    };
    return icons[type] || <LightbulbIcon />;
  };

  const getSuggestionColor = (confidence) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'default';
  };

  if (!currentWorkspace) {
    return (
      <Box p={3}>
        <Alert severity="info">
          Please select a workspace to manage automation rules.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Smart Automation
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<PsychologyIcon />}
            onClick={handleAnalyzePatterns}
            sx={{ mr: 1 }}
          >
            Analyze Patterns
          </Button>
          <Button
            variant="outlined"
            startIcon={<AutoAwesomeIcon />}
            onClick={handleGenerateSuggestions}
            sx={{ mr: 1 }}
          >
            Get Suggestions
          </Button>
          {hasWorkspaceRole('admin') && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setRuleDialog({ open: true, rule: null })}
            >
              Create Rule
            </Button>
          )}
        </Box>
      </Box>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Automation Rules" icon={<SmartToyIcon />} />
        <Tab label="AI Suggestions" icon={<AutoAwesomeIcon />} />
        <Tab label="Pattern Analysis" icon={<TrendingUpIcon />} />
      </Tabs>

      {activeTab === 0 && (
        <Box>
          {automationRules?.length > 0 ? (
            <Grid container spacing={3}>
              {automationRules.map((rule) => (
                <Grid item xs={12} md={6} lg={4} key={rule._id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Box flex={1}>
                          <Typography variant="h6" gutterBottom>
                            {rule.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {rule.description}
                          </Typography>
                        </Box>
                        {hasWorkspaceRole('admin') && (
                          <FormControlLabel
                            control={
                              <Switch
                                checked={rule.isActive}
                                onChange={(e) => handleToggleRule(rule._id, e.target.checked)}
                              />
                            }
                            label=""
                          />
                        )}
                      </Box>

                      <Box mb={2}>
                        <Typography variant="subtitle2" gutterBottom>
                          Trigger:
                        </Typography>
                        <Chip
                          label={triggerTypes.find(t => t.value === rule.trigger.type)?.label || rule.trigger.type}
                          size="small"
                          variant="outlined"
                        />
                      </Box>

                      <Box mb={2}>
                        <Typography variant="subtitle2" gutterBottom>
                          Actions:
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={0.5}>
                          {rule.actions.map((action, index) => (
                            <Chip
                              key={index}
                              label={actionTypes.find(a => a.value === action.type)?.label || action.type}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </Box>

                      {hasWorkspaceRole('admin') && (
                        <Box display="flex" justifyContent="flex-end">
                          <IconButton
                            size="small"
                            onClick={() => setRuleDialog({ open: true, rule })}
                            sx={{ mr: 1 }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteRule(rule._id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <SmartToyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No automation rules yet
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Create automation rules to streamline your workflow
              </Typography>
              {hasWorkspaceRole('admin') && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setRuleDialog({ open: true, rule: null })}
                >
                  Create Your First Rule
                </Button>
              )}
            </Paper>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          {aiSuggestions?.length > 0 ? (
            <List>
              {aiSuggestions.map((suggestion) => (
                <Card key={suggestion._id} sx={{ mb: 2 }}>
                  <CardContent>
                    <ListItem sx={{ px: 0 }}>
                      <Box sx={{ mr: 2, color: 'primary.main' }}>
                        {getSuggestionIcon(suggestion.type)}
                      </Box>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1">
                              {suggestion.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Typography>
                            <Chip
                              label={`${Math.round(suggestion.confidence * 100)}% confidence`}
                              size="small"
                              color={getSuggestionColor(suggestion.confidence)}
                            />
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {JSON.stringify(suggestion.suggestion, null, 2)}
                          </Typography>
                        }
                      />
                      <ListItemSecondaryAction>
                        {!suggestion.isAccepted && (
                          <Button
                            size="small"
                            onClick={() => handleAcceptSuggestion(suggestion._id)}
                          >
                            Accept
                          </Button>
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                  </CardContent>
                </Card>
              ))}
            </List>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <AutoAwesomeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No AI suggestions available
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Generate suggestions based on your task patterns
              </Typography>
              <Button
                variant="contained"
                startIcon={<AutoAwesomeIcon />}
                onClick={handleGenerateSuggestions}
              >
                Generate Suggestions
              </Button>
            </Paper>
          )}
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            Pattern analysis helps you understand your productivity trends and optimize your workflow.
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Productivity Patterns
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Analyze when you're most productive and optimize your schedule accordingly.
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<TrendingUpIcon />}
                    onClick={handleAnalyzePatterns}
                    fullWidth
                  >
                    Analyze My Patterns
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Task Categorization
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Get smart suggestions for categorizing your tasks automatically.
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<CategoryIcon />}
                    fullWidth
                  >
                    Test Categorization
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Create/Edit Rule Dialog */}
      <Dialog
        open={ruleDialog.open}
        onClose={() => setRuleDialog({ open: false, rule: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {ruleDialog.rule ? 'Edit Automation Rule' : 'Create Automation Rule'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Rule Name"
            value={newRule.name}
            onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />

          <TextField
            fullWidth
            label="Description"
            multiline
            rows={2}
            value={newRule.description}
            onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
            sx={{ mb: 3 }}
          />

          <Typography variant="h6" gutterBottom>
            Trigger
          </Typography>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>When this happens</InputLabel>
            <Select
              value={newRule.trigger.type}
              onChange={(e) => setNewRule({
                ...newRule,
                trigger: { ...newRule.trigger, type: e.target.value }
              })}
            >
              {triggerTypes.map((trigger) => (
                <MenuItem key={trigger.value} value={trigger.value}>
                  {trigger.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography variant="h6" gutterBottom>
            Actions
          </Typography>
          {newRule.actions.map((action, index) => (
            <FormControl fullWidth key={index} sx={{ mb: 2 }}>
              <InputLabel>Action {index + 1}</InputLabel>
              <Select
                value={action.type}
                onChange={(e) => {
                  const newActions = [...newRule.actions];
                  newActions[index] = { ...action, type: e.target.value };
                  setNewRule({ ...newRule, actions: newActions });
                }}
              >
                {actionTypes.map((actionType) => (
                  <MenuItem key={actionType.value} value={actionType.value}>
                    {actionType.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleDialog({ open: false, rule: null })}>
            Cancel
          </Button>
          <Button onClick={handleCreateRule} variant="contained">
            {ruleDialog.rule ? 'Update' : 'Create'} Rule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AutomationRules;
