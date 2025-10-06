import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Token'ı localStorage'dan al
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Make.com tarzı otomatik kurulum
 * Sadece token ve business ID ile WhatsApp bağlantısı kur
 */
export const setupWhatsApp = async (token, businessId) => {
  try {
    const response = await axios.post(
      `${API_URL}/makecom/setup`,
      { token, businessId },
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    console.error('WhatsApp kurulum hatası:', error);
    throw error;
  }
};

/**
 * WhatsApp bağlantı durumunu kontrol et
 */
export const checkStatus = async () => {
  try {
    const response = await axios.get(
      `${API_URL}/makecom/status`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    console.error('Durum kontrol hatası:', error);
    throw error;
  }
};

/**
 * Gelen mesajları getir
 */
export const getMessages = async () => {
  try {
    const response = await axios.get(
      `${API_URL}/makecom/messages`,
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    console.error('Mesaj getirme hatası:', error);
    throw error;
  }
};

/**
 * Test mesajı gönder
 */
export const sendTestMessage = async (phone, message) => {
  try {
    const response = await axios.post(
      `${API_URL}/makecom/test-message`,
      { phone, message },
      { headers: getAuthHeader() }
    );
    return response.data;
  } catch (error) {
    console.error('Test mesajı gönderme hatası:', error);
    throw error;
  }
};

export default {
  setupWhatsApp,
  checkStatus,
  getMessages,
  sendTestMessage
};