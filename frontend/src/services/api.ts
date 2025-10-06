import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  login(username: string, password: string, twoFactorCode?: string) {
    return this.api.post('/auth/login', { username, password, twoFactorCode });
  }

  register(data: any) {
    return this.api.post('/auth/register', data);
  }

  logout() {
    return this.api.post('/auth/logout');
  }

  enable2FA() {
    return this.api.post('/auth/enable-2fa');
  }

  verify2FA(code: string) {
    return this.api.post('/auth/verify-2fa', { code });
  }

  disable2FA(password: string, code: string) {
    return this.api.post('/auth/disable-2fa', { password, code });
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.api.post('/auth/change-password', { currentPassword, newPassword });
  }

  // Users
  getProfile() {
    return this.api.get('/users/profile');
  }

  updateProfile(data: any) {
    return this.api.put('/users/profile', data);
  }

  getUsers(params?: any) {
    return this.api.get('/users', { params });
  }

  getUser(id: string) {
    return this.api.get(`/users/${id}`);
  }

  createUser(data: any) {
    return this.api.post('/users', data);
  }

  updateUser(id: string, data: any) {
    return this.api.put(`/users/${id}`, data);
  }

  deleteUser(id: string) {
    return this.api.delete(`/users/${id}`);
  }

  getUserStats() {
    return this.api.get('/users/stats/overview');
  }

  // Customers
  getCustomers(params?: any) {
    return this.api.get('/customers', { params });
  }

  getCustomer(id: string) {
    return this.api.get(`/customers/${id}`);
  }

  createCustomer(data: any) {
    return this.api.post('/customers', data);
  }

  updateCustomer(id: string, data: any) {
    return this.api.put(`/customers/${id}`, data);
  }

  deleteCustomer(id: string) {
    return this.api.delete(`/customers/${id}`);
  }

  importCustomers(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post('/customers/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  // WhatsApp Contacts
  getWhatsAppContacts(params?: any) {
    return this.api.get('/whatsapp-contacts', { params });
  }

  getWhatsAppContact(id: string) {
    return this.api.get(`/whatsapp-contacts/${id}`);
  }

  createWhatsAppContact(data: any) {
    return this.api.post('/whatsapp-contacts', data);
  }

  updateWhatsAppContact(id: string, data: any) {
    return this.api.put(`/whatsapp-contacts/${id}`, data);
  }

  deleteWhatsAppContact(id: string) {
    return this.api.delete(`/whatsapp-contacts/${id}`);
  }

  unsubscribeCustomer(id: string, reason?: string) {
    return this.api.post(`/customers/${id}/unsubscribe`, { reason });
  }

  resubscribeCustomer(id: string) {
    return this.api.post(`/customers/${id}/resubscribe`);
  }

  blockCustomer(id: string, reason?: string) {
    return this.api.post(`/customers/${id}/block`, { reason });
  }

  unblockCustomer(id: string) {
    return this.api.post(`/customers/${id}/unblock`);
  }

  getCustomerMessages(id: string, params?: any) {
    return this.api.get(`/customers/${id}/messages`, { params });
  }

  addCustomerTags(id: string, tags: string[]) {
    return this.api.post(`/customers/${id}/tags`, { tags });
  }

  removeCustomerTags(id: string, tags: string[]) {
    return this.api.delete(`/customers/${id}/tags`, { data: { tags } });
  }

  // Campaigns
  getCampaigns(params?: any) {
    return this.api.get('/campaigns', { params });
  }

  getCampaign(id: string) {
    return this.api.get(`/campaigns/${id}`);
  }

  createCampaign(data: any) {
    return this.api.post('/campaigns', data);
  }

  updateCampaign(id: string, data: any) {
    return this.api.put(`/campaigns/${id}`, data);
  }

  deleteCampaign(id: string) {
    return this.api.delete(`/campaigns/${id}`);
  }

  executeCampaign(id: string) {
    return this.api.post(`/campaigns/${id}/execute`);
  }

  pauseCampaign(id: string) {
    return this.api.post(`/campaigns/${id}/pause`);
  }

  resumeCampaign(id: string) {
    return this.api.post(`/campaigns/${id}/resume`);
  }

  getCampaignStats(id: string) {
    return this.api.get(`/campaigns/${id}/stats`);
  }

  getCampaignMessages(id: string, params?: any) {
    return this.api.get(`/campaigns/${id}/messages`, { params });
  }

  previewCampaignAudience(id: string) {
    return this.api.get(`/campaigns/${id}/preview-audience`);
  }

  testCampaign(id: string, testNumbers: string[]) {
    return this.api.post(`/campaigns/${id}/test`, { test_numbers: testNumbers });
  }

  getCampaignTemplates() {
    return this.api.get('/campaigns/templates');
  }

  // Messages
  getMessages(params?: any) {
    return this.api.get('/messages', { params });
  }

  getMessage(id: string) {
    return this.api.get(`/messages/${id}`);
  }

  sendMessage(data: any) {
    return this.api.post('/messages/send', data);
  }

  sendBulkMessages(data: any) {
    return this.api.post('/messages/send-bulk', data);
  }

  getConversation(customerId: string, params?: any) {
    return this.api.get(`/messages/conversations/${customerId}`, { params });
  }

  getMessageStats() {
    return this.api.get('/messages/stats/overview');
  }

  retryMessage(id: string) {
    return this.api.post(`/messages/${id}/retry`);
  }

  // Templates
  get(url: string, config?: any) {
    return this.api.get(url, config);
  }

  post(url: string, data?: any, config?: any) {
    return this.api.post(url, data, config);
  }

  put(url: string, data?: any, config?: any) {
    return this.api.put(url, data, config);
  }

  delete(url: string, config?: any) {
    return this.api.delete(url, config);
  }

  patch(url: string, data?: any, config?: any) {
    return this.api.patch(url, data, config);
  }
}

export default new ApiService();