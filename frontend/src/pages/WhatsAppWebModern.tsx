import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemButton,
  ListItemIcon,
  Avatar,
  Badge,
  Chip,
  Card,
  CardContent,
  Stack,
  Divider,
  InputAdornment,
  CircularProgress,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Tooltip,
  FormControlLabel,
  Checkbox,
  Menu,
  MenuItem,
  LinearProgress,
  useTheme,
  alpha,
  Fade,
  Grow,
  Skeleton,
} from '@mui/material';
import {
  Phone as PhoneIcon,
  ContactPhone as ContactPhoneIcon,
  Message as MessageIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Search as SearchIcon,
  QrCode2 as QrCodeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Group as GroupIcon,
  Groups as GroupsIcon,
  Person as PersonIcon,
  Image as ImageIcon,
  VideoCameraBack as VideoIcon,
  Description as DocumentIcon,
  Mic as MicIcon,
  EmojiEmotions as EmojiIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  Sync as SyncIcon,
  GroupAdd as GroupAddIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Campaign as CampaignIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  ContentCopy as CopyIcon,
  CheckCircleOutline,
  RadioButtonUnchecked,
  WhatsApp,
  WhatsApp as WhatsAppIcon,
  TrendingUp,
  TrendingDown,
  AccessTime,
  DoneAll,
  Done,
  FilterList,
  AutoAwesome,
  Visibility,
  Close,
} from '@mui/icons-material';
import io from 'socket.io-client';
import axios from 'axios';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ModernToast from '../components/ModernToast';

interface Contact {
  id: string;
  name: string;
  number: string;
  pushname?: string;
  isMyContact?: boolean;
  isUser: boolean;
  isGroup?: boolean;
  isBlocked?: boolean;
  profilePicUrl?: string;
  status?: string;
  hasName?: boolean;
  lastSeen?: Date;
  unreadCount?: number;
}

interface Message {
  id: string;
  body: string;
  from: string;
  to: string;
  timestamp: number;
  fromMe: boolean;
  hasMedia: boolean;
  mediaUrl?: string;
  mediaType?: string;
  ack?: number;
  author?: string;
}

interface Chat {
  id: string;
  name: string;
  unreadCount: number;
  lastMessage?: Message;
  timestamp?: number;
  isGroup: boolean;
  participants?: string[];
  profilePicUrl?: string;
}

interface Session {
  id: string;
  status: 'INITIALIZING' | 'QR_CODE' | 'AUTHENTICATED' | 'READY' | 'DISCONNECTED' | 'AUTH_FAILURE';
  qr?: string;
  info?: {
    pushname: string;
    phone: string;
    platform: string;
  };
}

