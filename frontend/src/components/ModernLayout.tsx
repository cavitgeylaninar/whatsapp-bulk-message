import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { notificationStore, NotificationItem } from '../services/notificationStore';
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
  Paper,
  Chip,
  alpha,
  useTheme,
  Button,
  InputBase,
  styled,
  Stack,
  Card,
  useMediaQuery,
  TextField
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
  KeyboardArrowDown,
  Search as SearchIcon,
  Close as CloseIcon,
  ArrowForward as ArrowForwardIcon,
  FiberManualRecord,
  TrendingUp,
  Circle,
  Clear as ClearIcon,
  DoneAll as DoneAllIcon,
  Email as EmailIcon,
  Sms as SmsIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';
import api from '../services/api';

const DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 80;

// Styled Components
const StyledDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    border: 'none',
    boxShadow: theme.palette.mode === 'dark' 
      ? '0 0 40px rgba(0,0,0,0.5)' 
      : '0 0 40px rgba(0,0,0,0.08)',
    background: theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, #1e1e1e 0%, #121212 100%)'
      : 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)',
  }
}));

const ModernLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { user, logout } = useAuth();
  const { mode, toggleColorMode } = useCustomTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [messageCount, setMessageCount] = useState<number>(0);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchAnchor, setSearchAnchor] = useState<null | HTMLElement>(null);

  const fetchMessageCount = async () => {
    console.log('ModernLayout - fetchMessageCount çağrıldı, zaman:', new Date().toISOString());
    try {
      // Tüm mesajları al
      const response = await api.get('/messages?limit=100');
      
      if (response.data && Array.isArray(response.data.messages)) {
        // Sadece okunmamış gelen mesajları say
        let unreadCount = 0;
        const inboundMessages = response.data.messages.filter((msg: any) => msg.direction === 'inbound');
        
        console.log('Toplam gelen mesaj sayısı:', inboundMessages.length);
        
        inboundMessages.forEach((msg: any) => {
          // Gelen ve okunmamış mesajları say (status !== 'read')
          if (!msg.status || msg.status !== 'read') {
            unreadCount++;
            console.log(`Okunmamış: ${msg.id} - Durum: ${msg.status}`);
          } else {
            console.log(`Okunmuş: ${msg.id} - Durum: ${msg.status}`);
          }
        });
        
        console.log(`Rozet Güncelleme: ${messageCount} → ${unreadCount}`);
        setMessageCount(unreadCount);
      } else {
        console.log('Mesaj bulunamadı');
        setMessageCount(0);
      }
    } catch (error) {
      console.error('Mesaj sayısı alınamadı:', error);
      setMessageCount(0);
    }
  };

  useEffect(() => {
    fetchMessageCount();
    const interval = setInterval(fetchMessageCount, 30000);
    
    // Listen for message status updates
    const handleMessageStatusUpdate = () => {
      console.log('ModernLayout - messageStatusUpdated etkinliği alındı!');
      fetchMessageCount();
    };
    
    // Subscribe to notification store
    const unsubscribe = notificationStore.subscribe((notifs) => {
      setNotifications(notifs);
      setNotificationCount(notificationStore.getUnreadCount());
    });
    
    window.addEventListener('messageStatusUpdated', handleMessageStatusUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('messageStatusUpdated', handleMessageStatusUpdate);
      unsubscribe();
    };
  }, []);

  // Sayfa değiştiğinde badge'i güncelle
  useEffect(() => {
    fetchMessageCount();
  }, [location.pathname]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Global Search Function
  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (!query) {
      setSearchResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results: any[] = [];

    // Search in menu items
    filteredMenuItems.forEach(item => {
      if (item.text.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'page',
          title: item.text,
          icon: item.icon,
          path: item.path,
          description: `Sayfaya git: ${item.text}`
        });
      }
    });

    // Search in quick actions
    const quickActions = [
      { title: 'WhatsApp Web Bağlan', path: '/whatsapp-web', description: 'WhatsApp Web\'e bağlan' },
      { title: 'Yeni Kampanya', path: '/campaigns', description: 'Yeni kampanya oluştur' },
      { title: 'CSV Kişiler', path: '/csv-contacts', description: 'CSV dosyasından kişi yükle' },
      { title: 'Mesajlar', path: '/messages', description: 'Mesajları görüntüle' },
      { title: 'Şablonlar', path: '/templates', description: 'Mesaj şablonları' },
    ];

    quickActions.forEach(action => {
      if (action.title.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'action',
          ...action
        });
      }
    });

    setSearchResults(results.slice(0, 5)); // Show max 5 results
  };

  const handleSearchResultClick = (result: any) => {
    if (result.path) {
      navigate(result.path);
    }
    setSearchQuery('');
    setSearchResults([]);
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

  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleMarkAllRead = () => {
    notificationStore.markAllAsRead();
  };

  const handleClearAll = () => {
    notificationStore.clearAll();
    handleNotificationClose();
  };

  const handleNotificationItemClick = (notification: NotificationItem) => {
    notificationStore.markAsRead(notification.id);
    if (notification.type === 'message' && notification.data?.message) {
      navigate('/messages');
      handleNotificationClose();
    }
  };

  const menuItems = [
    { text: 'WhatsApp Web', icon: <WhatsAppIcon />, path: '/whatsapp-web', roles: ['admin', 'bayi'], color: '#128C7E' },
    { text: 'WhatsApp Kişileri', icon: <PeopleIcon />, path: '/whatsapp-web-contacts', roles: ['admin', 'bayi'], color: '#075E54' },
    { text: 'CSV Kişileri', icon: <DescriptionIcon />, path: '/csv-contacts', roles: ['admin', 'bayi'], color: '#667eea' },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role || '')
  );

  const drawer = (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: mode === 'dark'
        ? 'linear-gradient(180deg, rgba(20,20,30,0.98) 0%, rgba(10,10,15,0.98) 100%)'
        : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,249,252,0.98) 100%)',
      backdropFilter: 'blur(20px)',
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '200px',
        background: mode === 'dark'
          ? 'radial-gradient(circle at 30% 0%, rgba(37, 211, 102, 0.1) 0%, transparent 70%)'
          : 'radial-gradient(circle at 30% 0%, rgba(37, 211, 102, 0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }
    }}>
      {/* Logo Section */}
      <Box sx={{
        p: collapsed ? 2 : 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        minHeight: 80,
        position: 'relative',
        zIndex: 1,
      }}>
        <Box sx={{
          width: collapsed ? 40 : 48,
          height: collapsed ? 40 : 48,
          borderRadius: collapsed ? 2 : 3,
          background: 'linear-gradient(145deg, #25D366 0%, #128C7E 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 40px rgba(37, 211, 102, 0.3)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer',
          '&:hover': {
            transform: 'scale(1.05) rotate(-5deg)',
            boxShadow: '0 15px 50px rgba(37, 211, 102, 0.4)',
          }
        }}>
          <WhatsAppIcon sx={{
            color: 'white',
            fontSize: collapsed ? 24 : 28,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
          }} />
        </Box>
        {!collapsed && (
          <Box sx={{
            ml: 2,
            animation: 'fadeInLeft 0.4s ease-out',
            '@keyframes fadeInLeft': {
              '0%': { opacity: 0, transform: 'translateX(-10px)' },
              '100%': { opacity: 1, transform: 'translateX(0)' },
            }
          }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontSize: '1.1rem',
                letterSpacing: '-0.5px',
                background: 'linear-gradient(135deg, #25D366 0%, #075E54 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              WhatsApp
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: mode === 'dark' ? alpha('#ffffff', 0.6) : alpha('#000000', 0.5),
                fontSize: '0.7rem',
                fontWeight: 500,
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              Business Suite
            </Typography>
          </Box>
        )}
      </Box>

      <Divider sx={{
        opacity: 0.08,
        mx: 2,
        background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.divider, 0.3)}, transparent)`
      }} />

      {/* Navigation Menu */}
      <Box sx={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        px: collapsed ? 1.5 : 2,
        py: 2,
        '&::-webkit-scrollbar': {
          width: 6,
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: alpha(theme.palette.primary.main, 0.2),
          borderRadius: 3,
          '&:hover': {
            background: alpha(theme.palette.primary.main, 0.3),
          }
        }
      }}>
        {!collapsed && (
          <Typography
            variant="caption"
            sx={{
              px: 2,
              py: 1,
              display: 'block',
              color: mode === 'dark' ? alpha('#ffffff', 0.4) : alpha('#000000', 0.4),
              fontWeight: 600,
              fontSize: '0.65rem',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
            }}
          >
            Ana Menü
          </Typography>
        )}
        <List sx={{ pt: collapsed ? 0 : 1 }}>
          {filteredMenuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem
                key={item.text}
                disablePadding
                sx={{ mb: 1 }}
              >
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: collapsed ? 2 : 2.5,
                    height: collapsed ? 48 : 52,
                    position: 'relative',
                    overflow: 'hidden',
                    px: collapsed ? 1.5 : 2.5,
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    backgroundColor: isActive
                      ? mode === 'dark'
                        ? alpha(item.color, 0.15)
                        : alpha(item.color, 0.12)
                      : 'transparent',
                    border: `1px solid ${isActive
                      ? alpha(item.color, 0.2)
                      : 'transparent'
                    }`,
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: isActive ? '70%' : 0,
                      backgroundColor: item.color,
                      borderRadius: '0 3px 3px 0',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isActive ? `0 0 20px ${alpha(item.color, 0.5)}` : 'none',
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `radial-gradient(circle at 0% 50%, ${alpha(item.color, 0.15)}, transparent 70%)`,
                      opacity: 0,
                      transition: 'opacity 0.3s',
                      pointerEvents: 'none',
                    },
                    '&:hover': {
                      backgroundColor: isActive
                        ? mode === 'dark'
                          ? alpha(item.color, 0.2)
                          : alpha(item.color, 0.15)
                        : mode === 'dark'
                          ? alpha(item.color, 0.08)
                          : alpha(item.color, 0.06),
                      transform: collapsed ? 'none' : 'translateX(5px)',
                      border: `1px solid ${alpha(item.color, isActive ? 0.3 : 0.15)}`,
                      '&::before': {
                        height: '50%',
                        width: 3,
                      },
                      '&::after': {
                        opacity: isActive ? 0 : 0.3,
                      },
                      '& .menu-icon': {
                        transform: 'scale(1.1) rotate(5deg)',
                        color: item.color,
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{
                    minWidth: collapsed ? 'auto' : 45,
                    color: isActive
                      ? item.color
                      : mode === 'dark'
                        ? alpha('#ffffff', 0.7)
                        : alpha('#000000', 0.6),
                    transition: 'all 0.3s',
                  }}>
                    <Box
                      className="menu-icon"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 36,
                        height: 36,
                        borderRadius: 1.5,
                        background: isActive
                          ? `linear-gradient(135deg, ${alpha(item.color, 0.2)}, ${alpha(item.color, 0.1)})`
                          : 'transparent',
                        transition: 'all 0.3s',
                      }}
                    >
                      {item.text === 'Mesajlar' && messageCount > 0 ? (
                        <Badge
                          badgeContent={messageCount}
                          color="error"
                          sx={{
                            '& .MuiBadge-badge': {
                              fontSize: '0.65rem',
                              height: 18,
                              minWidth: 18,
                              fontWeight: 700,
                              background: 'linear-gradient(135deg, #ff4757, #ff6348)',
                              boxShadow: '0 2px 8px rgba(255, 71, 87, 0.4)',
                            }
                          }}
                        >
                          {React.cloneElement(item.icon, { sx: { fontSize: 22 } })}
                        </Badge>
                      ) : (
                        React.cloneElement(item.icon, { sx: { fontSize: 22 } })
                      )}
                    </Box>
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        fontSize: '0.9rem',
                        fontWeight: isActive ? 600 : 500,
                        color: isActive
                          ? item.color
                          : mode === 'dark'
                            ? alpha('#ffffff', 0.85)
                            : alpha('#000000', 0.75),
                        letterSpacing: '0.2px',
                      }}
                    />
                  )}
                  {!collapsed && isActive && (
                    <Box sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: item.color,
                      boxShadow: `0 0 10px ${item.color}`,
                      animation: 'pulse 2s infinite',
                    }} />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* User Section */}
      <Box sx={{ mt: 'auto' }}>
        <Divider sx={{
          opacity: 0.08,
          mx: 2,
          background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.divider, 0.3)}, transparent)`
        }} />

        <Box sx={{ p: collapsed ? 1.5 : 2 }}>
          <Card
            elevation={0}
            sx={{
              p: collapsed ? 1.5 : 2,
              background: mode === 'dark'
                ? `linear-gradient(135deg, ${alpha('#ffffff', 0.04)}, ${alpha('#ffffff', 0.02)})`
                : `linear-gradient(135deg, ${alpha('#000000', 0.03)}, ${alpha('#000000', 0.01)})`,
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s',
              cursor: 'pointer',
              '&:hover': {
                background: mode === 'dark'
                  ? `linear-gradient(135deg, ${alpha('#ffffff', 0.06)}, ${alpha('#ffffff', 0.03)})`
                  : `linear-gradient(135deg, ${alpha('#000000', 0.05)}, ${alpha('#000000', 0.02)})`,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                transform: 'translateY(-2px)',
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
              }
            }}
          >
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : 1.5,
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}>
              <Avatar
                sx={{
                  width: collapsed ? 32 : 38,
                  height: collapsed ? 32 : 38,
                  background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
                  fontSize: collapsed ? '0.8rem' : '0.9rem',
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
                }}
              >
                {user?.username?.[0]?.toUpperCase()}
              </Avatar>
              {!collapsed && (
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: mode === 'dark' ? '#ffffff' : '#1a1a1a',
                      fontSize: '0.85rem',
                      lineHeight: 1.2,
                    }}
                  >
                    {user?.company_name || user?.username}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: mode === 'dark' ? alpha('#ffffff', 0.5) : alpha('#000000', 0.5),
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mt: 0.3,
                    }}
                  >
                    <Box sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: '#25D366',
                      animation: 'pulse 2s infinite',
                    }} />
                    {user?.role === 'admin' ? 'Yönetici' : user?.role}
                  </Typography>
                </Box>
              )}
            </Box>
          </Card>

          {/* Collapse Button */}
          <Tooltip title={collapsed ? "Genişlet" : "Daralt"} placement="right">
            <IconButton
              onClick={() => setCollapsed(!collapsed)}
              sx={{
                mt: 2,
                width: '100%',
                height: 36,
                borderRadius: 2,
                background: mode === 'dark'
                  ? alpha('#ffffff', 0.03)
                  : alpha('#000000', 0.02),
                border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                transition: 'all 0.3s',
                '&:hover': {
                  background: mode === 'dark'
                    ? alpha('#ffffff', 0.05)
                    : alpha('#000000', 0.04),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                }
              }}
            >
              {collapsed ? (
                <KeyboardArrowDown sx={{
                  fontSize: 18,
                  transform: 'rotate(-90deg)',
                  transition: 'transform 0.3s'
                }} />
              ) : (
                <KeyboardArrowDown sx={{
                  fontSize: 18,
                  transform: 'rotate(90deg)',
                  transition: 'transform 0.3s'
                }} />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: mode === 'dark' ? '#0a0a0a' : '#f5f7fa' }}>
      {/* Modern AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH}px)` },
          ml: { sm: collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH },
          backgroundColor: mode === 'dark'
            ? 'rgba(20, 20, 20, 0.85)'
            : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: `1px solid ${mode === 'dark'
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(0, 0, 0, 0.08)'}`,
          boxShadow: mode === 'dark'
            ? '0 1px 40px rgba(0, 0, 0, 0.3)'
            : '0 1px 40px rgba(0, 0, 0, 0.03)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Toolbar sx={{
          height: 72,
          px: { xs: 2, sm: 3, md: 4 },
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{
              mr: 2,
              display: { sm: 'none' },
              color: mode === 'dark' ? '#fff' : '#000',
            }}
          >
            <MenuIcon />
          </IconButton>

          {/* Page Title with Enhanced Design */}
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  background: mode === 'dark'
                    ? 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%)'
                    : 'linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontSize: { xs: '1.2rem', sm: '1.4rem', md: '1.5rem' },
                  letterSpacing: '-0.02em',
                }}
              >
                {filteredMenuItems.find(item => item.path === location.pathname)?.text || 'Yönetim Paneli'}
              </Typography>
            </Box>
            {/* Breadcrumb */}
            <Typography
              variant="caption"
              sx={{
                color: mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                fontSize: '0.75rem',
                letterSpacing: '0.03em',
              }}
            >
              Ana Sayfa / {filteredMenuItems.find(item => item.path === location.pathname)?.text || 'Dashboard'}
            </Typography>
          </Box>

          {/* Right Section */}
          <Stack direction="row" spacing={1.5} alignItems="center">
            {/* Search Bar */}
            <Box sx={{ position: 'relative' }}>
              <TextField
                placeholder="Ara..."
                size="small"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                sx={{
                display: { xs: 'none', md: 'block' },
                width: 220,
                '& .MuiOutlinedInput-root': {
                  height: 40,
                  borderRadius: '20px',
                  backgroundColor: mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.03)',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.08)'}`,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '& fieldset': {
                    border: 'none',
                  },
                  '&:hover': {
                    backgroundColor: mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.05)',
                    transform: 'scale(1.02)',
                  },
                  '&.Mui-focused': {
                    backgroundColor: mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(0, 0, 0, 0.06)',
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                    boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.15)}`,
                  },
                },
                '& .MuiInputBase-input': {
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  '&::placeholder': {
                    color: mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.4)'
                      : 'rgba(0, 0, 0, 0.4)',
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <SearchIcon
                    sx={{
                      fontSize: 18,
                      color: mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.5)'
                        : 'rgba(0, 0, 0, 0.5)',
                      mr: 1,
                    }}
                  />
                ),
              }}
            />

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <Card
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  mt: 1,
                  zIndex: 9999,
                  maxHeight: 400,
                  overflowY: 'auto',
                  backgroundColor: mode === 'dark'
                    ? 'rgba(30, 30, 30, 0.98)'
                    : 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.1)'}`,
                  borderRadius: '12px',
                  boxShadow: mode === 'dark'
                    ? '0 8px 32px rgba(0, 0, 0, 0.4)'
                    : '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
              >
                <List sx={{ p: 0 }}>
                  {searchResults.map((result, index) => (
                    <ListItemButton
                      key={index}
                      onClick={() => handleSearchResultClick(result)}
                      sx={{
                        borderBottom: index < searchResults.length - 1
                          ? `1px solid ${alpha(theme.palette.divider, 0.1)}`
                          : 'none',
                        '&:hover': {
                          backgroundColor: mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(0, 0, 0, 0.02)',
                        },
                      }}
                    >
                      <ListItemIcon>
                        {result.type === 'page' ? (
                          result.icon || <ArrowForwardIcon fontSize="small" />
                        ) : (
                          <TrendingUp fontSize="small" color="primary" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight={500}>
                            {result.title}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {result.description}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Card>
            )}
            </Box>

            {/* Theme Toggle with Better Animation */}
            <Tooltip title={mode === 'dark' ? 'Aydınlık Mod' : 'Karanlık Mod'} placement="bottom">
              <IconButton
                onClick={toggleColorMode}
                sx={{
                  width: 42,
                  height: 42,
                  position: 'relative',
                  backgroundColor: mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.02)',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.08)'}`,
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 0,
                    height: 0,
                    borderRadius: '50%',
                    backgroundColor: mode === 'dark'
                      ? 'rgba(251, 191, 36, 0.2)'
                      : 'rgba(99, 102, 241, 0.2)',
                    transform: 'translate(-50%, -50%)',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  },
                  '&:hover': {
                    backgroundColor: mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.04)',
                    transform: 'rotate(180deg) scale(1.1)',
                    '&::before': {
                      width: 100,
                      height: 100,
                    },
                  },
                }}
              >
                {mode === 'dark' ?
                  <LightModeIcon sx={{
                    fontSize: 20,
                    color: '#fbbf24',
                    filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.5))',
                    transition: 'all 0.3s',
                  }} /> :
                  <DarkModeIcon sx={{
                    fontSize: 20,
                    color: '#6366f1',
                    filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.5))',
                    transition: 'all 0.3s',
                  }} />
                }
              </IconButton>
            </Tooltip>

            {/* Profile Button with Glassmorphism */}
            <Button
              onClick={handleProfileMenuOpen}
              sx={{
                borderRadius: 16,
                padding: '6px 12px',
                background: mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.02)',
                backdropFilter: 'blur(10px)',
                border: `1px solid ${mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.08)'}`,
                textTransform: 'none',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `radial-gradient(circle at center, ${alpha(theme.palette.primary.main, 0.15)}, transparent 70%)`,
                  opacity: 0,
                  transition: 'opacity 0.3s',
                },
                '&:hover': {
                  backgroundColor: mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.04)',
                  transform: 'translateY(-2px) scale(1.02)',
                  boxShadow: mode === 'dark'
                    ? '0 8px 32px rgba(102, 126, 234, 0.3)'
                    : '0 8px 32px rgba(102, 126, 234, 0.15)',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                  '&::before': {
                    opacity: 1,
                  },
                  '& .profile-avatar': {
                    transform: 'scale(1.1) rotate(-5deg)',
                  },
                  '& .profile-name': {
                    color: theme.palette.primary.main,
                  }
                }
              }}
            >
              <Avatar
                className="profile-avatar"
                sx={{
                  width: 36,
                  height: 36,
                  mr: 1.5,
                  background: 'linear-gradient(145deg, #667eea 0%, #764ba2 100%)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {user?.company_name ? user.company_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : user?.username?.[0]?.toUpperCase()}
              </Avatar>
              <Box sx={{ textAlign: 'left', display: { xs: 'none', sm: 'block' }, position: 'relative', zIndex: 1 }}>
                <Typography
                  className="profile-name"
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: mode === 'dark' ? '#ffffff' : '#1a1a1a',
                    fontSize: '0.9rem',
                    letterSpacing: '0.2px',
                    transition: 'color 0.3s',
                  }}
                >
                  {user?.company_name || user?.username}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: mode === 'dark' ? alpha('#ffffff', 0.6) : alpha('#000000', 0.6),
                    fontSize: '0.7rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <Box sx={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    backgroundColor: '#25D366',
                    animation: 'pulse 2s infinite',
                  }} />
                  {user?.role === 'admin' ? 'Yönetici' : user?.role}
                </Typography>
              </Box>
              <KeyboardArrowDown
                sx={{
                  ml: 1,
                  fontSize: 20,
                  color: mode === 'dark' ? alpha('#ffffff', 0.7) : alpha('#000000', 0.5),
                  transition: 'transform 0.3s',
                  '.MuiButton-root:hover &': {
                    transform: 'rotate(180deg)',
                  }
                }}
              />
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ 
          width: { sm: collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH }, 
          flexShrink: { sm: 0 },
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <StyledDrawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawer}
        </StyledDrawer>
        <StyledDrawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH,
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            },
          }}
          open
        >
          {drawer}
        </StyledDrawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH}px)` },
          mt: '70px',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          minHeight: 'calc(100vh - 70px)',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: '100%',
            overflow: 'auto',
            position: 'relative',
          }}
        >
          <Suspense
            fallback={
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  width: '100%',
                }}
              >
                <Typography>Yükleniyor...</Typography>
              </Box>
            }
          >
            <Outlet />
          </Suspense>
        </Box>
      </Box>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.08))',
            mt: 1.5,
            borderRadius: 2,
            minWidth: 220,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {user?.company_name || user?.username}
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
          Profil
        </MenuItem>
        <MenuItem onClick={() => { navigate('/settings'); handleProfileMenuClose(); }}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Ayarlar
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          Çıkış Yap
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ModernLayout;