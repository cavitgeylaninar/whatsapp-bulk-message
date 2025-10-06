import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSnackbar } from 'notistack';

interface WhatsAppNotification {
  id: string;
  type: 'whatsapp_message' | 'whatsapp_status';
  from?: string;
  message?: string;
  messageType?: string;
  timestamp: string;
  businessPhoneId?: string;
  displayPhoneNumber?: string;
  status?: string;
  recipientId?: string;
  read?: boolean;
}

interface NotificationContextType {
  notifications: WhatsAppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  socket: Socket | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<WhatsAppNotification[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('whatsapp_notifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        setNotifications(parsed);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('whatsapp_notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  // Initialize socket connection
  useEffect(() => {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
    const socketUrl = API_URL.replace('/api', '');
    
    const socketInstance = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket server');
      
      // Join user room if we have a user ID
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.id) {
        socketInstance.emit('join', user.id);
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    // Listen for new WhatsApp notifications
    socketInstance.on('new_notification', (notification: WhatsAppNotification) => {
      console.log('New notification received:', notification);
      
      // Add notification with read status
      const newNotification = { ...notification, read: false };
      setNotifications(prev => [newNotification, ...prev].slice(0, 100)); // Keep max 100 notifications
      
      // Show snackbar notification
      if (notification.type === 'whatsapp_message') {
        enqueueSnackbar(
          `Yeni WhatsApp mesajı: ${notification.from} - ${notification.message?.substring(0, 50)}...`,
          { 
            variant: 'info',
            autoHideDuration: 5000,
            preventDuplicate: true
          }
        );
        
        // Play notification sound if available
        try {
          const audio = new Audio('/notification.mp3');
          audio.play().catch(() => {});
        } catch (error) {
          console.error('Error playing notification sound:', error);
        }
      }
    });

    // Listen for WhatsApp messages specific to this user
    socketInstance.on('whatsapp_message', (notification: WhatsAppNotification) => {
      console.log('User-specific WhatsApp message:', notification);
      
      const newNotification = { ...notification, read: false };
      setNotifications(prev => {
        // Check if notification already exists
        const exists = prev.some(n => n.id === notification.id);
        if (exists) return prev;
        return [newNotification, ...prev].slice(0, 100);
      });
    });

    // Listen for message status updates
    socketInstance.on('message_status_update', (statusUpdate: any) => {
      console.log('Message status update:', statusUpdate);
      
      // You can handle status updates here if needed
      // For example, update the status of a sent message
    });

    socketInstance.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [enqueueSnackbar]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem('whatsapp_notifications');
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        socket
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;