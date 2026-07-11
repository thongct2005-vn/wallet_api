const pool = require('../../config/db');
const { v7: uuidv7 } = require('uuid');

const transactionRepository = {
    getWalletByUserId: async (userId) => {
        const query = `
            SELECT w.id, w.user_id, u.is_kyc_verified, u.full_name, u.phone
            FROM wallets w
            JOIN users u ON w.user_id = u.id
            WHERE w.user_id = $1
        `;
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    },

    getWalletByIdentifier: async (identifier) => {
        const query = `
            SELECT w.id, w.user_id, u.is_kyc_verified, u.full_name
            FROM wallets w
            JOIN users u ON w.user_id = u.id
            WHERE u.phone = $1 OR u.email = $1 OR w.wallet_code = $1
        `;
        const result = await pool.query(query, [identifier]);
        return result.rows[0];
    },

    lockAndGetBalance: async (client, walletId) => {
        await client.query(`
            INSERT INTO wallet_balances (wallet_id, available_balance, locked_balance)
            VALUES ($1, 0, 0)
            ON CONFLICT (wallet_id) DO NOTHING;
        `, [walletId]);

        const query = `
            SELECT available_balance 
            FROM wallet_balances 
            WHERE wallet_id = $1 
            FOR UPDATE;
        `;
        const result = await client.query(query, [walletId]);
        return BigInt(result.rows[0].available_balance); 
    },

    addBalance: async (client, walletId, amount) => {
        const query = `
            UPDATE wallet_balances 
            SET available_balance = available_balance + $1, updated_at = CURRENT_TIMESTAMP
            WHERE wallet_id = $2
            RETURNING available_balance;
        `;
        const result = await client.query(query, [amount.toString(), walletId]);
        return BigInt(result.rows[0].available_balance);
    },

    lockAndGetMerchantBalance: async (client, merchantId) => {
        const query = `
            SELECT available_balance 
            FROM merchant_balances 
            WHERE merchant_id = $1 
            FOR UPDATE;
        `;
        const result = await client.query(query, [merchantId]);
        if (result.rows.length === 0) {
            throw new Error(`Khong tim thay vi doanh nghiep cho merchant ${merchantId}`);
        }
        return BigInt(result.rows[0].available_balance); 
    },

    addMerchantBalance: async (client, merchantId, amount) => {
        const query = `
            UPDATE merchant_balances 
            SET available_balance = available_balance + $1, updated_at = CURRENT_TIMESTAMP
            WHERE merchant_id = $2
            RETURNING available_balance;
        `;
        const result = await client.query(query, [amount.toString(), merchantId]);
        return BigInt(result.rows[0].available_balance);
    },

    subtractBalance: async (client, walletId, amount) => {
        const query = `
            UPDATE wallet_balances 
            SET available_balance = available_balance - $1, updated_at = CURRENT_TIMESTAMP
            WHERE wallet_id = $2
            RETURNING available_balance;
        `;
        const result = await client.query(query, [amount.toString(), walletId]);
        return BigInt(result.rows[0].available_balance);
    },

    createLedgerTransaction: async (client, type, sourceId, sourceType, description, amount, currency = 'VND', metadata = null, idempotencyKey = null) => {
        const newId = uuidv7();
        const query = `
            INSERT INTO ledger_transactions (id, transaction_no, transaction_type, source_id, source_type, status, description, amount, currency, completed_at, metadata, idempotency_key)
            VALUES ($1, nextval('transaction_ref_seq')::text, $2, $3, $4, 'SUCCESS', $5, $6, $7, CURRENT_TIMESTAMP, $8, $9) RETURNING id, transaction_no;
        `;
        const result = await client.query(query, [newId, type, sourceId, sourceType, description, amount.toString(), currency, metadata, idempotencyKey]);
        return result.rows[0].id;
    },

    createFailedLedgerTransaction: async (type, description, amount, createdBy = null) => {
        const newId = uuidv7();
        const query = `
            INSERT INTO ledger_transactions (id, transaction_no, transaction_type, status, description, amount, created_by, completed_at)
            VALUES ($1, nextval('transaction_ref_seq')::text, $2, 'FAILED', $3, $4, $5, CURRENT_TIMESTAMP) RETURNING id, transaction_no;
        `;
        const result = await pool.query(query, [newId, type, description, amount.toString(), createdBy]);
        return result.rows[0].id;
    },

    createLedgerEntry: async (client, ledgerTransactionId, accountId, type, amount, balanceBefore, balanceAfter, accountType = 'PERSONAL') => {
        const newId = uuidv7();
        let query, params;
        const mappedAccountType = accountType === 'PERSONAL' ? 'USER_WALLET' : accountType;
        
        if (mappedAccountType === 'MERCHANT' || mappedAccountType === 'MERCHANT_BALANCE') {
            query = `
                INSERT INTO ledger_entries (id, ledger_transaction_id, merchant_id, entry_type, amount, balance_before, balance_after, account_type)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
            `;
        } else {
            query = `
                INSERT INTO ledger_entries (id, ledger_transaction_id, wallet_id, entry_type, amount, balance_before, balance_after, account_type)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
            `;
        }
        
        params = [newId, ledgerTransactionId, accountId, type, amount.toString(), balanceBefore.toString(), balanceAfter.toString(), mappedAccountType];
        await client.query(query, params);
        return newId;
    },

    createSystemLedgerEntry: async (client, ledgerTransactionId, systemAccountCode, type, amount) => {
        const newId = uuidv7();
        const query = `
            INSERT INTO ledger_entries (id, ledger_transaction_id, system_account_code, entry_type, amount, balance_before, balance_after, account_type)
            VALUES ($1, $2, $3, $4, $5, 0, 0, 'SYSTEM');
        `;
        await client.query(query, [newId, ledgerTransactionId, systemAccountCode, type, amount.toString()]);
        return newId;
    },

    recordDeposit: async (client, id, depositNo, userId, walletId, amount, ledgerId, depositMethod = 'LINKED_BANK', externalReference = null, idempotencyKey = null) => {
        idempotencyKey = idempotencyKey || id; // Fallback idempotency key
        const query = `
            INSERT INTO deposit_transactions (id, deposit_no, user_id, wallet_id, amount, deposit_method, status, external_reference, idempotency_key)
            VALUES ($1, $2, $3, $4, $5, $6, 'SUCCESS', $7, $8);
        `;
        await client.query(query, [id, depositNo, userId, walletId, amount.toString(), depositMethod, externalReference, idempotencyKey]);
        return id;
    },

    recordWithdrawal: async (client, id, withdrawalNo, userId, walletId, amount, ledgerId, linkedBankId, externalReference = null) => {
        const idempotencyKey = id;
        const query = `
            INSERT INTO withdrawal_transactions (id, withdrawal_no, user_id, wallet_id, amount, withdrawal_method, status, linked_bank_id, external_reference, idempotency_key)
            VALUES ($1, $2, $3, $4, $5, 'LINKED_BANK', 'SUCCESS', $6, $7, $8);
        `;
        await client.query(query, [id, withdrawalNo, userId, walletId, amount.toString(), linkedBankId, externalReference, idempotencyKey]);
        return id;
    },

    recordBankTransfer: async (client, id, withdrawalNo, userId, walletId, amount, ledgerId, bankCode, accountNumber, externalReference = null) => {
        const idempotencyKey = id;
        const query = `
            INSERT INTO withdrawal_transactions (id, withdrawal_no, user_id, wallet_id, amount, withdrawal_method, status, bank_code, account_number, external_reference, idempotency_key)
            VALUES ($1, $2, $3, $4, $5, 'BANK_TRANSFER', 'SUCCESS', $6, $7, $8, $9);
        `;
        await client.query(query, [id, withdrawalNo, userId, walletId, amount.toString(), bankCode, accountNumber, externalReference, idempotencyKey]);
        return id;
    },

    getUserKycFaceImage: async (userId) => {
        const query = `SELECT face_image FROM user_kyc WHERE user_id = $1 AND kyc_status = 'VERIFIED'`;
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    },

    recordTransfer: async (client, id, transferNo, senderUserId, senderWalletId, receiverUserId, receiverWalletId, amount, description, idempotencyKey) => {
        const query = `
            INSERT INTO wallet_transfers (id, transfer_no, sender_user_id, sender_wallet_id, receiver_user_id, receiver_wallet_id, amount, description, status, idempotency_key)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'SUCCESS', $9);
        `;
        await client.query(query, [id, transferNo, senderUserId, senderWalletId, receiverUserId, receiverWalletId, amount.toString(), description, idempotencyKey]);
        return id;
    },

    getWalletForPinCheck: async (userId) => {
        const query = `
            SELECT 
                w.id, 
                COALESCE(w.wallet_code, u.phone) AS wallet_code, 
                w.pin_failed_attempts, 
                w.pin_locked_until,
                u.pin_hash,
                u.phone,
                u.full_name
            FROM wallets w
            JOIN users u ON w.user_id = u.id
            WHERE w.user_id = $1
        `;
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    },

    updatePinAttempts: async (walletId, attempts, lockedUntil = null) => {
        const query = `
            UPDATE wallets 
            SET pin_failed_attempts = $1, pin_locked_until = $2 
            WHERE id = $3
        `;
        await pool.query(query, [attempts, lockedUntil, walletId]);
    },

    resetPinAttempts: async (walletId) => {
        const query = `
            UPDATE wallets 
            SET pin_failed_attempts = 0, pin_locked_until = NULL 
            WHERE id = $1
        `;
        await pool.query(query, [walletId]);
    },

    getMonthlyDebitTotal: async (walletId) => {
        const query = `
            SELECT COALESCE(SUM(le.amount), 0) as total
            FROM ledger_entries le
            JOIN ledger_transactions lt ON le.ledger_transaction_id = lt.id
            WHERE le.wallet_id = $1 
              AND le.entry_type = 'DEBIT' 
              AND lt.transaction_type IN ('TRANSFER', 'BANK_TRANSFER')
              AND EXTRACT(MONTH FROM le.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
              AND EXTRACT(YEAR FROM le.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        `;
        const result = await pool.query(query, [walletId]);
        return BigInt(result.rows[0].total);
    },

    getDailyTotal: async (walletId, type) => {
        const entryType = type === 'DEPOSIT' ? 'CREDIT' : 'DEBIT';
        const query = `
            SELECT COALESCE(SUM(le.amount), 0) as total
            FROM ledger_entries le
            JOIN ledger_transactions lt ON le.ledger_transaction_id = lt.id
            WHERE le.wallet_id = $1 
              AND le.entry_type = $2
              AND lt.transaction_type = $3
              AND le.created_at >= CURRENT_DATE 
              AND le.created_at < CURRENT_DATE + INTERVAL '1 day'
        `;
        const result = await pool.query(query, [walletId, entryType, type]);
        return BigInt(result.rows[0].total);
    },

    getTransactionHistory: async (walletId, limit = 20, offset = 0, filters = {}) => {
        let paramIndex = 1;
        const params = [walletId];
        let whereExtra = '';

        // Filter theo loại giao dịch (DEPOSIT, TRANSFER, WITHDRAW, PAYMENT)
        if (filters.type) {
            paramIndex++;
            whereExtra += ` AND lt.transaction_type = $${paramIndex}`;
            params.push(filters.type.toUpperCase());
        }

        // Filter theo ngày bắt đầu
        if (filters.startDate) {
            paramIndex++;
            whereExtra += ` AND le.created_at >= $${paramIndex}`;
            params.push(new Date(filters.startDate));
        }

        // Filter theo ngày kết thúc
        if (filters.endDate) {
            paramIndex++;
            whereExtra += ` AND le.created_at <= $${paramIndex}`;
            // Đặt endDate về cuối ngày
            const endDate = new Date(filters.endDate);
            endDate.setHours(23, 59, 59, 999);
            params.push(endDate);
        }

        paramIndex++;
        const limitParam = paramIndex;
        params.push(limit);

        paramIndex++;
        const offsetParam = paramIndex;
        params.push(offset);

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
            WHERE le.wallet_id = $1 AND (lt.currency IS NULL OR lt.currency != 'POINT')${whereExtra}
            ORDER BY le.created_at DESC
            LIMIT $${limitParam} OFFSET $${offsetParam};
        `;
        const result = await pool.query(query, params);
        return result.rows;
    },

    getTransactionHistoryForAI: async (walletId) => {
        const query = `
            SELECT 
                le.id AS entry_id,
                le.ledger_transaction_id AS transaction_id,
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
                le.created_at,
                wt.description AS transfer_note,
                COALESCE(u_sender.full_name, u_payer.full_name) AS sender_name,
                COALESCE(u_sender.phone, u_payer.phone) AS sender_phone,
                COALESCE(u_receiver.full_name, m.merchant_name) AS receiver_name,
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
            WHERE le.wallet_id = $1 AND (lt.currency IS NULL OR lt.currency != 'POINT') AND le.created_at >= CURRENT_DATE - INTERVAL '3 months'
            ORDER BY le.created_at DESC
            LIMIT 50;
        `;
        const result = await pool.query(query, [walletId]);
        return result.rows;
    },

    getMonthlySummaryForAI: async (walletId) => {
        const query = `
            SELECT 
                TO_CHAR(le.created_at, 'YYYY-MM') as month,
                le.entry_type,
                COALESCE(lt.category_name, lt.transaction_type) AS category_name,
                SUM(le.amount) as total_amount
            FROM ledger_entries le
            JOIN ledger_transactions lt ON le.ledger_transaction_id = lt.id
            WHERE le.wallet_id = $1 
              AND (lt.currency IS NULL OR lt.currency != 'POINT')
              AND le.created_at >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY month, le.entry_type, category_name
            ORDER BY month DESC, le.entry_type, category_name;
        `;
        const result = await pool.query(query, [walletId]);
        return result.rows;
    },

    checkTransactionOwnership: async (transactionId, walletId) => {
        const query = `
            SELECT 1 FROM ledger_entries 
            WHERE ledger_transaction_id = $1 AND wallet_id = $2
            LIMIT 1;
        `;
        const result = await pool.query(query, [transactionId, walletId]);
        return result.rows.length > 0;
    },

    updateTransactionCategory: async (transactionId, categoryName, isExpenseCounted) => {
        const query = `
            UPDATE ledger_transactions
            SET category_name = $1, is_expense_counted = $2
            WHERE id = $3
            RETURNING *;
        `;
        const result = await pool.query(query, [categoryName, isExpenseCounted, transactionId]);
        return result.rows[0];
    },

    getMonthlyStats: async (walletId) => {
        const query = `
            SELECT 
                COALESCE(SUM(CASE WHEN le.entry_type = 'DEBIT' AND EXTRACT(MONTH FROM le.created_at) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM le.created_at) = EXTRACT(YEAR FROM CURRENT_DATE) THEN le.amount ELSE 0 END), 0) AS total_spend_this_month,
                COALESCE(SUM(CASE WHEN le.entry_type = 'CREDIT' AND EXTRACT(MONTH FROM le.created_at) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM le.created_at) = EXTRACT(YEAR FROM CURRENT_DATE) THEN le.amount ELSE 0 END), 0) AS total_receive_this_month,
                COALESCE(SUM(CASE WHEN le.entry_type = 'DEBIT' AND EXTRACT(MONTH FROM le.created_at) = EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month') AND EXTRACT(YEAR FROM le.created_at) = EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month') THEN le.amount ELSE 0 END), 0) AS total_spend_last_month
            FROM ledger_entries le
            JOIN ledger_transactions lt ON le.ledger_transaction_id = lt.id
            WHERE le.wallet_id = $1 AND (lt.currency IS NULL OR lt.currency != 'POINT');
        `;
        const result = await pool.query(query, [walletId]);
        return result.rows[0];
    },

    getTransactionsByMonth: async (walletId, month, year) => {
        const query = `
            SELECT 
                le.id AS entry_id,
                le.ledger_transaction_id AS transaction_id,
                lt.transaction_no,
                lt.transaction_type,
                lt.transaction_type AS category_name,
                true AS is_expense_counted,
                le.entry_type,
                le.amount,
                le.balance_before,
                le.balance_after,
                lt.description,
                lt.status,
                le.created_at,
                wt.description AS transfer_note,
                COALESCE(u_sender.full_name, u_payer.full_name) AS sender_name,
                COALESCE(u_sender.phone, u_payer.phone) AS sender_phone,
                COALESCE(u_receiver.full_name, m.merchant_name) AS receiver_name,
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
            WHERE le.wallet_id = $1 
              AND (lt.currency IS NULL OR lt.currency != 'POINT')
              AND EXTRACT(MONTH FROM le.created_at) = $2 
              AND EXTRACT(YEAR FROM le.created_at) = $3
            ORDER BY le.created_at DESC;
        `;
        const result = await pool.query(query, [walletId, month, year]);
        return result.rows;
    },

    getChatList: async (walletId) => {
        const query = `
            WITH CTE AS (
                SELECT 
                    wt.id,
                    wt.amount,
                    lt.created_at,
                    CASE WHEN wt.sender_wallet_id = $1 THEN wt.receiver_wallet_id ELSE wt.sender_wallet_id END as counterparty_wallet_id,
                    CASE WHEN wt.sender_wallet_id = $1 THEN 'SEND' ELSE 'RECEIVE' END as direction,
                    wt.description as note,
                    'TRANSACTION' as message_type
                FROM wallet_transfers wt
                JOIN ledger_transactions lt ON lt.source_id = wt.id AND lt.source_type = 'TRANSFER'
                WHERE wt.sender_wallet_id = $1 OR wt.receiver_wallet_id = $1
                
                UNION ALL
                
                SELECT 
                    cm.id,
                    0 as amount,
                    cm.created_at,
                    CASE WHEN cm.sender_wallet_id = $1 THEN cm.receiver_wallet_id ELSE cm.sender_wallet_id END as counterparty_wallet_id,
                    CASE WHEN cm.sender_wallet_id = $1 THEN 'SEND' ELSE 'RECEIVE' END as direction,
                    cm.content as note,
                    cm.message_type
                FROM chat_messages cm
                WHERE cm.sender_wallet_id = $1 OR cm.receiver_wallet_id = $1
            )
            SELECT 
                c.counterparty_wallet_id,
                u.full_name as counterparty_name,
                u.phone as counterparty_phone,
                MAX(c.created_at) as latest_transaction_date
            FROM CTE c
            JOIN wallets w ON c.counterparty_wallet_id = w.id
            JOIN users u ON w.user_id = u.id
            GROUP BY c.counterparty_wallet_id, u.full_name, u.phone
            ORDER BY latest_transaction_date DESC;
        `;
        const result = await pool.query(query, [walletId]);
        return result.rows;
    },

    getChatHistory: async (walletId, counterpartyPhone, limit = 20, offset = 0) => {
        const query = `
            WITH AllMessages AS (
                SELECT 
                    wt.id as transfer_id,
                    wt.amount, 
                    wt.description as note, 
                    wt.created_at,
                    CASE WHEN wt.sender_wallet_id = $1 THEN 'SEND' ELSE 'RECEIVE' END as direction,
                    u_counterparty.full_name as counterparty_name,
                    u_counterparty.phone as counterparty_phone,
                    'TRANSACTION' as message_type,
                    NULL::json as red_packet_info
                FROM wallet_transfers wt
                JOIN wallets w_sender ON wt.sender_wallet_id = w_sender.id
                JOIN wallets w_receiver ON wt.receiver_wallet_id = w_receiver.id
                JOIN users u_sender ON w_sender.user_id = u_sender.id
                JOIN users u_receiver ON w_receiver.user_id = u_receiver.id
                JOIN users u_counterparty ON (CASE WHEN wt.sender_wallet_id = $1 THEN w_receiver.user_id ELSE w_sender.user_id END) = u_counterparty.id
                WHERE 
                    (wt.sender_wallet_id = $1 AND u_receiver.phone = $2)
                    OR 
                    (wt.receiver_wallet_id = $1 AND u_sender.phone = $2)
                
                UNION ALL
                
                SELECT 
                    cm.id as transfer_id,
                    0 as amount,
                    cm.content as note,
                    cm.created_at,
                    CASE WHEN cm.sender_wallet_id = $1 THEN 'SEND' ELSE 'RECEIVE' END as direction,
                    u_counterparty.full_name as counterparty_name,
                    u_counterparty.phone as counterparty_phone,
                    cm.message_type,
                    CASE 
                        WHEN cm.message_type = 'RED_PACKET' THEN (
                            SELECT json_build_object(
                                'is_claimed', EXISTS(SELECT 1 FROM group_funding_members gfm WHERE gfm.group_funding_id::text = cm.content AND gfm.wallet_id = $1),
                                'status', gf.status
                            )
                            FROM group_fundings gf 
                            WHERE gf.id::text = cm.content AND gf.type = 'RED_PACKET'
                        )
                        ELSE NULL
                    END::json as red_packet_info
                FROM chat_messages cm
                JOIN wallets w_sender ON cm.sender_wallet_id = w_sender.id
                JOIN wallets w_receiver ON cm.receiver_wallet_id = w_receiver.id
                JOIN users u_sender ON w_sender.user_id = u_sender.id
                JOIN users u_receiver ON w_receiver.user_id = u_receiver.id
                JOIN users u_counterparty ON (CASE WHEN cm.sender_wallet_id = $1 THEN w_receiver.user_id ELSE w_sender.user_id END) = u_counterparty.id
                WHERE 
                    (cm.sender_wallet_id = $1 AND u_receiver.phone = $2)
                    OR 
                    (cm.receiver_wallet_id = $1 AND u_sender.phone = $2)
            )
            SELECT * FROM AllMessages
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4;
        `;
        const result = await pool.query(query, [walletId, counterpartyPhone, limit, offset]);
        return result.rows;
    },
    saveChatMessage: async (senderWalletId, receiverWalletId, content, messageType = 'TEXT') => {
        const newId = uuidv7();
        const query = `
            INSERT INTO chat_messages (id, sender_wallet_id, receiver_wallet_id, content, message_type)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const result = await pool.query(query, [newId, senderWalletId, receiverWalletId, content, messageType]);
        return result.rows[0];
    }
};

module.exports = transactionRepository;