'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add subscription fields to users table
    await queryInterface.addColumn('users', 'subscription_type', {
      type: Sequelize.ENUM('trial', 'basic', 'premium', 'enterprise'),
      defaultValue: 'trial',
      allowNull: false,
      comment: 'User subscription type'
    });

    await queryInterface.addColumn('users', 'subscription_start_date', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'When the subscription started'
    });

    await queryInterface.addColumn('users', 'subscription_end_date', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'When the subscription ends'
    });

    await queryInterface.addColumn('users', 'is_trial', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'Whether user is on trial period'
    });

    await queryInterface.addColumn('users', 'trial_days', {
      type: Sequelize.INTEGER,
      defaultValue: 10,
      allowNull: false,
      comment: 'Number of trial days'
    });

    await queryInterface.addColumn('users', 'subscription_status', {
      type: Sequelize.ENUM('active', 'expired', 'suspended', 'cancelled'),
      defaultValue: 'active',
      allowNull: false,
      comment: 'Current subscription status'
    });

    await queryInterface.addColumn('users', 'max_messages_per_month', {
      type: Sequelize.INTEGER,
      defaultValue: 1000,
      allowNull: true,
      comment: 'Monthly message limit'
    });

    await queryInterface.addColumn('users', 'used_messages_this_month', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Messages used this month'
    });

    await queryInterface.addColumn('users', 'max_contacts', {
      type: Sequelize.INTEGER,
      defaultValue: 500,
      allowNull: true,
      comment: 'Maximum number of contacts allowed'
    });

    await queryInterface.addColumn('users', 'last_login_reminder_sent', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Last time expiry reminder was sent'
    });

    // Create subscription_history table
    await queryInterface.createTable('subscription_history', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      action: {
        type: Sequelize.ENUM('created', 'renewed', 'upgraded', 'downgraded', 'expired', 'suspended', 'reactivated'),
        allowNull: false
      },
      subscription_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('subscription_history', ['user_id']);
    await queryInterface.addIndex('subscription_history', ['created_at']);
    await queryInterface.addIndex('users', ['subscription_end_date']);
    await queryInterface.addIndex('users', ['subscription_status']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove columns from users table
    await queryInterface.removeColumn('users', 'subscription_type');
    await queryInterface.removeColumn('users', 'subscription_start_date');
    await queryInterface.removeColumn('users', 'subscription_end_date');
    await queryInterface.removeColumn('users', 'is_trial');
    await queryInterface.removeColumn('users', 'trial_days');
    await queryInterface.removeColumn('users', 'subscription_status');
    await queryInterface.removeColumn('users', 'max_messages_per_month');
    await queryInterface.removeColumn('users', 'used_messages_this_month');
    await queryInterface.removeColumn('users', 'max_contacts');
    await queryInterface.removeColumn('users', 'last_login_reminder_sent');

    // Drop subscription_history table
    await queryInterface.dropTable('subscription_history');
  }
};