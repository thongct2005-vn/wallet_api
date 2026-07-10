const pool = require('../../config/db');
const { v7: uuidv7 } = require('uuid');

const wealthBagRepository = {
    getWealthBagStatus: async (userId) => {
        const query = 'SELECT * FROM user_wealth_bags WHERE user_id = $1';
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    },

    activateWealthBag: async (userId) => {
        const query = `
            INSERT INTO user_wealth_bags (user_id, balance, total_profit, is_active)
            VALUES ($1, 0, 0, true)
            ON CONFLICT (user_id) 
            DO UPDATE SET is_active = true, updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        `;
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    },

    depositToWealthBag: async (userId, amount, source) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            if (source === 'wallet') {
                const walletQuery = 'SELECT id FROM wallets WHERE user_id = $1';
                const walletRes = await client.query(walletQuery, [userId]);
                if (walletRes.rows.length === 0) {
                    throw new Error('Wallet_Not_Found');
                }
                const walletId = walletRes.rows[0].id;

                const balanceQuery = 'SELECT available_balance FROM wallet_balances WHERE wallet_id = $1 FOR UPDATE';
                const balanceRes = await client.query(balanceQuery, [walletId]);
                
                if (balanceRes.rows.length === 0 || parseFloat(balanceRes.rows[0].available_balance) < parseFloat(amount)) {
                    throw new Error('Insufficient_Balance');
                }

                await client.query(
                    'UPDATE wallet_balances SET available_balance = available_balance - $1 WHERE wallet_id = $2',
                    [amount, walletId]
                );
            }

            const updateBagQuery = `
                UPDATE user_wealth_bags 
                SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $2 
                RETURNING *
            `;
            const bagRes = await client.query(updateBagQuery, [amount, userId]);
            
            if (bagRes.rows.length === 0) {
                throw new Error('Wealth_Bag_Not_Active');
            }

            const updatedBag = bagRes.rows[0];
            const newId = uuidv7();
            await client.query(
                `INSERT INTO wealth_bag_transactions (id, user_id, transaction_type, amount, balance_after, description) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [newId, userId, 'DEPOSIT', amount, updatedBag.balance, 'Nạp tiền']
            );

            await client.query('COMMIT');
            return updatedBag;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    withdrawFromWealthBag: async (userId, amount, destination) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const checkBagQuery = 'SELECT balance FROM user_wealth_bags WHERE user_id = $1 FOR UPDATE';
            const bagRes = await client.query(checkBagQuery, [userId]);
            
            if (bagRes.rows.length === 0) {
                throw new Error('Wealth_Bag_Not_Active');
            }
            if (parseFloat(bagRes.rows[0].balance) < parseFloat(amount)) {
                throw new Error('Insufficient_Wealth_Bag_Balance');
            }

            const updateBagQuery = `
                UPDATE user_wealth_bags 
                SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $2 
                RETURNING *
            `;
            const updatedBag = await client.query(updateBagQuery, [amount, userId]);
            const bag = updatedBag.rows[0];

            const newId = uuidv7();
            await client.query(
                `INSERT INTO wealth_bag_transactions (id, user_id, transaction_type, amount, balance_after, description) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [newId, userId, 'WITHDRAW', amount, bag.balance, destination === 'wallet' ? 'Rút tiền về Ví Mio' : 'Rút tiền về Ngân hàng']
            );

            if (destination === 'wallet') {
                const walletQuery = 'SELECT id FROM wallets WHERE user_id = $1';
                const walletRes = await client.query(walletQuery, [userId]);
                if (walletRes.rows.length === 0) {
                    throw new Error('Wallet_Not_Found');
                }
                const walletId = walletRes.rows[0].id;

                await client.query(
                    'UPDATE wallet_balances SET available_balance = available_balance + $1 WHERE wallet_id = $2',
                    [amount, walletId]
                );
            }

            await client.query('COMMIT');
            return bag;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    getWealthBagHistory: async (userId, filters = {}) => {
        let query = 'SELECT * FROM wealth_bag_transactions WHERE user_id = $1';
        const params = [userId];
        
        if (filters.type && filters.type !== 'ALL') {
            query += ' AND transaction_type = $2';
            params.push(filters.type);
        }
        
        query += ' ORDER BY created_at DESC LIMIT 50';
        
        const result = await pool.query(query, params);
        return result.rows;
    },
};

module.exports = wealthBagRepository;
