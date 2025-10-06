import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogContentText,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  Fab,
  IconButton,
  InputAdornment,
  LinearProgress,
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
  FormControlLabel,
  Switch,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Stack,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import {
  Add as AddIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  Groups as GroupsIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  FileUpload as FileUploadIcon,
  FileDownload as FileDownloadIcon,
  Clear as ClearIcon,
  WhatsApp as WhatsAppIcon,
  Business as BusinessIcon,
  Wifi as WifiIcon,
  Description as DescriptionIcon,
  Send as SendIcon,
  DeleteSweep as DeleteSweepIcon,
  Close as CloseIcon,
  Label as LabelIcon,
  Email as EmailIcon,
  AttachFile as AttachFileIcon,
  Image as ImageIcon,
} from "@mui/icons-material";
import { alpha, useTheme } from "@mui/material/styles";
import api from "../services/api";
import axios from "axios";
import ModernToast from "../components/ModernToast";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

interface ContactStats {
  total: number;
  active: number;
  inactive: number;
  business: number;
  sessions: {
    session_id: string;
    count: number;
  }[];
}

interface Contact {
  id: string | number; // Can be either string or number
  session_id: string;
  whatsapp_id: string;
  name: string;
  phone: string;
  is_business: boolean;
  is_active: boolean;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
  email?: string;
  tags?: string[];
  metadata?: {
    tags?: string[];
    email?: string;
    [key: string]: any;
  };
}

