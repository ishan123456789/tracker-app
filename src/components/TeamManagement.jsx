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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Avatar,
  Grid,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  Group as GroupIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';

const TeamManagement = () => {
  const { currentWorkspace, currentUser, hasWorkspaceRole } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [inviteUserOpen, setInviteUserOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', description: '', color: '#1976d2' });
  const [inviteData, setInviteData] = useState({ email: '', role: 'viewer' });

  // Queries
  const teams = useQuery(
    api.teams.getWorkspaceTeams,
    currentWorkspace ? { workspaceId: currentWorkspace._id } : "skip"
  );

  const workspaceMembers = useQuery(
    api.teams.getWorkspaceMembers,
    currentWorkspace ? { workspaceId: currentWorkspace._id } : "skip"
  );

  // Mutations
  const createTeam = useMutation(api.teams.createTeam);
  const inviteToWorkspace = useMutation(api.teams.inviteToWorkspace);
  const addTeamMember = useMutation(api.teams.addTeamMember);
  const removeTeamMember = useMutation(api.teams.removeTeamMember);

  const handleCreateTeam = async () => {
    try {
      await createTeam({
        workspaceId: currentWorkspace._id,
        name: newTeam.name,
        description: newTeam.description,
        color: newTeam.color,
      });
      setCreateTeamOpen(false);
      setNewTeam({ name: '', description: '', color: '#1976d2' });
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  const handleInviteUser = async () => {
    try {
      await inviteToWorkspace({
        workspaceId: currentWorkspace._id,
        email: inviteData.email,
        role: inviteData.role,
      });
      setInviteUserOpen(false);
      setInviteData({ email: '', role: 'viewer' });
    } catch (error) {
      console.error('Error inviting user:', error);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      owner: 'error',
      admin: 'warning',
      editor: 'primary',
      viewer: 'default',
      lead: 'secondary',
      member: 'default',
    };
    return colors[role] || 'default';
  };

  if (!currentWorkspace) {
    return (
      <Box p={3}>
        <Alert severity="info">
          Please select a workspace to manage teams.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Team Management
        </Typography>
        <Box>
          {hasWorkspaceRole('editor') && (
            <>
              <Button
                variant="outlined"
                startIcon={<PersonAddIcon />}
                onClick={() => setInviteUserOpen(true)}
                sx={{ mr: 1 }}
              >
                Invite User
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateTeamOpen(true)}
              >
                Create Team
              </Button>
            </>
          )}
        </Box>
      </Box>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Teams" icon={<GroupIcon />} />
        <Tab label="Workspace Members" icon={<BusinessIcon />} />
      </Tabs>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          {teams?.map((team) => (
            <Grid item xs={12} md={6} lg={4} key={team._id}>
              <TeamCard
                team={team}
                currentUser={currentUser}
                hasWorkspaceRole={hasWorkspaceRole}
                addTeamMember={addTeamMember}
                removeTeamMember={removeTeamMember}
                workspaceMembers={workspaceMembers}
              />
            </Grid>
          ))}
          {teams?.length === 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <GroupIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No teams yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Create your first team to start collaborating
                  </Typography>
                  {hasWorkspaceRole('editor') && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setCreateTeamOpen(true)}
                    >
                      Create Team
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Workspace Members ({workspaceMembers?.length || 0})
            </Typography>
            <List>
              {workspaceMembers?.map((member) => (
                <ListItem key={member._id}>
                  <Avatar sx={{ mr: 2 }}>
                    {member.name?.charAt(0).toUpperCase()}
                  </Avatar>
                  <ListItemText
                    primary={member.name}
                    secondary={member.email}
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={member.workspaceRole}
                      color={getRoleColor(member.workspaceRole)}
                      size="small"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Create Team Dialog */}
      <Dialog open={createTeamOpen} onClose={() => setCreateTeamOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Team</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Team Name"
            fullWidth
            variant="outlined"
            value={newTeam.name}
            onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newTeam.description}
            onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Color"
            type="color"
            value={newTeam.color}
            onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })}
            sx={{ width: 100 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateTeamOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateTeam} variant="contained" disabled={!newTeam.name}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={inviteUserOpen} onClose={() => setInviteUserOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite User to Workspace</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={inviteData.email}
            onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            select
            margin="dense"
            label="Role"
            fullWidth
            variant="outlined"
            value={inviteData.role}
            onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
            SelectProps={{ native: true }}
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            {hasWorkspaceRole('owner') && <option value="admin">Admin</option>}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteUserOpen(false)}>Cancel</Button>
          <Button onClick={handleInviteUser} variant="contained" disabled={!inviteData.email}>
            Send Invitation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const TeamCard = ({ team, currentUser, hasWorkspaceRole, addTeamMember, removeTeamMember, workspaceMembers }) => {
  const [membersOpen, setMembersOpen] = useState(false);

  const teamMembers = useQuery(
    api.teams.getTeamMembers,
    { teamId: team._id }
  );

  const handleAddMember = async (userId) => {
    try {
      await addTeamMember({
        teamId: team._id,
        userId,
        role: 'member',
      });
    } catch (error) {
      console.error('Error adding team member:', error);
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await removeTeamMember({
        teamId: team._id,
        userId,
      });
    } catch (error) {
      console.error('Error removing team member:', error);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <Box
            width={12}
            height={12}
            borderRadius="50%"
            bgcolor={team.color}
            mr={1}
          />
          <Typography variant="h6" component="h3">
            {team.name}
          </Typography>
        </Box>

        {team.description && (
          <Typography variant="body2" color="text.secondary" mb={2}>
            {team.description}
          </Typography>
        )}

        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            {teamMembers?.length || 0} members
          </Typography>

          {hasWorkspaceRole('editor') && (
            <Button
              size="small"
              onClick={() => setMembersOpen(true)}
            >
              Manage
            </Button>
          )}
        </Box>

        {/* Team Members Dialog */}
        <Dialog open={membersOpen} onClose={() => setMembersOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {team.name} Members
          </DialogTitle>
          <DialogContent>
            <Typography variant="subtitle2" gutterBottom>
              Current Members
            </Typography>
            <List>
              {teamMembers?.map((member) => (
                <ListItem key={member._id}>
                  <Avatar sx={{ mr: 2 }}>
                    {member.name?.charAt(0).toUpperCase()}
                  </Avatar>
                  <ListItemText
                    primary={member.name}
                    secondary={member.email}
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={member.teamRole}
                      color={member.teamRole === 'lead' ? 'secondary' : 'default'}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    {hasWorkspaceRole('editor') && member._id !== currentUser?._id && (
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveMember(member._id)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>

            {hasWorkspaceRole('editor') && (
              <>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
                  Add Members
                </Typography>
                <List>
                  {workspaceMembers
                    ?.filter(member => !teamMembers?.some(tm => tm._id === member._id))
                    ?.map((member) => (
                      <ListItem key={member._id}>
                        <Avatar sx={{ mr: 2 }}>
                          {member.name?.charAt(0).toUpperCase()}
                        </Avatar>
                        <ListItemText
                          primary={member.name}
                          secondary={member.email}
                        />
                        <ListItemSecondaryAction>
                          <Button
                            size="small"
                            onClick={() => handleAddMember(member._id)}
                          >
                            Add
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                </List>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMembersOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default TeamManagement;
