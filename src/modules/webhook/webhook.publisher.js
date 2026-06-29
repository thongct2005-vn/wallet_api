const { Queue } = require('bullmq');
const redisConnection = require('../../config/redis');

// Create the webhook queue
const webhookQueue = new Queue('webhookQueue', { connection: redisConnection });

webhookQueue.on('error', (err) => {
    // Chặn spam unhandled error khi Redis tắt
});

const webhookPublisher = {
    /**
     * Publish a webhook event to the queue.
     * @param {Object} data 
     * @param {number} data.logId - ID of the webhook_logs record
     * @param {number} data.merchantId
     * @param {Object} data.payload - Data to be sent to merchant
     * @param {number} [delay=0] - Delay in milliseconds before processing
     */
    publish: async (data, delay = 0) => {
        try {
            await webhookQueue.add('sendWebhook', data, {
                delay,
                attempts: 1, // We will handle our own retry logic with Fibonacci backoff
                removeOnComplete: true,
                removeOnFail: false,
                jobId: `webhook_${data.logId}_${Date.now()}`
            });
            console.log(`[WebhookPublisher] Job queued for logId: ${data.logId} with delay: ${delay}ms`);
        } catch (error) {
            console.error('[WebhookPublisher] Error publishing webhook job:', error);
            // Here you might want to alert monitoring systems or update log status
        }
    }
};

module.exports = webhookPublisher;
