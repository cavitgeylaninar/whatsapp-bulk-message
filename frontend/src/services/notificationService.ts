interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  badge?: string;
  silent?: boolean;
  tag?: string;
  requireInteraction?: boolean;
  actions?: any[];
  data?: any;
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private soundEnabled: boolean = true;
  private notificationSound: HTMLAudioElement;
  private lastNotificationTime: number = 0;
  private notificationThrottle: number = 1000; // Minimum 1 saniye ara

  constructor() {
    // Create WhatsApp-like notification sound (ding-dong style)
    const createWhatsAppSound = () => {
      const sampleRate = 44100;
      const totalDuration = 0.5; // Toplam süre
      const totalSamples = sampleRate * totalDuration;
      
      const buffer = new ArrayBuffer(44 + totalSamples * 2);
      const view = new DataView(buffer);
      
      // WAV header
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };
      
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + totalSamples * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, totalSamples * 2, true);
      
      // WhatsApp'ın karakteristik "ding-dong" sesi
      let offset = 44;
      
      // İlk nota: E5 (659.25 Hz) - Hızlı ve keskin başlangıç
      const note1Duration = 0.08;
      const note1Freq = 659.25;
      const note1Samples = sampleRate * note1Duration;
      
      for (let i = 0; i < note1Samples; i++) {
        // Hızlı attack, yavaş decay
        const envelope = Math.exp(-i / (sampleRate * 0.05));
        const value = Math.sin((2 * Math.PI * note1Freq * i) / sampleRate) * 0.4 * envelope;
        // Harmonik ekle
        const harmonic = Math.sin((2 * Math.PI * note1Freq * 2 * i) / sampleRate) * 0.1 * envelope;
        view.setInt16(offset, (value + harmonic) * 32767, true);
        offset += 2;
      }
      
      // Çok kısa ara - 30ms
      const gap1Duration = 0.03;
      const gap1Samples = sampleRate * gap1Duration;
      for (let i = 0; i < gap1Samples; i++) {
        view.setInt16(offset, 0, true);
        offset += 2;
      }
      
      // İkinci nota: C5 (523.25 Hz) - Daha yumuşak
      const note2Duration = 0.12;
      const note2Freq = 523.25;
      const note2Samples = sampleRate * note2Duration;
      
      for (let i = 0; i < note2Samples; i++) {
        // Yumuşak attack ve decay
        const attack = Math.min(1, i / (sampleRate * 0.008));
        const decay = Math.exp(-i / (sampleRate * 0.08));
        const envelope = attack * decay;
        const value = Math.sin((2 * Math.PI * note2Freq * i) / sampleRate) * 0.35 * envelope;
        // Harmonik ekle
        const harmonic = Math.sin((2 * Math.PI * note2Freq * 2 * i) / sampleRate) * 0.08 * envelope;
        view.setInt16(offset, (value + harmonic) * 32767, true);
        offset += 2;
      }
      
      // Üçüncü nota (echo): G4 (392 Hz) - Çok hafif
      const note3Duration = 0.15;
      const note3Freq = 392;
      const note3Samples = sampleRate * note3Duration;
      
      for (let i = 0; i < note3Samples; i++) {
        const envelope = Math.exp(-i / (sampleRate * 0.04)) * 0.15;
        const value = Math.sin((2 * Math.PI * note3Freq * i) / sampleRate) * envelope;
        view.setInt16(offset, value * 32767, true);
        offset += 2;
      }
      
      // Geri kalan sessizlik
      const remainingSamples = totalSamples - note1Samples - gap1Samples - note2Samples - note3Samples;
      for (let i = 0; i < remainingSamples; i++) {
        view.setInt16(offset, 0, true);
        offset += 2;
      }
      
      const blob = new Blob([buffer], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    };
    
    // WhatsApp benzeri bildirim sesi oluştur
    this.notificationSound = new Audio(createWhatsAppSound());
    this.notificationSound.volume = 0.7; // Daha belirgin ses
    
    // Local storage'dan ses ayarını al
    const savedSoundSetting = localStorage.getItem('notificationSound');
    this.soundEnabled = savedSoundSetting !== 'false';
    
    // İzin durumunu kontrol et
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  // Bildirim izni iste
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Bu tarayıcı bildirimleri desteklemiyor');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        this.permission = permission;
        return permission === 'granted';
      } catch (error) {
        console.error('Bildirim izni alınamadı:', error);
        return false;
      }
    }

    return false;
  }

  // Bildirim göster
  async showNotification(options: NotificationOptions): Promise<void> {
    // Throttle kontrolü
    const now = Date.now();
    if (now - this.lastNotificationTime < this.notificationThrottle) {
      return;
    }
    this.lastNotificationTime = now;

    // İzin kontrolü
    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('Bildirim izni verilmedi');
        return;
      }
    }

    try {
      // Ses çal
      if (this.soundEnabled && !options.silent) {
        this.playSound();
      }

      // Native bildirim göster
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/whatsapp-icon.png',
        badge: options.badge || '/badge-icon.png',
        tag: options.tag || 'whatsapp-message',
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || !this.soundEnabled,
        data: options.data
      });

      // Bildirime tıklandığında
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();
        
        // Eğer data'da customerId varsa, mesajlar sayfasına yönlendir
        if (options.data?.customerId) {
          window.location.href = `/messages?customer=${options.data.customerId}`;
        }
      };

      // 5 saniye sonra otomatik kapat
      setTimeout(() => {
        notification.close();
      }, 5000);

    } catch (error) {
      console.error('Bildirim gösterilemedi:', error);
      // Fallback: Toast notification göster
      this.showToastNotification(options.body || 'Bildirim');
    }
  }


  // Ses çal
  private playSound(): void {
    try {
      this.notificationSound.currentTime = 0;
      this.notificationSound.play().catch(e => {
        console.warn('Bildirim sesi çalınamadı:', e);
      });
    } catch (error) {
      console.error('Ses çalma hatası:', error);
    }
  }

  // Ses ayarını değiştir
  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    localStorage.setItem('notificationSound', enabled.toString());
  }

  // Ses seviyesini ayarla
  setVolume(volume: number): void {
    if (volume >= 0 && volume <= 1) {
      this.notificationSound.volume = volume;
    }
  }

  // İzin durumunu kontrol et
  hasPermission(): boolean {
    return this.permission === 'granted';
  }

  // Ses durumunu kontrol et
  isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  // Genel toast notification göster
  showToastNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    const icons = {
      success: '',
      error: '',
      warning: '',
      info: ''
    };

    const colors = {
      success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
      error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
      warning: { bg: '#fff3cd', border: '#ffeaa7', text: '#856404' },
      info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' }
    };

    const color = colors[type];
    const icon = icons[type];

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color.bg};
        border: 1px solid ${color.border};
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 16px;
        max-width: 350px;
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        color: ${color.text};
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      ">
        <span style="font-size: 20px;">${icon}</span>
        <div style="flex: 1;">
          <div style="font-weight: 500; line-height: 1.4;">${message}</div>
        </div>
        <button onclick="this.parentElement.remove()" style="
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: ${color.text};
          opacity: 0.7;
          padding: 0;
          margin: -8px -8px 0 0;
          transition: opacity 0.2s;
        " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">&times;</button>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // 5 saniye sonra otomatik kaldır
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 5000);
  }

  // Başarı toast mesajı
  showSuccessToast(message: string): void {
    this.showToastNotification(message, 'success');
  }

  // Hata toast mesajı
  showErrorToast(message: string): void {
    this.showToastNotification(message, 'error');
  }

  // Uyarı toast mesajı
  showWarningToast(message: string): void {
    this.showToastNotification(message, 'warning');
  }

  // Bilgi toast mesajı
  showInfoToast(message: string): void {
    this.showToastNotification(message, 'info');
  }

  // Yeni mesaj bildirimi
  async notifyNewMessage(message: {
    customerName?: string;
    customerPhone?: string;
    content: string;
    customerId?: string;
  }): Promise<void> {
    const title = message.customerName || message.customerPhone || 'Yeni Mesaj';
    const body = message.content.length > 100 
      ? message.content.substring(0, 100) + '...' 
      : message.content;

    await this.showNotification({
      title: `${title}`,
      body: body,
      icon: '/whatsapp-icon.png',
      badge: '/badge-icon.png',
      tag: `message-${Date.now()}`,
      data: {
        customerId: message.customerId,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Kampanya bildirimi
  async notifyCampaignStatus(campaign: {
    name: string;
    status: 'completed' | 'failed' | 'started';
    successRate?: number;
  }): Promise<void> {
    let title = '';
    let body = '';
    let icon = '';

    switch (campaign.status) {
      case 'completed':
        title = 'Kampanya Tamamlandı';
        body = `${campaign.name} kampanyası başarıyla tamamlandı. Başarı oranı: ${campaign.successRate || 0}%`;
        icon = '/success-icon.png';
        break;
      case 'failed':
        title = 'Kampanya Başarısız';
        body = `${campaign.name} kampanyası başarısız oldu.`;
        icon = '/error-icon.png';
        break;
      case 'started':
        title = 'Kampanya Başladı';
        body = `${campaign.name} kampanyası başlatıldı.`;
        icon = '/info-icon.png';
        break;
    }

    await this.showNotification({
      title,
      body,
      icon,
      requireInteraction: campaign.status === 'failed'
    });
  }
}

// Singleton instance
const notificationService = new NotificationService();

// CSS animasyon ekle
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);

export default notificationService;