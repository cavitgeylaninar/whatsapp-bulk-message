import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactElement;
  allowedRoles?: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is bayi and subscription is expired
    if (user && user.role === 'bayi') {
      const checkSubscription = () => {
        // Check if subscription end date has passed
        if (user.subscription_end_date) {
          const endDate = new Date(user.subscription_end_date);
          const now = new Date();
          
          if (now > endDate) {
            // Subscription expired, log out and redirect to login
            logout();
            localStorage.setItem('subscription_expired', JSON.stringify({
              username: user.username,
              endDate: user.subscription_end_date,
              message: 'Abonelik süreniz dolmuştur'
            }));
            navigate('/login');
          }
        }
      };

      checkSubscription();
      // Check every minute in case subscription expires while user is logged in
      const interval = setInterval(checkSubscription, 60000);
      return () => clearInterval(interval);
    }
  }, [user, logout, navigate]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PrivateRoute;