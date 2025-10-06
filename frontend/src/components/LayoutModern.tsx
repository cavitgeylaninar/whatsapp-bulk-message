import React, { useState } from 'react';
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
  Badge,
  Tooltip,
  useTheme,
  alpha,
  Chip,
  Stack,
  Button,
  InputBase,
  Paper,
  Collapse
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
  Notifications as NotificationsIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Circle as CircleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Apps as AppsIcon,
  AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';

const drawerWidth = 240;

const Layout: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { mode, toggleColorMode } = useCustomTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleMenuExpand = (menu: string) => {
    setExpandedMenu(expandedMenu === menu ? null : menu);
  };

  const menuItems = [
    { 
      text: 'Dashboard', 
      icon: <DashboardIcon />, 
      path: '/dashboard', 
      roles: ['admin', 'bayi', 'musteri'],
      badge: null
    },
    { 
      text: 'Müşteriler', 
      icon: <PeopleIcon />, 
      path: '/customers', 
      roles: ['bayi'],
      badge: null
    },
    { 
      text: 'Kampanyalar', 
      icon: <CampaignIcon />, 
      path: '/campaigns', 
      roles: ['admin', 'bayi'],
      badge: { count: 3, color: 'error' }
    },
    { 
      text: 'Mesajlar', 
      icon: <MessageIcon />, 
      path: '/messages', 
      roles: ['admin', 'bayi', 'musteri'],
      badge: { count: 12, color: 'primary' }
    },
    { 
      text: 'Şablonlar', 
      icon: <DescriptionIcon />, 
      path: '/templates', 
      roles: ['admin', 'bayi'],
      badge: null,
      subItems: [
        { text: 'Tüm Şablonlar', path: '/templates' },
        { text: 'Şablon Onay', path: '/templates/submission' }
      ]
    },
    { 
      text: 'Medya', 
      icon: <MediaIcon />, 
      path: '/media', 
      roles: ['admin', 'bayi'],
      badge: null
    },
    { 
      text: 'Analitik', 
      icon: <AnalyticsIcon />, 
      path: '/analytics', 
      roles: ['admin', 'bayi'],
      badge: null
    },
    { 
      text: 'API Durumu', 
      icon: <SpeedIcon />, 
      path: '/api-status', 
      roles: ['admin'],
      badge: { count: 'Aktif', color: 'success' }
    },
    { 
      text: 'Kullanıcılar', 
      icon: <GroupIcon />, 
      path: '/users', 
      roles: ['admin', 'bayi'],
      badge: null
    },
    { 
      text: 'Ayarlar', 
      icon: <SettingsIcon />, 
      path: '/settings', 
      roles: ['admin', 'bayi'],
      badge: null
    },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role || '')
  );

  const drawer = (
    <Box
      sx={{
        height: '100%',
        background: theme.palette.mode === 'dark'
          ? theme.palette.background.paper
          : '#ffffff',
        borderRight: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
      }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              background: `linear-gradient(135deg, #25D366 0%, #20BA5E 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: theme.palette.mode === 'dark' 
                ? `0 4px 12px ${alpha('#25D366', 0.2)}`
                : `0 2px 8px ${alpha('#25D366', 0.25)}`,
            }}
          >
            <WhatsAppIcon sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 700,
              fontSize: '1rem',
              color: theme.palette.text.primary,
              letterSpacing: '-0.5px',
            }}
          >
            WhatsApp
          </Typography>
        </Stack>
      </Box>
      
      <Box sx={{ px: 1.5, py: 1 }}>
        <Box
          sx={{
            px: 1.5,
            py: 0.8,
            display: 'flex',
            alignItems: 'center',
            bgcolor: theme.palette.mode === 'dark'
              ? alpha(theme.palette.common.white, 0.03)
              : alpha(theme.palette.common.black, 0.02),
            borderRadius: 1.5,
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: theme.palette.mode === 'dark'
                ? alpha(theme.palette.common.white, 0.05)
                : alpha(theme.palette.common.black, 0.04),
            },
          }}
        >
          <SearchIcon sx={{ mr: 1, color: theme.palette.text.secondary, fontSize: 18 }} />
          <InputBase
            placeholder="Ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ 
              flex: 1, 
              fontSize: '0.875rem',
              color: theme.palette.text.primary,
              '& ::placeholder': {
                fontSize: '0.875rem',
                color: theme.palette.text.secondary,
              },
            }}
          />
        </Box>
      </Box>
      
      <List sx={{ px: 1.5, py: 0.5 }}>
        {filteredMenuItems
          .filter(item => item.text.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((item) => {
            const isActive = location.pathname === item.path || 
                           (item.subItems && item.subItems.some(sub => sub.path === location.pathname));
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedMenu === item.text;
            const itemColor = theme.palette.primary.main;

            return (
              <React.Fragment key={item.text}>
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    selected={isActive}
                    onClick={() => {
                      if (hasSubItems) {
                        handleMenuExpand(item.text);
                      } else {
                        navigate(item.path);
                      }
                    }}
                    sx={{
                      borderRadius: 1.5,
                      mb: 0.5,
                      transition: 'all 0.2s',
                      position: 'relative',
                      ...(isActive && {
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: '20%',
                          bottom: '20%',
                          width: 3,
                          borderRadius: '0 2px 2px 0',
                          bgcolor: theme.palette.primary.main,
                        },
                      }),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Box
                        sx={{
                          color: isActive 
                            ? theme.palette.primary.main
                            : theme.palette.text.secondary,
                          display: 'flex',
                          alignItems: 'center',
                          '& svg': {
                            fontSize: 20,
                            transition: 'all 0.2s',
                          },
                        }}
                      >
                        {item.icon}
                      </Box>
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text}
                      primaryTypographyProps={{
                        fontWeight: isActive ? 600 : 500,
                        fontSize: '0.875rem',
                        color: isActive 
                          ? theme.palette.text.primary
                          : theme.palette.text.secondary,
                      }}
                    />
                    {item.badge && (
                      <Chip
                        label={item.badge.count}
                        size="small"
                        color={item.badge.color as any}
                        sx={{
                          height: 20,
                          minWidth: item.badge.count === 'Aktif' ? 45 : 24,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                        }}
                      />
                    )}
                    {hasSubItems && (
                      <IconButton size="small">
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    )}
                  </ListItemButton>
                </ListItem>
                {hasSubItems && (
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding sx={{ pl: 4 }}>
                      {item.subItems?.map((subItem) => (
                        <ListItemButton
                          key={subItem.path}
                          selected={location.pathname === subItem.path}
                          onClick={() => navigate(subItem.path)}
                          sx={{
                            borderRadius: 1.5,
                            mb: 0.5,
                            py: 1,
                            '&:hover': {
                              bgcolor: alpha(itemColor, 0.08),
                            },
                            ...(location.pathname === subItem.path && {
                              bgcolor: alpha(itemColor, 0.12),
                            }),
                          }}
                        >
                          <ListItemIcon>
                            <CircleIcon sx={{ fontSize: 8, color: itemColor }} />
                          </ListItemIcon>
                          <ListItemText 
                            primary={subItem.text}
                            primaryTypographyProps={{
                              fontSize: '0.85rem',
                              fontWeight: location.pathname === subItem.path ? 600 : 400,
                              color: location.pathname === subItem.path 
                                ? theme.palette.text.primary 
                                : theme.palette.text.secondary,
                            }}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Collapse>
                )}
              </React.Fragment>
            );
          })}
      </List>

      <Box sx={{ flexGrow: 1 }} />
      
      <Divider sx={{ mx: 2 }} />
      
      <Box sx={{ p: 1.5 }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 1.5,
            bgcolor: theme.palette.mode === 'dark'
              ? alpha(theme.palette.common.white, 0.03)
              : alpha(theme.palette.common.black, 0.02),
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: theme.palette.mode === 'dark'
                ? alpha(theme.palette.common.white, 0.05)
                : alpha(theme.palette.common.black, 0.04),
            },
          }}
          onClick={handleProfileMenuOpen}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              {user?.username[0].toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography 
                variant="body2" 
                fontWeight={600}
                sx={{ 
                  fontSize: '0.875rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.username}
              </Typography>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  fontSize: '0.75rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.company_name || (user?.role === 'admin' ? 'Yönetici' : user?.role === 'bayi' ? 'Bayi' : 'Müşteri')}
              </Typography>
            </Box>
            <ExpandMoreIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
          </Stack>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          background: theme.palette.mode === 'dark'
            ? theme.palette.background.paper
            : '#ffffff',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          boxShadow: 'none',
        }}
      >
        <Toolbar sx={{ px: 3, py: 1.5 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 2, 
              display: { sm: 'none' },
              color: theme.palette.text.primary,
            }}
          >
            <MenuIcon />
          </IconButton>
          
          <Stack 
            direction="row" 
            alignItems="center" 
            spacing={2}
            sx={{ flexGrow: 1 }}
          >
            <Box>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  fontSize: '1.25rem',
                  color: theme.palette.text.primary,
                }}
              >
                {filteredMenuItems.find(item => item.path === location.pathname)?.text || 'Panel'}
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
          </Stack>
          
          <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title="Uygulamalar">
              <IconButton
                sx={{
                  color: theme.palette.text.secondary,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <AppsIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Bildirimler">
              <IconButton
                onClick={handleNotificationOpen}
                sx={{
                  color: theme.palette.text.primary,
                }}
              >
                <Badge badgeContent={4} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title={mode === 'dark' ? 'Açık Tema' : 'Koyu Tema'}>
              <IconButton 
                onClick={toggleColorMode}
                sx={{
                  color: theme.palette.text.primary,
                }}
              >
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            
            <Box
              onClick={handleProfileMenuOpen}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              <Avatar 
                sx={{ 
                  width: 34, 
                  height: 34,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                {user?.username[0].toUpperCase()}
              </Avatar>
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>
                  {user?.username}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  {user?.role === 'admin' ? 'Yönetici' : user?.role === 'bayi' ? 'Bayi' : 'Müşteri'}
                </Typography>
              </Box>
              <ArrowDownIcon sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
            </Box>
          </Stack>
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
              borderRight: 'none',
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
              borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
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
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          background: theme.palette.mode === 'dark'
            ? theme.palette.background.default
            : '#f8f9fa',
          pt: 10,
          px: 3,
          pb: 3,
        }}
      >
        <Outlet />
      </Box>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            minWidth: 200,
            mt: 1.5,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            '& .MuiMenuItem-root': {
              borderRadius: 1,
              mx: 1,
              my: 0.5,
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {user?.username}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { navigate('/profile'); handleProfileMenuClose(); }}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          Profilim
        </MenuItem>
        <MenuItem onClick={() => { navigate('/settings'); handleProfileMenuClose(); }}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Ayarlar
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={handleLogout}
          sx={{
            color: theme.palette.error.main,
            '&:hover': {
              bgcolor: alpha(theme.palette.error.main, 0.08),
            },
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" sx={{ color: theme.palette.error.main }} />
          </ListItemIcon>
          Çıkış Yap
        </MenuItem>
      </Menu>

      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={handleNotificationClose}
        PaperProps={{
          elevation: 0,
          sx: {
            width: 360,
            maxHeight: 400,
            mt: 1.5,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <Typography variant="h6" fontWeight={600}>
            Bildirimler
          </Typography>
        </Box>
        <List sx={{ py: 0 }}>
          {[
            { title: 'Yeni kampanya oluşturuldu', time: '5 dakika önce', type: 'success' },
            { title: '150 mesaj başarıyla gönderildi', time: '1 saat önce', type: 'info' },
            { title: 'API limiti aşıldı', time: '2 saat önce', type: 'warning' },
            { title: 'Şablon onaylandı', time: '3 saat önce', type: 'success' },
          ].map((notification, index) => (
            <ListItem
              key={index}
              sx={{
                py: 1.5,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                },
              }}
            >
              <ListItemIcon>
                <CircleIcon 
                  sx={{ 
                    fontSize: 8, 
                    color: notification.type === 'success' ? theme.palette.success.main : 
                           notification.type === 'warning' ? theme.palette.warning.main : 
                           theme.palette.info.main 
                  }} 
                />
              </ListItemIcon>
              <ListItemText
                primary={notification.title}
                secondary={notification.time}
                primaryTypographyProps={{ fontSize: '0.9rem' }}
                secondaryTypographyProps={{ fontSize: '0.75rem' }}
              />
            </ListItem>
          ))}
        </List>
        <Box sx={{ p: 1, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <Button fullWidth size="small">
            Tüm Bildirimleri Gör
          </Button>
        </Box>
      </Menu>
    </Box>
  );
};

export default Layout;