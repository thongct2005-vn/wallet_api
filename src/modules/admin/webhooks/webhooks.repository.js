/**
 * Admin Webhooks Repository
 * 
 * Cần implement:
 * - listWebhooks()
 * - findWebhookById()
 * - retryWebhook()
 * - retryDueWebhooks()
 */
const pool = require('../../../config/db');
const { buildPagination } = require('../_shared/admin-pagination');

const webhooksRepository = {
    // TODO: Implement webhook repository queries
};

module.exports = webhooksRepository;
