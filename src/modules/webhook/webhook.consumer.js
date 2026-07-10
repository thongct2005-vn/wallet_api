const { Worker } = require('bullmq');
const axios = require('axios');
const crypto = require('crypto');
const redisConnection = require('../../config/redis');
const webhookService = require('./webhook.service');
const webhookPublisher = require('./webhook.publisher');
const { decryptApiSecret } = require('../../shared/utils/api-secret.util');

// Delay in minutes: 1, 3, 5, 7, 9, 11, 13 (Số lẻ theo đúng kịch bản báo cáo)
const RETRY_DELAYS_MINUTES = [1, 3, 5, 7, 9, 11, 13];

/**
 * Generate HMAC SHA256 signature for the payload
 */
const generateSignature = (payload, secretKey) => {
    if (!secretKey) return '';
    return crypto
        .createHmac('sha256', secretKey)
        .update(JSON.stringify(payload))
        .digest('hex');
};

const processWebhookJob = async (job) => {
    const { logId, merchantId, payload, callbackUrl } = job.data;
    const startTime = Date.now();
    try {
        // 1. Get merchant callback info and secret key
        const merchantInfo = await webhookService.getMerchantSecret(merchantId);
        
        const targetUrl = callbackUrl || (merchantInfo ? merchantInfo.callback_url : null);

        if (!targetUrl) {
            throw new Error('Merchant callback_url not found (both dynamic and global)');
        }

        let secret_key = null;
        const apiKey = merchantInfo?.api_key || 'UNKNOWN';
        
        if (merchantInfo && merchantInfo.api_secret_hash) {
            secret_key = decryptApiSecret(merchantInfo.api_secret_hash) || merchantInfo.api_secret_hash;
            if (!secret_key) {
                throw new Error('Khong the decrypt api_secret_hash. Vui long revoke va tao API Key moi.');
            }
        } else {
            throw new Error('Khong tim thay ACTIVE API Key de lay webhook secret.');
        }

        // 2. Prepare request with signature
        const signature = generateSignature(payload, secret_key);
        
        const headers = {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Vio-Signature': signature,
            'User-Agent': 'Mio-Webhook-Service/1.0'
        };

        // 3. Send HTTP POST request
        console.log(`\n[WebhookConsumer] MỚI GỬI: Bắt đầu gửi Webhook sang ${targetUrl}...`);
        console.log(`- Merchant ID: ${merchantId}`);
        console.log(`- API Key được chọn: ${apiKey}`);
        console.log(`- Decrypt Secret: ${secret_key ? 'Thành công (' + secret_key.substring(0, 8) + '...)' : 'Thất bại'}`);
        console.log(`- Generated Signature: ${signature}`);
        console.log(`- Callback URL: ${targetUrl}`);
        
        const response = await axios.post(targetUrl, payload, {
            headers,
            timeout: 10000 // 10 seconds timeout
        });
        
        const duration = Date.now() - startTime;

        // 4. Check if response is successful (Axios throws on 4xx/5xx by default)
        if (response.status >= 200 && response.status < 300) {
            await webhookService.updateLogStatus(logId, 'SUCCESS', null, response.status, duration);
            console.log(`- Webhook Response Status: ${response.status}`);
            console.log(`[WebhookConsumer] THÀNH CÔNG: Đã nhận phản hồi từ Cửa hàng chỉ trong ${duration}ms. LogId: ${logId}\n`);
            return true;
        } else {
            throw new Error(`Unexpected HTTP Status: ${response.status}`);
        }

    } catch (error) {
        const duration = Date.now() - startTime;
        // Handle failure and retry logic
        const errorMessage = error.response 
            ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}` 
            : error.message;
            
        console.error(`[WebhookConsumer] THẤT BẠI: Quá trình gửi tốn hết ${duration}ms rồi báo lỗi. LogId: ${logId}. Lỗi: ${errorMessage}`);

        // Increment retry count in DB
        const { retry_count, max_retries } = await webhookService.incrementRetry(logId, errorMessage);

        if (retry_count <= max_retries) {
            // Determine delay for the next attempt based on Fibonacci sequence
            // retry_count 1 means first retry (index 0 of array)
            const delayIndex = Math.min(retry_count - 1, RETRY_DELAYS_MINUTES.length - 1);
            const delayMinutes = RETRY_DELAYS_MINUTES[delayIndex];
            const delayMs = delayMinutes * 60 * 1000;

            console.log(`[WebhookConsumer] Rescheduling LogId: ${logId} (Attempt ${retry_count}/${max_retries}) in ${delayMinutes}m`);
            
            // Re-publish the job with delay
            await webhookPublisher.publish({ logId, merchantId, payload }, delayMs);
        } else {
            // Max retries reached
            const httpStatus = error.response ? error.response.status : null;
            await webhookService.updateLogStatus(logId, 'FAILED', errorMessage, httpStatus, duration);
            console.log(`[WebhookConsumer] Max retries reached for LogId: ${logId}. Marked as FAILED.`);
        }
    }
};

// Create the worker
const webhookWorker = new Worker('webhookQueue', processWebhookJob, { 
    connection: redisConnection,
    concurrency: 5 // Process 5 webhooks concurrently
});

webhookWorker.on('failed', (job, err) => {
    console.error(`[WebhookConsumer] Job failed unexpectedly (Job ID: ${job.id}):`, err);
});

webhookWorker.on('error', (err) => {
    // Chặn spam unhandled error khi Redis tắt
});

console.log('[WebhookConsumer] Worker started, listening to webhookQueue...');

module.exports = webhookWorker;
