'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'oidc-client-ts';
import { getUserManager, getUser, login, logout } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await getUser();
        if (currentUser && !currentUser.expired) {
          setUser(currentUser);
          // Call backend login endpoint to create/update user record
          try {
            await apiClient.post('/api/login');
          } catch (error) {
            console.error('Failed to sync user with backend:', error);
          }
        }
      } catch (error) {
        console.error('Failed to get user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for user loaded/unloaded events
    const userManager = getUserManager();
    
    const handleUserLoaded = async (loadedUser: User) => {
      setUser(loadedUser);
      // Call backend login endpoint to create/update user record
      try {
        await apiClient.post('/api/login');
      } catch (error) {
        console.error('Failed to sync user with backend:', error);
      }
    };

    const handleUserUnloaded = () => {
      setUser(null);
    };

    userManager.events.addUserLoaded(handleUserLoaded);
    userManager.events.addUserUnloaded(handleUserUnloaded);

    return () => {
      userManager.events.removeUserLoaded(handleUserLoaded);
      userManager.events.removeUserUnloaded(handleUserUnloaded);
    };
  }, []);

  const handleLogin = async () => {
    await login();
  };

  const handleLogout = async () => {
    await logout();
  };

  const getAccessToken = async (): Promise<string | null> => {
    return user?.access_token || null;
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user && !user.expired,
    login: handleLogin,
    logout: handleLogout,
    getAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
