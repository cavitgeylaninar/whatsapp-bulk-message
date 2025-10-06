import { format, formatDistance, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

export const formatDate = (date: string | Date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd MMM yyyy HH:mm', { locale: tr });
};

export const formatDateShort = (date: string | Date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd MMM yyyy', { locale: tr });
};

export const formatRelativeTime = (date: string | Date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistance(dateObj, new Date(), { addSuffix: true, locale: tr });
};

export const formatPhoneNumber = (phone: string) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('90')) {
    return `+90 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10, 12)}`;
  }
  return phone;
};

export const validatePhoneNumber = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};

export const validateEmail = (email: string) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const getStatusColor = (status: string) => {
  const statusColors: Record<string, string> = {
    'pending': 'warning',
    'sent': 'info',
    'delivered': 'success',
    'read': 'success',
    'failed': 'error',
    'draft': 'default',
    'scheduled': 'warning',
    'running': 'info',
    'completed': 'success',
    'paused': 'warning',
    'cancelled': 'error'
  };
  return statusColors[status] || 'default';
};

export const getStatusLabel = (status: string) => {
  const statusLabels: Record<string, string> = {
    'pending': 'Bekliyor',
    'sent': 'Gönderildi',
    'delivered': 'İletildi',
    'read': 'Okundu',
    'failed': 'Başarısız',
    'draft': 'Taslak',
    'scheduled': 'Zamanlandı',
    'running': 'Çalışıyor',
    'completed': 'Tamamlandı',
    'paused': 'Duraklatıldı',
    'cancelled': 'İptal Edildi'
  };
  return statusLabels[status] || status;
};

export const getRoleLabel = (role: string) => {
  const roleLabels: Record<string, string> = {
    'admin': 'Administrator',
    'bayi': 'Bayi',
    'musteri': 'Müşteri'
  };
  return roleLabels[role] || role;
};

export const truncateText = (text: string, maxLength: number = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const downloadCSV = (data: any[], filename: string) => {
  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const convertToCSV = (data: any[]) => {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      return typeof value === 'string' && value.includes(',') 
        ? `"${value}"` 
        : value;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
};

export const personalizeMessage = (template: string, data: Record<string, any>) => {
  let message = template;
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'gi');
    message = message.replace(regex, data[key] || '');
  });
  return message;
};

export const getInitials = (name: string) => {
  if (!name) return '';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};