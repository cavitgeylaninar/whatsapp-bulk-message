'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('whatsapp_contacts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true
      },
      tags: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Comma-separated tags for grouping'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      last_message_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_by: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('whatsapp_contacts', ['phone']);
    await queryInterface.addIndex('whatsapp_contacts', ['created_by']);
    await queryInterface.addIndex('whatsapp_contacts', ['is_active']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('whatsapp_contacts');
  }
};