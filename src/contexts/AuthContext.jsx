import React, { createContext, useContext, useEffect, useState } from 'react';
import { useConvexAuth } from 'convex/react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [userWorkspaces, setUserWorkspaces] = useState([]);

  // Get current user data
  const userData = useQuery(
    api.auth.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );

  // Get user workspaces
  const workspacesData = useQuery(
    api.teams.getUserWorkspaces,
    isAuthenticated ? {} : "skip"
  );

  useEffect(() => {
    if (userData) {
      setCurrentUser(userData);
    }
  }, [userData]);

  useEffect(() => {
    if (workspacesData) {
      setUserWorkspaces(workspacesData);

      // Set default workspace if none selected
      if (!currentWorkspace && workspacesData.length > 0) {
        setCurrentWorkspace(workspacesData[0]);
      }
    }
  }, [workspacesData, currentWorkspace]);

  const switchWorkspace = (workspace) => {
    setCurrentWorkspace(workspace);
    // Store in localStorage for persistence
    localStorage.setItem('currentWorkspaceId', workspace._id);
  };

  const createWorkspace = async (name, description) => {
    try {
      // This would be called from components using the mutation
      // The workspace list will automatically update via the query
      return true;
    } catch (error) {
      console.error('Error creating workspace:', error);
      throw error;
    }
  };

  const value = {
    // Auth state
    isLoading: isAuthLoading,
    isAuthenticated,
    currentUser,

    // Workspace state
    currentWorkspace,
    userWorkspaces,
    switchWorkspace,
    createWorkspace,

    // Helper functions
    hasWorkspaceRole: (requiredRole) => {
      if (!currentWorkspace) return false;

      const roleHierarchy = {
        viewer: 0,
        editor: 1,
        admin: 2,
        owner: 3
      };

      const userRole = currentWorkspace.role;
      return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
    },

    isWorkspaceOwner: () => {
      return currentWorkspace?.role === 'owner';
    },

    canEditWorkspace: () => {
      return currentWorkspace?.role === 'owner' || currentWorkspace?.role === 'admin';
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
