const pool = require('../../config/db');
const SystemLog = require('../system/models/system_log.model');

const webhookService = {
    createLog: async (client, merchantId, transactionId, idempotencyKey, payload) => {
        try {
            // 1. [SAFE] Keep the original SystemLog creation just in case mobile/other services rely on it
            const SystemLog = require('../system/models/system_log.model');
            const oldLog = await SystemLog.create({
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
                    max_retries: 7,
                    last_error: null
                }
            });

            // 2. Lookup payment_order_id from PostgreSQL using transactionId (which is paymentTxId)
            let paymentOrderId = null;
            if (transactionId) {
                const query = `SELECT payment_order_id FROM payment_transactions WHERE id = $1`;
                const result = await client.query(query, [transactionId]);
                if (result.rows.length > 0) {
                    paymentOrderId = result.rows[0].payment_order_id;
                }
            }

            // 3. Create the new WebhookAttemptLog for Admin panel
            const WebhookAttemptLog = require('./models/webhook_attempt_log.model');
            const newLog = await WebhookAttemptLog.create({
                old_pg_callback_id: oldLog._id.toString(), // Link them
                event_id: payload.event_id || `EVT-${Date.now()}`,
                event_type: payload.event_type || 'PAYMENT_SUCCESS',
                merchant_id: merchantId,
                payment_order_id: paymentOrderId || transactionId, // Fallback if lookup fails
                payment_transaction_id: transactionId,
                callback_url: payload.callback_url || '',
                request_body: payload,
                status: 'PENDING',
                attempt_no: 0,
                metadata: {
                    idempotency_key: idempotencyKey
                }
            });

            // We must return newLog ID because webhook.publisher uses it for retry logic!
            return newLog._id.toString();
        } catch (error) {
            console.error('[WebhookLog] Error creating log:', error.message);
            // Lỗi log (MongoDB) không được làm gián đoạn luồng thanh toán chính
            return null;
        }
    },

    updateLogStatus: async (logId, status, lastError = null, httpStatus = null, durationMs = null) => {
        try {
            const WebhookAttemptLog = require('./models/webhook_attempt_log.model');
            const updateData = { status: status, error_message: lastError };
            if (httpStatus !== null) updateData.http_status = httpStatus;
            if (durationMs !== null) updateData.duration_ms = durationMs;

            await WebhookAttemptLog.findByIdAndUpdate(logId, { $set: updateData });
        } catch (error) {
            console.error('[WebhookLog] Error updating log status:', error);
        }
    },

    incrementRetry: async (logId, lastError = null) => {
        try {
            const WebhookAttemptLog = require('./models/webhook_attempt_log.model');
            const updatedLog = await WebhookAttemptLog.findByIdAndUpdate(
                logId,
                {
                    $inc: { attempt_no: 1 },
                    $set: { error_message: lastError }
                },
                { returnDocument: 'after' } 
            );
            return {
                retry_count: updatedLog.attempt_no,
                max_retries: 7
            };
        } catch (error) {
            console.error('[WebhookLog] Error incrementing retry:', error);
            throw error;
        }
    },

    getMerchantSecret: async (merchantId) => {
        const query = `
            SELECT 
                mak.api_key,
                mak.api_secret_hash,
                mcc.default_callback_url as callback_url 
            FROM merchant_callback_configs mcc 
            LEFT JOIN merchant_api_keys mak ON mak.merchant_id = mcc.merchant_id AND mak.status = 'ACTIVE'
            WHERE mcc.merchant_id = $1
            ORDER BY mak.created_at DESC
            LIMIT 1
        `;
        const result = await pool.query(query, [merchantId]);
        return result.rows[0];
    }
};

module.exports = webhookService;
