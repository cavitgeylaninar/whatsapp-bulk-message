import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

class SettingsService {
  getHeaders() {
    return {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    };
  }

  // Sistem ayarlarını getir
  async getConfig() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/settings/config`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Config fetch error:', error);
      throw error;
    }
  }

  // Kullanıcı ayarlarını getir
  async getUserSettings() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/settings/user`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('User settings fetch error:', error);
      throw error;
    }
  }

  // Kullanıcı ayarlarını güncelle
  async updateUserSettings(settings) {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/settings/user`,
        settings,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('User settings update error:', error);
      throw error;
    }
  }

  // İstatistikleri getir
  async getStats() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/settings/stats`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Stats fetch error:', error);
      throw error;
    }
  }

  // WhatsApp bağlantı durumu
  async getWhatsAppStatus() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/settings/whatsapp/status`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('WhatsApp status check error:', error);
      throw error;
    }
  }
}

export default new SettingsService();