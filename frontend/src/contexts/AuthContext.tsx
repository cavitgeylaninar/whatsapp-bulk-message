import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import api from '../services/api';
import notificationService from '../services/notificationService';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'bayi' | 'musteri';
  company_name?: string;
  phone?: string;
  whatsapp_number?: string;
  parent_id?: string;
  is_active: boolean;
  two_factor_enabled: boolean;
  last_login?: string;
  created_at?: string;
  subscription_end_date?: string;
  whatsapp_business_id?: string;
  whatsapp_phone_number_id?: string;
  whatsapp_setup_completed?: boolean;
  subscription_status?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string, twoFactorCode?: string) => Promise<any>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await api.getProfile();
      const userData = response.data;
      
      // Check if user is bayi and subscription is expired
      if (userData.role === 'bayi' && userData.subscription_end_date) {
        const endDate = new Date(userData.subscription_end_date);
        const now = new Date();
        
        if (now > endDate) {
          // Subscription expired, don't allow access
          localStorage.setItem('subscription_expired', JSON.stringify({
            username: userData.username,
            endDate: userData.subscription_end_date,
            message: 'Abonelik süreniz dolmuştur'
          }));
          logout();
          return;
        }
      }
      
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      notificationService.showErrorToast('Kullanıcı bilgileri alınırken hata oluştu');
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string, twoFactorCode?: string) => {
    try {
      const response = await api.login(username, password, twoFactorCode);

      if (response.data.requiresTwoFactor) {
        throw new Error('2FA_REQUIRED');
      }

      const { user, token, subscription } = response.data;
      
      // Don't allow login if subscription is expired for bayi users
      if (user.role === 'bayi' && subscription && subscription.expired) {
        // Don't set user or token for expired subscriptions
        throw new Error('SUBSCRIPTION_EXPIRED');
      }
      
      setUser(user);
      setToken(token);
      localStorage.setItem('token', token);
      
      // Store subscription info for later use
      if (subscription) {
        localStorage.setItem('subscription', JSON.stringify(subscription));
        
        // Return subscription info to handle in login component
        return { user, token, subscription };
      }
      
      return { user, token };
    } catch (error: any) {
      // Pass through the original error to preserve response data
      if (error.response) {
        // This is an axios error with response data
        throw error;
      }
      if (error.message === '2FA_REQUIRED' || error.message === 'SUBSCRIPTION_EXPIRED') {
        throw error;
      }
      // Pass through the full error object
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call the logout API endpoint
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('http://localhost:3500/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local state and storage regardless of API call result
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};