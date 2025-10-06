import React from 'react';
import { Button } from '@mui/material';
import { notificationStore } from '../services/notificationStore';

const TestNotification: React.FC = () => {
  const testNotification = () => {
    // Simulate a new WhatsApp message notification
    const testMessage = {
      id: `test-${Date.now()}`,
      customer_id: 'test-customer',
      direction: 'inbound' as const,
      message_type: 'text',
      content: 'Test mesaj içeriği: Merhaba, ürün hakkında bilgi almak istiyorum.',
      status: 'delivered',
      created_at: new Date().toISOString(),
      customer: {
        id: 'test-customer',
        name: 'Test Müşteri',
        phone: '+905551234567',
        whatsapp_number: '+905551234567'
      }
    };

    // Dispatch the event that the notification store listens to
    const event = new CustomEvent('newWhatsAppMessage', {
      detail: {
        message: testMessage,
        customer: testMessage.customer
      }
    });
    
    window.dispatchEvent(event);
    
    console.log('Test notification dispatched!');
  };

  return (
    <Button 
      variant="contained" 
      color="primary" 
      onClick={testNotification}
      sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}
    >
      Test Bildirimi
    </Button>
  );
};

export default TestNotification;