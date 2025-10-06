import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Button,
  Chip,
  Paper,
  Tooltip,
  alpha
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  WhatsApp as WhatsAppIcon,
  Message as MessageIcon,
  Clear as ClearIcon,
  DoneAll as DoneAllIcon,
  Circle as CircleIcon
} from '@mui/icons-material';
import { useNotifications } from '../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

const NotificationMenu: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notificationId: string) => {
    markAsRead(notificationId);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'whatsapp_message':
        return <WhatsAppIcon sx={{ color: '#25D366' }} />;
      case 'whatsapp_status':
        return <MessageIcon sx={{ color: '#1976d2' }} />;
      default:
        return <NotificationsIcon />;
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Format phone number for display
    if (phone.startsWith('90')) {
      return `+${phone.slice(0, 2)} ${phone.slice(2, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`;
    }
    return phone;
  };

  return (
    <>
      <Tooltip title="Bildirimler">
        <IconButton
          color="inherit"
          onClick={handleClick}
          sx={{
            '&:hover': {
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1)
            }
          }}
        >
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 420,
            maxHeight: 600,
            overflow: 'hidden',
            mt: 1.5,
            borderRadius: 2,
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ 
          px: 2, 
          py: 1.5, 
          borderBottom: 1, 
          borderColor: 'divider',
          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Bildirimler
              </Typography>
              {unreadCount > 0 && (
                <Chip 
                  label={unreadCount} 
                  size="small" 
                  color="error"
                  sx={{ height: 20, fontSize: '0.75rem' }}
                />
              )}
            </Box>
            {notifications.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="Tümünü okundu işaretle">
                  <IconButton size="small" onClick={markAllAsRead}>
                    <DoneAllIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Tümünü temizle">
                  <IconButton size="small" onClick={clearNotifications}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>
        </Box>

        {/* Notifications List */}
        <List sx={{ 
          p: 0, 
          maxHeight: 450, 
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: 6
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'grey.300',
            borderRadius: 1
          }
        }}>
          {notifications.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center', 
              py: 8,
              color: 'text.secondary'
            }}>
              <NotificationsIcon sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
              <Typography variant="body2">
                Henüz bildirim yok
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                WhatsApp mesajları burada görünecek
              </Typography>
            </Box>
          ) : (
            notifications.slice(0, 20).map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  onClick={() => handleNotificationClick(notification.id)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    cursor: 'pointer',
                    bgcolor: !notification.read ? alpha('#25D366', 0.05) : 'transparent',
                    '&:hover': {
                      bgcolor: (theme) => 
                        theme.palette.mode === 'dark' 
                          ? alpha(theme.palette.common.white, 0.05)
                          : alpha(theme.palette.common.black, 0.02)
                    },
                    position: 'relative'
                  }}
                >
                  {!notification.read && (
                    <CircleIcon 
                      sx={{ 
                        position: 'absolute',
                        left: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: 8,
                        color: '#25D366'
                      }} 
                    />
                  )}
                  <ListItemAvatar sx={{ ml: !notification.read ? 1 : 0 }}>
                    <Avatar sx={{ 
                      bgcolor: alpha('#25D366', 0.1),
                      width: 40,
                      height: 40
                    }}>
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {formatPhoneNumber(notification.from || '')}
                        </Typography>
                        {notification.type === 'whatsapp_message' && (
                          <Chip 
                            label="WhatsApp" 
                            size="small" 
                            sx={{ 
                              height: 18,
                              fontSize: '0.7rem',
                              bgcolor: alpha('#25D366', 0.15),
                              color: '#128C7E'
                            }} 
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'text.primary',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            mt: 0.5
                          }}
                        >
                          {notification.message}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'text.secondary',
                            mt: 0.5,
                            display: 'block'
                          }}
                        >
                          {formatDistanceToNow(new Date(notification.timestamp), { 
                            addSuffix: true, 
                            locale: tr 
                          })}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < notifications.length - 1 && (
                  <Divider variant="inset" component="li" />
                )}
              </React.Fragment>
            ))
          )}
        </List>

        {/* Footer */}
        {notifications.length > 0 && (
          <Box sx={{ 
            p: 1.5, 
            borderTop: 1, 
            borderColor: 'divider',
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'
          }}>
            <Button
              fullWidth
              size="small"
              onClick={() => {
                handleClose();
                // Navigate to messages page
                window.location.href = '/messages';
              }}
              sx={{ textTransform: 'none' }}
            >
              Tüm mesajları görüntüle
            </Button>
          </Box>
        )}
      </Menu>
    </>
  );
};

export default NotificationMenu;