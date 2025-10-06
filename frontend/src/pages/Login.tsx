import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
  alpha,
  useTheme
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  WhatsApp as WhatsAppIcon,
  LockOutlined,
  PersonOutlined
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    twoFactorCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(
        formData.username,
        formData.password,
        requires2FA ? formData.twoFactorCode : undefined
      );
      navigate('/dashboard');
    } catch (error: any) {
      if (error.message === '2FA_REQUIRED') {
        setRequires2FA(true);
        setError('Lütfen 2FA kodunuzu girin');
      } else {
        setError(error.response?.data?.message || error.message || 'Giriş başarısız');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23000000" fill-opacity="0.02"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          opacity: 0.4,
        }
      }}
    >
      <Container component="main" maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={24}
          sx={{
            padding: { xs: 3, sm: 5 },
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                mb: 2,
                boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              <WhatsAppIcon sx={{ fontSize: 48, color: 'white' }} />
            </Box>
            <Typography
              variant="h4"
              fontWeight={700}
              gutterBottom
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              WhatsApp Bulk Message
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Profesyonel toplu mesajlaşma platformu
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Error Alert */}
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  fontSize: 24
                }
              }}
            >
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Kullanıcı Adı"
              name="username"
              autoComplete="username"
              autoFocus
              value={formData.username}
              onChange={handleChange}
              disabled={requires2FA || loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlined color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  transition: 'all 0.3s',
                  '&:hover': {
                    boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`,
                  },
                  '&.Mui-focused': {
                    boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
                  }
                }
              }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Şifre"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              disabled={requires2FA || loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={loading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  transition: 'all 0.3s',
                  '&:hover': {
                    boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`,
                  },
                  '&.Mui-focused': {
                    boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
                  }
                }
              }}
            />

            {requires2FA && (
              <TextField
                margin="normal"
                required
                fullWidth
                name="twoFactorCode"
                label="2FA Code"
                type="text"
                id="twoFactorCode"
                value={formData.twoFactorCode}
                onChange={handleChange}
                autoFocus
                disabled={loading}
                helperText="Authenticator uygulamanızdaki 6 haneli kodu girin"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 4,
                mb: 2,
                py: 1.5,
                borderRadius: 2,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
                transition: 'all 0.3s',
                '&:hover': {
                  boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
                  transform: 'translateY(-2px)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
                '&:disabled': {
                  background: theme.palette.action.disabledBackground,
                }
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                requires2FA ? '2FA Kodu ile Giriş' : 'Giriş Yap'
              )}
            </Button>

            {requires2FA && (
              <Button
                fullWidth
                variant="text"
                onClick={() => {
                  setRequires2FA(false);
                  setFormData({ ...formData, twoFactorCode: '' });
                  setError('');
                }}
                disabled={loading}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                }}
              >
                Geri Dön
              </Button>
            )}
          </Box>

          {/* Footer */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Developed by Cavit Geylani Nar
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
