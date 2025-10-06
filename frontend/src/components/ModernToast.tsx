import React from 'react';
import { Snackbar, Alert, Slide, SlideProps, Box, IconButton } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Close as CloseIcon
} from '@mui/icons-material';

interface ModernToastProps {
  open: boolean;
  message: string;
  severity?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  duration?: number;
  action?: React.ReactNode;
}

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

const ModernToast: React.FC<ModernToastProps> = ({
  open,
  message,
  severity = 'info',
  onClose,
  duration = 5000,
  action
}) => {
  const theme = useTheme();

  const getIcon = () => {
    switch (severity) {
      case 'success':
        return <SuccessIcon />;
      case 'error':
        return <ErrorIcon />;
      case 'warning':
        return <WarningIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getColor = () => {
    switch (severity) {
      case 'success':
        return theme.palette.success.main;
      case 'error':
        return theme.palette.error.main;
      case 'warning':
        return theme.palette.warning.main;
      default:
        return theme.palette.info.main;
    }
  };

  const getSeverityMessage = () => {
    // WhatsApp bağlantı hataları
    if (message.includes('Protocol error') || message.includes('Session closed')) {
      return 'WhatsApp bağlantısı kesildi. Lütfen sayfayı yenileyip tekrar deneyin.';
    }

    if (message.includes('WhatsApp oturumu bulunamadı') || message.includes('Session not found')) {
      return 'WhatsApp oturumu bulunamadı. Lütfen QR kod ile tekrar bağlanın.';
    }

    if (message.includes('Cannot read properties')) {
      return 'Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin.';
    }

    if (message.includes('Phone number is required')) {
      return 'Telefon numarası gerekli.';
    }

    // Network hataları
    if (message.includes('Network Error') || message.includes('ERR_NETWORK')) {
      return 'İnternet bağlantınızı kontrol edin.';
    }

    // Timeout hataları
    if (message.includes('timeout')) {
      return 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.';
    }

    // Auth hataları
    if (message.includes('401') || message.includes('Unauthorized')) {
      return 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
    }

    if (message.includes('403') || message.includes('Forbidden')) {
      return 'Bu işlem için yetkiniz bulunmuyor.';
    }

    // 404 hataları
    if (message.includes('404') || message.includes('Not Found')) {
      return 'Aradığınız sayfa veya kaynak bulunamadı.';
    }

    // Server hataları
    if (message.includes('500') || message.includes('Internal Server Error')) {
      return 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';
    }

    if (message.includes('503') || message.includes('Service Unavailable')) {
      return 'Servis şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
    }

    // Default - emojisiz mesajları olduğu gibi göster
    return message;
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      TransitionComponent={SlideTransition}
      sx={{
        '& .MuiSnackbar-root': {
          bottom: 24,
        }
      }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        icon={getIcon()}
        action={
          action || (
            <IconButton
              size="small"
              color="inherit"
              onClick={onClose}
              sx={{
                '&:hover': {
                  backgroundColor: alpha(theme.palette.common.white, 0.1),
                }
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )
        }
        sx={{
          minWidth: 380,
          maxWidth: 600,
          background: theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`
            : `linear-gradient(135deg, ${alpha('#ffffff', 0.98)} 0%, ${alpha('#f5f5f5', 0.95)} 100%)`,
          color: theme.palette.text.primary,
          border: `1px solid ${alpha(getColor(), 0.2)}`,
          borderRadius: 3,
          boxShadow: `
            0 4px 6px -1px ${alpha(getColor(), 0.1)},
            0 2px 4px -1px ${alpha(getColor(), 0.06)},
            0 20px 25px -5px ${alpha(getColor(), 0.1)},
            0 10px 10px -5px ${alpha(getColor(), 0.04)},
            inset 0 0 0 1px ${alpha(getColor(), 0.05)}
          `,
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          paddingRight: 3,
          '& .MuiAlert-icon': {
            fontSize: 26,
            color: getColor(),
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
            alignSelf: 'center',
          },
          '& .MuiAlert-message': {
            fontSize: '0.925rem',
            fontWeight: 500,
            letterSpacing: '0.3px',
            lineHeight: 1.5,
            padding: '2px 0',
            display: 'flex',
            alignItems: 'center',
          },
          '& .MuiAlert-action': {
            padding: 0,
            marginRight: 0,
            alignSelf: 'center',
            display: 'flex',
            alignItems: 'center',
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: 4,
            height: '100%',
            background: `linear-gradient(180deg, ${getColor()} 0%, ${alpha(getColor(), 0.8)} 100%)`,
            borderRadius: '3px 0 0 3px',
            boxShadow: `2px 0 8px ${alpha(getColor(), 0.3)}`,
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: -50,
            right: -50,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(getColor(), 0.08)} 0%, transparent 70%)`,
            pointerEvents: 'none',
          },
          animation: 'slideInUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          '@keyframes slideInUp': {
            '0%': {
              opacity: 0,
              transform: 'translateY(30px) scale(0.95)',
            },
            '100%': {
              opacity: 1,
              transform: 'translateY(0) scale(1)',
            },
          },
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: `
              0 6px 8px -2px ${alpha(getColor(), 0.15)},
              0 4px 6px -1px ${alpha(getColor(), 0.08)},
              0 24px 30px -6px ${alpha(getColor(), 0.15)},
              0 12px 12px -6px ${alpha(getColor(), 0.06)},
              inset 0 0 0 1px ${alpha(getColor(), 0.08)}
            `,
          },
        }}
      >
        {getSeverityMessage()}
      </Alert>
    </Snackbar>
  );
};

export default ModernToast;