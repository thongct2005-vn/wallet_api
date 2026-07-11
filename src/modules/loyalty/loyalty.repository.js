const pool = require('../../config/db');
const { v7: uuidv7 } = require('uuid');

const loyaltyRepository = {
    // Thêm lô (batch) mới khi nhận Xu
    createBatch: async (client, walletId, amount, ledgerTransactionId, monthsToExpire = 6) => {
        const id = uuidv7();
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + monthsToExpire);
        expiresAt.setDate(0); // Ngày cuối cùng của tháng đó
        expiresAt.setHours(23, 59, 59, 999);

        const query = `
            INSERT INTO loyalty_point_batches (id, wallet_id, initial_amount, remaining_amount, expires_at, ledger_transaction_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const result = await client.query(query, [id, walletId, amount, amount, expiresAt, ledgerTransactionId]);
        return result.rows[0];
    },

    // Trừ Xu theo cơ chế FIFO
    spendPoints: async (client, walletId, amountToSpend) => {
        // Lấy danh sách các batch còn hạn, còn xu, sắp xếp theo hạn sử dụng tăng dần (gần hết hạn dùng trước)
        const query = `
            SELECT id, remaining_amount 
            FROM loyalty_point_batches 
            WHERE wallet_id = $1 
              AND remaining_amount > 0 
              AND expires_at > CURRENT_TIMESTAMP
            ORDER BY expires_at ASC
            FOR UPDATE;
        `;
        const res = await client.query(query, [walletId]);
        const batches = res.rows;

        let remainingToSpend = amountToSpend;
        const deductedBatches = [];

        for (let batch of batches) {
            if (remainingToSpend <= 0) break;

            const deduct = Math.min(batch.remaining_amount, remainingToSpend);
            
            await client.query(`
                UPDATE loyalty_point_batches 
                SET remaining_amount = remaining_amount - $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [deduct, batch.id]);

            deductedBatches.push({ batchId: batch.id, amount: deduct });
            remainingToSpend -= deduct;
        }

        if (remainingToSpend > 0) {
            throw new Error('Not enough unexpired points to spend');
        }

        return deductedBatches;
    },

    // Lấy thông tin tổng quan (tổng xu, xu hôm nay, xu sắp hết hạn)
    getSummary: async (walletId) => {
        // 1. Lấy tổng số Xu (đang có trong ví)
        const balanceQuery = `SELECT loyalty_points FROM wallet_balances WHERE wallet_id = $1`;
        const balanceRes = await pool.query(balanceQuery, [walletId]);
        const totalPoints = balanceRes.rows[0] ? Number(balanceRes.rows[0].loyalty_points) : 0;

        // 2. Lấy số xu nhận hôm nay
        const todayQuery = `
            SELECT COALESCE(SUM(le.amount), 0) as today_points
            FROM ledger_entries le
            JOIN ledger_transactions lt ON le.ledger_transaction_id = lt.id
            WHERE le.wallet_id = $1 
              AND le.entry_type = 'CREDIT' 
              AND lt.currency = 'POINT'
              AND DATE(le.created_at) = CURRENT_DATE
        `;
        const todayRes = await pool.query(todayQuery, [walletId]);
        const todayPoints = Number(todayRes.rows[0].today_points);

        // 3. Lấy số xu sắp hết hạn (trong vòng 30 ngày tới hoặc lô gần nhất sẽ hết hạn)
        // Chúng ta sẽ lấy tổng số Xu của các lô sẽ hết hạn trong khoảng 30 ngày tới.
        const expiringQuery = `
            SELECT COALESCE(SUM(remaining_amount), 0) as expiring_points, MIN(expires_at) as nearest_expiration
            FROM loyalty_point_batches
            WHERE wallet_id = $1 
              AND remaining_amount > 0 
              AND expires_at > CURRENT_TIMESTAMP 
              AND expires_at <= CURRENT_TIMESTAMP + INTERVAL '30 days'
        `;
        const expiringRes = await pool.query(expiringQuery, [walletId]);
        const expiringPoints = Number(expiringRes.rows[0].expiring_points);
        const nearestExpiration = expiringRes.rows[0].nearest_expiration;

        return {
            totalPoints,
            todayPoints,
            expiringPoints,
            nearestExpiration
        };
    },

    // Lấy lịch sử xu
    getHistory: async (walletId, tab = 'EARNED', limit = 20, offset = 0) => {
        let entryTypeFilter = '';
        if (tab === 'EARNED') {
            entryTypeFilter = "AND le.entry_type = 'CREDIT'";
        } else if (tab === 'SPENT') {
            entryTypeFilter = "AND le.entry_type = 'DEBIT' AND lt.transaction_type != 'REVOKE'";
        } else if (tab === 'REVOKED') {
            entryTypeFilter = "AND le.entry_type = 'DEBIT' AND lt.transaction_type = 'REVOKE'";
        }

        const query = `
            SELECT 
                le.id AS entry_id,
                le.ledger_transaction_id AS transaction_id,
                lt.transaction_no,
                lt.transaction_type,
                COALESCE(lt.category_name, lt.transaction_type) AS category_name,
                COALESCE(lt.is_expense_counted, true) AS is_expense_counted,
                le.entry_type,
                le.amount,
                le.balance_before,
                le.balance_after,
                lt.description,
                lt.status,
                lt.currency,
                (SELECT metadata FROM ledger_transactions WHERE id = lt.id) AS metadata,
                le.created_at,
                wt.description AS transfer_note,
                COALESCE(u_sender.full_name, u_payer.full_name, u_rp_creator.full_name) AS sender_name,
                COALESCE(u_sender.phone, u_payer.phone, u_rp_creator.phone) AS sender_phone,
                COALESCE(u_receiver.full_name, m.merchant_name, CASE WHEN gf.id IS NOT NULL THEN 'Bao lì xì' ELSE NULL END) AS receiver_name,
                u_receiver.phone AS receiver_phone,
                COALESCE(dt.external_reference, wt_act.external_reference, wt.transfer_no, po.payment_no) AS external_reference
            FROM ledger_entries le
            JOIN ledger_transactions lt ON le.ledger_transaction_id = lt.id
            LEFT JOIN wallet_transfers wt ON lt.source_type = 'TRANSFER' AND lt.source_id = wt.id
            LEFT JOIN wallets w_sender ON wt.sender_wallet_id = w_sender.id
            LEFT JOIN users u_sender ON w_sender.user_id = u_sender.id
            LEFT JOIN wallets w_receiver ON wt.receiver_wallet_id = w_receiver.id
            LEFT JOIN users u_receiver ON w_receiver.user_id = u_receiver.id
            LEFT JOIN deposit_transactions dt ON lt.source_type = 'DEPOSIT' AND lt.source_id = dt.id
            LEFT JOIN withdrawal_transactions wt_act ON lt.source_type = 'WITHDRAWAL' AND lt.source_id = wt_act.id
            LEFT JOIN payment_transactions pt_pay ON lt.source_type = 'PAYMENT' AND lt.source_id = pt_pay.id
            LEFT JOIN payment_orders po ON pt_pay.payment_order_id = po.id
            LEFT JOIN merchants m ON po.merchant_id = m.id
            LEFT JOIN wallets w_payer ON pt_pay.payer_wallet_id = w_payer.id
            LEFT JOIN users u_payer ON w_payer.user_id = u_payer.id
            LEFT JOIN group_fundings gf ON lt.source_type = 'RED_PACKET' AND lt.transaction_type = 'PAYMENT' AND lt.source_id = gf.id
            LEFT JOIN group_funding_members gfm ON lt.source_type = 'RED_PACKET' AND lt.transaction_type = 'RECEIVE' AND lt.source_id = gfm.id
            LEFT JOIN group_fundings gf2 ON gfm.group_funding_id = gf2.id
            LEFT JOIN users u_rp_creator ON gf2.creator_user_id = u_rp_creator.id
            WHERE le.wallet_id = $1 
              AND lt.currency = 'POINT'
              ${entryTypeFilter}
            ORDER BY le.created_at DESC
            LIMIT $2 OFFSET $3;
        `;
        const res = await pool.query(query, [walletId, limit, offset]);
        return res.rows;
    }
};

module.exports = loyaltyRepository;