const WhatsAppWebContacts: React.FC = () => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<(string | number)[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10); // Default 10 rows per page
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [availableSessions, setAvailableSessions] = useState<
    { id: string; name: string }[]
  >([]);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Dialog states
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openDeleteAllDialog, setOpenDeleteAllDialog] = useState(false);
  const [openClearSessionDialog, setOpenClearSessionDialog] = useState(false);
  const [openBulkMessageDialog, setOpenBulkMessageDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkMessage, setBulkMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [bulkMessageMinDelay, setBulkMessageMinDelay] = useState(3);
  const [bulkMessageMaxDelay, setBulkMessageMaxDelay] = useState(8);
  const [bulkMessageSentCount, setBulkMessageSentCount] = useState(0);
  const [bulkMessageErrors, setBulkMessageErrors] = useState<string[]>([]);
  const [selectedSessionForClear, setSelectedSessionForClear] =
    useState<string>("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    session_id: "",
    is_active: true,
    email: "",
    tags: "",
  });

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    fetchActiveSessions();
  }, []);

  useEffect(() => {
    // Only fetch contacts on initial load when sessions are available
    if (availableSessions.length > 0 && !initialLoadDone) {
      fetchContacts();
      setInitialLoadDone(true);
    }
  }, [availableSessions]); // Only depend on availableSessions for initial load

  useEffect(() => {
    // Only fetch when pagination or search changes, but not on initial load
    if (initialLoadDone && availableSessions.length > 0) {
      fetchContacts();
    }
  }, [page, rowsPerPage, debouncedSearchQuery, activeFilter]); // Pagination and search changes

  // Update stats and available tags based on loaded contacts
  useEffect(() => {
    if (contacts.length > 0) {
      const activeCount = contacts.filter((c) => c.is_active).length;
      const businessCount = contacts.filter((c) => c.is_business).length;
      setStats({
        total: totalCount,
        active: activeCount,
        inactive: totalCount - activeCount,
        business: businessCount,
        sessions: availableSessions.map((s) => ({
          session_id: s.id,
          count: contacts.filter((c) => c.session_id === s.id).length,
        })),
      });
    }
  }, [contacts, totalCount, availableSessions]);

  const fetchContacts = useCallback(
    async (forceRefresh = false) => {
      if (loading) return; // Prevent multiple simultaneous calls

      setLoading(true);
      console.log("=== FETCH CONTACTS DEBUG ===");
      console.log("Page:", page + 1, "Limit:", rowsPerPage);
      console.log("Search:", searchQuery);

      try {
        let endpoint = "";
        let params: any = {};

        // Always fetch from live WhatsApp session
        // Get first active session
        const sessions = await axios.get("/api/whatsapp-web/sessions", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

        const activeSessions =
          sessions.data.sessions?.filter((s: any) => s.status === "READY") ||
          [];

        if (activeSessions.length === 0) {
          showSnackbar(
            "Aktif WhatsApp Web oturumu bulunamadı. Lütfen önce QR kod ile bağlanın.",
            "warning",
          );
          setContacts([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }

        const sessionId = activeSessions[0].id;
        endpoint = `/api/whatsapp-web/session/${sessionId}/contacts`;
        params = {
          page: page + 1,
          limit: rowsPerPage,
          search: debouncedSearchQuery,
        };

        const response = await axios.get(endpoint, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          params,
          timeout: 30000, // 30 second timeout
        });

        console.log("API Response:", response.data);

        if (response.data.success) {
          // Handle live WhatsApp contacts response
          if (response.data.contacts) {
            // Handle live WhatsApp contacts
            let contactsData = response.data.contacts.map((contact: any) => ({
              id:
                contact.id ||
                contact.whatsapp_id ||
                Math.random().toString(36).substr(2, 9),
              session_id: availableSessions[0]?.id || "whatsapp-session",
              whatsapp_id: contact.id || contact.whatsapp_id,
              name: contact.name || contact.pushname || "İsimsiz",
              phone:
                contact.number ||
                contact.phone ||
                contact.id?.replace("@c.us", ""),
              is_business: contact.isBusiness || false,
              is_active: true,
              last_seen_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              email: contact.email || "",
              tags: contact.tags || [],
              metadata: contact.metadata || {},
            }));

            // Collect all available tags
            const allTags = Array.from(
              new Set(
                contactsData.flatMap(
                  (contact: Contact) =>
                    contact.metadata?.tags || contact.tags || [],
                ),
              ),
            ).filter(Boolean) as string[];
            setAvailableTags(allTags);

            // Apply client-side filtering
            if (activeFilter !== "all") {
              contactsData = contactsData.filter((contact: Contact) => {
                if (activeFilter === "active") return contact.is_active;
                if (activeFilter === "inactive") return !contact.is_active;
                return true;
              });
            }

            // Apply tags filtering
            if (selectedTags.length > 0) {
              contactsData = contactsData.filter((contact: Contact) => {
                const contactTags =
                  contact.metadata?.tags || contact.tags || [];
                return selectedTags.some((tag) => contactTags.includes(tag));
              });
            }

            setContacts(contactsData);
            setTotalCount(response.data.total || contactsData.length);

            if (contactsData.length === 0) {
              showSnackbar("WhatsApp oturumunda kişi bulunamadı", "info");
            }
          } else if (response.data.contacts) {
            // Fallback for direct array response
            let contactsData = response.data.contacts.map((contact: any) => ({
              ...contact,
              email: contact.email || contact.metadata?.email || "",
              tags: contact.tags || contact.metadata?.tags || [],
            }));

            // Apply client-side filtering
            if (activeFilter !== "all") {
              contactsData = contactsData.filter((contact: Contact) => {
                if (activeFilter === "active") return contact.is_active;
                if (activeFilter === "inactive") return !contact.is_active;
                return true;
              });
            }

            setContacts(contactsData);
            setTotalCount(response.data.total || contactsData.length);

            if (contactsData.length === 0) {
              showSnackbar("Kişi listesi boş", "info");
            }
          } else {
            console.log("No contacts in response");
            setContacts([]);
            setTotalCount(0);
            showSnackbar(
              "WhatsApp oturumunda kişi bulunamadı. Lütfen WhatsApp hesabınızda kişi olduğundan emin olun.",
              "info",
            );
          }
        } else {
          console.log("Response not successful");
          setContacts([]);
          setTotalCount(0);
          showSnackbar(response.data.error || "Veri alınamadı", "error");
        }
      } catch (error: any) {
        console.error("Fetch contacts error:", error);
        console.error("Error details:", error.response?.data);
        setContacts([]);
        setTotalCount(0);
        showSnackbar(
          error.response?.data?.error || "WhatsApp kişileri yüklenemedi",
          "error",
        );
      } finally {
        setLoading(false);
      }
    },
    [page, rowsPerPage, debouncedSearchQuery, activeFilter, availableSessions],
  );

  const fetchActiveSessions = async () => {
    try {
      console.log("Fetching active sessions...");
      const response = await axios.get("/api/whatsapp-web/sessions", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      console.log("Sessions response:", response.data);

      if (response.data.success && response.data.sessions) {
        // Get READY sessions with name
        const readySessions = response.data.sessions
          .filter((session: any) => session.status === "READY")
          .map((session: any) => ({
            id: session.id,
            name: session.info?.pushname || session.info?.phone || session.id,
          }));

        console.log("Ready sessions:", readySessions);
        setAvailableSessions(readySessions);
      } else {
        console.log("No sessions found or invalid response");
        setAvailableSessions([]);
      }
    } catch (error: any) {
      console.error("Aktif oturumlar yüklenirken hata:", error);
      setAvailableSessions([]);
    }
  };

  const handleSelectAll = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.checked) {
        setSelectedContacts(contacts.map((c) => c.id));
      } else {
        setSelectedContacts([]);
      }
    },
    [contacts],
  );

  const handleSelectContact = useCallback((id: string | number) => {
    setSelectedContacts((prev) => {
      if (prev.includes(id)) {
        return prev.filter((contactId) => contactId !== id);
      }
      return [...prev, id];
    });
  }, []);

  const handleDeleteContacts = async () => {
    try {
      if (selectedContacts.length === 1) {
        await axios.delete(
          `/api/whatsapp-web/web-contacts/${selectedContacts[0]}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
      } else {
        await axios.post(
          "/api/whatsapp-web/web-contacts/bulk-delete",
          {
            ids: selectedContacts,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
      }

      showSnackbar(
        `${selectedContacts.length} kişi başarıyla silindi`,
        "success",
      );
      setOpenDeleteDialog(false);
      setSelectedContacts([]);
      fetchContacts();
    } catch (error: any) {
      console.error("Kişiler silinirken hata:", error);
      showSnackbar("Kişiler silinemedi", "error");
    }
  };

  const handleClearSessionContacts = async () => {
    if (!selectedSessionForClear) return;

    try {
      await axios.delete(
        `/api/whatsapp-web/web-contacts/session/${selectedSessionForClear}/clear`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      showSnackbar(
        `${selectedSessionForClear} oturumu kişileri temizlendi`,
        "success",
      );
      setOpenClearSessionDialog(false);
      setSelectedSessionForClear("");
      setSelectedContacts([]);
      fetchContacts();
    } catch (error: any) {
      console.error("Oturum kişileri temizlenirken hata:", error);
      showSnackbar("Oturum kişileri temizlenemedi", "error");
    }
  };

  const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 16MB for WhatsApp)
      if (file.size > 16 * 1024 * 1024) {
        showSnackbar("Dosya boyutu 16MB'dan büyük olamaz", "error");
        return;
      }

      setSelectedMedia(file);

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setMediaPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setMediaPreview("");
      }
    }
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
    setMediaPreview("");
  };

  const handleSendBulkMessage = async () => {
    if (!bulkMessage.trim() && !selectedMedia) {
      showSnackbar("Lütfen mesaj yazın veya medya seçin", "warning");
      return;
    }

    if (selectedContacts.length === 0 || availableSessions.length === 0) {
      showSnackbar(
        "Lütfen kişi seçin ve oturum aktif olduğundan emin olun",
        "warning",
      );
      return;
    }

    setSendingMessage(true);
    setBulkMessageSentCount(0);
    setBulkMessageErrors([]);

    const selectedContactsData = contacts.filter((c) =>
      selectedContacts.includes(c.id),
    );
    const sessionId = availableSessions[0]?.id; // Use first available session

    console.log("Sending bulk message:", {
      sessionId,
      selectedContactsData: selectedContactsData.map((c) => ({
        name: c.name,
        phone: c.phone,
      })),
      message: bulkMessage,
    });

    try {
      // First try bulk endpoint
      const phoneNumbers = selectedContactsData.map((contact) => {
        // Clean phone number - remove any non-digits except +
        let cleanPhone = contact.phone.replace(/[^\d+]/g, "");

        // If phone starts with +90, remove +
        if (cleanPhone.startsWith("+90")) {
          cleanPhone = cleanPhone.substring(1);
        }
        // If phone starts with 0, replace with 90
        else if (cleanPhone.startsWith("0")) {
          cleanPhone = "90" + cleanPhone.substring(1);
        }
        // If phone doesn't start with 90 and is 10 digits, add 90
        else if (cleanPhone.length === 10 && !cleanPhone.startsWith("90")) {
          cleanPhone = "90" + cleanPhone;
        }

        console.log(`Converting phone: ${contact.phone} -> ${cleanPhone}`);
        return cleanPhone;
      });

      try {
        // Prepare personalized messages for each contact
        const personalizedMessages = selectedContactsData.map((contact) => {
          // Clean phone number - remove any non-digits except +
          let cleanPhone = contact.phone.replace(/[^\d+]/g, "");

          // If phone starts with +90, remove +
          if (cleanPhone.startsWith("+90")) {
            cleanPhone = cleanPhone.substring(1);
          }
          // If phone starts with 0, replace with 90
          else if (cleanPhone.startsWith("0")) {
            cleanPhone = "90" + cleanPhone.substring(1);
          }
          // If phone doesn't start with 90 and is 10 digits, add 90
          else if (cleanPhone.length === 10 && !cleanPhone.startsWith("90")) {
            cleanPhone = "90" + cleanPhone;
          }

          // Replace variables in message
          const personalizedMsg = bulkMessage
            .replace(/\{\{name\}\}/g, contact.name || "")
            .replace(/\{\{phone\}\}/g, contact.phone || "")
            .replace(/\{\{email\}\}/g, contact.email || "")
            .replace(
              /\{\{tags\}\}/g,
              Array.isArray(contact.tags)
                ? contact.tags.join(", ")
                : contact.tags || "",
            );

          return {
            recipient: cleanPhone,
            message: personalizedMsg,
          };
        });

        const bulkResponse = await axios.post(
          `/api/whatsapp-web/session/${sessionId}/send/bulk`,
          {
            recipients: phoneNumbers,
            message: bulkMessage,
            personalizedMessages: personalizedMessages,
            options: {
              minDelay: bulkMessageMinDelay * 1000,
              maxDelay: bulkMessageMaxDelay * 1000,
              randomDelay: true,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );

        console.log("Bulk response:", bulkResponse.data);

        if (bulkResponse.data && bulkResponse.data.results) {
          const { results, successful, total, failed } = bulkResponse.data;
          const successCount =
            successful || results.filter((r: any) => r.success).length;
          const errors = results
            .filter((r: any) => !r.success)
            .map(
              (r: any) => `${r.recipient}: ${r.error || "Gönderim başarısız"}`,
            );

          setBulkMessageSentCount(successCount);
          setBulkMessageErrors(errors);

          if (successCount === total) {
            showSnackbar(
              `${successCount} kişiye mesaj başarıyla gönderildi`,
              "success",
            );
            setOpenBulkMessageDialog(false);
            setBulkMessage("");
            setSelectedContacts([]);
          } else if (successCount > 0) {
            showSnackbar(
              `${successCount}/${total} kişiye mesaj gönderildi. ${failed} hata oluştu.`,
              "warning",
            );
          } else {
            showSnackbar("Hiçbir kişiye mesaj gönderilemedi", "error");
          }
        } else {
          throw new Error(bulkResponse.data?.error || "Bulk endpoint failed");
        }
      } catch (bulkError: any) {
        console.log(
          "Bulk endpoint failed, trying individual messages:",
          bulkError.response?.data || bulkError.message,
        );

        // If bulk fails, try individual messages
        let successCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < selectedContactsData.length; i++) {
          const contact = selectedContactsData[i];

          try {
            const response = await axios.post(
              `/api/whatsapp-web/session/${sessionId}/send/message`,
              {
                phoneNumber: phoneNumbers[i],
                message: bulkMessage,
                options: {},
              },
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              },
            );

            console.log(`Message to ${contact.phone}:`, response.data);

            if (response.data.success) {
              successCount++;
              setBulkMessageSentCount(successCount);
            } else {
              errors.push(
                `${contact.name || contact.phone}: ${response.data.error || "Gönderim başarısız"}`,
              );
            }
          } catch (error: any) {
            console.error(
              `Error sending to ${contact.phone}:`,
              error.response?.data || error.message,
            );
            errors.push(
              `${contact.name || contact.phone}: ${error.response?.data?.error || "Gönderim hatası"}`,
            );
          }

          // Add delay between messages
          if (i < selectedContactsData.length - 1) {
            const randomDelay =
              Math.floor(
                Math.random() *
                  (bulkMessageMaxDelay - bulkMessageMinDelay + 1) +
                  bulkMessageMinDelay,
              ) * 1000;
            await new Promise((resolve) => setTimeout(resolve, randomDelay));
          }
        }

        setBulkMessageErrors(errors);

        if (successCount === selectedContactsData.length) {
          showSnackbar(
            `${successCount} kişiye mesaj başarıyla gönderildi`,
            "success",
          );
          setOpenBulkMessageDialog(false);
          setBulkMessage("");
          setSelectedContacts([]);
        } else if (successCount > 0) {
          showSnackbar(
            `${successCount}/${selectedContactsData.length} kişiye mesaj gönderildi. ${errors.length} hata oluştu.`,
            "warning",
          );
        } else {
          showSnackbar("Hiçbir kişiye mesaj gönderilemedi", "error");
        }
      }
    } catch (error: any) {
      console.error("Toplu mesaj gönderme hatası:", error);
      showSnackbar("Toplu mesaj gönderiminde hata oluştu", "error");
    } finally {
      setSendingMessage(false);
    }
  };

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "warning" | "info",
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      session_id: "",
      is_active: true,
      email: "",
      tags: "",
    });
    setSelectedContact(null);
  };

  const handleExportCsv = () => {
    try {
      let csvContent = "İsim,Telefon,Email,Etiketler,Durum,Tip,Oturum\n";

      const contactsToExport =
        selectedContacts.length > 0
          ? contacts.filter((c) => selectedContacts.includes(c.id))
          : contacts;

      contactsToExport.forEach((contact) => {
        const tags = (contact.metadata?.tags || contact.tags || []).join(";");
        const email = contact.metadata?.email || contact.email || "";
        const status = contact.is_active ? "Aktif" : "Pasif";
        const type = contact.is_business ? "İşletme" : "Kişisel";

        csvContent += `"${contact.name || ""}","${contact.phone}","${email}","${tags}","${status}","${type}","${contact.session_id || ""}"\n`;
      });

      const blob = new Blob(["\ufeff" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `whatsapp_web_contacts_${new Date().getTime()}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      showSnackbar("CSV dosyası indirildi", "success");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      showSnackbar("Export hatası", "error");
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      "İsim,Telefon,Email,Etiketler,Durum,Tip,Oturum\nCavit Geylani Nar,905551234567,cavit@example.com,müşteri;vip,Aktif,Kişisel,session-admin";

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "whatsapp_web_template.csv";
    link.click();
    URL.revokeObjectURL(link.href);

    showSnackbar("CSV şablonu indirildi", "success");
  };

  const handleImportCsv = async () => {
    if (!csvFile) {
      showSnackbar("Lütfen bir CSV dosyası seçin", "warning");
      return;
    }

    try {
      const text = await csvFile.text();
      const lines = text.split("\n").filter((line) => line.trim());

      if (lines.length < 2) {
        showSnackbar("CSV dosyası boş veya sadece başlık içeriyor", "error");
        return;
      }

      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/['"]/g, ""));
      const nameIndex = headers.findIndex((h) => /^(İsim|Name|Ad)/i.test(h));
      const phoneIndex = headers.findIndex((h) =>
        /^(Telefon|Phone|Numara)/i.test(h),
      );
      const emailIndex = headers.findIndex((h) =>
        /^(Email|Eposta|E-posta)/i.test(h),
      );
      const tagsIndex = headers.findIndex((h) =>
        /^(Etiketler|Tags|Etiket)/i.test(h),
      );
      const statusIndex = headers.findIndex((h) => /^(Durum|Status)/i.test(h));
      const typeIndex = headers.findIndex((h) => /^(Tip|Type)/i.test(h));
      const sessionIndex = headers.findIndex((h) =>
        /^(Oturum|Session)/i.test(h),
      );

      if (phoneIndex === -1) {
        showSnackbar(
          "CSV dosyasında telefon numarası sütunu bulunamadı",
          "error",
        );
        return;
      }

      let importedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        const cleanValues = values.map((v) =>
          v.trim().replace(/^["']|["']$/g, ""),
        );

        const phone = phoneIndex !== -1 ? cleanValues[phoneIndex] : "";

        if (!phone) {
          errorCount++;
          continue;
        }

        // Clean phone number
        let cleanPhone = phone.replace(/[^\d+]/g, "");
        if (!cleanPhone.startsWith("90") && !cleanPhone.startsWith("+90")) {
          if (cleanPhone.startsWith("0")) {
            cleanPhone = "90" + cleanPhone.substring(1);
          } else if (cleanPhone.length === 10) {
            cleanPhone = "90" + cleanPhone;
          }
        }

        const name = nameIndex !== -1 ? cleanValues[nameIndex] : "";
        const email = emailIndex !== -1 ? cleanValues[emailIndex] : "";
        const tags =
          tagsIndex !== -1
            ? cleanValues[tagsIndex]
                ?.split(";")
                .map((t) => t.trim())
                .filter((t) => t)
            : [];
        const isActive =
          statusIndex !== -1
            ? cleanValues[statusIndex]?.toLowerCase() === "aktif"
            : true;
        const isBusiness =
          typeIndex !== -1
            ? cleanValues[typeIndex]?.toLowerCase() === "işletme"
            : false;
        const sessionId =
          sessionIndex !== -1
            ? cleanValues[sessionIndex]
            : availableSessions[0]?.id || "session-admin";

        // Check if contact exists
        const existingContact = contacts.find((c) => c.phone === cleanPhone);

        try {
          if (existingContact) {
            // Update existing contact
            const response = await axios.patch(
              `${API_URL}/api/whatsapp-web/web-contacts/${existingContact.id}`,
              {
                name,
                email,
                tags,
                is_active: isActive,
                is_business: isBusiness,
                metadata: { email, tags },
              },
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                  "Content-Type": "application/json",
                },
              },
            );

            if (response.data.success) {
              updatedCount++;
            } else {
              errorCount++;
            }
          } else {
            // Create new contact
            const response = await axios.post(
              `${API_URL}/api/whatsapp-web/web-contacts`,
              {
                whatsapp_id: cleanPhone + "@c.us",
                name,
                phone: cleanPhone,
                session_id: sessionId,
                is_active: isActive,
                is_business: isBusiness,
                metadata: { email, tags },
              },
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                  "Content-Type": "application/json",
                },
              },
            );

            if (response.data.success) {
              importedCount++;
            } else {
              errorCount++;
            }
          }
        } catch (error) {
          console.error(`Error importing contact ${phone}:`, error);
          errorCount++;
        }
      }

      await fetchContacts();

      let message = "";
      if (importedCount > 0) message += `${importedCount} yeni kişi eklendi. `;
      if (updatedCount > 0) message += `${updatedCount} kişi güncellendi. `;
      if (errorCount > 0) message += `${errorCount} hata oluştu.`;

      showSnackbar(
        message || "İmport tamamlandı",
        importedCount > 0 || updatedCount > 0 ? "success" : "warning",
      );
      setOpenImportDialog(false);
      setCsvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Import error:", error);
      showSnackbar("Import sırasında hata oluştu", "error");
    }
  };

  // Effect to populate form when editing a contact
  useEffect(() => {
    if (editingContact) {
      setFormData({
        name: editingContact.name || "",
        phone: editingContact.phone || "",
        session_id: editingContact.session_id || "",
        is_active:
          editingContact.is_active !== undefined
            ? editingContact.is_active
            : true,
        email: editingContact.metadata?.email || "",
        tags: editingContact.metadata?.tags
          ? editingContact.metadata.tags.join(", ")
          : "",
      });
    }
  }, [editingContact]);

  const handleToggleActive = async (contact: Contact) => {
    try {
      const response = await axios.patch(
        `${API_URL}/api/whatsapp-web/web-contacts/${contact.id}`,
        { is_active: !contact.is_active },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        // Update the contact in the local state
        setContacts((prevContacts) =>
          prevContacts.map((c) =>
            c.id === contact.id ? { ...c, is_active: !c.is_active } : c,
          ),
        );
        showSnackbar(
          `${contact.name} ${!contact.is_active ? "aktif" : "pasif"} yapıldı`,
          "success",
        );
      } else {
        showSnackbar(response.data.error || "Durum güncellenemedi", "error");
      }
    } catch (error: any) {
      console.error("Toggle active error:", error);
      showSnackbar(
        error.response?.data?.error || "Durum güncellenemedi",
        "error",
      );
    }
  };

  const handleToggleBusinessType = async (contact: Contact) => {
    try {
      const response = await axios.patch(
        `${API_URL}/api/whatsapp-web/web-contacts/${contact.id}`,
        { is_business: !contact.is_business },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        // Update the contact in the local state
        setContacts((prevContacts) =>
          prevContacts.map((c) =>
            c.id === contact.id ? { ...c, is_business: !c.is_business } : c,
          ),
        );
        showSnackbar(
          `${contact.name} ${!contact.is_business ? "işletme" : "kişisel"} hesap olarak güncellendi`,
          "success",
        );
      } else {
        showSnackbar(response.data.error || "Tip güncellenemedi", "error");
      }
    } catch (error: any) {
      console.error("Toggle business type error:", error);
      showSnackbar(
        error.response?.data?.error || "Tip güncellenemedi",
        "error",
      );
    }
  };

  const handleAddContact = async () => {
    try {
      const contactData = {
        name: formData.name,
        phone: formData.phone,
        session_id: formData.session_id,
        is_active: formData.is_active,
        whatsapp_id: formData.phone.replace(/\D/g, ""), // Remove non-digits for whatsapp_id
        is_business: false, // Default to personal contact
        metadata: {
          email: formData.email,
          tags: formData.tags
            ? formData.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
        },
      };

      const response = await axios.post(
        "/api/whatsapp-web/web-contacts",
        contactData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        showSnackbar("WhatsApp Web kişisi başarıyla eklendi", "success");
        setOpenAddDialog(false);
        setEditingContact(null);
        resetForm();
        fetchContacts();
      } else {
        showSnackbar(response.data.error || "Kişi eklenemedi", "error");
      }
    } catch (error: any) {
      console.error("Kişi ekleme hatası:", error);
      showSnackbar(error.response?.data?.error || "Kişi eklenemedi", "error");
    }
  };

  const handleUpdateContact = async () => {
    if (!editingContact) return;

    try {
      // For now, we'll delete the old contact and create a new one
      // First delete the existing contact
      await axios.delete(
        `/api/whatsapp-web/web-contacts/${editingContact.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      // Then create the updated contact
      const contactData = {
        name: formData.name,
        phone: formData.phone,
        session_id: formData.session_id,
        is_active: formData.is_active,
        whatsapp_id: formData.phone.replace(/\D/g, ""),
        is_business: editingContact.is_business || false,
        metadata: {
          email: formData.email,
          tags: formData.tags
            ? formData.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
        },
      };

      const response = await axios.post(
        "/api/whatsapp-web/web-contacts",
        contactData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        showSnackbar("WhatsApp Web kişisi başarıyla güncellendi", "success");
        setOpenAddDialog(false);
        setEditingContact(null);
        resetForm();
        fetchContacts();
      } else {
        showSnackbar(response.data.error || "Kişi güncellenemedi", "error");
      }
    } catch (error: any) {
      console.error("Kişi güncelleme hatası:", error);
      showSnackbar(
        error.response?.data?.error || "Kişi güncellenemedi",
        "error",
      );
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              backgroundClip: "text",
              textFillColor: "transparent",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            WhatsApp Web Kişileri
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Toplu mesaj göndermek için kişilerinizi yönetin
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DescriptionIcon />}
            onClick={handleDownloadTemplate}
            sx={{ py: 0.5, px: 1.5, minHeight: 32, whiteSpace: "nowrap" }}
          >
            Şablon
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<FileUploadIcon />}
            onClick={() => setOpenImportDialog(true)}
            disabled={loading}
            sx={{ py: 0.5, px: 1.5, minHeight: 32, whiteSpace: "nowrap" }}
          >
            İçe Aktar
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportCsv}
            disabled={loading || contacts.length === 0}
            sx={{ py: 0.5, px: 1.5, minHeight: 32, whiteSpace: "nowrap" }}
          >
            Dışa Aktar{" "}
            {selectedContacts.length > 0 && `(${selectedContacts.length})`}
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setOpenAddDialog(true)}
            color="success"
            sx={{ py: 0.5, px: 1.5, minHeight: 32, whiteSpace: "nowrap" }}
          >
            Kişi Ekle
          </Button>
        </Stack>
      </Box>

      {/* Stats Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Card
          sx={{
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {stats?.total || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Toplam Kişi
                </Typography>
              </Box>
              <GroupsIcon
                sx={{
                  fontSize: 40,
                  color: theme.palette.primary.main,
                  opacity: 0.5,
                }}
              />
            </Box>
          </CardContent>
        </Card>

        <Card
          sx={{
            background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {stats?.active || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Aktif
                </Typography>
              </Box>
              <CheckCircleIcon
                sx={{
                  fontSize: 40,
                  color: theme.palette.success.main,
                  opacity: 0.5,
                }}
              />
            </Box>
          </CardContent>
        </Card>

        <Card
          sx={{
            background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {stats?.inactive || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pasif
                </Typography>
              </Box>
              <CancelIcon
                sx={{
                  fontSize: 40,
                  color: theme.palette.error.main,
                  opacity: 0.5,
                }}
              />
            </Box>
          </CardContent>
        </Card>

        <Card
          sx={{
            background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {stats?.business || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  İşletme
                </Typography>
              </Box>
              <BusinessIcon
                sx={{
                  fontSize: 40,
                  color: theme.palette.info.main,
                  opacity: 0.5,
                }}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Search and Actions Bar */}
      <Paper
        sx={{
          mb: 3,
          background: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: "blur(10px)",
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Box p={2}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems="center"
          >
            <TextField
              size="small"
              placeholder="Kişi ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1 }}
            />

            {/* Durum Filtreleme */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Durum</InputLabel>
              <Select
                value={activeFilter}
                label="Durum"
                onChange={(e) => setActiveFilter(e.target.value)}
              >
                <MenuItem value="all">Tümü</MenuItem>
                <MenuItem value="active">Aktif</MenuItem>
                <MenuItem value="inactive">Pasif</MenuItem>
              </Select>
            </FormControl>

            {/* Etiket Filtreleme */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Etiket</InputLabel>
              <Select
                multiple
                value={selectedTags}
                label="Etiket"
                onChange={(e) =>
                  setSelectedTags(
                    typeof e.target.value === "string"
                      ? e.target.value.split(",")
                      : e.target.value,
                  )
                }
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip
                        key={value}
                        label={value}
                        size="small"
                        sx={{ height: 20, fontSize: "0.75rem" }}
                      />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="">
                  <em>Tümü</em>
                </MenuItem>
                {availableTags.map((tag) => (
                  <MenuItem key={tag} value={tag}>
                    {tag}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Action Buttons - CSV Contacts tarzı */}
            <Box
              sx={{
                display: "flex",
                gap: 1,
                flexWrap: "nowrap",
                minWidth: "auto",
              }}
            >
              {selectedContacts.length > 0 && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SendIcon />}
                  onClick={() => setOpenBulkMessageDialog(true)}
                  size="small"
                  sx={{ py: 0.5, px: 1.5, minHeight: 32, whiteSpace: "nowrap" }}
                >
                  Toplu Mesaj Gönder ({selectedContacts.length})
                </Button>
              )}

              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  setInitialLoadDone(false);
                  fetchContacts();
                  showSnackbar("Kişiler yenileniyor...", "info");
                }}
                disabled={loading}
                color="primary"
                size="small"
                sx={{ py: 0.5, px: 1.5, minHeight: 32 }}
              >
                Yenile
              </Button>

              {selectedContacts.length > 0 && (
                <Button
                  variant="outlined"
                  startIcon={<DeleteSweepIcon />}
                  onClick={() => setOpenDeleteDialog(true)}
                  color="error"
                  size="small"
                  sx={{ py: 0.5, px: 1.5, minHeight: 32, whiteSpace: "nowrap" }}
                >
                  Seçilenleri Sil ({selectedContacts.length})
                </Button>
              )}

              {contacts.length > 0 && (
                <Button
                  variant="outlined"
                  startIcon={<DeleteSweepIcon />}
                  onClick={() => setOpenDeleteAllDialog(true)}
                  color="warning"
                  size="small"
                  sx={{ py: 0.5, px: 1.5, minHeight: 32, whiteSpace: "nowrap" }}
                >
                  Tümünü Temizle
                </Button>
              )}
            </Box>
          </Stack>
        </Box>
      </Paper>

      {/* Contacts Table */}
      <TableContainer component={Paper}>
        {loading && <LinearProgress />}

        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={
                    contacts.length > 0 &&
                    selectedContacts.length === contacts.length
                  }
                  indeterminate={
                    selectedContacts.length > 0 &&
                    selectedContacts.length < contacts.length
                  }
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>İsim</TableCell>
              <TableCell>Telefon</TableCell>
              <TableCell>Durum</TableCell>
              <TableCell>Tip</TableCell>
              <TableCell>Etiketler</TableCell>
              <TableCell align="right">İşlemler</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ py: 3 }}
                  >
                    WhatsApp kişileri yükleniyor veya henüz kişi bulunamadı
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              contacts
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((contact) => (
                  <TableRow
                    key={contact.id}
                    hover
                    selected={selectedContacts.includes(contact.id)}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() => handleSelectContact(contact.id)}
                      />
                    </TableCell>

                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <PersonIcon
                          sx={{ fontSize: 20, color: "text.secondary" }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {contact.name || "İsimsiz"}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <PhoneIcon
                          sx={{ fontSize: 16, color: "text.secondary" }}
                        />
                        <Typography variant="body2">{contact.phone}</Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Switch
                          checked={contact.is_active}
                          onChange={() => handleToggleActive(contact)}
                          size="small"
                          color={contact.is_active ? "success" : "default"}
                        />
                        <Typography
                          variant="body2"
                          color={
                            contact.is_active
                              ? "success.main"
                              : "text.secondary"
                          }
                          sx={{ fontWeight: 500 }}
                        >
                          {contact.is_active ? "Aktif" : "Pasif"}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Switch
                          checked={contact.is_business}
                          onChange={() => handleToggleBusinessType(contact)}
                          size="small"
                          color={contact.is_business ? "warning" : "default"}
                        />
                        {contact.is_business ? (
                          <BusinessIcon
                            sx={{ fontSize: 16, color: "text.secondary" }}
                          />
                        ) : (
                          <PersonIcon
                            sx={{ fontSize: 16, color: "text.secondary" }}
                          />
                        )}
                        <Typography
                          variant="body2"
                          color={
                            contact.is_business
                              ? "warning.main"
                              : "text.secondary"
                          }
                          sx={{ fontWeight: 500 }}
                        >
                          {contact.is_business ? "İşletme" : "Kişisel"}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {(contact.metadata?.tags || contact.tags || []).map(
                          (tag: string, index: number) => (
                            <Chip
                              key={index}
                              label={tag}
                              size="small"
                              sx={{
                                bgcolor: alpha(
                                  theme.palette.secondary.main,
                                  0.1,
                                ),
                                color: theme.palette.secondary.main,
                                fontSize: "0.7rem",
                                height: "20px",
                              }}
                            />
                          ),
                        )}
                        {!(contact.metadata?.tags || contact.tags)?.length && (
                          <Typography
                            variant="body2"
                            color="text.disabled"
                            sx={{ fontSize: "0.8rem" }}
                          >
                            -
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    <TableCell align="right">
                      <Box display="flex" justifyContent="flex-end" gap={1}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            // Set editing state for the contact
                            setEditingContact(contact);
                            setOpenAddDialog(true);
                          }}
                          title="Düzenle"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
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
                ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          labelRowsPerPage="Sayfa başına:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} / ${count}`
          }
        />
      </TableContainer>

      {/* Add/Edit Contact Dialog */}
      <Dialog
        open={openAddDialog}
        onClose={() => {
          setOpenAddDialog(false);
          setEditingContact(null);
          resetForm();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {editingContact
            ? "WhatsApp Web Kişisini Düzenle"
            : "WhatsApp Web Kişisi Ekle"}
          <IconButton
            onClick={() => {
              setOpenAddDialog(false);
              setEditingContact(null);
              resetForm();
            }}
            size="small"
            sx={{ color: "text.secondary" }}
          >
            <ClearIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="İsim"
              fullWidth
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              helperText="Kişinin adı soyadı"
            />

            <TextField
              label="Telefon"
              fullWidth
              required
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              helperText="Örnek: +905551234567"
            />

            <Box sx={{ mb: 2 }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, mb: 1, color: "text.primary" }}
              >
                WhatsApp Web Oturumu
              </Typography>

              {availableSessions.length > 0 ? (
                <Box>
                  <FormControl fullWidth required>
                    <InputLabel>Aktif Oturum Seçin</InputLabel>
                    <Select
                      value={formData.session_id}
                      label="Aktif Oturum Seçin"
                      onChange={(e) =>
                        setFormData({ ...formData, session_id: e.target.value })
                      }
                      startAdornment={
                        <InputAdornment position="start">
                          <WhatsAppIcon
                            sx={{ color: "#25D366", fontSize: 20 }}
                          />
                        </InputAdornment>
                      }
                    >
                      {availableSessions.map((session) => (
                        <MenuItem key={session.id} value={session.id}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Chip
                              label="AKTIF"
                              size="small"
                              color="success"
                              sx={{ fontSize: "0.7rem", height: 18 }}
                            />
                            <Typography variant="body2">
                              {session.name}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mt: 1,
                    }}
                  >
                    <CheckCircleIcon
                      sx={{ color: "success.main", fontSize: 16 }}
                    />
                    <Typography variant="caption" color="success.main">
                      {availableSessions.length} aktif oturum bulundu
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Paper
                    sx={{
                      p: 3,
                      border: `2px dashed ${alpha(theme.palette.warning.main, 0.3)}`,
                      backgroundColor: alpha(theme.palette.warning.main, 0.05),
                      textAlign: "center",
                    }}
                  >
                    <WhatsAppIcon
                      sx={{
                        fontSize: 48,
                        color: alpha(theme.palette.action.disabled, 0.5),
                        mb: 2,
                      }}
                    />
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      gutterBottom
                    >
                      Aktif Oturum Bulunamadı
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 3 }}
                    >
                      WhatsApp Web kişisi eklemek için önce bir oturum
                      oluşturmanız gerekiyor.
                    </Typography>

                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={2}
                      justifyContent="center"
                    >
                      <Button
                        variant="contained"
                        startIcon={<WhatsAppIcon />}
                        onClick={() => navigate("/whatsapp-web")}
                        sx={{
                          backgroundColor: "#25D366",
                          "&:hover": { backgroundColor: "#128C7E" },
                        }}
                      >
                        Oturum Oluştur
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          // Expand manual entry form
                        }}
                      >
                        Manuel Giriş
                      </Button>
                    </Stack>
                  </Paper>

                  <Box sx={{ mt: 2 }}>
                    <TextField
                      label="Manuel Oturum ID"
                      fullWidth
                      value={formData.session_id}
                      onChange={(e) =>
                        setFormData({ ...formData, session_id: e.target.value })
                      }
                      placeholder="Örnek: session_001, my_whatsapp, vb."
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EditIcon
                              sx={{ color: "text.secondary", fontSize: 20 }}
                            />
                          </InputAdornment>
                        ),
                      }}
                      helperText="Henüz oturum yoksa manuel olarak oturum ID'si girebilirsiniz"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          "&:hover fieldset": {
                            borderColor: alpha(theme.palette.primary.main, 0.5),
                          },
                        },
                      }}
                    />
                  </Box>
                </Box>
              )}
            </Box>

            <TextField
              label="E-posta"
              fullWidth
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              helperText="Opsiyonel - Kişinin e-posta adresi"
            />

            <TextField
              label="Etiketler"
              fullWidth
              value={formData.tags}
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
              helperText="Vergül ile ayırın: müşteri, vip, ankara"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                />
              }
              label="Aktif"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenAddDialog(false);
              setEditingContact(null);
              resetForm();
            }}
          >
            İptal
          </Button>
          <Button
            variant="contained"
            onClick={editingContact ? handleUpdateContact : handleAddContact}
            disabled={!formData.name || !formData.phone || !formData.session_id}
          >
            {editingContact ? "Güncelle" : "Ekle"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Kişileri Sil</DialogTitle>
        <DialogContent>
          <Typography>
            {selectedContacts.length} kişiyi silmek istediğinizden emin misiniz?
            Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>İptal</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteContacts}
          >
            Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog
        open={openImportDialog}
        onClose={() => setOpenImportDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          CSV Dosyası İçe Aktar
          <IconButton
            onClick={() => setOpenImportDialog(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <Alert severity="info">
              CSV dosyanızın ilk satırı başlık satırı olmalıdır. Desteklenen
              başlıklar:
              <br />• <strong>İsim, Name, Ad</strong> - Kişinin adı
              <br />• <strong>Telefon, Phone, Numara</strong> - Telefon numarası
              (Zorunlu)
              <br />• <strong>Email, Eposta, E-posta</strong> - E-posta adresi
              <br />• <strong>Etiketler, Tags, Etiket</strong> - Noktalı virgül
              (;) ile ayrılmış
              <br />• <strong>Durum, Status</strong> - Aktif/Pasif
              <br />• <strong>Tip, Type</strong> - İşletme/Kişisel
              <br />• <strong>Oturum, Session</strong> - WhatsApp oturum ID'si
            </Alert>

            <Alert severity="warning">
              <strong>Güncelleme Özelliği:</strong> Eğer telefon numarası mevcut
              bir kişiye aitse, o kişinin bilgileri güncellenecektir.
            </Alert>

            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<FileUploadIcon />}
            >
              {csvFile ? csvFile.name : "CSV Dosyası Seç"}
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
                Dosya seçildi: {csvFile.name} (
                {(csvFile.size / 1024).toFixed(2)} KB)
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenImportDialog(false);
              setCsvFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          >
            İptal
          </Button>
          <Button
            onClick={handleImportCsv}
            variant="contained"
            disabled={!csvFile || loading}
            startIcon={
              loading ? <CircularProgress size={20} /> : <FileUploadIcon />
            }
          >
            İçe Aktar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Message Dialog */}
      <Dialog
        open={openBulkMessageDialog}
        onClose={() => setOpenBulkMessageDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, color: theme.palette.primary.main }}
            >
              Toplu Mesaj Gönder
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedContacts.length} kişiye mesaj gönderilecek
            </Typography>
          </Box>
          <IconButton
            onClick={() => setOpenBulkMessageDialog(false)}
            sx={{ color: "text.secondary" }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Selected Recipients Preview */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Seçili Alıcılar ({selectedContacts.length})
              </Typography>
              <Paper
                sx={{
                  p: 2,
                  maxHeight: 120,
                  overflow: "auto",
                  background: alpha(theme.palette.background.default, 0.5),
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
              >
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {contacts
                    .filter((c) => selectedContacts.includes(c.id))
                    .map((contact, index) => (
                      <Chip
                        key={contact.id}
                        label={contact.name || contact.phone}
                        size="small"
                        sx={{
                          backgroundColor: alpha(
                            theme.palette.primary.main,
                            0.1,
                          ),
                          color: theme.palette.primary.main,
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
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
                  • <strong>{`{{name}}`}</strong> - Kişinin adı
                  <br />• <strong>{`{{phone}}`}</strong> - Kişinin telefon
                  numarası
                  <br />• <strong>{`{{email}}`}</strong> - Kişinin email adresi
                  <br />• <strong>{`{{tags}}`}</strong> - Kişinin etiketleri
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
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: alpha(theme.palette.background.paper, 0.8),
                  },
                }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: "block" }}
              >
                Karakter sayısı: {bulkMessage.length}
              </Typography>

              {/* Message Preview */}
              {bulkMessage && selectedContacts.length > 0 && (
                <Paper
                  sx={{
                    mt: 2,
                    p: 2,
                    background: alpha(theme.palette.success.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 600, color: theme.palette.success.main }}
                  >
                    Önizleme (İlk seçili kişi için):
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ mt: 1, whiteSpace: "pre-wrap" }}
                  >
                    {(() => {
                      const firstContact = contacts.find((c) =>
                        selectedContacts.includes(c.id),
                      );
                      if (!firstContact) return bulkMessage;

                      return bulkMessage
                        .replace(/\{\{name\}\}/g, firstContact.name || "")
                        .replace(/\{\{phone\}\}/g, firstContact.phone || "")
                        .replace(/\{\{email\}\}/g, firstContact.email || "")
                        .replace(
                          /\{\{tags\}\}/g,
                          Array.isArray(firstContact.tags)
                            ? firstContact.tags.join(", ")
                            : firstContact.tags || "",
                        );
                    })()}
                  </Typography>
                </Paper>
              )}
            </Box>

            {/* Media Upload Section */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Medya Ekle (Opsiyonel)
              </Typography>
              <Paper
                sx={{
                  p: 2,
                  border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                  backgroundColor: alpha(theme.palette.primary.main, 0.02),
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<AttachFileIcon />}
                    sx={{
                      borderStyle: "dashed",
                      "&:hover": {
                        borderStyle: "solid",
                      },
                    }}
                  >
                    {selectedMedia ? "Medya Değiştir" : "Medya Seç"}
                    <input
                      type="file"
                      hidden
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                      onChange={handleMediaSelect}
                    />
                  </Button>

                  {selectedMedia && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        p: 2,
                        bgcolor: alpha(theme.palette.background.paper, 0.8),
                        borderRadius: 1,
                      }}
                    >
                      {mediaPreview && (
                        <Box
                          sx={{
                            width: 80,
                            height: 80,
                            borderRadius: 1,
                            overflow: "hidden",
                            flexShrink: 0,
                          }}
                        >
                          <img
                            src={mediaPreview}
                            alt="Preview"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </Box>
                      )}
                      {!mediaPreview && (
                        <Box
                          sx={{
                            width: 80,
                            height: 80,
                            borderRadius: 1,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {selectedMedia.type.startsWith("video/")
                            ? "📹"
                            : selectedMedia.type.startsWith("audio/")
                              ? "🎵"
                              : selectedMedia.type.includes("pdf")
                                ? "📄"
                                : "📎"}
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
                    Desteklenen formatlar: Resim, Video, Ses, PDF, Word, Excel
                    (Maks. 16MB)
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
                  Rastgele gecikmeler kullanılarak insan davranışı taklit
                  edilir. Bu, hesabınızın spam olarak işaretlenmesini önler.
                </Typography>
              </Alert>
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
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
                    setBulkMessageMaxDelay(
                      Math.max(value, bulkMessageMinDelay),
                    );
                  }}
                  inputProps={{ min: 1, max: 120 }}
                  disabled={sendingMessage}
                  sx={{ width: 180 }}
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ flex: 1 }}
                >
                  Her mesaj arasında {bulkMessageMinDelay}-{bulkMessageMaxDelay}{" "}
                  saniye + 0-1 saniye rastgele gecikme
                </Typography>
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
              >
                Önerilen: 3-8 saniye arası. Çok fazla mesaj için daha yüksek
                değerler kullanın.
              </Typography>
            </Box>

            {/* Progress Info */}
            {sendingMessage && (
              <Paper
                sx={{
                  p: 2,
                  background: alpha(theme.palette.info.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
                >
                  <CircularProgress size={20} />
                  <Typography variant="subtitle2">
                    Mesajlar gönderiliyor... ({bulkMessageSentCount}/
                    {selectedContacts.length})
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(bulkMessageSentCount / selectedContacts.length) * 100}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Paper>
            )}

            {/* Error Messages */}
            {bulkMessageErrors.length > 0 && (
              <Paper
                sx={{
                  p: 2,
                  background: alpha(theme.palette.error.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    mb: 1,
                    fontWeight: 600,
                    color: theme.palette.error.main,
                  }}
                >
                  Gönderim Hataları ({bulkMessageErrors.length})
                </Typography>
                <Box sx={{ maxHeight: 120, overflow: "auto" }}>
                  {bulkMessageErrors.map((error, index) => (
                    <Typography
                      key={index}
                      variant="body2"
                      color="error"
                      sx={{ mb: 0.5 }}
                    >
                      • {error}
                    </Typography>
                  ))}
                </Box>
              </Paper>
            )}

            {/* Session Info */}
            {availableSessions.length > 0 && (
              <Box
                sx={{
                  p: 2,
                  background: alpha(theme.palette.success.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" color="success.main">
                  <strong>Aktif Oturum:</strong>{" "}
                  {availableSessions[0]?.name || availableSessions[0]?.id}
                </Typography>
              </Box>
            )}

            {availableSessions.length === 0 && (
              <Alert severity="warning">
                Aktif WhatsApp Web oturumu bulunamadı. Lütfen önce WhatsApp Web
                sayfasından QR kodu tarayın.
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            p: 2,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            background: alpha(theme.palette.background.default, 0.3),
          }}
        >
          <Button
            onClick={() => setOpenBulkMessageDialog(false)}
            disabled={sendingMessage}
          >
            İptal
          </Button>
          <Button
            onClick={handleSendBulkMessage}
            variant="contained"
            startIcon={
              sendingMessage ? <CircularProgress size={20} /> : <SendIcon />
            }
            disabled={
              !bulkMessage.trim() ||
              sendingMessage ||
              selectedContacts.length === 0 ||
              availableSessions.length === 0
            }
          >
            {sendingMessage ? "Gönderiliyor..." : "Gönder"}
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

export default WhatsAppWebContacts;
