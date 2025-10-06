'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('templates');
    
    // Add Meta WhatsApp API fields to templates table only if they don't exist
    if (!columns.meta_template_id) {
      await queryInterface.addColumn('templates', 'meta_template_id', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Meta template ID returned after approval'
      });
    }

    if (!columns.meta_template_name) {
      await queryInterface.addColumn('templates', 'meta_template_name', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Template name in Meta Business Manager'
      });
    }

    if (!columns.whatsapp_template_id) {
      await queryInterface.addColumn('templates', 'whatsapp_template_id', {
        type: Sequelize.STRING(255),
        allowNull: true
      });
    }

    // Create ENUM types if they don't exist
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_templates_approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISABLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_templates_quality_score AS ENUM ('UNKNOWN', 'GREEN', 'YELLOW', 'RED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    if (!columns.approval_status) {
      await queryInterface.addColumn('templates', 'approval_status', {
        type: Sequelize.ENUM('PENDING', 'APPROVED', 'REJECTED', 'DISABLED'),
        defaultValue: 'PENDING'
      });
    }

    if (!columns.quality_score) {
      await queryInterface.addColumn('templates', 'quality_score', {
        type: Sequelize.ENUM('UNKNOWN', 'GREEN', 'YELLOW', 'RED'),
        defaultValue: 'UNKNOWN',
        comment: 'Template quality score from Meta'
      });
    }

    if (!columns.rejection_reason) {
      await queryInterface.addColumn('templates', 'rejection_reason', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!columns.submitted_at) {
      await queryInterface.addColumn('templates', 'submitted_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When template was submitted to Meta'
      });
    }

    if (!columns.approved_at) {
      await queryInterface.addColumn('templates', 'approved_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When template was approved by Meta'
      });
    }

    if (!columns.usage_count) {
      await queryInterface.addColumn('templates', 'usage_count', {
        type: Sequelize.INTEGER,
        defaultValue: 0
      });
    }

    if (!columns.last_used_at) {
      await queryInterface.addColumn('templates', 'last_used_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  async down (queryInterface, Sequelize) {
    // Remove Meta WhatsApp API fields
    await queryInterface.removeColumn('templates', 'meta_template_id');
    await queryInterface.removeColumn('templates', 'meta_template_name');
    await queryInterface.removeColumn('templates', 'whatsapp_template_id');
    await queryInterface.removeColumn('templates', 'approval_status');
    await queryInterface.removeColumn('templates', 'quality_score');
    await queryInterface.removeColumn('templates', 'rejection_reason');
    await queryInterface.removeColumn('templates', 'submitted_at');
    await queryInterface.removeColumn('templates', 'approved_at');
    await queryInterface.removeColumn('templates', 'usage_count');
    await queryInterface.removeColumn('templates', 'last_used_at');

    // Drop ENUM types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_templates_approval_status;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_templates_quality_score;');
  }
};
