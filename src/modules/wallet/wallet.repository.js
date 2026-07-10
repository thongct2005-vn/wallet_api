
const pool = require('../../config/db');
const { v7: uuidv7 } = require('uuid');

const walletRepository = {
    
    create: async (client, userId, walletNo) => {
        const newId = uuidv7();
        const query = `INSERT INTO wallets (id, user_id, wallet_no) VALUES ($1, $2, $3)`;
        await client.query(query, [newId, userId, walletNo]);
        return newId;
    },

    findByUserId: async (userId) => {
        
        const query = `SELECT id FROM wallets WHERE user_id = $1`;
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    },

    getBalanceByUserId: async (userId) => {
        const query = `
            SELECT 
                COALESCE(w.wallet_code, u.phone) AS wallet_code, 
                w.currency, 
                w.status, 
                wb.available_balance, 
                wb.locked_balance,
                wb.loyalty_points,
                u.phone,
                u.pin_hash
            FROM wallets w
            LEFT JOIN wallet_balances wb ON w.id = wb.wallet_id
            LEFT JOIN users u ON w.user_id = u.id
            WHERE w.user_id = $1
        `;
        
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    },

    updatePinHash: async (userId, pinHash) => {
        const query = `
            UPDATE users 
            SET pin_hash = $1 
            WHERE id = $2 
            RETURNING pin_hash;
        `;
        const result = await pool.query(query, [pinHash, userId]);
        return result.rows[0];
    },

    updateWalletCode: async (userId, walletCode) => {
        const query = `
            UPDATE wallets 
            SET wallet_code = $1 
            WHERE user_id = $2 
            RETURNING wallet_code;
        `;
        const result = await pool.query(query, [walletCode, userId]);
        return result.rows[0]; 
    },

    updateBalanceWithClient: async (client, walletId, availableBalanceDiff, lockedBalanceDiff = 0n) => {
        const query = `
            UPDATE wallets 
            SET available_balance = available_balance + $2,
                locked_balance = locked_balance + $3,
                balance_updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        const result = await client.query(query, [walletId, availableBalanceDiff, lockedBalanceDiff]);
        return result.rows[0];
    },

    findByIdForUpdate: async (client, walletId) => {
        const query = `
            SELECT * FROM wallets
            WHERE id = $1
            FOR UPDATE
        `;
        const result = await client.query(query, [walletId]);
        return result.rows[0];
    },


    getUserInfoForQR: async (userId) => {
        const query = `SELECT full_name, phone FROM users WHERE id = $1`;
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    },

    getLinkedBanks: async (walletId) => {
        const query = `
            SELECT id, bank_name, bank_code, card_number, card_holder_name, status, created_at
            FROM wallet_linked_banks
            WHERE wallet_id = $1 AND status = 'ACTIVE'
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query, [walletId]);
        return result.rows;
    },

    linkBank: async (walletId, bankName, bankCode, cardNumber, cardHolderName) => {
        const newId = uuidv7();
        const query = `
            INSERT INTO wallet_linked_banks (id, wallet_id, bank_name, bank_code, card_number, card_holder_name, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
            RETURNING id, bank_name, bank_code, card_number, card_holder_name, status
        `;
        const result = await pool.query(query, [newId, walletId, bankName, bankCode, cardNumber, cardHolderName]);
        return result.rows[0];
    },

    getLimitsAndUsage: async (walletId) => {
        let limitsRes = await pool.query('SELECT * FROM wallet_limits WHERE wallet_id = $1', [walletId]);
        if (limitsRes.rows.length === 0) {
            limitsRes = await pool.query(`
                INSERT INTO wallet_limits (wallet_id) VALUES ($1) RETURNING *
            `, [walletId]);
        }
        const limits = limitsRes.rows[0];

        const dailyDepositRes = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM deposit_transactions 
            WHERE wallet_id = $1 AND status = 'SUCCESS' AND created_at >= CURRENT_DATE
        `, [walletId]);
        const dailyDepositUsage = BigInt(dailyDepositRes.rows[0].total);

        const dailyWithdrawalRes = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM withdrawal_transactions 
            WHERE wallet_id = $1 AND status = 'SUCCESS' AND created_at >= CURRENT_DATE
        `, [walletId]);
        const dailyWithdrawalUsage = BigInt(dailyWithdrawalRes.rows[0].total);

        const calcTxUsage = async (dateCondition) => {
            const transferRes = await pool.query(`
                SELECT COALESCE(SUM(amount), 0) as total 
                FROM wallet_transfers 
                WHERE sender_wallet_id = $1 AND status = 'SUCCESS' AND ${dateCondition}
            `, [walletId]);
            const paymentRes = await pool.query(`
                SELECT COALESCE(SUM(amount), 0) as total 
                FROM payment_transactions 
                WHERE payer_wallet_id = $1 AND status = 'SUCCESS' AND ${dateCondition}
            `, [walletId]);
            return BigInt(transferRes.rows[0].total) + BigInt(paymentRes.rows[0].total);
        };

        const dailyTransactionUsage = await calcTxUsage('created_at >= CURRENT_DATE');
        const monthlyTransactionUsage = await calcTxUsage("created_at >= date_trunc('month', CURRENT_DATE)");

        // Calculate Special Services (Topup + Lucky Money)
        const topupRes = await pool.query(`
            SELECT COALESCE(SUM(pt.amount), 0) as total
            FROM payment_transactions pt
            JOIN payment_orders po ON pt.payment_order_id = po.id
            WHERE pt.payer_wallet_id = $1 AND pt.status = 'SUCCESS' 
              AND pt.created_at >= date_trunc('month', CURRENT_DATE)
              AND (po.description ILIKE '%nạp tiền điện thoại%' 
                   OR po.description ILIKE '%mã thẻ%' 
                   OR po.description ILIKE '%nạp gói data%')
        `, [walletId]);
        
        const luckyMoneyRes = await pool.query(`
            SELECT COALESCE(SUM(lt.amount), 0) as total
            FROM ledger_transactions lt
            JOIN ledger_entries le ON lt.id = le.ledger_transaction_id
            WHERE le.wallet_id = $1 AND le.entry_type = 'DEBIT' 
              AND lt.source_type = 'RED_PACKET' AND lt.status = 'SUCCESS'
              AND lt.completed_at >= date_trunc('month', CURRENT_DATE)
        `, [walletId]);
        
        const monthlySpecialUsage = BigInt(topupRes.rows[0].total) + BigInt(luckyMoneyRes.rows[0].total);

        return {
            limits: {
                daily_deposit_limit: limits.daily_deposit_limit.toString(),
                daily_withdrawal_limit: limits.daily_withdrawal_limit.toString(),
                daily_transaction_limit: limits.daily_transaction_limit.toString(),
                monthly_transaction_limit: limits.monthly_transaction_limit.toString(),
                monthly_special_service_limit: limits.monthly_special_service_limit.toString(),
            },
            usage: {
                daily_deposit_usage: dailyDepositUsage.toString(),
                daily_withdrawal_usage: dailyWithdrawalUsage.toString(),
                daily_transaction_usage: dailyTransactionUsage.toString(),
                monthly_transaction_usage: monthlyTransactionUsage.toString(),
                monthly_special_service_usage: monthlySpecialUsage.toString()
            }
        };
    }
};

module.exports = walletRepository;