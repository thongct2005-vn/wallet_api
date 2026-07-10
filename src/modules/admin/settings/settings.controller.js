/**
 * Admin Settings Controller
 */
const settingsService = require('./settings.service');
const { getRequestMeta } = require('../_shared/admin-audit');
const { success } = require('../_shared/admin-response');
const { handleAdminError } = require('../_shared/admin-error');

const settingsController = {
    listSettings: async (req, res) => {
        try {
            const settings = await settingsService.listSettings(req.user);
            return success(res, settings, 'Settings retrieved successfully', 200);
        } catch (error) {
            return handleAdminError(req, res, error);
        }
    },

    updateSetting: async (req, res) => {
        try {
            const { key } = req.params;
            const meta = getRequestMeta(req);
            const updated = await settingsService.updateSetting(req.user, key, req.body, meta.ipAddress, meta.userAgent);
            return success(res, updated, 'Setting updated successfully', 200);
        } catch (error) {
            if (error.message === 'Setting_Not_Found') {
                return res.status(404).json({ error: 'Không tìm thấy cài đặt này' });
            }
            return handleAdminError(req, res, error);
        }
    },

    getSettingHistory: async (req, res) => {
        try {
            const { key } = req.params; // If we want to support querying by key in the route, e.g., /history/:key
            // But swagger says /history, so we will look for ?key=... in query
            const settingKey = req.query.key || req.params.key;
            if (!settingKey) {
                return res.status(400).json({ error: 'Thiếu thông số key để tra cứu lịch sử' });
            }
            const history = await settingsService.getSettingHistory(settingKey, req.query);
            return success(res, history, 'History retrieved successfully', 200);
        } catch (error) {
            return handleAdminError(req, res, error);
        }
    }
};

module.exports = settingsController;
