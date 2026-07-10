/**
 * Admin Webhooks Controller
 * 
 * Implemented:
 * - listWebhooks
 * - getWebhookDetail
 * - retryWebhook
 */
const adminWebhooksService = require('./webhooks.service');
const webhookPublisher = require('../../webhook/webhook.publisher');
const { getRequestMeta } = require('../_shared/admin-audit');
const { success, error: errorResponse } = require('../_shared/admin-response');
const { handleAdminError } = require('../_shared/admin-error');

const webhooksController = {
    listWebhooks: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const status = req.query.status;
            const merchantId = req.query.merchant_id;

            const result = await adminWebhooksService.listWebhooks(page, limit, status, merchantId);
            return success(res, result, 'Lấy danh sách webhook thành công');
        } catch (error) {
            return handleAdminError(res, error, 'Lỗi admin listWebhooks');
        }
    },

    getWebhookDetail: async (req, res) => {
        try {
            const { id } = req.params;
            const webhook = await adminWebhooksService.getWebhookDetail(id);
            if (!webhook) {
                return errorResponse(res, 404, 'NOT_FOUND', 'Không tìm thấy webhook');
            }
            return success(res, webhook, 'Lấy chi tiết webhook thành công');
        } catch (error) {
            return handleAdminError(res, error, 'Lỗi admin getWebhookDetail');
        }
    },

    retryWebhook: async (req, res) => {
        try {
            const { id } = req.params;
            const webhook = await adminWebhooksService.getWebhookDetail(id);
            if (!webhook) {
                return errorResponse(res, 404, 'NOT_FOUND', 'Không tìm thấy webhook');
            }

            // Push again to queue
            await webhookPublisher.publish({
                logId: id,
                merchantId: webhook.merchant_id,
                payload: webhook.request_body,
                callbackUrl: webhook.callback_url
            });

            return success(res, null, 'Đã đưa webhook vào hàng đợi retry');
        } catch (error) {
            return handleAdminError(res, error, 'Lỗi admin retryWebhook');
        }
    },
    
    runRetryDueJob: async (req, res) => {
        return success(res, null, 'Job retry due (demo)');
    }
};

module.exports = webhooksController;
