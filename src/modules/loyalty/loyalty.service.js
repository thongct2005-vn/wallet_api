const loyaltyRepository = require('./loyalty.repository');
const transactionRepository = require('../transaction/transaction.repository');
const pool = require('../../config/db');
const { v7: uuidv7 } = require('uuid');

const loyaltyService = {
    getSummary: async (walletId) => {
        return await loyaltyRepository.getSummary(walletId);
    },

    getHistory: async (walletId, tab, page = 1, limit = 20) => {
        const offset = (page - 1) * limit;
        const history = await loyaltyRepository.getHistory(walletId, tab, limit, offset);
        
        // Group by month/year
        const groupedHistory = {};
        for (let item of history) {
            const date = new Date(item.created_at);
            const monthYear = `Tháng ${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
            
            if (!groupedHistory[monthYear]) {
                groupedHistory[monthYear] = [];
            }
            
            let ref = item.transaction_no || item.external_reference;
            if (!ref && item.transaction_id) {
                const hex = item.transaction_id.replace(/-/g, '').substring(0, 10);
                ref = BigInt('0x' + hex).toString().padStart(12, '0').slice(0, 12);
            }

            groupedHistory[monthYear].push({
                ...item,
                external_reference: ref,
                // Make positive/negative explicit
                display_amount: (item.entry_type === 'CREDIT' ? '+' : '-') + item.amount + ' Xu'
            });
        }
        
        // Convert to array format for Flutter
        const resultList = Object.keys(groupedHistory).map(key => ({
            month: key,
            items: groupedHistory[key]
        }));
        
        return resultList;
    },

    getCheckinStatus: async (userId) => {
        const res = await pool.query('SELECT * FROM user_checkins WHERE user_id = $1', [userId]);
        if (res.rows.length === 0) {
            return { currentStreak: 0, checkedInToday: false };
        }
        
        const row = res.rows[0];
        const lastCheckinDate = new Date(row.last_checkin_date);
        
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        
        const isToday = lastCheckinDate.toDateString() === today.toDateString();
        const isYesterday = lastCheckinDate.toDateString() === yesterday.toDateString();
        
        if (isToday) {
            return { currentStreak: row.current_streak, checkedInToday: true };
        } else if (isYesterday) {
            return { currentStreak: row.current_streak, checkedInToday: false };
        } else {
            // Missed a day
            return { currentStreak: 0, checkedInToday: false };
        }
    },

    checkin: async (userId, walletId) => {
        const status = await loyaltyService.getCheckinStatus(userId);
        if (status.checkedInToday) {
            throw new Error('Bạn đã điểm danh hôm nay rồi!');
        }

        // Calculate new streak
        let newStreak = status.currentStreak + 1;
        if (newStreak > 7) newStreak = 1;

        // Calculate points
        let rewardPoints = 50;
        let isGift = false;
        
        if (newStreak === 3 || newStreak === 5 || newStreak === 7) {
            // Random 50 - 200
            rewardPoints = Math.floor(Math.random() * (200 - 50 + 1)) + 50;
            isGift = true;
        }

        let client;
        try {
            client = await pool.connect();
            await client.query('BEGIN');

            // Upsert checkin record
            await client.query(`
                INSERT INTO user_checkins (user_id, last_checkin_date, current_streak) 
                VALUES ($1, CURRENT_DATE, $2)
                ON CONFLICT (user_id) DO UPDATE 
                SET last_checkin_date = CURRENT_DATE, 
                    current_streak = $2, 
                    updated_at = CURRENT_TIMESTAMP
            `, [userId, newStreak]);

            // Add points
            const walletRes = await client.query('SELECT loyalty_points FROM wallet_balances WHERE wallet_id = $1 FOR UPDATE', [walletId]);
            const pointsBefore = BigInt(Math.floor(Number(walletRes.rows[0].loyalty_points || 0)));
            const pointsAfter = pointsBefore + BigInt(rewardPoints);

            await client.query('UPDATE wallet_balances SET loyalty_points = loyalty_points + $1 WHERE wallet_id = $2', [rewardPoints, walletId]);

            // Ledger
            const ledgerTxId = await transactionRepository.createLedgerTransaction(
                client, 
                'LOYALTY_EARN', 
                null, 
                'CHECKIN', 
                'Điểm danh mỗi ngày', 
                rewardPoints,
                'POINT'
            );

            await transactionRepository.createLedgerEntry(
                client,
                ledgerTxId,
                walletId,
                'CREDIT',
                rewardPoints,
                pointsBefore,
                pointsAfter
            );

            // Add to batches (expire in 6 months)
            await loyaltyRepository.createBatch(client, walletId, rewardPoints, ledgerTxId, 6);

            await client.query('COMMIT');
            
            return {
                newStreak,
                rewardPoints,
                isGift
            };
        } catch (error) {
            if (client) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (client) client.release();
        }
    }
};

module.exports = loyaltyService;
