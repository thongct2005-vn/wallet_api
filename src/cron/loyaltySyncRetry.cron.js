const cron = require('node-cron');
const LoyaltyIntegrationService = require('../modules/payment/LoyaltyIntegrationService');

// Chạy cronjob mỗi 5 phút một lần: '*/5 * * * *'
cron.schedule('*/5 * * * *', async () => {
    console.log('[CRONJOB] Bắt đầu quét các bản ghi Loyalty FAILED để đồng bộ lại...');
    try {
        await LoyaltyIntegrationService.retryFailedSyncs();
        console.log('[CRONJOB] Quét và gọi lại Loyalty FAILED hoàn tất.');
    } catch (error) {
        console.error('[CRONJOB_ERROR] Lỗi khi retry Loyalty sync:', error.message);
    }
});

console.log('[CRONJOB_INIT] Đã khởi tạo Cronjob Retry Loyalty Sync (5 phút/lần).');
