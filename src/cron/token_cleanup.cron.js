const cron = require('node-cron');
const pool = require('../config/db');

// Lập lịch chạy tự động vào lúc 3:00 sáng mỗi ngày (0 3 * * *)
cron.schedule('0 3 * * *', async () => {
    const startTime = new Date().toISOString();
    console.log(`[Cron Job] Bắt đầu dọn dẹp refresh token rác lúc: ${startTime}`);
    
    try {
        const queryText = `
            DELETE FROM refresh_tokens
            WHERE (expires_at < NOW() - INTERVAL '7 days')
               OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '7 days');
        `;
        
        const result = await pool.query(queryText);
        console.log(`[Cron Job] Dọn dẹp hoàn tất. Số lượng token rác đã bị xóa: ${result.rowCount}`);
    } catch (error) {
        console.error(`[Cron Job] Gặp lỗi khi dọn dẹp refresh tokens:`, error);
    }
}, {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh"
});

console.log('[Cron Job] Đã kích hoạt lịch dọn dẹp refresh token tự động (3:00 sáng mỗi ngày).');
