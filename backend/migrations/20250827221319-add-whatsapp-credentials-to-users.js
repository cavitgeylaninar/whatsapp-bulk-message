'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add WhatsApp Business credentials columns to users table
    await queryInterface.addColumn('users', 'whatsapp_phone_number_id', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'WhatsApp Business phone number ID'
    });

    await queryInterface.addColumn('users', 'whatsapp_business_id', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'WhatsApp Business account ID'
    });

    await queryInterface.addColumn('users', 'whatsapp_access_token', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Encrypted WhatsApp Business API access token'
    });

    await queryInterface.addColumn('users', 'whatsapp_webhook_verify_token', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Webhook verification token for this tenant'
    });

    await queryInterface.addColumn('users', 'whatsapp_setup_completed', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether WhatsApp Business setup is completed'
    });

    await queryInterface.addColumn('users', 'whatsapp_setup_date', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Date when WhatsApp was setup'
    });

    // Add indexes for faster webhook routing
    await queryInterface.addIndex('users', ['whatsapp_phone_number_id'], {
      name: 'users_whatsapp_phone_number_id_idx',
      where: {
        whatsapp_phone_number_id: {
          [Sequelize.Op.ne]: null
        }
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove columns from users table
    await queryInterface.removeColumn('users', 'whatsapp_phone_number_id');
    await queryInterface.removeColumn('users', 'whatsapp_business_id');
    await queryInterface.removeColumn('users', 'whatsapp_access_token');
    await queryInterface.removeColumn('users', 'whatsapp_webhook_verify_token');
    await queryInterface.removeColumn('users', 'whatsapp_setup_completed');
    await queryInterface.removeColumn('users', 'whatsapp_setup_date');

    // Remove indexes
    await queryInterface.removeIndex('users', 'users_whatsapp_phone_number_id_idx');
  }
};