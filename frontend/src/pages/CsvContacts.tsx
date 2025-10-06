import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  Fab,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Alert,
  Checkbox,
  Stack,
  LinearProgress,
  DialogContentText,
} from '@mui/material';
import {
  Add as AddIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  FileUpload as FileUploadIcon,
  FileDownload as FileDownloadIcon,
  Clear as ClearIcon,
  Send as SendIcon,
  Close as CloseIcon,
  Label as LabelIcon,
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  Description as DescriptionIcon,
  Edit as EditIcon,
  AttachFile as AttachFileIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import ModernToast from '../components/ModernToast';

interface CsvContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags?: string[];
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}

const CsvContacts: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<CsvContact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual contact form states
  const [manualContact, setManualContact] = useState({
    name: '',
    phone: '',
    email: '',
    tags: ''
  });
  const [editingContact, setEditingContact] = useState<CsvContact | null>(null);

  // Bulk message states
  const [openBulkMessageDialog, setOpenBulkMessageDialog] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkMessageMinDelay, setBulkMessageMinDelay] = useState(3);
  const [bulkMessageMaxDelay, setBulkMessageMaxDelay] = useState(8);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [bulkMessageSentCount, setBulkMessageSentCount] = useState(0);
  const [bulkMessageErrors, setBulkMessageErrors] = useState<string[]>([]);
  const [activeSession, setActiveSession] = useState<{id: string, name: string} | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');

  // Load CSV contacts from localStorage and check session on mount
  useEffect(() => {
    loadContactsFromStorage();
    checkActiveSession();
  }, []);

  const checkActiveSession = async () => {
    try {
      const response = await axios.get('/api/whatsapp-web/sessions', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success && response.data.sessions) {
        const readySessions = response.data.sessions
          .filter((session: any) => session.status === 'READY')
          .map((session: any) => ({
            id: session.id,
            name: session.info?.pushname || session.info?.phone || session.id
          }));

        if (readySessions.length > 0) {
          setActiveSession(readySessions[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching active sessions:', error);
    }
  };

  const loadContactsFromStorage = () => {
    try {
      const storedContacts = localStorage.getItem('csvContacts');
      if (storedContacts) {
        const parsedContacts = JSON.parse(storedContacts);
        setContacts(parsedContacts);
        setTotalCount(parsedContacts.length);
      }
    } catch (error) {
      console.error('Error loading contacts from storage:', error);
    }
  };

  const saveContactsToStorage = (contactsToSave: CsvContact[]) => {
    try {
      localStorage.setItem('csvContacts', JSON.stringify(contactsToSave));
    } catch (error) {
      console.error('Error saving contacts to storage:', error);
    }
  };

  const handleImportCsv = async () => {
    if (!csvFile) {
      showSnackbar('Lütfen bir CSV dosyası seçin', 'warning');
      return;
    }

    setLoading(true);
    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        showSnackbar('CSV dosyası boş', 'error');
        setLoading(false);
        return;
      }

      // Parse CSV
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const newContacts: CsvContact[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const contact: CsvContact = {
          id: `csv_${Date.now()}_${i}`,
          name: '',
          phone: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        headers.forEach((header, index) => {
          const value = values[index] || '';
          if (header === 'name' || header === 'isim' || header === 'ad') {
            contact.name = value;
          } else if (header === 'phone' || header === 'telefon' || header === 'numara') {
            // Clean phone number
            contact.phone = value.replace(/\D/g, '');
            if (contact.phone && !contact.phone.startsWith('90')) {
              contact.phone = '90' + contact.phone;
            }
          } else if (header === 'email' || header === 'eposta' || header === 'e-posta') {
            contact.email = value;
          } else if (header === 'tags' || header === 'etiket' || header === 'etiketler') {
            contact.tags = value.split(';').map(t => t.trim()).filter(t => t);
          }
        });

        // Only add if has valid phone
        if (contact.phone && contact.phone.length >= 10) {
          newContacts.push(contact);
        }
      }

      if (newContacts.length === 0) {
        showSnackbar('Geçerli kişi bulunamadı', 'error');
      } else {
        // Merge with existing contacts
        const existingContacts = [...contacts];
        const mergedContacts = [...existingContacts, ...newContacts];

        setContacts(mergedContacts);
        setTotalCount(mergedContacts.length);
        saveContactsToStorage(mergedContacts);

        showSnackbar(`${newContacts.length} kişi başarıyla import edildi`, 'success');
        setOpenImportDialog(false);
        setCsvFile(null);
      }
    } catch (error) {
      console.error('Error importing CSV:', error);
      showSnackbar('CSV import hatası', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    try {
      let csvContent = 'İsim,Telefon,Email,Etiketler\n';

      const contactsToExport = selectedContacts.length > 0
        ? contacts.filter(c => selectedContacts.includes(c.id))
        : contacts;

      contactsToExport.forEach(contact => {
        const tags = contact.tags?.join(';') || '';
        csvContent += `${contact.name},${contact.phone},${contact.email || ''},${tags}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `csv_contacts_${new Date().getTime()}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      showSnackbar('CSV dosyası indirildi', 'success');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showSnackbar('Export hatası', 'error');
    }
  };

  const handleDeleteSelected = () => {
    const remainingContacts = contacts.filter(c => !selectedContacts.includes(c.id));
    setContacts(remainingContacts);
    setTotalCount(remainingContacts.length);
    saveContactsToStorage(remainingContacts);
    showSnackbar(`${selectedContacts.length} kişi silindi`, 'success');
    setSelectedContacts([]);
    setOpenDeleteDialog(false);
  };

  const handleClearAll = () => {
    setContacts([]);
    setTotalCount(0);
    setSelectedContacts([]);
    localStorage.removeItem('csvContacts');
    showSnackbar('Tüm kişiler temizlendi', 'success');
  };

  const handleAddManualContact = () => {
    if (!manualContact.phone.trim()) {
      showSnackbar('Telefon numarası zorunludur', 'error');
      return;
    }

    // Clean phone number
    let cleanPhone = manualContact.phone.replace(/[^\d+]/g, '');
    if (!cleanPhone.startsWith('90') && cleanPhone.length === 10) {
      cleanPhone = '90' + cleanPhone;
    }

    const newContact: CsvContact = {
      id: `manual_${Date.now()}`,
      name: manualContact.name || 'İsimsiz',
      phone: cleanPhone,
      email: manualContact.email || undefined,
      tags: manualContact.tags ? manualContact.tags.split(',').map(t => t.trim()).filter(t => t) : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedContacts = [...contacts, newContact];
    setContacts(updatedContacts);
    setTotalCount(updatedContacts.length);
    saveContactsToStorage(updatedContacts);

    showSnackbar('Kişi başarıyla eklendi', 'success');
    setOpenAddDialog(false);
    setManualContact({ name: '', phone: '', email: '', tags: '' });
  };

  const handleUpdateContact = () => {
    if (!manualContact.phone.trim() || !editingContact) {
      showSnackbar('Telefon numarası zorunludur', 'error');
      return;
    }

    // Clean phone number
    let cleanPhone = manualContact.phone.replace(/[^\d+]/g, '');
    if (!cleanPhone.startsWith('90') && !cleanPhone.startsWith('+90')) {
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '90' + cleanPhone.substring(1);
      } else if (cleanPhone.length === 10) {
        cleanPhone = '90' + cleanPhone;
      }
    }

    const tags = manualContact.tags
      ? manualContact.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      : [];

    const updatedContacts = contacts.map(contact => {
      if (contact.id === editingContact.id) {
        return {
          ...contact,
          name: manualContact.name || '',
          phone: cleanPhone,
          email: manualContact.email || '',
          tags,
          updated_at: new Date().toISOString()
        };
      }
      return contact;
    });

    setContacts(updatedContacts);
    saveContactsToStorage(updatedContacts);
    showSnackbar('Kişi güncellendi', 'success');
    setOpenAddDialog(false);
    setEditingContact(null);
    setManualContact({ name: '', phone: '', email: '', tags: '' });
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedContacts(filteredContacts.map(c => c.id));
    } else {
      setSelectedContacts([]);
    }
  };

  const handleSelectContact = (contactId: string) => {
    setSelectedContacts(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId);
      }
      return [...prev, contactId];
    });
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // Function to replace variables in message
  const replaceMessageVariables = (message: string, contact: CsvContact): string => {
    let personalizedMessage = message;
    personalizedMessage = personalizedMessage.replace(/\{\{name\}\}/g, contact.name || 'Değerli Müşteri');
    personalizedMessage = personalizedMessage.replace(/\{\{phone\}\}/g, contact.phone || '');
    personalizedMessage = personalizedMessage.replace(/\{\{email\}\}/g, contact.email || '');
    if (contact.tags && contact.tags.length > 0) {
      personalizedMessage = personalizedMessage.replace(/\{\{tags\}\}/g, contact.tags.join(', '));
    }
    return personalizedMessage;
  };

  // Function to get random delay between min and max (in milliseconds)
  const getRandomDelay = (): number => {
    const min = bulkMessageMinDelay * 1000;
    const max = bulkMessageMaxDelay * 1000;
    // Add some milliseconds randomness for more human-like behavior
    const randomMs = Math.floor(Math.random() * 1000);
    return Math.floor(Math.random() * (max - min + 1) + min) + randomMs;
  };

  const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 16MB for WhatsApp)
      if (file.size > 16 * 1024 * 1024) {
        showSnackbar('Dosya boyutu 16MB\'dan büyük olamaz', 'error');
        return;
      }

      setSelectedMedia(file);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setMediaPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setMediaPreview('');
      }
    }
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
    setMediaPreview('');
  };

  const handleSendBulkMessage = async () => {
    if (!bulkMessage.trim() && !selectedMedia) {
      showSnackbar('Lütfen mesaj yazın veya medya seçin', 'warning');
      return;
    }

    if (selectedContacts.length === 0) {
      showSnackbar('Lütfen kişi seçin', 'warning');
      return;
    }

    setSendingMessage(true);
    setBulkMessageSentCount(0);
    setBulkMessageErrors([]);

    const selectedContactsData = contacts.filter(c => selectedContacts.includes(c.id));
    const sessionId = user?.username ? `session-${user.username}` : `session-${user?.id || 'default'}`; // Get session ID from user context

    try {
      // Prepare phone numbers
      const phoneNumbers = selectedContactsData.map(contact => {
        let cleanPhone = contact.phone.replace(/[^\d+]/g, '');
        if (cleanPhone.startsWith('+90')) {
          cleanPhone = cleanPhone.substring(1);
        } else if (cleanPhone.startsWith('0')) {
          cleanPhone = '90' + cleanPhone.substring(1);
        } else if (cleanPhone.length === 10 && !cleanPhone.startsWith('90')) {
          cleanPhone = '90' + cleanPhone;
        }
        return cleanPhone;
      });

      // Try bulk send first - but with personalized messages
      try {
        // Prepare personalized messages for each recipient
        const bulkMessages = selectedContactsData.map((contact, index) => ({
          recipient: phoneNumbers[index],
          message: replaceMessageVariables(bulkMessage, contact)
        }));

        const bulkResponse = await axios.post(
          `/api/whatsapp-web/session/${sessionId}/send/bulk`,
          {
            recipients: phoneNumbers,
            message: bulkMessage, // Keep original for backward compatibility
            personalizedMessages: bulkMessages, // Add personalized messages
            options: {
              minDelay: bulkMessageMinDelay * 1000,
              maxDelay: bulkMessageMaxDelay * 1000,
              randomDelay: true
            }
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );

        if (bulkResponse.data && bulkResponse.data.results) {
          const { results, successful, total, failed } = bulkResponse.data;
          const successCount = successful || results.filter((r: any) => r.success).length;
          const errors = results
            .filter((r: any) => !r.success)
            .map((r: any) => `${r.recipient}: ${r.error || 'Gönderim başarısız'}`);

          setBulkMessageSentCount(successCount);
          setBulkMessageErrors(errors);

          if (successCount === total) {
            showSnackbar(`${successCount} kişiye mesaj başarıyla gönderildi`, 'success');
            setOpenBulkMessageDialog(false);
            setBulkMessage('');
            setSelectedContacts([]);
          } else if (successCount > 0) {
            showSnackbar(`${successCount}/${total} kişiye mesaj gönderildi. ${failed} hata oluştu.`, 'warning');
          } else {
            showSnackbar('Hiçbir kişiye mesaj gönderilemedi', 'error');
          }
        }
      } catch (bulkError: any) {
        console.error('Bulk send failed, using fallback:', bulkError);
        console.error('Error response:', bulkError.response?.data);
        // If bulk fails, try individual messages
        let successCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < selectedContactsData.length; i++) {
          const contact = selectedContactsData[i];
          const personalizedMessage = replaceMessageVariables(bulkMessage, contact);

          try {
            const response = await axios.post(
              `/api/whatsapp-web/session/${sessionId}/send/message`,
              {
                phoneNumber: phoneNumbers[i],
                message: personalizedMessage,
                options: {}
              },
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem('token')}`
                }
              }
            );

            if (response.data.success) {
              successCount++;
              setBulkMessageSentCount(successCount);
            } else {
              errors.push(`${contact.name || contact.phone}: ${response.data.error || 'Gönderim başarısız'}`);
            }
          } catch (error: any) {
            errors.push(`${contact.name || contact.phone}: ${error.response?.data?.error || 'Gönderim hatası'}`);
          }

          if (i < selectedContactsData.length - 1) {
            // Random delay between messages to mimic human behavior
            const delay = getRandomDelay();
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        setBulkMessageErrors(errors);

        if (successCount === selectedContactsData.length) {
          showSnackbar(`${successCount} kişiye mesaj başarıyla gönderildi`, 'success');
          setOpenBulkMessageDialog(false);
          setBulkMessage('');
          setSelectedContacts([]);
        } else if (successCount > 0) {
          showSnackbar(`${successCount}/${selectedContactsData.length} kişiye mesaj gönderildi. ${errors.length} hata oluştu.`, 'warning');
        } else {
          showSnackbar('Hiçbir kişiye mesaj gönderilemedi', 'error');
        }
      }
    } catch (error: any) {
      console.error('Toplu mesaj gönderme hatası:', error);
      showSnackbar('Mesaj gönderme hatası oluştu', 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const query = searchQuery.toLowerCase();
    return (
      contact.name?.toLowerCase().includes(query) ||
      contact.phone?.includes(query) ||
      contact.email?.toLowerCase().includes(query) ||
      contact.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  const paginatedContacts = filteredContacts.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const downloadTemplate = () => {
    const template = 'İsim,Telefon,Email,Etiketler\nCavit Geylani Nar,5551234567,cavit@example.com,müşteri;vip';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'csv_template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header - Same style as WhatsApp Web Contacts */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            CSV Kişileri
          </Typography>
          <Typography variant="body2" color="text.secondary">
            CSV dosyasından import edilen kişileri yönetin
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DescriptionIcon />}
            onClick={downloadTemplate}
            sx={{ py: 0.5, px: 1.5, minHeight: 32, whiteSpace: 'nowrap' }}
          >
            Şablon
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<FileUploadIcon />}
            onClick={() => setOpenImportDialog(true)}
            disabled={loading}
            sx={{ py: 0.5, px: 1.5, minHeight: 32, whiteSpace: 'nowrap' }}
          >
            İçe Aktar
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportCsv}
            disabled={contacts.length === 0}
            sx={{ py: 0.5, px: 1.5, minHeight: 32, whiteSpace: 'nowrap' }}
          >
            Dışa Aktar
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setOpenAddDialog(true)}
            color="success"
            sx={{ py: 0.5, px: 1.5, minHeight: 32, whiteSpace: 'nowrap' }}
          >
            Kişi Ekle
          </Button>
        </Stack>
      </Box>

      {/* Stats Cards - Same style as WhatsApp Web Contacts */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <Card sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        }}>
          <CardContent sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {totalCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Toplam Kişi
                </Typography>
              </Box>
              <PersonIcon sx={{ fontSize: 40, color: theme.palette.primary.main, opacity: 0.5 }} />
            </Box>
          </CardContent>
        </Card>

        <Card sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
        }}>
          <CardContent sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {selectedContacts.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Seçili
                </Typography>
              </Box>
              <CheckCircleIcon sx={{ fontSize: 40, color: theme.palette.success.main, opacity: 0.5 }} />
            </Box>
          </CardContent>
        </Card>

        <Card sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
        }}>
          <CardContent sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {filteredContacts.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Filtrelenmiş
                </Typography>
              </Box>
              <SearchIcon sx={{ fontSize: 40, color: theme.palette.info.main, opacity: 0.5 }} />
            </Box>
          </CardContent>
        </Card>

        <Card sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
        }}>
          <CardContent sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  CSV
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Dosya Formatı
                </Typography>
              </Box>
              <DescriptionIcon sx={{ fontSize: 40, color: theme.palette.warning.main, opacity: 0.5 }} />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Search and Actions Bar - Same style as WhatsApp Web Contacts */}
      <Paper
        sx={{
          mb: 3,
          background: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Box p={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              fullWidth
              placeholder="Kişi ara..."
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap', minWidth: 'auto' }}>
              {selectedContacts.length > 0 && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SendIcon />}
                  onClick={() => setOpenBulkMessageDialog(true)}
                  size="small"
                  sx={{ py: 0.5, px: 1.5, minHeight: 32, whiteSpace: 'nowrap' }}
                >
                  Toplu Mesaj Gönder ({selectedContacts.length})
                </Button>
              )}

              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadContactsFromStorage}
                color="primary"
                size="small"
                sx={{ py: 0.5, px: 1.5, minHeight: 32 }}
              >
                Yenile
              </Button>

              {selectedContacts.length > 0 && (
                <Button
                  variant="outlined"
                  startIcon={<DeleteIcon />}
                  onClick={() => setOpenDeleteDialog(true)}
                  color="error"
                  size="small"
                  sx={{ py: 0.5, px: 1.5, minHeight: 32, whiteSpace: 'nowrap' }}
                >
                  Seçilenleri Sil ({selectedContacts.length})
                </Button>
              )}

              {contacts.length > 0 && (
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={handleClearAll}
                  color="warning"
                  size="small"
                  sx={{ py: 0.5, px: 1.5, minHeight: 32, whiteSpace: 'nowrap' }}
                >
                  Tümünü Temizle
                </Button>
              )}
            </Box>
          </Stack>
        </Box>
      </Paper>

      {/* Contacts Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.08) }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedContacts.length > 0 && selectedContacts.length < filteredContacts.length}
                      checked={filteredContacts.length > 0 && selectedContacts.length === filteredContacts.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>İsim</TableCell>
                  <TableCell>Telefon</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Etiketler</TableCell>
                  <TableCell>Oluşturulma</TableCell>
                  <TableCell align="center">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedContacts.map((contact) => {
                  const isSelected = selectedContacts.includes(contact.id);
                  return (
                    <TableRow
                      key={contact.id}
                      hover
                      selected={isSelected}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleSelectContact(contact.id)}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox checked={isSelected} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonIcon color="action" />
                          {contact.name || '-'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PhoneIcon color="action" fontSize="small" />
                          {contact.phone}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {contact.email && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EmailIcon color="action" fontSize="small" />
                            {contact.email}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                          {contact.tags?.map((tag, index) => {
                            // Her etiket için farklı renk paleti
                            const tagColors = [
                              { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadow: 'rgba(102, 126, 234, 0.4)' },
                              { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', shadow: 'rgba(240, 147, 251, 0.4)' },
                              { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', shadow: 'rgba(79, 172, 254, 0.4)' },
                              { bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', shadow: 'rgba(67, 233, 123, 0.4)' },
                              { bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', shadow: 'rgba(250, 112, 154, 0.4)' },
                              { bg: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', shadow: 'rgba(48, 207, 208, 0.4)' },
                              { bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', shadow: 'rgba(168, 237, 234, 0.4)' },
                              { bg: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', shadow: 'rgba(255, 236, 210, 0.4)' }
                            ];

                            const colorIndex = index % tagColors.length;
                            const tagColor = tagColors[colorIndex];

                            return (
                              <Chip
                                key={index}
                                label={tag}
                                size="small"
                                sx={{
                                  background: tagColor.bg,
                                  color: 'white',
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  letterSpacing: '0.5px',
                                  padding: '0 2px',
                                  height: 26,
                                  borderRadius: '13px',
                                  boxShadow: `0 3px 10px ${tagColor.shadow}`,
                                  border: 'none',
                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                  '&:hover': {
                                    transform: 'translateY(-2px) scale(1.05)',
                                    boxShadow: `0 5px 15px ${tagColor.shadow}`,
                                  },
                                  '& .MuiChip-label': {
                                    padding: '0 10px',
                                    textTransform: 'capitalize'
                                  }
                                }}
                              />
                            );
                          })}
                          {(!contact.tags || contact.tags.length === 0) && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.disabled',
                                fontStyle: 'italic'
                              }}
                            >
                              Etiket yok
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {contact.created_at && new Date(contact.created_at).toLocaleString('tr-TR')}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingContact(contact);
                              setManualContact({
                                name: contact.name || '',
                                phone: contact.phone || '',
                                email: contact.email || '',
                                tags: contact.tags?.join(', ') || ''
                              });
                              setOpenAddDialog(true);
                            }}
                            title="Düzenle"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedContacts([contact.id]);
                              setOpenDeleteDialog(true);
                            }}
                            title="Sil"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {paginatedContacts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                      <Typography variant="body1" color="textSecondary">
                        {searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz kişi eklenmemiş'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filteredContacts.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              labelRowsPerPage="Sayfa başına:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
            />
          </>
        )}
      </TableContainer>

      {/* Manual Add Contact Dialog */}
      <Dialog open={openAddDialog} onClose={() => {
        setOpenAddDialog(false);
        setEditingContact(null);
        setManualContact({ name: '', phone: '', email: '', tags: '' });
      }} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingContact ? 'Kişiyi Düzenle' : 'Manuel Kişi Ekle'}
          <IconButton
            onClick={() => {
              setOpenAddDialog(false);
              setEditingContact(null);
              setManualContact({ name: '', phone: '', email: '', tags: '' });
            }}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="İsim"
              fullWidth
              value={manualContact.name}
              onChange={(e) => setManualContact({ ...manualContact, name: e.target.value })}
            />
            <TextField
              label="Telefon Numarası"
              fullWidth
              required
              value={manualContact.phone}
              onChange={(e) => setManualContact({ ...manualContact, phone: e.target.value })}
              helperText="Başında 0 veya 90 olmadan girebilirsiniz"
            />
            <TextField
              label="Email"
              fullWidth
              type="email"
              value={manualContact.email}
              onChange={(e) => setManualContact({ ...manualContact, email: e.target.value })}
            />
            <TextField
              label="Etiketler"
              fullWidth
              value={manualContact.tags}
              onChange={(e) => setManualContact({ ...manualContact, tags: e.target.value })}
              helperText="Virgül ile ayırarak birden fazla etiket ekleyebilirsiniz"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenAddDialog(false);
            setEditingContact(null);
            setManualContact({ name: '', phone: '', email: '', tags: '' });
          }}>
            İptal
          </Button>
          <Button
            onClick={editingContact ? handleUpdateContact : handleAddManualContact}
            variant="contained"
            color="primary"
            disabled={!manualContact.phone.trim()}
            startIcon={<PersonIcon />}
          >
            {editingContact ? 'Güncelle' : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={openImportDialog} onClose={() => setOpenImportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          CSV Dosyası Import Et
          <IconButton
            onClick={() => setOpenImportDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Alert severity="info">
              CSV dosyanızın ilk satırı başlık satırı olmalıdır. Desteklenen başlıklar:
              <br />
              • İsim, Name, Ad
              <br />
              • Telefon, Phone, Numara
              <br />
              • Email, Eposta, E-posta
              <br />
              • Etiketler, Tags, Etiket (noktalı virgül ile ayrılmış)
            </Alert>

            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<FileUploadIcon />}
            >
              {csvFile ? csvFile.name : 'CSV Dosyası Seç'}
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept=".csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setCsvFile(e.target.files[0]);
                  }
                }}
              />
            </Button>

            {csvFile && (
              <Alert severity="success">
                Dosya seçildi: {csvFile.name}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenImportDialog(false)}>İptal</Button>
          <Button
            onClick={handleImportCsv}
            variant="contained"
            disabled={!csvFile || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <FileUploadIcon />}
          >
            Import Et
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Kişileri Sil</DialogTitle>
        <DialogContent>
          <Typography>
            {selectedContacts.length} kişiyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>İptal</Button>
          <Button onClick={handleDeleteSelected} color="error" variant="contained">
            Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Message Dialog */}
      <Dialog
        open={openBulkMessageDialog}
        onClose={() => !sendingMessage && setOpenBulkMessageDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
              Toplu Mesaj Gönder
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedContacts.length} kişiye mesaj gönderilecek
            </Typography>
          </Box>
          <IconButton
            onClick={() => !sendingMessage && setOpenBulkMessageDialog(false)}
            sx={{ color: 'text.secondary' }}
            disabled={sendingMessage}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Selected Recipients Preview */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Seçili Alıcılar ({selectedContacts.length})
              </Typography>
              <Paper
                sx={{
                  p: 2,
                  maxHeight: 120,
                  overflow: 'auto',
                  background: alpha(theme.palette.background.default, 0.5),
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                }}
              >
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {contacts
                    .filter(c => selectedContacts.includes(c.id))
                    .map((contact) => (
                      <Chip
                        key={contact.id}
                        label={contact.name || contact.phone}
                        size="small"
                        sx={{
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                        }}
                      />
                    ))}
                </Box>
              </Paper>
            </Box>

            {/* Message Input */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Mesaj İçeriği
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Kullanılabilir Değişkenler:
                </Typography>
                <Typography variant="body2">
                  • <strong>{`{{name}}`}</strong> - Kişinin adı<br/>
                  • <strong>{`{{phone}}`}</strong> - Kişinin telefon numarası<br/>
                  • <strong>{`{{email}}`}</strong> - Kişinin email adresi<br/>
                  • <strong>{`{{tags}}`}</strong> - Kişinin etiketleri
                </Typography>
              </Alert>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Örnek: Merhaba {{name}}, size özel teklifimiz var!"
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
                disabled={sendingMessage}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: alpha(theme.palette.background.paper, 0.8),
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Karakter sayısı: {bulkMessage.length}
              </Typography>

              {/* Message Preview */}
              {bulkMessage && selectedContacts.length > 0 && (
                <Paper sx={{
                  mt: 2,
                  p: 2,
                  background: alpha(theme.palette.success.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
                }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                    Önizleme (İlk seçili kişi için):
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                    {replaceMessageVariables(
                      bulkMessage,
                      contacts.find(c => selectedContacts.includes(c.id)) || contacts[0]
                    )}
                  </Typography>
                </Paper>
              )}
            </Box>

            {/* Media Upload Section */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Medya Ekle (Opsiyonel)
              </Typography>
              <Paper sx={{
                p: 2,
                border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                backgroundColor: alpha(theme.palette.primary.main, 0.02),
                borderRadius: 2,
              }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<AttachFileIcon />}
                    sx={{
                      borderStyle: 'dashed',
                      '&:hover': {
                        borderStyle: 'solid',
                      }
                    }}
                  >
                    {selectedMedia ? 'Medya Değiştir' : 'Medya Seç'}
                    <input
                      type="file"
                      hidden
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                      onChange={handleMediaSelect}
                    />
                  </Button>

                  {selectedMedia && (
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 2,
                      bgcolor: alpha(theme.palette.background.paper, 0.8),
                      borderRadius: 1,
                    }}>
                      {mediaPreview && (
                        <Box sx={{
                          width: 80,
                          height: 80,
                          borderRadius: 1,
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}>
                          <img
                            src={mediaPreview}
                            alt="Preview"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </Box>
                      )}
                      {!mediaPreview && (
                        <Box sx={{
                          width: 80,
                          height: 80,
                          borderRadius: 1,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {selectedMedia.type.startsWith('video/') ? '📹' :
                           selectedMedia.type.startsWith('audio/') ? '🎵' :
                           selectedMedia.type.includes('pdf') ? '📄' : '📎'}
                        </Box>
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={500}>
                          {selectedMedia.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(selectedMedia.size / 1024 / 1024).toFixed(2)} MB
                        </Typography>
                      </Box>
                      <IconButton
                        onClick={handleRemoveMedia}
                        size="small"
                        color="error"
                      >
                        <CloseIcon />
                      </IconButton>
                    </Box>
                  )}

                  <Typography variant="caption" color="text.secondary">
                    Desteklenen formatlar: Resim, Video, Ses, PDF, Word, Excel (Maks. 16MB)
                  </Typography>
                </Box>
              </Paper>
            </Box>

            {/* Settings */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                Gönderim Ayarları - İnsan Davranışı Simülasyonu
              </Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Rastgele gecikmeler kullanılarak insan davranışı taklit edilir. Bu, hesabınızın spam olarak işaretlenmesini önler.
                </Typography>
              </Alert>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  label="Minimum bekleme (saniye)"
                  type="number"
                  size="small"
                  value={bulkMessageMinDelay}
                  onChange={(e) => {
                    const value = Math.max(1, parseInt(e.target.value) || 1);
                    setBulkMessageMinDelay(value);
                    if (value > bulkMessageMaxDelay) {
                      setBulkMessageMaxDelay(value + 2);
                    }
                  }}
                  inputProps={{ min: 1, max: 60 }}
                  disabled={sendingMessage}
                  sx={{ width: 180 }}
                />
                <TextField
                  label="Maksimum bekleme (saniye)"
                  type="number"
                  size="small"
                  value={bulkMessageMaxDelay}
                  onChange={(e) => {
                    const value = Math.max(1, parseInt(e.target.value) || 1);
                    setBulkMessageMaxDelay(Math.max(value, bulkMessageMinDelay));
                  }}
                  inputProps={{ min: 1, max: 120 }}
                  disabled={sendingMessage}
                  sx={{ width: 180 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                  Her mesaj arasında {bulkMessageMinDelay}-{bulkMessageMaxDelay} saniye + 0-1 saniye rastgele gecikme
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Önerilen: 3-8 saniye arası. Çok fazla mesaj için daha yüksek değerler kullanın.
              </Typography>
            </Box>

            {/* Progress Info */}
            {sendingMessage && (
              <Paper sx={{
                p: 2,
                background: alpha(theme.palette.info.main, 0.1),
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <CircularProgress size={20} />
                  <Typography variant="subtitle2">
                    Mesajlar gönderiliyor... ({bulkMessageSentCount}/{selectedContacts.length})
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(bulkMessageSentCount / selectedContacts.length) * 100}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Paper>
            )}

            {/* Session Info */}
            {activeSession && (
              <Box sx={{
                p: 2,
                background: alpha(theme.palette.success.main, 0.1),
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                borderRadius: 1
              }}>
                <Typography variant="body2" color="success.main">
                  <strong>Aktif Oturum:</strong> {activeSession.name || activeSession.id}
                </Typography>
              </Box>
            )}

            {!activeSession && (
              <Alert severity="warning">
                Aktif WhatsApp Web oturumu bulunamadı. Lütfen önce WhatsApp Web sayfasından QR kodu tarayın.
              </Alert>
            )}

            {/* Error Messages */}
            {bulkMessageErrors.length > 0 && (
              <Paper sx={{
                p: 2,
                background: alpha(theme.palette.error.main, 0.1),
                border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`
              }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: theme.palette.error.main }}>
                  Gönderim Hataları ({bulkMessageErrors.length})
                </Typography>
                <Box sx={{ maxHeight: 120, overflow: 'auto' }}>
                  {bulkMessageErrors.map((error, index) => (
                    <Typography key={index} variant="body2" color="error" sx={{ mb: 0.5 }}>
                      • {error}
                    </Typography>
                  ))}
                </Box>
              </Paper>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{
          p: 2,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          background: alpha(theme.palette.background.default, 0.3)
        }}>
          <Button
            onClick={() => setOpenBulkMessageDialog(false)}
            disabled={sendingMessage}
          >
            İptal
          </Button>
          <Button
            onClick={handleSendBulkMessage}
            variant="contained"
            startIcon={sendingMessage ? <CircularProgress size={20} /> : <SendIcon />}
            disabled={!bulkMessage.trim() || sendingMessage || selectedContacts.length === 0}
          >
            {sendingMessage ? 'Gönderiliyor...' : 'Gönder'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modern Toast */}
      <ModernToast
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      />
    </Box>
  );
};

export default CsvContacts;