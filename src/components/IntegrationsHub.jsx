import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
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
  Alert,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import {
  Google as GoogleIcon,
  GitHub as GitHubIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Sync as SyncIcon,
  Webhook as WebhookIcon,
  ImportExport as ImportExportIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
} from '@mui/icons-material';

const IntegrationsHub = () => {
  const { currentWorkspace, hasWorkspaceRole } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [configDialog, setConfigDialog] = useState({ open: false, integration: null });
  const [webhookDialog, setWebhookDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);

  // Queries
  const integrations = useQuery(
    api.integrations.getWorkspaceIntegrations,
    currentWorkspace ? { workspaceId: currentWorkspace._id } : "skip"
  );

  const webhooks = useQuery(
    api.integrations.getWorkspaceWebhooks,
    currentWorkspace && hasWorkspaceRole('admin') ? { workspaceId: currentWorkspace._id } : "skip"
  );

  // Mutations
  const createIntegration = useMutation(api.integrations.createIntegration);
  const updateIntegration = useMutation(api.integrations.updateIntegration);
  const deleteIntegration = useMutation(api.integrations.deleteIntegration);
  const createWebhook = useMutation(api.integrations.createWebhook);

  const availableIntegrations = [
    {
      type: 'google_calendar',
      name: 'Google Calendar',
      description: 'Sync tasks with Google Calendar events',
      icon: <GoogleIcon />,
      color: '#4285f4',
      features: ['Two-way sync', 'Deadline management', 'Event creation'],
    },
    {
      type: 'slack',
      name: 'Slack',
      description: 'Send notifications and create tasks from Slack',
      icon: <Avatar sx={{ bgcolor: '#4A154B', width: 24, height: 24 }}>S</Avatar>,
      color: '#4A154B',
      features: ['Notifications', 'Task creation', 'Status updates'],
    },
    {
      type: 'github',
      name: 'GitHub',
      description: 'Link tasks with GitHub issues and PRs',
      icon: <GitHubIcon />,
      color: '#333',
      features: ['Issue tracking', 'PR management', 'Commit linking'],
    },
    {
      type: 'outlook',
      name: 'Microsoft Outlook',
      description: 'Sync with Outlook calendar and tasks',
      icon: <Avatar sx={{ bgcolor: '#0078d4', width: 24, height: 24 }}>O</Avatar>,
      color: '#0078d4',
      features: ['Calendar sync', 'Email integration', 'Task sync'],
    },
    {
      type: 'zapier',
      name: 'Zapier',
      description: 'Connect with 3000+ apps via Zapier',
      icon: <Avatar sx={{ bgcolor: '#ff4a00', width: 24, height: 24 }}>Z</Avatar>,
      color: '#ff4a00',
      features: ['Custom workflows', 'Automation', 'Multi-app integration'],
    },
  ];

  const getIntegrationStatus = (type) => {
    return integrations?.find(i => i.type === type);
  };

  const handleToggleIntegration = async (type, enabled) => {
    const existingIntegration = getIntegrationStatus(type);

    if (enabled && !existingIntegration) {
      // Create new integration
      setConfigDialog({ open: true, integration: { type, isNew: true } });
    } else if (existingIntegration) {
      // Update existing integration
      await updateIntegration({
        integrationId: existingIntegration._id,
        isActive: enabled,
      });
    }
  };

  const handleConfigureIntegration = (integration) => {
    setConfigDialog({ open: true, integration });
  };

  const handleDeleteIntegration = async (integrationId) => {
    if (window.confirm('Are you sure you want to delete this integration?')) {
      await deleteIntegration({ integrationId });
    }
  };

  const renderIntegrationCard = (integrationDef) => {
    const status = getIntegrationStatus(integrationDef.type);
    const isActive = status?.isActive || false;
    const isConfigured = !!status;

    return (
      <Card key={integrationDef.type} sx={{ height: '100%' }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Box sx={{ color: integrationDef.color, mr: 2 }}>
              {integrationDef.icon}
            </Box>
            <Box flex={1}>
              <Typography variant="h6" component="h3">
                {integrationDef.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {integrationDef.description}
              </Typography>
            </Box>
            {hasWorkspaceRole('admin') && (
              <FormControlLabel
                control={
                  <Switch
                    checked={isActive}
                    onChange={(e) => handleToggleIntegration(integrationDef.type, e.target.checked)}
                  />
                }
                label=""
              />
            )}
          </Box>

          <Box mb={2}>
            {integrationDef.features.map((feature) => (
              <Chip
                key={feature}
                label={feature}
                size="small"
                variant="outlined"
                sx={{ mr: 0.5, mb: 0.5 }}
              />
            ))}
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              {isConfigured ? (
                <Chip
                  label={isActive ? "Active" : "Inactive"}
                  color={isActive ? "success" : "default"}
                  size="small"
                />
              ) : (
                <Chip label="Not configured" color="default" size="small" />
              )}
            </Box>

            {hasWorkspaceRole('admin') && isConfigured && (
              <Box>
                <IconButton
                  size="small"
                  onClick={() => handleConfigureIntegration(status)}
                  sx={{ mr: 1 }}
                >
                  <SettingsIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDeleteIntegration(status._id)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (!currentWorkspace) {
    return (
      <Box p={3}>
        <Alert severity="info">
          Please select a workspace to manage integrations.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Integrations Hub
        </Typography>
        {hasWorkspaceRole('admin') && (
          <Box>
            <Button
              variant="outlined"
              startIcon={<ImportExportIcon />}
              onClick={() => setImportDialog(true)}
              sx={{ mr: 1 }}
            >
              Import/Export
            </Button>
            <Button
              variant="outlined"
              startIcon={<WebhookIcon />}
              onClick={() => setWebhookDialog(true)}
            >
              Webhooks
            </Button>
          </Box>
        )}
      </Box>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Available Integrations" />
        <Tab label="Active Integrations" />
        {hasWorkspaceRole('admin') && <Tab label="Webhooks" />}
      </Tabs>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          {availableIntegrations.map((integration) => (
            <Grid item xs={12} md={6} lg={4} key={integration.type}>
              {renderIntegrationCard(integration)}
            </Grid>
          ))}
        </Grid>
      )}

      {activeTab === 1 && (
        <Box>
          {integrations?.filter(i => i.isActive).length > 0 ? (
            <Grid container spacing={3}>
              {integrations
                .filter(i => i.isActive)
                .map((integration) => {
                  const def = availableIntegrations.find(d => d.type === integration.type);
                  return (
                    <Grid item xs={12} md={6} lg={4} key={integration._id}>
                      <Card>
                        <CardContent>
                          <Box display="flex" alignItems="center" mb={2}>
                            <Box sx={{ color: def?.color, mr: 2 }}>
                              {def?.icon}
                            </Box>
                            <Box flex={1}>
                              <Typography variant="h6">
                                {integration.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Last sync: {integration.lastSync
                                  ? new Date(integration.lastSync).toLocaleString()
                                  : 'Never'
                                }
                              </Typography>
                            </Box>
                            <IconButton size="small">
                              <SyncIcon />
                            </IconButton>
                          </Box>
                          <Chip label="Active" color="success" size="small" />
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
            </Grid>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No active integrations
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enable integrations from the Available Integrations tab
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {activeTab === 2 && hasWorkspaceRole('admin') && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Webhooks</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setWebhookDialog(true)}
            >
              Add Webhook
            </Button>
          </Box>

          {webhooks?.length > 0 ? (
            <List>
              {webhooks.map((webhook) => (
                <ListItem key={webhook._id}>
                  <ListItemText
                    primary={webhook.url}
                    secondary={`Events: ${webhook.events.join(', ')}`}
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={webhook.isActive ? "Active" : "Inactive"}
                      color={webhook.isActive ? "success" : "default"}
                      size="small"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <WebhookIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No webhooks configured
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add webhooks to receive real-time notifications
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* Integration Configuration Dialog */}
      <Dialog
        open={configDialog.open}
        onClose={() => setConfigDialog({ open: false, integration: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Configure {availableIntegrations.find(i => i.type === configDialog.integration?.type)?.name}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Integration configuration would be implemented here with OAuth flows and API key management.
          </Alert>
          <TextField
            fullWidth
            label="Integration Name"
            defaultValue={configDialog.integration?.name || ''}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="API Key / Token"
            type="password"
            placeholder="Enter your API credentials"
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialog({ open: false, integration: null })}>
            Cancel
          </Button>
          <Button variant="contained">
            Save Configuration
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import/Export Dialog */}
      <Dialog
        open={importDialog}
        onClose={() => setImportDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Import/Export Data</DialogTitle>
        <DialogContent>
          <Box display="flex" gap={2} mb={3}>
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              fullWidth
            >
              Import from Todoist
            </Button>
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              fullWidth
            >
              Import from Asana
            </Button>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<CloudDownloadIcon />}
              fullWidth
            >
              Export to JSON
            </Button>
            <Button
              variant="outlined"
              startIcon={<CloudDownloadIcon />}
              fullWidth
            >
              Export to CSV
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IntegrationsHub;
