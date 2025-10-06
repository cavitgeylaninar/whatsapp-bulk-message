import api from './api';

const CONTACTS_API = '/whatsapp-contacts';

export const whatsappContactService = {
  // Get all contacts with pagination and filters
  getContacts: async (params = {}) => {
    const response = await api.get(CONTACTS_API, { params });
    return response.data;
  },

  // Get single contact
  getContact: async (id) => {
    const response = await api.get(`${CONTACTS_API}/${id}`);
    return response.data;
  },

  // Create new contact
  createContact: async (contactData) => {
    const response = await api.post(CONTACTS_API, contactData);
    return response.data;
  },

  // Update contact
  updateContact: async (id, contactData) => {
    const response = await api.put(`${CONTACTS_API}/${id}`, contactData);
    return response.data;
  },

  // Delete contact
  deleteContact: async (id) => {
    const response = await api.delete(`${CONTACTS_API}/${id}`);
    return response.data;
  },

  // Bulk delete contacts
  bulkDeleteContacts: async (ids) => {
    const response = await api.post(`${CONTACTS_API}/bulk-delete`, { ids });
    return response.data;
  },

  // Import contacts from CSV
  importContacts: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`${CONTACTS_API}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Export contacts to CSV
  exportContacts: async (params = {}) => {
    const response = await api.get(`${CONTACTS_API}/export`, {
      params,
      responseType: 'blob',
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `whatsapp_contacts_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return { success: true };
  },

  // Get contact statistics
  getContactStats: async () => {
    const response = await api.get(`${CONTACTS_API}/stats`);
    return response.data;
  },
};