const WhatsAppWebModern: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesMap, setMessagesMap] = useState<Map<string, Message[]>>(new Map());
  const [messageText, setMessageText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [socket, setSocket] = useState<any>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showSessionExpiredDialog, setShowSessionExpiredDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as any });
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [bulkMessage, setBulkMessage] = useState('');
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [stats, setStats] = useState({ totalMessages: 0, sentToday: 0, receivedToday: 0, activeChats: 0 });
  const [checkingSession, setCheckingSession] = useState(true);
  const [manualNumbers, setManualNumbers] = useState('');
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncContactsCount, setSyncContactsCount] = useState(0);
  const [totalContactsCount, setTotalContactsCount] = useState(0);
  const [syncStartTime, setSyncStartTime] = useState<Date | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [syncElapsedTime, setSyncElapsedTime] = useState(0);
  const [syncStatus, setSyncStatus] = useState('');
  const [syncSpeed, setSyncSpeed] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  const token = localStorage.getItem('token');
  // Create default session ID based on user ID (backend uses ID, not username)
  const defaultSessionId = `session-${user?.id || 'default'}`;

  // Socket.io connection
  useEffect(() => {
    const newSocket = io('http://localhost:3500', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      if (session?.id) {
        console.log('Joining session:', session.id);
        newSocket.emit('join-session', session.id);
      }
    });

    // Listen for all WhatsApp Web events
    newSocket.on('qr', (data: any) => {
      console.log('QR event received:', data);
      const qrData = data.qr || data.qrDataUrl || data;
      setSession(prev => ({
        ...prev!,
        id: data.sessionId || prev?.id || defaultSessionId,
        status: 'QR_CODE',
        qr: qrData
      }));
      setShowQRDialog(true);
      showSnackbar('QR kodu okutun', 'info');
    });

    newSocket.on('authenticated', (data: any) => {
      console.log('Authenticated event received:', data);
      setSession(prev => ({
        ...prev!,
        id: data.sessionId || prev?.id || defaultSessionId,
        status: 'AUTHENTICATED',
        qr: undefined
      }));
      setShowQRDialog(false);
      setLoading(true); // Show loading while connecting
      showSnackbar('WhatsApp bağlantısı doğrulandı! Bağlantı kuruluyor...', 'success');
    });

    newSocket.on('ready', (data: any) => {
      console.log('Ready event received:', data);
      const currentSessionId = data.sessionId || defaultSessionId;
      setSession(prev => ({
        ...prev!,
        id: currentSessionId,
        status: 'READY',
        info: data.info,
        qr: undefined
      }));
      setShowQRDialog(false); // Ensure QR dialog is closed
      setLoading(false); // Reset loading state
      showSnackbar('WhatsApp bağlantısı başarıyla kuruldu!', 'success');

      // Auto-load contacts and chats after session ready (skip sync to avoid issues)
      setTimeout(async () => {
        try {
          console.log('Auto-loading contacts after session ready...');
          // Directly load contacts without sync
          await loadContacts();
          await loadChats();
        } catch (error) {
          console.error('Auto-load failed:', error);
          showSnackbar('Kişiler yüklenemedi. Senkronize Et butonunu kullanın.', 'warning');
        } finally {
          // Ensure loading state is reset
          setLoading(false);
          loadingContactsRef.current = false;
        }
      }, 3000); // Increased delay for stability
    });

    newSocket.on('disconnected', (data: any) => {
      console.log('Disconnected event received:', data);
      setSession(prev => prev ? { ...prev, status: 'DISCONNECTED', qr: undefined } : null);
      setContacts([]);
      setChats([]);
      setMessages([]);
      showSnackbar('WhatsApp bağlantısı kesildi', 'warning');
    });

    newSocket.on('session-destroyed', (data: any) => {
      console.log('Session destroyed:', data);
      setSession(null);
      setContacts([]);
      setChats([]);
      setMessages([]);
      showSnackbar('WhatsApp oturumu sonlandırıldı', 'info');
    });

    newSocket.on('auth_failure', (data: any) => {
      console.log('Auth failure event received:', data);
      setSession(prev => prev ? { ...prev, status: 'AUTH_FAILURE' } : null);
      showSnackbar('Kimlik doğrulama hatası!', 'error');
      setShowQRDialog(false);
    });

    newSocket.on('message', (data: any) => {
      console.log('New message received:', data);
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
        loadChats();
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  // Check session status on mount
  useEffect(() => {
    const checkSessionStatus = async () => {
      setCheckingSession(true);
      // Reset session first to prevent showing old state
      setSession(null);
      try {
        // Backend uses user ID for session creation, not username
        const sessionId = `session-${user?.id || 'default'}`;
        const response = await axios.get(`${API_URL}/whatsapp-web/session/${sessionId}/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success && response.data.data) {
          const sessionData = response.data.data;
          console.log('Existing session found:', sessionData);

          if (sessionData.status === 'READY') {
            // Verify session is actually ready by trying to get contacts
            try {
              const verifyResponse = await axios.get(`${API_URL}/whatsapp-web/session/${sessionId}/contacts`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { limit: 1 } // Just check if we can get contacts
              });

              // If successful, session is truly ready
              setSession({
                id: sessionId,
                status: 'READY',
                info: sessionData.info,
                qr: undefined
              });

              // Auto-load contacts and chats for existing session
              setTimeout(async () => {
                console.log('Loading contacts for existing session...');
                try {
                  await loadContacts();
                  await loadChats();
                  showSnackbar('WhatsApp bağlantısı aktif!', 'success');
                } catch (error) {
                  console.error('Failed to load data for existing session:', error);
                  showSnackbar('Kişiler yüklenemedi. Senkronize Et butonunu kullanın.', 'warning');
                } finally {
                  // Ensure loading state is reset after auto-load
                  setLoading(false);
                  loadingContactsRef.current = false;
                }
              }, 1000);
            } catch (verifyError: any) {
              // Session is not actually ready, reset it
              console.log('Session verification failed:', verifyError);

              // Check if it's a protocol error
              const errorMessage = verifyError.response?.data?.error || verifyError.message || '';
              if (errorMessage.includes('Protocol error') || errorMessage.includes('Session closed')) {
                // Session is dead, clear it
                setSession(null);
                setContacts([]);
                setChats([]);
                setMessages([]);
              } else {
                // Other error, might be temporary
                setSession({
                  id: sessionId,
                  status: 'DISCONNECTED',
                  info: undefined,
                  qr: undefined
                });
              }
            }
          } else if (sessionData.status === 'QR_CODE' && sessionData.qr) {
            setSession({
              id: sessionId,
              status: 'QR_CODE',
              qr: sessionData.qr,
              info: undefined
            });
            setShowQRDialog(true);
          } else if (sessionData.status === 'DISCONNECTED') {
            setSession(prev => prev ? { ...prev, status: 'DISCONNECTED' } : null);
            setContacts([]);
            setChats([]);
            setMessages([]);
          }
        } else {
          // No session or session destroyed
          setSession(null);
          setContacts([]);
          setChats([]);
          setMessages([]);
        }
      } catch (error) {
        console.log('No existing session or error checking status:', error);
      } finally {
        setCheckingSession(false);
      }
    };

    if (token && user) {
      checkSessionStatus();

      // Removed auto interval check - it was causing page to refresh
      // Session status is already monitored via socket events
    } else {
      setCheckingSession(false);
    }
  }, [token, user]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Join socket room when session changes
  useEffect(() => {
    if (socket && session?.id) {
      console.log('Joining socket room for session:', session.id);
      socket.emit('join-session', session.id);
    }
  }, [socket, session?.id]);

  // Load data when session is ready - optimized to prevent blocking
  useEffect(() => {
    if (session?.status === 'READY' && session?.id) {
      console.log('Session ready, starting sequential data loading...');
      // Load contacts first, then chats after a small delay
      const loadTimer = setTimeout(() => {
        loadContacts();
        // Load chats after contacts to prevent UI blocking
        setTimeout(() => {
          loadChats();
        }, 1000);
      }, 100);

      return () => clearTimeout(loadTimer);
    }
  }, [session?.status, session?.id]);

  // Update stats
  useEffect(() => {
    setStats({
      totalMessages: messages.length,
      sentToday: messages.filter(m => m.fromMe && new Date(m.timestamp * 1000).toDateString() === new Date().toDateString()).length,
      receivedToday: messages.filter(m => !m.fromMe && new Date(m.timestamp * 1000).toDateString() === new Date().toDateString()).length,
      activeChats: chats.filter(c => c.unreadCount > 0).length
    });
  }, [messages, chats]);

  const showSnackbar = (message: string, severity: any) => {
    setSnackbar({ open: true, message, severity });
  };

  // Create or get session
  const initializeSession = async (forceReconnect = false) => {
    console.log('=== INITIALIZE SESSION DEBUG ===');
    console.log('Token available:', !!token);
    console.log('API URL:', API_URL);
    console.log('Force reconnect:', forceReconnect);
    console.log('Initializing WhatsApp session...');
    setLoading(true);
    try {
      // Create user-specific session ID using user ID (backend uses ID, not username)
      const sessionId = `session-${user?.id || 'default'}`;

      // First check if session exists (unless force reconnect)
      if (!forceReconnect) {
        try {
          const statusResponse = await axios.get(`${API_URL}/whatsapp-web/session/${sessionId}/status`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          console.log('Existing session status:', statusResponse.data);

          if (statusResponse.data.status === 'READY') {
            // Check if session is still valid by trying to get user info
            try {
              await axios.get(`${API_URL}/whatsapp-web/session/${sessionId}/contacts`,
                { headers: { Authorization: `Bearer ${token}` } }
              );

              setSession({
                id: sessionId,
                status: 'READY',
                info: statusResponse.data.info
              });
              showSnackbar('WhatsApp bağlantısı hazır!', 'success');
              setLoading(false);
              loadContacts();
              loadChats();
              return;
            } catch (contactError: any) {
              console.log('Session exists but appears expired:', contactError);

              // Check for Protocol error or Session closed error
              const errorMessage = contactError.response?.data?.error || contactError.message || '';
              if (errorMessage.includes('Protocol error') || errorMessage.includes('Session closed')) {
                console.log('Session is closed due to Protocol error, resetting...');

                // Reset session state
                setSession(null);
                setShowQRDialog(false);
                setContacts([]);
                setChats([]);
                setMessages([]);
                setSelectedChat(null);

                // Don't show expired dialog, directly destroy and recreate
                try {
                  await axios.delete(`${API_URL}/whatsapp-web/session/${sessionId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                } catch (destroyError) {
                  console.log('Error destroying old session:', destroyError);
                }

                // Continue with new session creation
              } else {
                // Show expired dialog for other errors
                setShowSessionExpiredDialog(true);
                setLoading(false);
                return;
              }
            }
          }
        } catch (statusError) {
          console.log('No existing session, creating new one...');
        }
      } else {
        // Force reconnect: destroy existing session first
        showSnackbar('Oturum yenileniyor, lütfen QR kodu tekrar okutun...', 'info');
        try {
          await axios.delete(`${API_URL}/whatsapp-web/session/${sessionId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log('Old session destroyed for reconnection');
        } catch (destroyError) {
          console.log('Error destroying old session:', destroyError);
        }
      }

      // Create new session
      const response = await axios.post(`${API_URL}/whatsapp-web/session/create`,
        { sessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Session created:', response.data);

      const sessionData = response.data.session || response.data;
      setSession({
        id: sessionId,
        status: sessionData.status || 'INITIALIZING',
        qr: sessionData.qr,
        info: sessionData.info
      });

      if (sessionData.qr) {
        setShowQRDialog(true);
        showSnackbar('QR kodu okutun', 'info');
      } else if (sessionData.status === 'READY') {
        showSnackbar('WhatsApp bağlantısı hazır!', 'success');
        loadContacts();
        loadChats();
      }

      // Poll for status updates
      const pollInterval = setInterval(async () => {
        try {
          const statusCheck = await axios.get(`${API_URL}/whatsapp-web/session/${sessionId}/status`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          console.log('Status poll:', statusCheck.data);

          if (statusCheck.data.status !== session?.status) {
            setSession({
              id: sessionId,
              status: statusCheck.data.status,
              qr: statusCheck.data.qr,
              info: statusCheck.data.info
            });

            if (statusCheck.data.status === 'READY') {
              clearInterval(pollInterval);
              setShowQRDialog(false);
              setLoading(false); // Reset loading state when session becomes ready
              // WhatsApp Web connected, loading contacts
              // Auto-load contacts when session becomes ready via polling
              setTimeout(async () => {
                try {
                  console.log('Auto-loading contacts via polling...');
                  await loadContacts();
                  await loadChats();
                  // Contacts loaded successfully
                } catch (error) {
                  console.error('Polling auto-load contacts failed:', error);
                  showSnackbar('Kişiler yüklenemedi. Senkronize Et butonunu kullanın.', 'warning');
                }
              }, 1500);
            }
          }
        } catch (error) {
          console.error('Status poll error:', error);
        }
      }, 3000); // Poll every 3 seconds

      // Clear interval after 2 minutes
      setTimeout(() => clearInterval(pollInterval), 120000);

    } catch (error: any) {
      console.error('Session creation error:', error);
      showSnackbar(error.response?.data?.error || 'Oturum oluşturulamadı', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add a ref to track if component is mounted
  const isMountedRef = React.useRef(true);
  const loadingContactsRef = React.useRef(false);

  // Load contacts
  const loadContacts = async () => {
    console.log('=== LOAD CONTACTS DEBUG ===');
    console.log('Session:', session);
    console.log('Session ID:', session?.id);
    console.log('Session Status:', session?.status);
    console.log('Loading state:', loading);
    console.log('LoadingContactsRef:', loadingContactsRef.current);
    console.log('Token available:', !!token);
    console.log('API URL:', API_URL);

    // Prevent multiple simultaneous loads
    if (loading || loadingContactsRef.current) {
      console.log('Already loading contacts, skipping...');
      return;
    }

    // Allow loading if we have a session ID, even if not fully ready
    if (!session?.id) {
      console.log('Skipping contact load - no session ID');
      showSnackbar('WhatsApp oturumu bulunamadı!', 'error');
      return;
    }

    setLoading(true);
    loadingContactsRef.current = true;

    try {
      console.log('Loading contacts for session:', session.id);
      // Set a timeout for the request to prevent indefinite hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout - increased for large contact lists

      const response = await axios.get(`${API_URL}/whatsapp-web/session/${session.id}/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          savedOnly: true, // Only get saved contacts from phone book
          whatsappOnly: true, // Only WhatsApp contacts
          limit: 500 // Reasonable limit for saved contacts
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('Contacts response:', response.data);
      console.log('Response data type:', typeof response.data);
      console.log('Response data keys:', Object.keys(response.data));

      // Extract contacts from the response structure
      let contactList = response.data.contacts || [];

      console.log('Raw contact list:', contactList);
      console.log('Contact list is array?', Array.isArray(contactList));
      console.log('Contact list length:', contactList.length);

      // Ensure we have an array
      if (!Array.isArray(contactList)) {
        console.error('Contact list is not an array, received:', contactList);
        contactList = [];
      }

      // Filter and process contacts on frontend for better control
      const contactMap = new Map<string, any>(); // Use map to store unique contacts

      // First pass: collect all contacts and organize by name
      const contactsByName = new Map<string, any[]>();

      contactList.forEach(contact => {
        // Skip invalid entries
        if (!contact.number || contact.number.length < 10 || contact.isGroup) {
          return;
        }

        // Only include WhatsApp users
        if (contact.isUser === false) {
          return;
        }

        // Get normalized name
        const displayName = (contact.name || contact.pushname || '').trim();

        if (displayName) {
          if (!contactsByName.has(displayName)) {
            contactsByName.set(displayName, []);
          }
          contactsByName.get(displayName)!.push(contact);
        } else {
          // No name, use number as unique key
          contactMap.set(contact.number, contact);
        }
      });

      // Second pass: for each name, pick the best contact (prefer Turkish numbers)
      contactsByName.forEach((contacts, name) => {
        if (contacts.length === 1) {
          // Only one contact with this name
          const contact = contacts[0];
          contactMap.set(`${name}_${contact.number}`, contact);
        } else {
          // Multiple contacts with same name - pick the best one
          let bestContact = contacts[0];

          for (const contact of contacts) {
            const currentIsTurkish = contact.number.startsWith('90');
            const bestIsTurkish = bestContact.number.startsWith('90');

            // Prefer Turkish numbers
            if (currentIsTurkish && !bestIsTurkish) {
              bestContact = contact;
            } else if (!currentIsTurkish && bestIsTurkish) {
              // Keep best
            } else if (contact.number.length === 12 && contact.number.startsWith('90')) {
              // Prefer complete Turkish numbers (90 + 10 digits)
              bestContact = contact;
            }
          }

          contactMap.set(`${name}_${bestContact.number}`, bestContact);
        }
      });

      // Convert map back to array and filter out invalid entries
      contactList = Array.from(contactMap.values())
        .filter(contact => {
          // Final validation - only keep valid phone numbers
          const isValidFormat = /^\d{10,15}$/.test(contact.number);
          return isValidFormat;
        })
        .map(contact => ({
          ...contact,
          // Ensure we have a display name - prefer saved name, then pushname, then formatted number
          name: contact.name || contact.pushname || `+${contact.number}`,
          isWhatsAppUser: contact.isUser !== false // For backward compatibility
        }));

      console.log(`Processed ${contactList.length} valid contacts`);
      console.log('Sample contacts:', contactList.slice(0, 3));

      // Debug: log the contact setting action
      console.log('Setting contacts state to:', contactList);
      setContacts(contactList);

      // Additional debug: verify state was set
      console.log('Contacts state should now be updated. Length:', contactList.length);

      // Reset loading flag
      setLoading(false);
      loadingContactsRef.current = false;

      // Contacts loaded successfully
    } catch (error: any) {
      // Check if it's a CanceledError from AbortController
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        console.log('Contact loading was canceled (timeout or component unmount)');
        setLoading(false);
        loadingContactsRef.current = false; // Reset loading flag
        return; // Don't show error for canceled requests
      }

      console.error('Kişiler yüklenemedi:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });

      let errorMessage = 'Kişiler yüklenemedi';

      if (error.response?.status === 400) {
        errorMessage = 'WhatsApp oturumu hazır değil, lütfen bekleyin...';
        // Reset loading state before retry
        setLoading(false);
        loadingContactsRef.current = false;
        // Retry after a delay for 400 errors
        setTimeout(() => {
          loadContacts();
        }, 3000);
      } else if (error.response?.status === 401) {
        errorMessage = 'Kimlik doğrulama hatası. Lütfen yeniden giriş yapın.';
      } else if (error.response?.status === 404) {
        errorMessage = 'WhatsApp oturumu bulunamadı';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Sunucu hatası';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      // Check for Protocol error or Session closed error
      if (errorMessage.includes('Protocol error') || errorMessage.includes('Session closed')) {
        // Reset session state to show QR code
        setSession(null);
        setShowQRDialog(false);
        setContacts([]);
        setChats([]);
        setMessages([]);
        setSelectedChat(null);

        // Show user-friendly message
        showSnackbar('WhatsApp bağlantısı kesildi. Lütfen QR kod ile tekrar bağlanın.', 'error');

        // Don't auto-reconnect, let user manually reconnect
        // This prevents continuous reconnection loop

        // Reset loading state
        setLoading(false);
        loadingContactsRef.current = false;
        return;
      }

      // Only show error for non-retryable errors
      if (error.response?.status !== 400 && errorMessage) {
        showSnackbar(errorMessage, 'error');
      }

      // Set empty contacts on error
      setContacts([]);

      // Reset loading state
      setLoading(false);
      loadingContactsRef.current = false;
    }
  };

  // Load chats with pagination
  const [chatsOffset, setChatsOffset] = useState(0);
  const [hasMoreChats, setHasMoreChats] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadChats = async (append = false) => {
    if (!session?.id || session.status !== 'READY') {
      console.log('loadChats skipped - session not ready:', session);
      return;
    }

    if (append && !hasMoreChats) {
      console.log('No more chats to load');
      return;
    }

    console.log('Loading chats for session:', session.id, 'Append:', append);

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setChatsOffset(0);  // Reset offset for fresh load
    }

    try {
      const currentOffset = append ? chatsOffset : 0;
      const limit = 15;  // Reduced to 15 for better performance

      const response = await axios.get(`${API_URL}/whatsapp-web/session/${session.id}/chats`, {
        params: { limit, offset: currentOffset },
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Raw chats response:', response.data);
      console.log('Response data type:', typeof response.data);
      console.log('Has chats property:', 'chats' in response.data);

      // The backend returns { total, unread, chats, hasMore } structure
      const chatsArray = response.data.chats || response.data || [];
      const hasMore = response.data.hasMore || false;

      console.log('Extracted chats array:', chatsArray);
      console.log('Chats array length:', chatsArray.length);

      // Transform chats data to ensure consistent structure
      const formattedChats = chatsArray.map(chat => ({
        id: chat.id,
        name: chat.name || chat.contact?.name || 'İsimsiz',
        lastMessage: chat.lastMessage,  // This is already an object with body, timestamp, fromMe
        timestamp: chat.timestamp,
        unreadCount: chat.unreadCount || 0,
        isGroup: chat.isGroup || false,
        profilePicUrl: chat.profilePicUrl || null,
        archived: chat.archived || false,
        pinned: chat.pinned || false,
        isMuted: chat.isMuted || false
      }));

      console.log('Formatted chats:', formattedChats.length, 'Total:', response.data.total);

      if (append) {
        setChats(prev => [...prev, ...formattedChats]);
        setChatsOffset(currentOffset + formattedChats.length);
      } else {
        setChats(formattedChats);
        setChatsOffset(formattedChats.length);
      }

      setHasMoreChats(hasMore);

      // Chats loaded successfully
    } catch (error: any) {
      console.error('Sohbetler yüklenemedi - Full error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      let errorMessage = 'Sohbetler yüklenemedi';
      if (error.response?.status === 404) {
        errorMessage = 'WhatsApp oturumu bulunamadı';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      // Check for Protocol error or Session closed error
      if (errorMessage.includes('Protocol error') || errorMessage.includes('Session closed')) {
        // Reset session state to show QR code
        setSession(null);
        setShowQRDialog(false);
        setContacts([]);
        setChats([]);
        setMessages([]);
        setSelectedChat(null);

        // Show user-friendly message
        showSnackbar('WhatsApp bağlantısı kesildi. Lütfen QR kod ile tekrar bağlanın.', 'error');

        // Don't auto-reconnect, let user manually reconnect
        // This prevents continuous reconnection loop

        return;
      }

      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Load chat history
  const loadChatHistory = async (chatId: string) => {
    if (!session?.id) return;

    // Önce bu chat için daha önce yüklenmiş mesajlar var mı kontrol et
    const cachedMessages = messagesMap.get(chatId);
    if (cachedMessages) {
      setMessages(cachedMessages);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/whatsapp-web/session/${session.id}/messages/history`, {
        params: { chatId, limit: 50 },
        headers: { Authorization: `Bearer ${token}` }
      });

      const chatMessages = response.data.data || [];

      // Mesajları Map'e kaydet
      setMessagesMap(prev => {
        const newMap = new Map(prev);
        newMap.set(chatId, chatMessages);
        return newMap;
      });

      // Mevcut chat için mesajları göster
      setMessages(chatMessages);
    } catch (error: any) {
      console.error('Mesaj geçmişi yüklenemedi:', error);
      // Hata durumunda boş array set et
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!session?.id || !selectedChat || !messageText.trim()) {
      showSnackbar('Mesaj metni boş olamaz', 'warning');
      return;
    }

    if (session.status !== 'READY') {
      showSnackbar('WhatsApp oturumu hazır değil', 'warning');
      return;
    }

    setLoading(true);
    try {
      // Clean phone number properly
      let phoneNumber = selectedChat.id;
      if (phoneNumber.includes('@c.us')) {
        phoneNumber = phoneNumber.replace('@c.us', '');
      } else if (phoneNumber.includes('@g.us')) {
        phoneNumber = phoneNumber.replace('@g.us', '');
      }

      const response = await axios.post(`${API_URL}/whatsapp-web/session/${session.id}/send/message`, {
        phoneNumber: phoneNumber,
        message: messageText.trim()
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });

      if (response.data.success) {
        setMessageText('');
        const newMessage: Message = {
          id: response.data.messageId || Date.now().toString(),
          body: messageText.trim(),
          from: session.info?.phone || '',
          to: selectedChat.id,
          timestamp: Date.now() / 1000,
          fromMe: true,
          hasMedia: false,
          ack: 1 // Tek tik (gönderildi)
        };

        // Mesajı hem mevcut messages'a hem de Map'e ekle
        setMessages(prev => [...prev, newMessage]);

        // Map'i güncelle
        setMessagesMap(prev => {
          const newMap = new Map(prev);
          const chatMessages = newMap.get(selectedChat.id) || [];
          newMap.set(selectedChat.id, [...chatMessages, newMessage]);
          return newMap;
        });

        showSnackbar('Mesaj gönderildi', 'success');

        // Reload chat to get updated messages
        setTimeout(() => {
          loadChatHistory(selectedChat.id);
        }, 1000);
      } else {
        throw new Error(response.data.error || 'Mesaj gönderilemedi');
      }
    } catch (error: any) {
      console.error('Message send error:', error);
      let errorMessage = 'Mesaj gönderilemedi';

      if (error.response?.status === 404) {
        errorMessage = 'WhatsApp oturumu bulunamadı';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'Geçersiz parametre';
      } else if (error.response?.status === 500) {
        errorMessage = 'Sunucu hatası';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'İstek zaman aşımına uğradı';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Send bulk messages
  const sendBulkMessages = async () => {
    console.log('sendBulkMessages called');
    console.log('Session:', session);
    console.log('Manual numbers:', manualNumbers);
    console.log('Bulk message:', bulkMessage);

    // Check session first
    if (!session || !session.id) {
      showSnackbar('WhatsApp oturumu bulunamadı. Lütfen önce bağlanın!', 'error');
      return;
    }

    if (session.status !== 'READY') {
      showSnackbar('WhatsApp bağlantısı hazır değil. Lütfen bekleyin...', 'warning');
      return;
    }

    // Combine selected contacts with manual numbers
    const manualNumbersList = manualNumbers
      .split(',')
      .map(num => {
        // Remove spaces and non-digits, then format properly
        let cleaned = num.trim().replace(/\D/g, '');

        // Skip empty strings
        if (!cleaned) return '';

        // If number starts with 0, remove it and add Turkey code
        if (cleaned.startsWith('0')) {
          cleaned = '90' + cleaned.substring(1);
        }
        // If number doesn't start with country code, add Turkey code
        else if (cleaned.length === 10) {
          cleaned = '90' + cleaned;
        }
        // If number starts with just 9 (Turkey code without +), add full code
        else if (cleaned.startsWith('9') && cleaned.length === 11) {
          cleaned = '90' + cleaned.substring(1);
        }

        return cleaned;
      })
      .filter(num => num && num.length >= 10); // Filter out invalid numbers

    console.log('Manual numbers list:', manualNumbersList);

    const allRecipients = [...selectedContacts, ...manualNumbersList];
    console.log('All recipients:', allRecipients);

    if (allRecipients.length === 0) {
      showSnackbar('Lütfen en az bir alıcı seçin veya numara girin!', 'error');
      return;
    }

    if (!bulkMessage.trim()) {
      showSnackbar('Lütfen mesaj metni girin!', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/whatsapp-web/session/${session.id}/send/bulk`, {
        recipients: allRecipients,
        message: bulkMessage,
        options: { delay: 2000 }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSnackbar(`${allRecipients.length} kişiye mesaj gönderiliyor...`, 'success');
      setBulkMessage('');
      setSelectedContacts([]);
      setManualNumbers('');

      // Show success results
      if (response.data) {
        setTimeout(() => {
          showSnackbar(`Başarılı: ${response.data.successful || 0}, Başarısız: ${response.data.failed || 0}`, 'info');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Bulk message error:', error);
      showSnackbar(error.response?.data?.error || error.message || 'Toplu mesaj gönderilemedi', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Sync chats - similar to syncContacts but for chats
  const syncChats = async () => {
    const sessionIdToUse = session?.id || (user?.username ? `session-${user.username}` : `session-${user?.id || 'default'}`);

    setSyncInProgress(true);
    setSyncProgress(0);
    setSyncContactsCount(0);
    setTotalContactsCount(0);
    setSyncStartTime(new Date());
    setSyncElapsedTime(0);
    setSyncStatus('Sohbetler yükleniyor...');
    setSyncSpeed(0);

    console.log('Starting chat sync for session:', sessionIdToUse);

    // Start elapsed time counter
    const timeInterval = setInterval(() => {
      setSyncElapsedTime((prev) => prev + 1);
    }, 1000);

    try {
      setSyncProgress(20);
      setSyncStatus('WhatsApp sohbetleri alınıyor...');

      // Use a safer approach to load chats
      const response = await axios.get(
        `${API_URL}/whatsapp-web/session/${sessionIdToUse}/chats`,
        {
          params: { limit: 50, offset: 0 },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000 // 30 second timeout
        }
      );

      setSyncProgress(60);
      setSyncStatus('Sohbetler işleniyor...');

      const chatsData = response.data.chats || response.data || [];
      setChats(chatsData);

      setSyncProgress(100);
      setSyncStatus(`${chatsData.length} sohbet başarıyla yüklendi!`);
      setSyncContactsCount(chatsData.length);
      setTotalContactsCount(chatsData.length);

      clearInterval(timeInterval);

      setTimeout(() => {
        setSyncInProgress(false);
      }, 1000);

    } catch (error: any) {
      clearInterval(timeInterval);
      setSyncInProgress(false);
      console.error('Chat sync error:', error);

      let errorMessage = 'Sohbetler yüklenemedi';

      if (error.message?.includes('Session closed') || error.message?.includes('Protocol error')) {
        errorMessage = 'WhatsApp bağlantısı koptu. Lütfen QR kodu yeniden okutun.';
        // Reset session on this error
        setSession(null);
        setShowQRDialog(true);
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Bağlantı zaman aşımına uğradı. Lütfen tekrar deneyin.';
      } else if (error.response?.status === 404) {
        errorMessage = 'WhatsApp oturumu bulunamadı';
      }

      showSnackbar(errorMessage, 'error');
    }
  };

  // Sync contacts with optional sessionId parameter
  const syncContacts = async (customSessionId?: string) => {
    const sessionIdToUse = customSessionId || session?.id;

    console.log('=== SYNC CONTACTS DEBUG ===');
    console.log('Session:', session);
    console.log('Session ID to use:', sessionIdToUse);
    console.log('Session Status:', session?.status);
    console.log('Token available:', !!token);

    if (!sessionIdToUse) {
      console.log('No session ID - showing error');
      showSnackbar('WhatsApp oturumu bulunamadı!', 'error');
      return;
    }

    // Allow sync if we have a sessionId
    // Remove strict READY check to allow sync attempts even when loading

    setSyncInProgress(true);
    setSyncProgress(0);
    setSyncContactsCount(0);
    setTotalContactsCount(0);
    setSyncStartTime(new Date());
    setSyncElapsedTime(0);
    setSyncStatus('Bağlantı kuruluyor...');
    setSyncSpeed(0);
    console.log('Starting contact sync for session:', sessionIdToUse);

    // Start elapsed time counter
    const timeInterval = setInterval(() => {
      setSyncElapsedTime((prev) => prev + 1);
    }, 1000);

    // Simulate progress updates with realistic speeds
    const progressInterval = setInterval(() => {
      setSyncProgress((prev) => {
        if (prev >= 90) {
          return 90; // Stop at 90% and let the actual sync complete it
        }
        const increment = Math.random() * 10 + 5;
        const newProgress = Math.min(prev + increment, 90);

        // Calculate speed (contacts per second)
        if (prev > 0) {
          const contactsProcessed = Math.floor((newProgress / 100) * totalContactsCount);
          setSyncContactsCount(contactsProcessed);
          setSyncSpeed(Math.floor(contactsProcessed / Math.max(syncElapsedTime, 1)));
        }

        // Update status based on progress
        if (newProgress < 20) {
          setSyncStatus('WhatsApp bağlantısı kontrol ediliyor...');
        } else if (newProgress < 40) {
          setSyncStatus('Kişiler yükleniyor...');
        } else if (newProgress < 60) {
          setSyncStatus('Kişiler analiz ediliyor...');
        } else if (newProgress < 80) {
          setSyncStatus('Veritabanına kaydediliyor...');
        } else {
          setSyncStatus('Senkronizasyon tamamlanıyor...');
        }

        return newProgress;
      });
    }, 800);

    try {
      // First get total contacts count
      setSyncProgress(10);
      const contactsResponse = await axios.get(
        `${API_URL}/whatsapp-web/session/${sessionIdToUse}/contacts`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const totalContacts = contactsResponse.data.total || contactsResponse.data.contacts?.length || 0;
      setTotalContactsCount(totalContacts);
      setSyncProgress(25);

      // Start sync
      const response = await axios.post(
        `${API_URL}/whatsapp-web/session/${sessionIdToUse}/contacts/sync`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 60000, // 60 second timeout
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setSyncProgress(25 + (percentCompleted * 0.75));
            }
          }
        }
      );

      setSyncProgress(100);
      setSyncStatus('Senkronizasyon başarıyla tamamlandı!');

      // Clear intervals after setting progress to 100
      setTimeout(() => {
        clearInterval(progressInterval);
        clearInterval(timeInterval);
      }, 100);

      console.log('Sync response:', response.data);
      console.log('Sync success:', response.data.success);

      if (response.data.success) {
        // Load contacts and get actual count
        if (!customSessionId) {
          try {
            const contactsResponse = await axios.get(
              `${API_URL}/whatsapp-web/session/${sessionIdToUse}/contacts`,
              {
                headers: { Authorization: `Bearer ${token}` }
              }
            );

            const actualContactCount = contactsResponse.data.contacts?.length || contactsResponse.data.total || 0;
            setSyncContactsCount(actualContactCount);

            // Calculate final speed with actual count
            const finalSpeed = Math.floor(actualContactCount / Math.max(syncElapsedTime, 1));
            setSyncSpeed(finalSpeed);

            setTimeout(() => {
              const totalTime = syncElapsedTime;
              const minutes = Math.floor(totalTime / 60);
              const seconds = totalTime % 60;
              const timeStr = minutes > 0 ? `${minutes} dk ${seconds} sn` : `${seconds} saniye`;

              showSnackbar(
                `${actualContactCount} kişi ${timeStr} içinde başarıyla senkronize edildi!`,
                'success'
              );
              setSyncInProgress(false);
              setSyncProgress(0);
              setSyncStartTime(null);
              setSyncElapsedTime(0);

              // Load contacts to display them with a small delay
              setTimeout(() => {
                loadContacts();
              }, 500);
            }, 1500);
          } catch (error) {
            console.error('Error getting actual contact count:', error);
            // Use response data if available
            const syncedCount = response.data.synced || 0;
            setSyncContactsCount(syncedCount);

            setTimeout(() => {
              const totalTime = syncElapsedTime;
              const minutes = Math.floor(totalTime / 60);
              const seconds = totalTime % 60;
              const timeStr = minutes > 0 ? `${minutes} dk ${seconds} sn` : `${seconds} saniye`;

              showSnackbar(
                `${syncedCount} kişi ${timeStr} içinde başarıyla senkronize edildi!`,
                'success'
              );
              setSyncInProgress(false);
              setSyncProgress(0);
              setSyncStartTime(null);
              setSyncElapsedTime(0);

              // Always load contacts after sync
              setTimeout(() => {
                loadContacts();
              }, 500);
            }, 1500);
          }
        }
      } else {
        clearInterval(timeInterval);
        setSyncInProgress(false);
        setSyncProgress(0);
        setSyncStartTime(null);
        setSyncElapsedTime(0);
        showSnackbar(response.data.message || 'Senkronizasyon tamamlanamadı', 'warning');
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      clearInterval(timeInterval);
      console.error('Sync error:', error);

      let errorMessage = 'Senkronizasyon başarısız';

      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Senkronizasyon zaman aşımına uğradı. Çok fazla kişi olabilir.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'WhatsApp oturumu hazır değil';
      } else if (error.response?.status === 404) {
        errorMessage = 'WhatsApp oturumu bulunamadı';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      setSyncInProgress(false);
      setSyncProgress(0);
      setSyncStartTime(null);
      setSyncElapsedTime(0);
      setSyncStatus('');
      setLoading(false);  // Reset loading state
      showSnackbar(errorMessage, 'error');
    }
  };

  // Destroy session
  const destroySession = async () => {
    if (!session?.id) return;

    try {
      await axios.delete(`${API_URL}/whatsapp-web/session/${session.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSession(null);
      setContacts([]);
      setChats([]);
      setMessages([]);
      showSnackbar('Oturum sonlandırıldı', 'info');
    } catch (error: any) {
      showSnackbar('Oturum sonlandırılamadı', 'error');
    }
  };

  // Handle user logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Filter contacts/chats based on search
  const filteredContacts = contacts.filter(contact => {
    const searchLower = searchText.toLowerCase();
    const name = contact.name || '';
    const pushname = contact.pushname || '';
    const number = contact.number || '';

    return name.toLowerCase().includes(searchLower) ||
           pushname.toLowerCase().includes(searchLower) ||
           number.includes(searchText);
  });

  const filteredChats = chats.filter(chat => {
    const chatName = chat.name || '';
    const search = searchText.toLowerCase();
    return chatName.toLowerCase().includes(search);
  });

  // Get message status icon
  const getMessageStatusIcon = (ack?: number) => {
    switch (ack) {
      case 0: return <RadioButtonUnchecked sx={{ fontSize: 14 }} />;
      case 1: return <Done sx={{ fontSize: 14 }} />;
      case 2: return <DoneAll sx={{ fontSize: 14 }} color="disabled" />;
      case 3: return <DoneAll sx={{ fontSize: 14 }} color="primary" />;
      default: return null;
    }
  };

  // Stats Cards - WhatsApp Contacts stilinde
  const StatCard = ({ title, value, icon, color }: any) => (
    <Card sx={{
      background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
      border: `1px solid ${alpha(color, 0.2)}`,
    }}>
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
          {React.cloneElement(icon, { sx: { fontSize: 40, color: color, opacity: 0.5 } })}
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              WhatsApp Web
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gerçek zamanlı mesajlaşma ve yönetim platformu
            </Typography>
          </Box>

          <Stack direction="row" spacing={2} alignItems="center">
            {checkingSession ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary">
                  Bağlantı durumu kontrol ediliyor...
                </Typography>
              </Box>
            ) : session && session.status === 'READY' ? (
              <>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.success.light, 0.15)} 0%, ${alpha(theme.palette.success.main, 0.15)} 100%)`,
                  borderRadius: 3,
                  padding: '12px 20px',
                  border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                  boxShadow: `0 4px 16px ${alpha(theme.palette.success.main, 0.15)}`
                }}>
                  <CheckCircleIcon sx={{ color: theme.palette.success.main, fontSize: 28 }} />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.success.dark }}>
                      Bağlantı Başarılı
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                      {session.info?.pushname || 'WhatsApp Hesabı'}
                      {session.info?.phone && ` • ${session.info.phone}`}
                    </Typography>
                  </Box>
                </Box>
                <Tooltip title="Sohbetleri Yenile">
                  <IconButton
                    onClick={() => loadChats()}
                    disabled={loading || session?.status !== 'READY'}
                    sx={{
                      bgcolor: alpha(theme.palette.info.main, 0.1),
                      padding: '10px',
                      width: '44px',
                      height: '44px',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.info.main, 0.2),
                        transform: 'scale(1.05)'
                      },
                      transition: 'all 0.3s ease',
                      color: theme.palette.info.main
                    }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Kişileri Yükle">
                  <IconButton
                    onClick={() => loadContacts()}
                    disabled={loading}
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      padding: '10px',
                      width: '44px',
                      height: '44px',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.2),
                        transform: 'rotate(180deg)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <SyncIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Oturumu Sonlandır">
                  <IconButton
                    onClick={destroySession}
                    sx={{
                      bgcolor: alpha(theme.palette.error.main, 0.1),
                      padding: '10px',
                      width: '44px',
                      height: '44px',
                      color: theme.palette.error.main,
                      '&:hover': {
                        bgcolor: alpha(theme.palette.error.main, 0.2),
                        transform: 'scale(1.05)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <LogoutIcon />
                  </IconButton>
                </Tooltip>
              </>
            ) : session?.status === 'QR_CODE' ? (
              <Chip
                icon={<CircularProgress size={16} color="inherit" />}
                label="QR Kod Bekleniyor..."
                color="warning"
                variant="filled"
                sx={{
                  fontWeight: 'bold',
                  fontSize: '0.95rem',
                  py: 2,
                  px: 2,
                  height: 'auto',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.7 },
                    '100%': { opacity: 1 }
                  }
                }}
              />
            ) : session?.status === 'INITIALIZING' ? (
              <Chip
                icon={<CircularProgress size={16} color="inherit" />}
                label="Bağlantı Kuruluyor..."
                color="info"
                variant="filled"
                sx={{
                  fontWeight: 'bold',
                  fontSize: '0.95rem',
                  py: 2,
                  px: 2,
                  height: 'auto'
                }}
              />
            ) : (
              <Button
                variant="contained"
                size="large"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <QrCodeIcon />}
                onClick={() => initializeSession()}
                disabled={loading}
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 6px 24px ${alpha(theme.palette.primary.main, 0.5)}`,
                  }
                }}
              >
                WhatsApp'a Bağlan
              </Button>
            )}
          </Stack>
        </Stack>

        {/* Stats Cards - WhatsApp Contacts stilinde */}
        {!checkingSession && session && session.status === 'READY' && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
            <StatCard
              title="Toplam Kişi"
              value={contacts.length}
              icon={<GroupIcon />}
              color={theme.palette.primary.main}
            />
            <StatCard
              title="Bireysel Kişiler"
              value={contacts.filter((c: any) => !c.isGroup).length}
              icon={<PersonIcon />}
              color={theme.palette.success.main}
            />
            <StatCard
              title="Gruplar"
              value={contacts.filter((c: any) => c.isGroup).length}
              icon={<GroupsIcon />}
              color={theme.palette.info.main}
            />
            <StatCard
              title="Aktif Oturumlar"
              value={1}
              icon={<WhatsApp />}
              color={theme.palette.warning.main}
            />
          </Box>
        )}
      </Box>

      {/* Main Content */}
      {checkingSession ? (
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 'calc(100vh - 320px)'
        }}>
          <CircularProgress />
        </Box>
      ) : session && session.status === 'READY' ? (
      <Paper
        elevation={0}
        sx={{
          height: 'calc(100vh - 320px)',
          display: 'flex',
          overflow: 'hidden',
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          background: theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.paper, 0.8)
            : theme.palette.background.paper,
        }}
      >
        {/* Sidebar */}
        <Box sx={{
          width: 380,
          borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Search Bar */}
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Ara..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.action.selected, 0.04),
                }
              }}
            />
          </Box>

          {/* Tabs */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            px: 2
          }}>
            <Tabs
              value={tabValue}
              onChange={(e, v) => setTabValue(v)}
              sx={{
                flex: 1,
                '& .MuiTab-root': {
                  minHeight: 48,
                  textTransform: 'none',
                  fontWeight: 600
                }
              }}
            >
              <Tab label={`Kişiler (${contacts.length})`} />
              <Tab label="Toplu Mesaj" />
              <Tab label={`Sohbetler (${chats.length})`} />
            </Tabs>
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {/* Contacts Tab */}
            {tabValue === 0 && (
              <List sx={{ p: 0 }}>
                {filteredContacts.length === 0 && session?.status !== 'READY' ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <ContactPhoneIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      WhatsApp Bağlantısı Gerekli
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Kişilerinizi görüntülemek için önce WhatsApp'a bağlanmanız gerekir.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<QrCodeIcon />}
                      onClick={() => initializeSession()}
                      disabled={loading}
                      sx={{ mt: 1 }}
                    >
                      WhatsApp'a Bağlan
                    </Button>
                  </Box>
                ) : filteredContacts.length === 0 && session?.status === 'READY' ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <ContactPhoneIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      Henüz Kişi Yok
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      WhatsApp kişilerinizi yüklemek için aşağıdaki butona tıklayın.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<SyncIcon />}
                      onClick={() => loadContacts()}
                      disabled={loading}
                      sx={{ mt: 1 }}
                    >
                      Kişileri Yükle
                    </Button>
                  </Box>
                ) : (
                  filteredContacts.map((contact, index) => (
                    <Grow in timeout={300 * (index + 1)} key={contact.number || contact.id}>
                      <ListItemButton
                        onClick={() => {
                          setSelectedChat({
                            id: contact.id,
                            name: contact.name,
                            unreadCount: 0,
                            isGroup: false,
                            profilePicUrl: contact.profilePicUrl
                          });
                          loadChatHistory(contact.id);
                        }}
                        sx={{
                          px: 2,
                          py: 1.5,
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.04)
                          }
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar src={contact.profilePicUrl}>
                            <PersonIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2" fontWeight={contact.hasName ? 600 : 400}>
                              {contact.name || `+${contact.number}`}
                            </Typography>
                          }
                          secondary={
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="caption" color="text.secondary">
                                {contact.number}
                              </Typography>
                              {contact.isMyContact && (
                                <Chip
                                  size="small"
                                  label="Kayıtlı"
                                  color="primary"
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                            </Stack>
                          }
                        />
                        <Chip
                          size="small"
                          label="WhatsApp"
                          color="success"
                          variant="outlined"
                          sx={{ borderRadius: 1 }}
                        />
                      </ListItemButton>
                    </Grow>
                  ))
                )}
              </List>
            )}

            {/* Bulk Message Tab */}
            {tabValue === 1 && (
              <Box sx={{ p: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Birden fazla kişiye aynı anda mesaj gönderin
                </Alert>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 3,
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: alpha(theme.palette.primary.main, 0.1)
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom fontWeight={600} sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <UploadIcon fontSize="small" />
                      <span>Manuel Numara Girişi</span>
                    </Stack>
                  </Typography>

                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label="Telefon Numaraları (virgülle ayırın)"
                      placeholder="905431555634, 905321234567, 905301234567"
                      value={manualNumbers}
                      onChange={(e) => setManualNumbers(e.target.value)}
                      multiline
                      rows={2}
                      helperText={`${manualNumbers.split(',').filter(n => n.trim()).length} numara girildi`}
                    />

                    <Divider sx={{ my: 1 }}>
                      <Chip label="VEYA" size="small" />
                    </Divider>

                    <Box>
                      <Stack spacing={2}>
                        <input
                          type="file"
                          accept=".csv,.txt"
                          style={{ display: 'none' }}
                          id="csv-upload"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const text = await file.text();
                              // Parse CSV or TXT file
                              const numbers = text
                                .split(/[,\n\r;]+/) // Split by comma, newline, or semicolon
                                .map(n => n.trim())
                                .filter(n => n && /^\d{10,15}$/.test(n))
                                .join(', ');

                              // Append to existing numbers or replace
                              if (manualNumbers) {
                                setManualNumbers(manualNumbers + ', ' + numbers);
                              } else {
                                setManualNumbers(numbers);
                              }

                              // Numbers loaded successfully
                            }
                          }}
                        />
                        <label htmlFor="csv-upload">
                          <Button
                            variant="outlined"
                            component="span"
                            startIcon={<UploadIcon />}
                            fullWidth
                            sx={{
                              borderStyle: 'dashed',
                              borderWidth: 2,
                              py: 1.5,
                              '&:hover': {
                                borderStyle: 'dashed',
                                borderWidth: 2,
                                bgcolor: alpha(theme.palette.primary.main, 0.04)
                              }
                            }}
                          >
                            CSV/TXT Dosyası Yükle
                          </Button>
                        </label>

                        <Button
                          variant="outlined"
                          fullWidth
                          startIcon={<DownloadIcon />}
                          onClick={() => {
                            // Create sample CSV content
                            const sampleCSV = `telefon_numarasi,isim,notlar
905431555634,Ahmet Yılmaz,Müşteri
905321234567,Ayşe Demir,Tedarikçi
905301234567,Mehmet Öz,Partner
905551234567,Fatma Kaya,Müşteri
905441234567,Ali Çelik,Danışman
905331234567,Zeynep Ak,Müşteri
905501234567,Mustafa Yıldırım,Yönetici
905401234567,Emine Şahin,Müşteri
905351234567,Hasan Güneş,Teknisyen
905451234567,Hatice Ay,Müşteri`;

                            // Create blob and download
                            const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
                            const link = document.createElement('a');
                            const url = URL.createObjectURL(blob);
                            link.href = url;
                            link.download = 'toplu_mesaj_sablonu.csv';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);

                            showSnackbar('Şablon dosya indirildi', 'success');
                          }}
                          sx={{
                            py: 1.5,
                            borderColor: theme.palette.success.main,
                            color: theme.palette.success.main,
                            '&:hover': {
                              borderColor: theme.palette.success.dark,
                              bgcolor: alpha(theme.palette.success.main, 0.04)
                            }
                          }}
                        >
                          Örnek Şablon İndir
                        </Button>
                      </Stack>

                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        CSV dosyanızda telefon numaraları ilk sütunda olmalıdır. İsim ve notlar opsiyoneldir.
                      </Typography>

                    </Box>
                  </Stack>
                </Paper>

                <Box sx={{ mb: 3 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 2,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: 2
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar
                          sx={{
                            bgcolor: 'rgba(255, 255, 255, 0.2)',
                            width: 40,
                            height: 40
                          }}
                        >
                          <GroupIcon sx={{ color: 'white' }} />
                        </Avatar>
                        <Box>
                          <Typography
                            variant="h6"
                            sx={{
                              color: 'white',
                              fontWeight: 700,
                              fontSize: '1.1rem'
                            }}
                          >
                            Kayıtlı Kişiler
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'rgba(255, 255, 255, 0.8)',
                              fontSize: '0.75rem'
                            }}
                          >
                            Toplu mesaj için kişi seçin
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={`${selectedContacts.length} / ${contacts.filter(c => c.isUser !== false).length}`}
                          sx={{
                            bgcolor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            fontWeight: 600,
                            '& .MuiChip-icon': { color: 'white' }
                          }}
                          size="medium"
                          icon={selectedContacts.length > 0 ? <CheckCircleIcon /> : <RadioButtonUnchecked />}
                        />
                        <IconButton
                          size="small"
                          onClick={() => {
                            if (selectedContacts.length === contacts.filter(c => c.isUser !== false).length) {
                              setSelectedContacts([]);
                            } else {
                              setSelectedContacts(contacts.filter(c => c.isUser !== false).map(c => c.number));
                            }
                          }}
                          sx={{
                            color: 'white',
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 0.2)'
                            }
                          }}
                        >
                          {selectedContacts.length === contacts.filter(c => c.isUser !== false).length ?
                            <CancelIcon /> : <CheckCircleOutline />
                          }
                        </IconButton>
                      </Stack>
                    </Stack>
                  </Paper>

                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Kişi ara..."
                    value={contactSearchQuery}
                    onChange={(e) => setContactSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 1.5 }}
                  />

                  <Paper
                    variant="outlined"
                    sx={{
                      maxHeight: 280,
                      overflow: 'hidden',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper'
                    }}
                  >
                    <Box sx={{ maxHeight: 280, overflow: 'auto' }}>
                      {contacts.length > 0 ? (
                        <List dense sx={{ p: 0 }}>
                          {contacts
                            .filter(c => c.isUser !== false)
                            .filter(c => {
                              if (!contactSearchQuery) return true;
                              const query = contactSearchQuery.toLowerCase();
                              const name = (c.name || c.pushname || '').toLowerCase();
                              const number = c.number || '';
                              return name.includes(query) || number.includes(query);
                            })
                            .map((contact) => {
                              const displayName = contact.name || contact.pushname || `+${contact.number}`;
                              const hasRealName = contact.name && contact.name !== `+${contact.number}`;
                              const isSelected = selectedContacts.includes(contact.number);

                              return (
                                <ListItem
                                  key={contact.number || contact.id}
                                  disablePadding
                                  sx={{
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    '&:last-child': { borderBottom: 'none' }
                                  }}
                                >
                                  <ListItemButton
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedContacts(selectedContacts.filter(n => n !== contact.number));
                                      } else {
                                        setSelectedContacts([...selectedContacts, contact.number]);
                                      }
                                    }}
                                    sx={{
                                      py: 1,
                                      px: 2,
                                      transition: 'all 0.2s',
                                      bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                                      '&:hover': {
                                        bgcolor: isSelected
                                          ? alpha(theme.palette.primary.main, 0.12)
                                          : alpha(theme.palette.action.hover, 0.04)
                                      }
                                    }}
                                  >
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                      <Checkbox
                                        edge="start"
                                        checked={isSelected}
                                        tabIndex={-1}
                                        disableRipple
                                        size="small"
                                        sx={{
                                          color: theme.palette.text.disabled,
                                          '&.Mui-checked': {
                                            color: theme.palette.primary.main,
                                          }
                                        }}
                                      />
                                    </ListItemIcon>
                                    <ListItemAvatar sx={{ minWidth: 40 }}>
                                      <Avatar
                                        sx={{
                                          width: 32,
                                          height: 32,
                                          bgcolor: isSelected
                                            ? theme.palette.primary.main
                                            : alpha(theme.palette.text.primary, 0.1),
                                          fontSize: '0.875rem'
                                        }}
                                      >
                                        {displayName[0]?.toUpperCase()}
                                      </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                      primary={
                                        <Typography
                                          variant="body2"
                                          fontWeight={hasRealName ? 600 : 400}
                                          sx={{
                                            color: isSelected ? theme.palette.primary.main : 'text.primary'
                                          }}
                                        >
                                          {displayName}
                                        </Typography>
                                      }
                                      secondary={
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                          <Typography variant="caption" color="text.secondary">
                                            {contact.number}
                                          </Typography>
                                          {contact.isMyContact && (
                                            <Chip
                                              label="Kayıtlı"
                                              size="small"
                                              sx={{
                                                height: 16,
                                                fontSize: '0.625rem',
                                                '& .MuiChip-label': { px: 0.5 }
                                              }}
                                            />
                                          )}
                                        </Stack>
                                      }
                                    />
                                  </ListItemButton>
                                </ListItem>
                              );
                            })}
                        </List>
                      ) : (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                          <ContactPhoneIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            Kişi listesi yüklenemedi
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Manuel numara girişini kullanın
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </Box>

                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Manuel Numaralar"
                  placeholder="Virgülle ayırarak telefon numaraları girin (örn: 5551234567, 5559876543)"
                  value={manualNumbers}
                  onChange={(e) => setManualNumbers(e.target.value)}
                  helperText="Kişi listesinde olmayan numaralara mesaj göndermek için kullanın"
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Mesaj"
                  value={bulkMessage}
                  onChange={(e) => setBulkMessage(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={sendBulkMessages}
                  disabled={(selectedContacts.length === 0 && !manualNumbers.trim()) || !bulkMessage.trim() || loading}
                  sx={{
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  }}
                >
                  {loading ? 'Gönderiliyor...' : `Toplu Mesaj Gönder`}
                </Button>
              </Box>
            )}

            {/* Chats Tab - moved from 0 to 2 */}
            {tabValue === 2 && (
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                p: 4
              }}>
                <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
                  <Typography
                    variant="h5"
                    color="text.secondary"
                    gutterBottom
                    sx={{ fontWeight: 600 }}
                  >
                    Geliştirme Aşamasında
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Sohbetler özelliği şu anda geliştirilme aşamasındadır.
                    Yakında kullanıma sunulacaktır.
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        {/* Chat Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.primary.main, 0.01)} 100%)`
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    src={selectedChat.profilePicUrl}
                    sx={{ width: 48, height: 48 }}
                  >
                    {selectedChat.isGroup ? <GroupIcon /> : <PersonIcon />}
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="h6" fontWeight={600}>
                      {selectedChat.name}
                    </Typography>
                    {selectedChat.isGroup && (
                      <Typography variant="caption" color="text.secondary">
                        {selectedChat.participants?.length} katılımcı
                      </Typography>
                    )}
                  </Box>
                  <IconButton>
                    <MoreVertIcon />
                  </IconButton>
                </Stack>
              </Paper>

              {/* Messages Area */}
              <Box sx={{
                flex: 1,
                overflow: 'auto',
                p: 2,
                background: `url('/chat-bg.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                bgcolor: theme.palette.mode === 'dark'
                  ? alpha(theme.palette.background.default, 0.95)
                  : alpha(theme.palette.grey[50], 0.95)
              }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    {messages.map((message, index) => (
                      <Fade in timeout={300 * (index + 1)} key={message.id}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: message.fromMe ? 'flex-end' : 'flex-start',
                            mb: 1
                          }}
                        >
                          <Paper
                            elevation={1}
                            sx={{
                              p: 1.5,
                              maxWidth: '70%',
                              bgcolor: message.fromMe
                                ? alpha(theme.palette.primary.main, 0.1)
                                : theme.palette.background.paper,
                              borderRadius: 2,
                              borderTopLeftRadius: message.fromMe ? 16 : 4,
                              borderTopRightRadius: message.fromMe ? 4 : 16,
                            }}
                          >
                            {message.author && (
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 'bold',
                                  display: 'block',
                                  color: theme.palette.primary.main
                                }}
                              >
                                {message.author}
                              </Typography>
                            )}
                            {message.hasMedia && message.mediaUrl && (
                              <Box sx={{ mb: 1 }}>
                                {message.mediaType?.startsWith('image') && (
                                  <img
                                    src={message.mediaUrl}
                                    alt=""
                                    style={{
                                      maxWidth: '100%',
                                      borderRadius: 8,
                                      display: 'block'
                                    }}
                                  />
                                )}
                                {message.mediaType?.startsWith('video') && (
                                  <video
                                    src={message.mediaUrl}
                                    controls
                                    style={{
                                      maxWidth: '100%',
                                      borderRadius: 8
                                    }}
                                  />
                                )}
                              </Box>
                            )}
                            <Typography variant="body2">
                              {message.body}
                            </Typography>
                            <Stack direction="row" spacing={0.5} alignItems="center" mt={0.5}>
                              <Typography variant="caption" color="text.secondary">
                                {format(new Date(message.timestamp * 1000), 'HH:mm')}
                              </Typography>
                              {message.fromMe && getMessageStatusIcon(message.ack)}
                            </Stack>
                          </Paper>
                        </Box>
                      </Fade>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </Box>

              {/* Message Input */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                }}
              >
                <Stack direction="row" spacing={1}>
                  <IconButton
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      color: theme.palette.text.secondary,
                      '&:hover': { color: theme.palette.primary.main }
                    }}
                  >
                    <AttachFileIcon />
                  </IconButton>
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setMediaFile(file);
                        setShowMediaDialog(true);
                      }
                    }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Mesaj yazın..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    multiline
                    maxRows={4}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        bgcolor: alpha(theme.palette.action.selected, 0.04),
                      }
                    }}
                  />
                  <IconButton
                    color="primary"
                    onClick={sendMessage}
                    disabled={!messageText.trim() || loading || session?.status !== 'READY'}
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.2),
                        transform: 'scale(1.1)'
                      },
                      '&:disabled': {
                        bgcolor: alpha(theme.palette.action.disabled, 0.1),
                        color: theme.palette.action.disabled
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                  </IconButton>
                </Stack>
              </Paper>
            </>
          ) : (
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              p: 4
            }}>
              <WhatsApp sx={{
                fontSize: 120,
                color: alpha(theme.palette.text.disabled, 0.3),
                mb: 3
              }} />
              <Typography variant="h5" color="text.secondary" gutterBottom>
                WhatsApp Web'e Hoş Geldiniz
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Mesajlaşmaya başlamak için sol taraftan bir sohbet seçin<br />
                veya yeni bir sohbet başlatın
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
      ) : (
        /* Session is not ready, show QR code section */
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 'calc(100vh - 320px)'
        }}>
          <Paper sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.08)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
          }}>
            <WhatsApp sx={{
              fontSize: 80,
              color: '#25D366',
              mb: 3
            }} />
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              WhatsApp Web'e Bağlanın
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 400 }}>
              WhatsApp Web'i kullanmak için telefonunuzla QR kodu okutarak bağlantı kurmanız gerekiyor.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<QrCodeIcon />}
              onClick={() => initializeSession()}
              disabled={loading}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: 2,
                textTransform: 'none',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
                }
              }}
            >
              {loading ? 'Bağlanıyor...' : 'WhatsApp\'a Bağlan'}
            </Button>
          </Paper>
        </Box>
      )}

      {/* QR Code Dialog - Minimal Professional Design */}
      <Dialog
        open={showQRDialog}
        onClose={() => setShowQRDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 20px 40px rgba(0,0,0,0.4)'
              : '0 20px 40px rgba(0,0,0,0.08)',
            border: `1px solid ${theme.palette.mode === 'dark'
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(0,0,0,0.08)'}`,
          }
        }}
      >
        <DialogContent sx={{ px: 4, pb: 3, pt: 3 }}>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}>
            {/* Connection Status */}
            {session && session.status === 'AUTHENTICATED' && (
              <Fade in>
                <Paper
                  sx={{
                    width: '100%',
                    mb: 3,
                    p: 2,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.05) 100%)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1.5
                  }}
                >
                  <CircularProgress size={18} sx={{ color: '#10b981' }} />
                  <Typography variant="body2" fontWeight={600} color="#10b981">
                    Bağlantı kuruluyor...
                  </Typography>
                </Paper>
              </Fade>
            )}

            {/* QR Code Section */}
            {session?.qr ? (
              <Fade in>
                <Box sx={{ position: 'relative' }}>
                  {/* Decorative frame */}
                  <Box sx={{
                    position: 'absolute',
                    top: -10,
                    left: -10,
                    right: -10,
                    bottom: -10,
                    borderRadius: 4,
                    border: '2px solid',
                    borderColor: alpha(theme.palette.primary.main, 0.2),
                    pointerEvents: 'none'
                  }} />

                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      background: theme.palette.mode === 'dark'
                        ? 'linear-gradient(145deg, #2a2a2a, #1a1a1a)'
                        : 'linear-gradient(145deg, #ffffff, #f0f0f0)',
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* WhatsApp Logo watermark */}
                    <Box sx={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      opacity: 0.1
                    }}>
                      <WhatsAppIcon sx={{ fontSize: 40 }} />
                    </Box>

                    <img
                      src={session.qr}
                      alt="QR Code"
                      style={{
                        display: 'block',
                        margin: '0 auto',
                        padding: '20px',
                        borderRadius: '8px',
                        backgroundColor: '#fff'
                      }}
                    />
                  </Paper>

                  {/* Instructions */}
                  <Stack spacing={1} sx={{ mt: 3 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      Bağlanmak için:
                    </Typography>
                    <Stack spacing={0.5} sx={{ textAlign: 'left', pl: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        1. WhatsApp'ı telefonunuzda açın
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        2. Ayarlar → Bağlı Cihazlar'a gidin
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        3. QR kodu tarayın
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              </Fade>
            ) : (
              <Box sx={{ py: 4 }}>
                <CircularProgress size={48} thickness={2} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  QR kod yükleniyor...
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Stack direction="row" spacing={2} width="100%">
            <Button
              variant="outlined"
              onClick={() => {
                setShowQRDialog(false);
                setSession(null);
              }}
              fullWidth
            >
              İptal
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setShowQRDialog(false);
                initializeSession(true); // Force reconnect
              }}
              startIcon={<RefreshIcon />}
              fullWidth
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.warning.dark} 0%, ${theme.palette.warning.main} 100%)`,
                }
              }}
            >
              QR Yenile
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Session Expired Dialog */}
      <Dialog
        open={showSessionExpiredDialog}
        onClose={() => setShowSessionExpiredDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{
          background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
          color: 'white'
        }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <AccessTime />
            <Typography variant="h6">Oturum Süresi Dolmuş</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                WhatsApp Web Oturumu Geçersiz
              </Typography>
              <Typography variant="body2">
                Mevcut oturumunuz süresi dolmuş veya geçersiz hale gelmiş.
                WhatsApp Web'e tekrar bağlanmak için QR kodu taratmanız gerekiyor.
              </Typography>
            </Alert>

            <Box sx={{
              p: 3,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
            }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                <PersonIcon />
                Şu anda bağlı: Cavit Geylani Nar
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Bu hesapla yeniden bağlanmak istiyorsanız QR kodu taratın
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Stack direction="row" spacing={2} width="100%">
            <Button
              variant="outlined"
              onClick={() => setShowSessionExpiredDialog(false)}
              fullWidth
            >
              İptal
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setShowSessionExpiredDialog(false);
                initializeSession(true); // Force reconnect with QR
              }}
              startIcon={<QrCodeIcon />}
              fullWidth
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              }}
            >
              QR Kod ile Yeniden Bağlan
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Modern & Responsive Sync Dialog */}
      <Dialog
        open={syncInProgress}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: '#ffffff',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
            maxHeight: { xs: '90vh', sm: '80vh' }
          }
        }}
      >
        <Box
          sx={{
            height: 4,
            background: `linear-gradient(90deg,
              ${theme.palette.primary.main} 0%,
              ${theme.palette.primary.main} ${syncProgress}%,
              ${alpha(theme.palette.primary.main, 0.1)} ${syncProgress}%,
              ${alpha(theme.palette.primary.main, 0.1)} 100%)`
          }}
        />

        <DialogTitle sx={{ pb: 2, pt: 3, px: { xs: 2, sm: 3 } }}>
          <Stack spacing={1} alignItems="center">
            <Typography variant="h6" fontWeight={600} color="text.primary" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              Kişiler Senkronize Ediliyor
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '0.875rem' } }}>
              {syncStatus || 'WhatsApp kişileriniz yükleniyor'}
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pt: 2, pb: 3, px: { xs: 2, sm: 3 } }}>
          <Stack spacing={3}>
            {/* Minimalist Progress Circle */}
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress
                  variant="determinate"
                  value={syncProgress}
                  size={120}
                  thickness={3}
                  sx={{
                    color: theme.palette.primary.main,
                    '& .MuiCircularProgress-circle': {
                      strokeLinecap: 'round',
                      transition: 'stroke-dashoffset 0.3s ease'
                    }
                  }}
                />
                <CircularProgress
                  variant="determinate"
                  value={100}
                  size={120}
                  thickness={3}
                  sx={{
                    color: alpha(theme.palette.primary.main, 0.08),
                    position: 'absolute',
                    left: 0
                  }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column'
                  }}
                >
                  <Typography
                    variant="h4"
                    fontWeight={600}
                    color="primary"
                    sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}
                  >
                    {Math.round(syncProgress)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                    tamamlandı
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Simplified Stats - Responsive Grid */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                gap: 1.5
              }}
            >
              <Box
                sx={{
                  p: 2,
                  textAlign: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`
                }}
              >
                <Typography variant="h6" fontWeight={600} color="primary">
                  {syncContactsCount}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                  Kişi İşlendi
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 2,
                  textAlign: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`
                }}
              >
                <Typography variant="h6" fontWeight={600} color="primary">
                  {syncElapsedTime > 0
                    ? `${Math.floor(syncElapsedTime / 60)}:${(syncElapsedTime % 60).toString().padStart(2, '0')}`
                    : '0:00'
                  }
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                  Süre
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 2,
                  textAlign: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`
                }}
              >
                <Typography variant="h6" fontWeight={600} color="primary">
                  {totalContactsCount || '0'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                  Toplam
                </Typography>
              </Box>
            </Box>

            {/* Simplified Status Message */}
            <Box
              sx={{
                p: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                borderRadius: 2,
                textAlign: 'center'
              }}
            >
              <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: theme.palette.primary.main,
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '0.875rem' } }}>
                  {syncStatus || 'Kişiler senkronize ediliyor...'}
                </Typography>
                <Chip
                  label={syncProgress === 100 ? 'Tamamlandı' : 'İşleniyor'}
                  size="small"
                  color={syncProgress === 100 ? 'success' : 'primary'}
                  sx={{ height: 20 }}
                />
              </Stack>
            </Box>

            {/* Progress Bar */}
            <Box sx={{ width: '100%' }}>
              <LinearProgress
                variant="buffer"
                value={syncProgress}
                valueBuffer={Math.min(syncProgress + 10, 100)}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 5,
                    background: `linear-gradient(90deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                  },
                  '& .MuiLinearProgress-bar2Buffer': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.15)
                  }
                }}
              />
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Modern Toast */}
      <ModernToast
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      />
    </Container>
  );
};

export default WhatsAppWebModern;