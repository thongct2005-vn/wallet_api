/**
 * Admin Settings Service
 */
const settingsRepository = require('./settings.repository');
const auditLogRepository = require('../../system/audit_log.repository');
const { ensureWriteAccess } = require('../_shared/admin-permission');

const settingsService = {
    listSettings: async (adminUser) => {
        const settings = await settingsRepository.listSettings();
        
        // Hide sensitive values if not Super Admin (or if you want to always hide them in list)
        // Here we just return all settings, but mask sensitive ones if needed
        return settings.map(s => {
            if (s.is_sensitive) {
                // Return masked value or just true/false indicator instead of raw value
                return { ...s, setting_value: '********' };
            }
            return s;
        });
    },

    updateSetting: async (adminUser, key, payload, ipAddress, userAgent) => {
        ensureWriteAccess(adminUser, 'settings');

        const oldSetting = await settingsRepository.findByKey(key);
        if (!oldSetting) {
            throw new Error('Setting_Not_Found');
        }

        const newValue = payload.setting_value;
        const updatedSetting = await settingsRepository.updateSetting(key, newValue);

        // Mask sensitive value in audit log
        let oldData = oldSetting.setting_value;
        let newData = updatedSetting.setting_value;
        if (oldSetting.is_sensitive) {
            oldData = '********';
            newData = '********';
        }

        await auditLogRepository.create({
            actorType: 'ADMIN',
            actorId: adminUser.id,
            action: 'settings.updated',
            entityType: 'app_settings',
            entityId: key,
            oldData: { setting_value: oldData },
            newData: { setting_value: newData },
            ipAddress,
            userAgent
        });

        return updatedSetting;
    },

    getSettingHistory: async (key, query) => {
        return auditLogRepository.listByEntity({
            entityType: 'app_settings',
            entityId: key,
            page: query.page,
            pageSize: query.page_size || 20
        });
    }
};

module.exports = settingsService;
