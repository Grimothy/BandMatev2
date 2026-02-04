import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { 
  Activity, 
  getActivities, 
  getUnreadActivityCount, 
  markActivityAsRead as apiMarkActivityAsRead,
  markAllActivitiesAsRead as apiMarkAllActivitiesAsRead
} from '../api/activities';

export interface Notification {
  id: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  title: string;
  message: string;
  resourceLink: string | null;
  isRead: boolean;
  createdAt: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  // Activities
  activities: Activity[];
  unreadActivityCount: number;
  isLoadingActivities: boolean;
  fetchActivities: () => Promise<void>;
  markActivityAsRead: (activityId: string) => Promise<void>;
  markAllActivitiesAsRead: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType | null>(null);

// In development, Vite proxies /api to the backend. For socket.io, we need the direct backend URL.
// In production, socket.io will connect to the same host as the page.
const getSocketUrl = (): string => {
  // In production, connect to the same origin
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return window.location.origin;
  }
  // In development, connect directly to the backend
  return 'http://localhost:3000';
};

const API_BASE = '/api';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Activity state
  const [activities, setActivities] = useState<Activity[]>([]);
  const [unreadActivityCount, setUnreadActivityCount] = useState(0);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/notifications?limit=20`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [isAuthenticated]);

  // Fetch activities from API
  const fetchActivities = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoadingActivities(true);
      const result = await getActivities({ limit: 50 });
      setActivities(result.activities);
      setUnreadActivityCount(result.unreadCount);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setIsLoadingActivities(false);
    }
  }, [isAuthenticated]);

  // Fetch only unread activity count (for badge updates)
  const fetchUnreadActivityCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const count = await getUnreadActivityCount();
      setUnreadActivityCount(count);
    } catch (error) {
      console.error('Failed to fetch unread activity count:', error);
    }
  }, [isAuthenticated]);

  // Mark a single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  // Mark a single activity as read
  const markActivityAsRead = useCallback(async (activityId: string) => {
    try {
      await apiMarkActivityAsRead(activityId);
      setActivities((prev) =>
        prev.map((a) =>
          a.id === activityId ? { ...a, isRead: true } : a
        )
      );
      setUnreadActivityCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark activity as read:', error);
    }
  }, []);

  // Mark all activities as read
  const markAllActivitiesAsRead = useCallback(async () => {
    try {
      await apiMarkAllActivitiesAsRead();
      setActivities((prev) => prev.map((a) => ({ ...a, isRead: true })));
      setUnreadActivityCount(0);
    } catch (error) {
      console.error('Failed to mark all activities as read:', error);
    }
  }, []);

  // Initialize socket connection when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect if not authenticated
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      // Clear state
      setActivities([]);
      setUnreadActivityCount(0);
      setIsLoadingActivities(true);
      return;
    }

    // Avoid reconnecting if already connected with same user
    if (socket?.connected) {
      return;
    }

    // Get token from localStorage if available (for regular login)
    // OAuth users may not have token in localStorage - they use httpOnly cookies
    const token = localStorage.getItem('accessToken');

    // Create socket connection
    const socketUrl = getSocketUrl();
    const newSocket = io(socketUrl, {
      // Pass token if available, otherwise socket.io will use cookies via withCredentials
      auth: token ? { token } : {},
      transports: ['websocket', 'polling'],
      withCredentials: true, // Enable sending cookies for OAuth users
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      setIsConnected(false);
    });

    // Listen for real-time notifications
    newSocket.on('notification', (notification: Notification) => {
      console.log('[Socket] Received notification:', notification);

      // Add to local state
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show toast based on notification type
      const toastOptions = {
        description: notification.message,
        action: notification.resourceLink
          ? {
              label: 'View',
              onClick: () => {
                window.location.href = notification.resourceLink!;
              },
            }
          : undefined,
      };

      switch (notification.type) {
        case 'SUCCESS':
          toast.success(notification.title, toastOptions);
          break;
        case 'WARNING':
          toast.warning(notification.title, toastOptions);
          break;
        case 'ERROR':
          toast.error(notification.title, toastOptions);
          break;
        default:
          toast.info(notification.title, toastOptions);
      }
    });

    // Listen for real-time activities
    newSocket.on('activity', (activity: Activity) => {
      console.log('[Socket] Received activity:', activity);

      // Prepend new activity to the list
      setActivities((prev) => {
        // Avoid duplicates
        if (prev.some(a => a.id === activity.id)) {
          return prev;
        }
        // Mark as read if it's from the current user, unread if from others
        const isOwnAction = activity.userId === user.id;
        return [{ ...activity, isRead: isOwnAction }, ...prev.slice(0, 49)];
      });
      
      // Only increment unread count if it's from another user
      if (activity.userId !== user.id) {
        setUnreadActivityCount((prev) => prev + 1);
      }
    });

    setSocket(newSocket);

    // Fetch existing notifications and activities
    fetchNotifications();
    fetchActivities();

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  // Periodically refresh unread count (backup for missed socket events)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      fetchUnreadActivityCount();
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnreadActivityCount]);

  const value: SocketContextType = {
    socket,
    isConnected,
    // Notifications
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    // Activities
    activities,
    unreadActivityCount,
    isLoadingActivities,
    fetchActivities,
    markActivityAsRead,
    markAllActivitiesAsRead,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
