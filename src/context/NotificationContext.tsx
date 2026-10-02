import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Notification } from '../api/api';
import { useActiveNotifications } from '../hooks';

interface NotificationContextProps {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Load read state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('readNotifications');
      if (stored) {
        setReadIds(new Set(JSON.parse(stored)));
      }
    } catch (e) {
      console.error('Failed to load read notifications from local storage', e);
    }
  }, []);

  const { data: rawNotifications = [], isLoading: loading, refetch } = useActiveNotifications();
  
  const notifications = [...rawNotifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const refreshNotifications = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const persistReadIds = (newReadIds: Set<string>) => {
    setReadIds(newReadIds);
    localStorage.setItem('readNotifications', JSON.stringify(Array.from(newReadIds)));
  };

  const markAsRead = (id: string) => {
    if (!readIds.has(id)) {
      const newReadIds = new Set(readIds);
      newReadIds.add(id);
      persistReadIds(newReadIds);
    }
  };

  const markAllAsRead = () => {
    const newReadIds = new Set(readIds);
    notifications.forEach(n => newReadIds.add(n.id));
    persistReadIds(newReadIds);
  };

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      markAsRead,
      markAllAsRead,
      refreshNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
