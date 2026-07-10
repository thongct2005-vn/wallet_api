/**
 * Admin Webhooks Repository
 * 
 * Cần implement:
 * - listWebhooks()
 * - findWebhookById()
 * - retryWebhook()
 * - retryDueWebhooks()
 */
const WebhookAttemptLog = require('../../webhook/models/webhook_attempt_log.model');
const mongoose = require('mongoose');

const webhooksRepository = {
    listWebhooks: async (page = 1, limit = 20, status, merchantId) => {
        const query = {};
        
        if (status) {
            query.status = status;
        }
        
        if (merchantId) {
            query.merchant_id = merchantId;
        }

        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            WebhookAttemptLog.find(query)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            WebhookAttemptLog.countDocuments(query)
        ]);

        return { items, total };
    },

    getWebhookDetail: async (id) => {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return null;
        }
        const webhook = await WebhookAttemptLog.findOne({
            _id: id
        }).lean();
        
        return webhook;
    }
};

module.exports = webhooksRepository;
