const webhooksRepository = require('./webhooks.repository');

const mapWebhook = (w) => {
    if (!w) return w;
    return {
        ...w,
        id: w._id || w.id,
        url: w.callback_url || w.url,
        retry_count: w.attempt_no || w.retry_count,
        last_attempt_at: w.sent_at || w.last_attempt_at,
        response_status_code: w.http_status || w.response_status_code
    };
};

const adminWebhooksService = {
    listWebhooks: async (page = 1, limit = 20, status, merchantId) => {
        const { items, total } = await webhooksRepository.listWebhooks(page, limit, status, merchantId);

        return {
            items: items.map(mapWebhook),
            total,
            page,
            limit,
            total_pages: Math.ceil(total / limit)
        };
    },

    getWebhookDetail: async (id) => {
        const webhook = await webhooksRepository.getWebhookDetail(id);
        return mapWebhook(webhook);
    }
};

module.exports = adminWebhooksService;
