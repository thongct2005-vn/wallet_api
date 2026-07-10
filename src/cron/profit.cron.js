const cron = require('node-cron');
const pool = require('../config/db');
const { v7: uuidv7 } = require('uuid');

// Cấu hình chạy lúc 00:00 mỗi ngày
cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Bắt đầu tính lãi kép Túi Thần Tài...');
    await calculateDailyProfit();
});

async function calculateDailyProfit() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Lấy tất cả các Túi Thần Tài đang active kèm theo tổng tiền nạp ngày hôm qua
        // (từ 00:00 ngày hôm qua đến 00:00 ngày hôm nay)
        const query = `
            WITH daily_deposits AS (
                SELECT user_id, SUM(amount) AS sum_deposits
                FROM wealth_bag_transactions
                WHERE transaction_type = 'DEPOSIT'
                  AND created_at >= (CURRENT_DATE - INTERVAL '1 day')
                  AND created_at < CURRENT_DATE
                GROUP BY user_id
            )
            SELECT 
                w.user_id, 
                w.balance, 
                w.total_profit,
                COALESCE(d.sum_deposits, 0) AS sum_deposits,
                GREATEST(0, w.balance - COALESCE(d.sum_deposits, 0)) AS eligible_balance
            FROM user_wealth_bags w
            LEFT JOIN daily_deposits d ON w.user_id = d.user_id
            WHERE w.is_active = true AND w.balance > 0
        `;
        const { rows: eligibleBags } = await client.query(query);

        let totalUsersProcessed = 0;
        let totalProfitGiven = 0;

        // 2. Xử lý tính lãi cho từng người dùng
        for (const bag of eligibleBags) {
            const eligibleBalance = parseFloat(bag.eligible_balance);
            if (eligibleBalance <= 0) continue;

            // Tính lãi: (Số dư hợp lệ * 4%) / 365
            // Làm tròn đến số nguyên gần nhất (tránh mất tiền lẻ, giống quy tắc ngân hàng)
            const profitAmount = Math.round((eligibleBalance * 0.04) / 365);
            
            if (profitAmount > 0) {
                const currentBalance = parseFloat(bag.balance);
                const newBalance = currentBalance + profitAmount;
                const newTotalProfit = parseFloat(bag.total_profit) + profitAmount;

                // Cập nhật số dư và tổng lời
                await client.query(`
                    UPDATE user_wealth_bags 
                    SET balance = $1, 
                        total_profit = $2,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = $3
                `, [newBalance, newTotalProfit, bag.user_id]);

                // Sinh lịch sử giao dịch nhận tiền lời
                const txId = uuidv7();
                await client.query(`
                    INSERT INTO wealth_bag_transactions 
                    (id, user_id, transaction_type, amount, balance_after, description) 
                    VALUES ($1, $2, 'PROFIT', $3, $4, 'Tiền lời Túi Thần Tài')
                `, [txId, bag.user_id, profitAmount, newBalance]);

                totalUsersProcessed++;
                totalProfitGiven += profitAmount;
            }
        }

        await client.query('COMMIT');
        console.log(`[CRON] Hoàn tất tính lãi! Đã cộng lãi cho ${totalUsersProcessed} user(s). Tổng tiền lời sinh ra: ${totalProfitGiven}đ.`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[CRON] Lỗi khi tính lãi kép Túi Thần Tài:', error);
    } finally {
        client.release();
    }
}

module.exports = { calculateDailyProfit };
