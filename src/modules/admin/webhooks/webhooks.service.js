/**
 * Admin Webhooks Service
 * 
 * Cần implement:
 * - listWebhooks
 * - getWebhookDetail
 * - retryWebhook
 * - runRetryDueJob
 */
const webhooksRepository = require('./webhooks.repository');
const { ensureWriteAccess } = require('../_shared/admin-permission');
const { ensureUuid } = require('../_shared/admin-validator');

const webhooksService = {
    // TODO: Implement webhook service logic
};

module.exports = webhooksService;
