const pool = require('../../config/db');
const SystemLog = require('../system/models/system_log.model');

const webhookService = {
    createLog: async (client, merchantId, transactionId, idempotencyKey, payload) => {
        try {
            const newLog = await SystemLog.create({
                service_name: 'WebhookService',
                log_level: 'INFO',
                message: 'Webhook dispatched',
                metadata: {
                    merchant_id: merchantId,
                    transaction_id: transactionId,
                    idempotency_key: idempotencyKey,
                    payload: payload,
                    status: 'PENDING',
                    retry_count: 0,
                    max_retries: 5,
                    last_error: null
                }
            });
            return newLog._id.toString();
        } catch (error) {
            console.error('[WebhookLog] Error creating log:', error);
            throw error;
        }
    },

    updateLogStatus: async (logId, status, lastError = null) => {
        try {
            await SystemLog.findByIdAndUpdate(logId, {
                $set: {
                    'metadata.status': status,
                    'metadata.last_error': lastError
                }
            });
        } catch (error) {
            console.error('[WebhookLog] Error updating log status:', error);
        }
    },

    incrementRetry: async (logId, lastError = null) => {
        try {
            const updatedLog = await SystemLog.findByIdAndUpdate(
                logId,
                {
                    $inc: { 'metadata.retry_count': 1 },
                    $set: { 'metadata.last_error': lastError }
                },
                { returnDocument: 'after' } 
            );
            return {
                retry_count: updatedLog.metadata.retry_count,
                max_retries: updatedLog.metadata.max_retries
            };
        } catch (error) {
            console.error('[WebhookLog] Error incrementing retry:', error);
            throw error;
        }
    },

    getMerchantSecret: async (merchantId) => {
        const query = `
            SELECT mcc.webhook_secret_hash as secret_key, mcc.default_callback_url as callback_url 
            FROM merchant_callback_configs mcc 
            WHERE mcc.merchant_id = $1
        `;
        const result = await pool.query(query, [merchantId]);
        return result.rows[0];
    }
};

module.exports = webhookService;
