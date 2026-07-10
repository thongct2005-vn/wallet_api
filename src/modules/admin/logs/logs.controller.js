/**
 * Admin Logs Controller
 * 
 * Cần implement:
 * - listAuditLogs
 * - getAuditLogDetail
 * - listSystemLogs
 * - getPaymentTrace
 */
const logsService = require('./logs.service');

const logsController = {
    listAuditLogs: async (req, res) => {
        try {
            const result = await logsService.listAuditLogs(req.query);
            return res.status(200).json({ success: true, data: result });
        } catch (err) {
            console.error("Lỗi listAuditLogs:", err);
            return res.status(500).json({ success: false, message: 'Lỗi lấy Audit Logs', error: err.message });
        }
    },

    getApiLogs: async (req, res) => {
        try {
            const result = await logsService.getApiLogs(req.query);
            return res.status(200).json({ success: true, data: result });
        } catch (err) {
            console.error("Lỗi getApiLogs:", err);
            return res.status(500).json({ success: false, message: 'Lỗi lấy API Logs', error: err.message });
        }
    },

    getSystemLogs: async (req, res) => {
        try {
            const result = await logsService.getSystemLogs(req.query);
            return res.status(200).json({ success: true, data: result });
        } catch (err) {
            console.error("Lỗi getSystemLogs:", err);
            return res.status(500).json({ success: false, message: 'Lỗi lấy System Logs', error: err.message });
        }
    },

    getPaymentTraces: async (req, res) => {
        try {
            const result = await logsService.getPaymentTraces(req.query);
            return res.status(200).json({ success: true, data: result });
        } catch (err) {
            console.error("Lỗi getPaymentTraces:", err);
            return res.status(500).json({ success: false, message: 'Lỗi lấy Payment Traces', error: err.message });
        }
    },

    getWebhookLogs: async (req, res) => {
        try {
            const result = await logsService.getWebhookLogs(req.query);
            return res.status(200).json({ success: true, data: result });
        } catch (err) {
            console.error("Lỗi getWebhookLogs:", err);
            return res.status(500).json({ success: false, message: 'Lỗi lấy Webhook Logs', error: err.message });
        }
    }
};

module.exports = logsController;
