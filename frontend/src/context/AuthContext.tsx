import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, ManagedFile } from '../types';
import { login as apiLogin, logout as apiLogout, getCurrentUser } from '../api/auth';
import { getUserStorage, UserStorage } from '../api/files';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  /** Check if current user can modify a file (owner or admin) */
  canModifyFile: (file: ManagedFile | { uploadedById: string }) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** User's storage usage */
  storage: UserStorage | null;
  /** Refresh storage usage */
  refreshStorage: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storage, setStorage] = useState<UserStorage | null>(null);

  const refreshStorage = useCallback(async () => {
    console.log('[AuthContext] refreshStorage called');
    try {
      const storageData = await getUserStorage();
      console.log('[AuthContext] storage data received:', storageData);
      setStorage(storageData);
    } catch (error) {
      console.error('[AuthContext] Failed to fetch storage:', error);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      // Try to get current user - cookies are sent automatically
      // Don't check localStorage since OAuth uses httpOnly cookies
      const userData = await getCurrentUser();
      setUser(userData);
    } catch {
      setUser(null);
      setStorage(null);
      localStorage.removeItem('accessToken');
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      console.log('[AuthContext] initAuth starting');
      setIsLoading(true);
      await refreshUser();
      console.log('[AuthContext] refreshUser complete');
      // Storage will be fetched by the user?.id effect if user is authenticated
      setIsLoading(false);
    };
    initAuth();
  }, [refreshUser]);

  // Fetch storage after user is authenticated
  useEffect(() => {
    if (user?.id) {
      refreshStorage();
    }
  }, [user?.id, refreshStorage]);

  const login = async (email: string, password: string) => {
    const response = await apiLogin(email, password);
    setUser(response.user);
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
    setStorage(null);
  };

  const canModifyFile = useCallback((file: ManagedFile | { uploadedById: string }) => {
    if (!user) return false;
    return file.uploadedById === user.id || user.role === 'ADMIN';
  }, [user]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    canModifyFile,
    login,
    logout,
    refreshUser,
    storage,
    refreshStorage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
