/**
 * Admin Webhooks Controller
 * 
 * Cần implement:
 * - listWebhooks
 * - getWebhookDetail
 * - retryWebhook
 * - runRetryDueJob
 */
const webhooksService = require('./webhooks.service');
const { getRequestMeta } = require('../_shared/admin-audit');
const { success } = require('../_shared/admin-response');
const { handleAdminError } = require('../_shared/admin-error');

const webhooksController = {
    // TODO: Implement webhook management logic
};

module.exports = webhooksController;
