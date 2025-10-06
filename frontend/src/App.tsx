import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CustomThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Toaster } from 'react-hot-toast';
import { Box, CircularProgress } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/ModernLayout';
import Login from './pages/Login';

// Lazy load pages for better performance and smooth transitions
const WhatsAppWeb = lazy(() => import('./pages/WhatsAppWebModern'));
const WhatsAppWebContacts = lazy(() => import('./pages/WhatsAppWebContacts'));
const CsvContacts = lazy(() => import('./pages/CsvContacts'));

// Loading component
const PageLoader = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100%',
    }}
  >
    <CircularProgress />
  </Box>
);

function App() {
  return (
    <CustomThemeProvider>
      <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <AuthProvider>
          <NotificationProvider>
            <Toaster position="top-right" />
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                  <Route index element={<Navigate to="/whatsapp-web" replace />} />
                  <Route path="dashboard" element={<Navigate to="/whatsapp-web" replace />} />
                  <Route path="whatsapp-web" element={<Suspense fallback={<PageLoader />}><WhatsAppWeb /></Suspense>} />
                  <Route path="whatsapp-web-contacts" element={<Suspense fallback={<PageLoader />}><WhatsAppWebContacts /></Suspense>} />
                  <Route path="csv-contacts" element={<Suspense fallback={<PageLoader />}><CsvContacts /></Suspense>} />
                  <Route path="*" element={<Navigate to="/whatsapp-web" replace />} />
                </Route>
              </Routes>
            </Router>
          </NotificationProvider>
        </AuthProvider>
      </SnackbarProvider>
    </CustomThemeProvider>
  );
}

export default App;
