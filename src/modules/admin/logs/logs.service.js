/**
 * Admin Logs Service
 * 
 * Cần implement:
 * - listAuditLogs
 * - getAuditLogDetail
 * - listSystemLogs
 * - getPaymentTrace
 */
const logsRepository = require('./logs.repository');

const logsService = {
    listAuditLogs: async (query) => {
        return logsRepository.listAuditLogs(query);
    },
    
    getApiLogs: async (query) => {
        return logsRepository.getApiLogs(query);
    },
    
    getSystemLogs: async (query) => {
        return logsRepository.getSystemLogs(query);
    },
    
    getPaymentTraces: async (query) => {
        return logsRepository.getPaymentTraces(query);
    },
    
    getWebhookLogs: async (query) => {
        return logsRepository.getWebhookLogs(query);
    }
};

module.exports = logsService;
