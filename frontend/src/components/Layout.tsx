import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  ListItemButton,
  Tooltip,
  Paper,
  Chip,
  alpha,
  useTheme as useMuiTheme
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Campaign as CampaignIcon,
  Message as MessageIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Menu as MenuIcon,
  Group as GroupIcon,
  WhatsApp as WhatsAppIcon,
  Description as DescriptionIcon,
  PermMedia as MediaIcon,
  Speed as SpeedIcon,
  Analytics as AnalyticsIcon,
  CloudUpload as CloudUploadIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Search as SearchIcon,
  KeyboardArrowDown
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const drawerWidth = 280; // Modern sidebar width

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { mode, toggleColorMode } = useTheme();
  const muiTheme = useMuiTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', roles: ['admin', 'bayi', 'musteri'] },
    { text: 'Müşteriler', icon: <PeopleIcon />, path: '/customers', roles: ['bayi'] },
    { text: 'Kampanyalar', icon: <CampaignIcon />, path: '/campaigns', roles: ['admin', 'bayi'] },
    { text: 'Mesajlar', icon: <MessageIcon />, path: '/messages', roles: ['admin', 'bayi', 'musteri'] },
    { text: 'Şablonlar', icon: <DescriptionIcon />, path: '/templates', roles: ['admin', 'bayi'] },
    { text: 'Şablon Onay', icon: <CloudUploadIcon />, path: '/templates/submission', roles: ['admin', 'bayi'] },
    { text: 'Medya', icon: <MediaIcon />, path: '/media', roles: ['admin', 'bayi'] },
    { text: 'Analitik', icon: <AnalyticsIcon />, path: '/analytics', roles: ['admin', 'bayi'] },
    { text: 'API Durumu', icon: <SpeedIcon />, path: '/api-status', roles: ['admin'] },
    { text: 'Kullanıcılar', icon: <GroupIcon />, path: '/users', roles: ['admin', 'bayi'] },
    { text: 'Ayarlar', icon: <SettingsIcon />, path: '/settings', roles: ['admin', 'bayi'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role || '')
  );

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        p: 3, 
        background: mode === 'dark' 
          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <WhatsAppIcon sx={{ mr: 1.5, fontSize: 32 }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              WhatsApp Business
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              API Management Platform
            </Typography>
          </Box>
        </Box>
        {user && (
          <Chip
            label={user.role === 'admin' ? 'Administrator' : user.role === 'bayi' ? 'Dealer' : 'Customer'}
            size="small"
            sx={{ 
              backgroundColor: alpha('#fff', 0.2),
              color: 'white',
              fontWeight: 600,
              fontSize: '0.75rem'
            }}
          />
        )}
      </Box>
      
      <Box sx={{ flex: 1, overflowY: 'auto', py: 2 }}>
        <List sx={{ px: 2 }}>
          {filteredMenuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  transition: 'all 0.3s ease',
                  backgroundColor: location.pathname === item.path 
                    ? mode === 'dark' 
                      ? alpha(muiTheme.palette.primary.main, 0.15)
                      : alpha(muiTheme.palette.primary.main, 0.08)
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: location.pathname === item.path
                      ? mode === 'dark'
                        ? alpha(muiTheme.palette.primary.main, 0.2)
                        : alpha(muiTheme.palette.primary.main, 0.12)
                      : mode === 'dark'
                        ? alpha(muiTheme.palette.primary.main, 0.08)
                        : alpha(muiTheme.palette.primary.main, 0.04),
                    transform: 'translateX(4px)'
                  },
                  '& .MuiListItemIcon-root': {
                    color: location.pathname === item.path 
                      ? muiTheme.palette.primary.main
                      : muiTheme.palette.text.secondary
                  },
                  '& .MuiListItemText-primary': {
                    fontWeight: location.pathname === item.path ? 600 : 400,
                    color: location.pathname === item.path 
                      ? muiTheme.palette.primary.main
                      : muiTheme.palette.text.primary
                  }
                }}
                onClick={() => navigate(item.path)}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.95rem'
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
      
      <Divider />
      <Box sx={{ p: 2 }}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2,
            backgroundColor: mode === 'dark'
              ? alpha(muiTheme.palette.primary.main, 0.08)
              : alpha(muiTheme.palette.primary.main, 0.04),
            border: `1px solid ${alpha(muiTheme.palette.primary.main, 0.1)}`
          }}
        >
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Account Status
          </Typography>
          <Typography variant="body2" fontWeight={600} color="primary">
            {user?.company_name || user?.username}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.email}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: mode === 'dark' 
            ? alpha('#1a1a1a', 0.8)
            : '#ffffff',
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${mode === 'dark' ? alpha('#fff', 0.1) : alpha('#000', 0.1)}`,
          color: mode === 'dark' ? '#ffffff' : '#1a1a1a',
        }}
      >
        <Toolbar sx={{ py: 1, px: { xs: 2, sm: 3 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography 
              variant="h6" 
              noWrap 
              component="div" 
              sx={{ 
                fontWeight: 700,
                fontSize: '1.25rem',
                background: mode === 'dark'
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              {filteredMenuItems.find(item => item.path === location.pathname)?.text || 'Dashboard'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date().toLocaleDateString('tr-TR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Paper
              elevation={0}
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                px: 2,
                py: 0.5,
                borderRadius: 20,
                backgroundColor: mode === 'dark'
                  ? alpha('#fff', 0.05)
                  : alpha('#000', 0.03),
                border: `1px solid ${mode === 'dark' ? alpha('#fff', 0.1) : alpha('#000', 0.1)}`,
                mr: 2
              }}
            >
              <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ minWidth: 150 }}
              >
                Search (⌘K)
              </Typography>
            </Paper>
            
            
            <Tooltip title={mode === 'dark' ? 'Light Mode' : 'Dark Mode'}>
              <IconButton 
                onClick={toggleColorMode}
                sx={{ 
                  color: mode === 'dark' ? '#fff' : 'text.primary',
                  backgroundColor: mode === 'dark' 
                    ? alpha('#fff', 0.05)
                    : alpha('#000', 0.03),
                  '&:hover': {
                    backgroundColor: mode === 'dark'
                      ? alpha('#fff', 0.1)
                      : alpha('#000', 0.06)
                  }
                }}
              >
                {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            
            <Box
              onClick={handleProfileMenuOpen}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 1.5,
                py: 0.8,
                borderRadius: 10,
                cursor: 'pointer',
                backgroundColor: mode === 'dark' 
                  ? alpha('#fff', 0.05)
                  : alpha('#000', 0.03),
                border: `1px solid ${mode === 'dark' ? alpha('#fff', 0.1) : alpha('#000', 0.1)}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: mode === 'dark'
                    ? alpha('#fff', 0.1)
                    : alpha('#000', 0.06),
                  transform: 'translateY(-2px)',
                  boxShadow: mode === 'dark'
                    ? '0 4px 12px rgba(0,0,0,0.2)'
                    : '0 4px 12px rgba(0,0,0,0.08)'
                }
              }}
            >
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}
              >
                {user?.username[0].toUpperCase()}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography 
                  variant="body2" 
                  fontWeight={600}
                  sx={{ 
                    lineHeight: 1,
                    color: mode === 'dark' ? '#fff' : 'text.primary'
                  }}
                >
                  {user?.username}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ lineHeight: 1 }}
                >
                  {user?.role === 'admin' ? 'Admin' : user?.role === 'bayi' ? 'Dealer' : 'Customer'}
                </Typography>
              </Box>
              <KeyboardArrowDown 
                fontSize="small" 
                sx={{ 
                  color: 'text.secondary',
                  display: { xs: 'none', sm: 'block' }
                }} 
              />
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              backgroundColor: mode === 'dark' ? '#1a1a1a' : '#ffffff',
              borderRight: `1px solid ${mode === 'dark' ? alpha('#fff', 0.1) : alpha('#000', 0.1)}`
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              backgroundColor: mode === 'dark' ? '#1a1a1a' : '#ffffff',
              borderRight: `1px solid ${mode === 'dark' ? alpha('#fff', 0.1) : alpha('#000', 0.1)}`,
              boxShadow: mode === 'dark'
                ? '4px 0 24px rgba(0,0,0,0.4)'
                : '4px 0 24px rgba(0,0,0,0.06)'
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <Outlet />
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
            mt: 1.5,
            borderRadius: 2,
            minWidth: 200,
            '& .MuiMenuItem-root': {
              px: 2,
              py: 1,
              borderRadius: 1,
              mx: 1,
              my: 0.5,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: mode === 'dark'
                  ? alpha(muiTheme.palette.primary.main, 0.08)
                  : alpha(muiTheme.palette.primary.main, 0.04)
              }
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${alpha(muiTheme.palette.divider, 0.5)}` }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {user?.company_name || user?.username}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.email}
          </Typography>
        </Box>
        <MenuItem onClick={() => { navigate('/profile'); handleProfileMenuClose(); }}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={() => { navigate('/settings'); handleProfileMenuClose(); }}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem 
          onClick={handleLogout}
          sx={{ 
            color: 'error.main',
            '&:hover': {
              backgroundColor: alpha(muiTheme.palette.error.main, 0.08)
            }
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          Sign Out
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Layout;