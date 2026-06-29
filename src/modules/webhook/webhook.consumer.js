const { Worker } = require('bullmq');
const axios = require('axios');
const crypto = require('crypto');
const redisConnection = require('../../config/redis');
const webhookService = require('./webhook.service');
const webhookPublisher = require('./webhook.publisher');

// Fibonacci delay in minutes: 1, 1, 2, 3, 5, 8, 13
const FIBONACCI_DELAYS_MINUTES = [1, 1, 2, 3, 5, 8, 13];

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

        const secret_key = merchantInfo ? merchantInfo.secret_key : null;

        // 2. Prepare request with signature
        const signature = generateSignature(payload, secret_key);
        
        const headers = {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'User-Agent': 'Mio-Webhook-Service/1.0'
        };

        // 3. Send HTTP POST request
        console.log(`\n[WebhookConsumer] MỚI GỬI: Bắt đầu gửi Webhook sang ${targetUrl}...`);
        const response = await axios.post(targetUrl, payload, {
            headers,
            timeout: 10000 // 10 seconds timeout
        });
        
        const duration = Date.now() - startTime;

        // 4. Check if response is successful (Axios throws on 4xx/5xx by default)
        if (response.status >= 200 && response.status < 300) {
            await webhookService.updateLogStatus(logId, 'SUCCESS');
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
            const delayIndex = Math.min(retry_count - 1, FIBONACCI_DELAYS_MINUTES.length - 1);
            const delayMinutes = FIBONACCI_DELAYS_MINUTES[delayIndex];
            const delayMs = delayMinutes * 60 * 1000;

            console.log(`[WebhookConsumer] Rescheduling LogId: ${logId} (Attempt ${retry_count}/${max_retries}) in ${delayMinutes}m`);
            
            // Re-publish the job with delay
            await webhookPublisher.publish({ logId, merchantId, payload }, delayMs);
        } else {
            // Max retries reached
            await webhookService.updateLogStatus(logId, 'FAILED', errorMessage);
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
