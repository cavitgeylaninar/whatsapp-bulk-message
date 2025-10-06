// Notification store for managing notifications globally
export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  type: 'message' | 'campaign' | 'system';
  read: boolean;
  data?: any;
}

class NotificationStore {
  private notifications: NotificationItem[] = [];
  private listeners: Set<(notifications: NotificationItem[]) => void> = new Set();

  constructor() {
    // Load notifications from localStorage
    const stored = localStorage.getItem('notifications');
    if (stored) {
      try {
        this.notifications = JSON.parse(stored).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    }

    // Listen for new WhatsApp messages
    window.addEventListener('newWhatsAppMessage', this.handleNewMessage);
  }

  private handleNewMessage = (event: any) => {
    const { message, customer } = event.detail;
    this.addNotification({
      id: `msg-${Date.now()}`,
      title: customer?.name || customer?.phone || 'Yeni Mesaj',
      message: message.content,
      timestamp: new Date(),
      type: 'message',
      read: false,
      data: { message, customer }
    });
  };

  addNotification(notification: NotificationItem) {
    this.notifications.unshift(notification);
    this.persist();
    this.notify();
  }

  markAsRead(id: string) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.persist();
      this.notify();
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.persist();
    this.notify();
  }

  clearAll() {
    this.notifications = [];
    this.persist();
    this.notify();
  }

  clearRead() {
    this.notifications = this.notifications.filter(n => !n.read);
    this.persist();
    this.notify();
  }

  getNotifications(): NotificationItem[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  subscribe(listener: (notifications: NotificationItem[]) => void) {
    this.listeners.add(listener);
    // Immediately notify the new listener
    listener(this.getNotifications());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const notifications = this.getNotifications();
    this.listeners.forEach(listener => listener(notifications));
  }

  private persist() {
    try {
      localStorage.setItem('notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Failed to persist notifications:', error);
    }
  }
}

export const notificationStore = new NotificationStore();