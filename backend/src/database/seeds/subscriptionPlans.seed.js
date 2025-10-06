const SubscriptionPlan = require('../../models/SubscriptionPlan');
const logger = require('../../utils/logger');

const plans = [
  {
    name: 'free',
    display_name: 'Ücretsiz Plan',
    description: 'Küçük işletmeler için başlangıç planı',
    price_monthly: 0,
    price_yearly: 0,
    // Mesaj limitleri
    messages_per_month: 1000,
    messages_per_day: 50,
    messages_per_second: 1,
    concurrent_messages: 5,
    // Kampanya limitleri
    campaigns_per_month: 5,
    recipients_per_campaign: 100,
    // Depolama
    storage_limit_mb: 50,
    // Özellikler
    features: {
      api_access: false,
      webhook_support: true,
      custom_templates: false,
      media_messages: false,
      bulk_import: false,
      advanced_analytics: false,
      priority_support: false,
      white_label: false,
      multiple_users: false,
      automation: false,
      integrations: false,
      export_data: false
    },
    // Kaynak limitleri
    resource_limits: {
      max_contacts: 500,
      max_templates: 3,
      max_media_files: 10,
      max_users: 1,
      api_rate_limit: 10,
      webhook_rate_limit: 1,
      worker_count: 1,
      queue_priority: 0,
      cpu_shares: 128,
      memory_limit_mb: 256
    },
    plan_type: 'free',
    trial_days: 0,
    is_active: true,
    is_popular: false,
    sort_order: 1
  },
  {
    name: 'starter',
    display_name: 'Başlangıç',
    description: 'Büyüyen işletmeler için ideal',
    price_monthly: 299,
    price_yearly: 2990,
    // Mesaj limitleri
    messages_per_month: 10000,
    messages_per_day: 500,
    messages_per_second: 5,
    concurrent_messages: 20,
    // Kampanya limitleri
    campaigns_per_month: 20,
    recipients_per_campaign: 500,
    // Depolama
    storage_limit_mb: 500,
    // Özellikler
    features: {
      api_access: true,
      webhook_support: true,
      custom_templates: true,
      media_messages: true,
      bulk_import: true,
      advanced_analytics: false,
      priority_support: false,
      white_label: false,
      multiple_users: false,
      automation: false,
      integrations: false,
      export_data: true
    },
    // Kaynak limitleri
    resource_limits: {
      max_contacts: 5000,
      max_templates: 10,
      max_media_files: 100,
      max_users: 2,
      api_rate_limit: 100,
      webhook_rate_limit: 10,
      worker_count: 2,
      queue_priority: 3,
      cpu_shares: 256,
      memory_limit_mb: 512
    },
    plan_type: 'starter',
    trial_days: 7,
    is_active: true,
    is_popular: true,
    sort_order: 2
  },
  {
    name: 'professional',
    display_name: 'Profesyonel',
    description: 'Orta ve büyük ölçekli işletmeler için',
    price_monthly: 999,
    price_yearly: 9990,
    // Mesaj limitleri
    messages_per_month: 50000,
    messages_per_day: 2000,
    messages_per_second: 20,
    concurrent_messages: 50,
    // Kampanya limitleri
    campaigns_per_month: 100,
    recipients_per_campaign: 2000,
    // Depolama
    storage_limit_mb: 2000,
    // Özellikler
    features: {
      api_access: true,
      webhook_support: true,
      custom_templates: true,
      media_messages: true,
      bulk_import: true,
      advanced_analytics: true,
      priority_support: true,
      white_label: false,
      multiple_users: true,
      automation: true,
      integrations: true,
      export_data: true
    },
    // Kaynak limitleri
    resource_limits: {
      max_contacts: 25000,
      max_templates: 50,
      max_media_files: 500,
      max_users: 5,
      api_rate_limit: 500,
      webhook_rate_limit: 50,
      worker_count: 5,
      queue_priority: 6,
      cpu_shares: 512,
      memory_limit_mb: 1024
    },
    plan_type: 'professional',
    trial_days: 14,
    is_active: true,
    is_popular: false,
    sort_order: 3
  },
  {
    name: 'enterprise',
    display_name: 'Kurumsal',
    description: 'Büyük kurumlar ve yüksek hacimli kullanım için',
    price_monthly: 2999,
    price_yearly: 29990,
    // Mesaj limitleri
    messages_per_month: 200000,
    messages_per_day: 10000,
    messages_per_second: 100,
    concurrent_messages: 200,
    // Kampanya limitleri
    campaigns_per_month: 500,
    recipients_per_campaign: 10000,
    // Depolama
    storage_limit_mb: 10000,
    // Özellikler
    features: {
      api_access: true,
      webhook_support: true,
      custom_templates: true,
      media_messages: true,
      bulk_import: true,
      advanced_analytics: true,
      priority_support: true,
      white_label: true,
      multiple_users: true,
      automation: true,
      integrations: true,
      export_data: true
    },
    // Kaynak limitleri
    resource_limits: {
      max_contacts: 100000,
      max_templates: 200,
      max_media_files: 2000,
      max_users: 20,
      api_rate_limit: 2000,
      webhook_rate_limit: 100,
      worker_count: 10,
      queue_priority: 9,
      cpu_shares: 1024,
      memory_limit_mb: 2048
    },
    plan_type: 'enterprise',
    trial_days: 30,
    is_active: true,
    is_popular: false,
    sort_order: 4
  },
  {
    name: 'custom',
    display_name: 'Özel Plan',
    description: 'İhtiyaçlarınıza özel tasarlanmış plan',
    price_monthly: 0, // Özel fiyatlandırma
    price_yearly: 0,
    // Mesaj limitleri (müzakere edilecek)
    messages_per_month: 1000000,
    messages_per_day: 50000,
    messages_per_second: 500,
    concurrent_messages: 1000,
    // Kampanya limitleri
    campaigns_per_month: 9999,
    recipients_per_campaign: 50000,
    // Depolama
    storage_limit_mb: 100000,
    // Tüm özellikler açık
    features: {
      api_access: true,
      webhook_support: true,
      custom_templates: true,
      media_messages: true,
      bulk_import: true,
      advanced_analytics: true,
      priority_support: true,
      white_label: true,
      multiple_users: true,
      automation: true,
      integrations: true,
      export_data: true
    },
    // Kaynak limitleri (özelleştirilebilir)
    resource_limits: {
      max_contacts: 999999,
      max_templates: 999,
      max_media_files: 9999,
      max_users: 999,
      api_rate_limit: 10000,
      webhook_rate_limit: 500,
      worker_count: 20,
      queue_priority: 10,
      cpu_shares: 2048,
      memory_limit_mb: 4096
    },
    plan_type: 'custom',
    trial_days: 30,
    is_active: false, // Sadece özel müşteriler için aktif edilecek
    is_popular: false,
    sort_order: 5
  }
];

async function seedSubscriptionPlans() {
  try {
    logger.info('Seeding subscription plans...');
    
    for (const planData of plans) {
      const [plan, created] = await SubscriptionPlan.findOrCreate({
        where: { name: planData.name },
        defaults: planData
      });
      
      if (created) {
        logger.info(`Created subscription plan: ${plan.display_name}`);
      } else {
        // Mevcut planı güncelle
        await plan.update(planData);
        logger.info(`Updated subscription plan: ${plan.display_name}`);
      }
    }
    
    logger.info('Subscription plans seeded successfully');
    return true;
  } catch (error) {
    logger.error('Error seeding subscription plans:', error);
    throw error;
  }
}

// Standalone çalıştırma
if (require.main === module) {
  const sequelize = require('../../database/connection');
  
  sequelize.authenticate()
    .then(() => {
      logger.info('Database connected');
      return sequelize.sync();
    })
    .then(() => {
      return seedSubscriptionPlans();
    })
    .then(() => {
      logger.info('Seed completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Seed failed:', error);
      process.exit(1);
    });
}

module.exports = seedSubscriptionPlans;