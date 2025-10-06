import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

class PollingService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  getHeaders() {
    return {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    };
  }

  // Polling durumunu kontrol et
  async getPollingStatus() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/polling/status`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Polling durumu alınamadı:', error);
      throw error;
    }
  }

  // Polling'i başlat
  async startPolling(interval = 30) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/polling/start`, 
        { interval },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Polling başlatılamadı:', error);
      throw error;
    }
  }

  // Polling'i durdur
  async stopPolling() {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/polling/stop`, 
        {},
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Polling durdurulamadı:', error);
      throw error;
    }
  }

  // Manuel senkronizasyon
  async manualSync() {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/polling/sync`, 
        {},
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Manuel senkronizasyon başarısız:', error);
      throw error;
    }
  }

  // Mesaj durumlarını güncelle
  async updateMessageStatuses() {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/polling/update-statuses`, 
        {},
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Mesaj durumları güncellenemedi:', error);
      throw error;
    }
  }
}

export default new PollingService();