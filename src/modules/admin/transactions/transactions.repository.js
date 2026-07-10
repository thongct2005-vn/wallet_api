const pool = require('../../../config/db');
const { buildPagination } = require('../_shared');

const transactionsRepository = {
    // --- TOPUPS (deposit_transactions) ---
    listTopups: async ({ q, status, userId, walletId, dateFrom, dateTo, page, limit }) => {
        const { page: safePage, limit: safeLimit, offset } = buildPagination(page, limit);
        const conditions = [];
        const params = [];
        let idx = 1;

        if (q) {
            conditions.push(`d.deposit_no ILIKE $${idx}`);
            params.push(`%${q}%`);
            idx++;
        }
        if (status) {
            conditions.push(`d.status = $${idx}::deposit_status`);
            params.push(status);
            idx++;
        }
        if (userId) {
            conditions.push(`d.user_id = $${idx}`);
            params.push(userId);
            idx++;
        }
        if (walletId) {
            conditions.push(`d.wallet_id = $${idx}`);
            params.push(walletId);
            idx++;
        }
        if (dateFrom) {
            conditions.push(`d.created_at >= $${idx}`);
            params.push(dateFrom);
            idx++;
        }
        if (dateTo) {
            conditions.push(`d.created_at <= $${idx}`);
            params.push(dateTo);
            idx++;
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const countSql = `SELECT COUNT(*) FROM deposit_transactions d ${where}`;
        const { rows: countRows } = await pool.query(countSql, params);
        const total = Number(countRows[0].count);

        const dataSql = `
            SELECT d.*, u.full_name, u.phone
            FROM deposit_transactions d
            LEFT JOIN users u ON u.id = d.user_id
            ${where}
            ORDER BY d.created_at DESC
            LIMIT $${idx} OFFSET $${idx + 1}
        `;
        const { rows } = await pool.query(dataSql, [...params, safeLimit, offset]);

        return { rows, total, page: safePage, limit: safeLimit };
    },

    findTopupById: async (id) => {
        const { rows } = await pool.query(`
            SELECT d.*, u.full_name, u.phone
            FROM deposit_transactions d
            LEFT JOIN users u ON u.id = d.user_id
            WHERE d.id = $1
        `, [id]);
        return rows[0] || null;
    },

    // --- TRANSFERS (wallet_transfers) ---
    listTransfers: async ({ q, status, userId, walletId, dateFrom, dateTo, page, limit }) => {
        const { page: safePage, limit: safeLimit, offset } = buildPagination(page, limit);
        const conditions = [];
        const params = [];
        let idx = 1;

        if (q) {
            conditions.push(`t.transfer_no ILIKE $${idx}`);
            params.push(`%${q}%`);
            idx++;
        }
        if (status) {
            conditions.push(`t.status = $${idx}::transfer_status`);
            params.push(status);
            idx++;
        }
        if (userId) {
            conditions.push(`(t.sender_user_id = $${idx} OR t.receiver_user_id = $${idx})`);
            params.push(userId);
            idx++;
        }
        if (walletId) {
            conditions.push(`(t.sender_wallet_id = $${idx} OR t.receiver_wallet_id = $${idx})`);
            params.push(walletId);
            idx++;
        }
        if (dateFrom) {
            conditions.push(`t.created_at >= $${idx}`);
            params.push(dateFrom);
            idx++;
        }
        if (dateTo) {
            conditions.push(`t.created_at <= $${idx}`);
            params.push(dateTo);
            idx++;
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const countSql = `SELECT COUNT(*) FROM wallet_transfers t ${where}`;
        const { rows: countRows } = await pool.query(countSql, params);
        const total = Number(countRows[0].count);

        const dataSql = `
            SELECT t.*,
                   su.full_name AS sender_name,
                   ru.full_name AS receiver_name
            FROM wallet_transfers t
            LEFT JOIN users su ON su.id = t.sender_user_id
            LEFT JOIN users ru ON ru.id = t.receiver_user_id
            ${where}
            ORDER BY t.created_at DESC
            LIMIT $${idx} OFFSET $${idx + 1}
        `;
        const { rows } = await pool.query(dataSql, [...params, safeLimit, offset]);

        return { rows, total, page: safePage, limit: safeLimit };
    },

    findTransferById: async (id) => {
        const { rows } = await pool.query(`
            SELECT t.*,
                   su.full_name AS sender_name,
                   ru.full_name AS receiver_name
            FROM wallet_transfers t
            LEFT JOIN users su ON su.id = t.sender_user_id
            LEFT JOIN users ru ON ru.id = t.receiver_user_id
            WHERE t.id = $1
        `, [id]);
        return rows[0] || null;
    },

    // --- LEDGER TRANSACTIONS ---
    listLedgerTransactions: async ({ q, status, type, dateFrom, dateTo, page, limit }) => {
        const { page: safePage, limit: safeLimit, offset } = buildPagination(page, limit);
        const conditions = [];
        const params = [];
        let idx = 1;

        if (q) {
            conditions.push(`lt.transaction_no ILIKE $${idx}`);
            params.push(`%${q}%`);
            idx++;
        }
        if (status) {
            conditions.push(`lt.status = $${idx}::transaction_status`);
            params.push(status);
            idx++;
        }
        if (type) {
            conditions.push(`lt.transaction_type = $${idx}::ledger_transaction_type`);
            params.push(type);
            idx++;
        }
        if (dateFrom) {
            conditions.push(`lt.created_at >= $${idx}`);
            params.push(dateFrom);
            idx++;
        }
        if (dateTo) {
            conditions.push(`lt.created_at <= $${idx}`);
            params.push(dateTo);
            idx++;
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const countSql = `SELECT COUNT(*) FROM ledger_transactions lt ${where}`;
        const { rows: countRows } = await pool.query(countSql, params);
        const total = Number(countRows[0].count);

        const dataSql = `
            SELECT lt.*
            FROM ledger_transactions lt
            ${where}
            ORDER BY lt.created_at DESC
            LIMIT $${idx} OFFSET $${idx + 1}
        `;
        const { rows } = await pool.query(dataSql, [...params, safeLimit, offset]);

        return { rows, total, page: safePage, limit: safeLimit };
    },

    findLedgerTransactionById: async (id) => {
        const { rows } = await pool.query(`SELECT * FROM ledger_transactions WHERE id = $1`, [id]);
        return rows[0] || null;
    },

    findLedgerEntriesByTransactionId: async (transactionId) => {
        const { rows } = await pool.query(`
            SELECT le.*, lt.transaction_no, 
                   w.wallet_code, w.wallet_no, u.full_name as owner_name
            FROM ledger_entries le
            JOIN ledger_transactions lt ON lt.id = le.ledger_transaction_id
            LEFT JOIN wallets w ON w.id = le.wallet_id
            LEFT JOIN users u ON u.id = w.user_id
            WHERE le.ledger_transaction_id = $1
            ORDER BY le.created_at ASC
        `, [transactionId]);
        return rows;
    },

    // --- LEDGER ENTRIES ---
    listLedgerEntries: async ({ walletId, merchantId, accountType, entryType, dateFrom, dateTo, page, limit }) => {
        const { page: safePage, limit: safeLimit, offset } = buildPagination(page, limit);
        const conditions = [];
        const params = [];
        let idx = 1;

        if (walletId) {
            conditions.push(`le.wallet_id = $${idx}`);
            params.push(walletId);
            idx++;
        }
        if (merchantId) {
            conditions.push(`le.merchant_id = $${idx}`);
            params.push(merchantId);
            idx++;
        }
        if (accountType) {
            conditions.push(`le.account_type = $${idx}::ledger_account_type`);
            params.push(accountType);
            idx++;
        }
        if (entryType) {
            conditions.push(`le.entry_type = $${idx}::ledger_entry_type`);
            params.push(entryType);
            idx++;
        }
        if (dateFrom) {
            conditions.push(`le.created_at >= $${idx}`);
            params.push(dateFrom);
            idx++;
        }
        if (dateTo) {
            conditions.push(`le.created_at <= $${idx}`);
            params.push(dateTo);
            idx++;
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const countSql = `SELECT COUNT(*) FROM ledger_entries le ${where}`;
        const { rows: countRows } = await pool.query(countSql, params);
        const total = Number(countRows[0].count);

        const dataSql = `
            SELECT le.*, lt.transaction_no
            FROM ledger_entries le
            LEFT JOIN ledger_transactions lt ON lt.id = le.ledger_transaction_id
            ${where}
            ORDER BY le.created_at DESC
            LIMIT $${idx} OFFSET $${idx + 1}
        `;
        const { rows } = await pool.query(dataSql, [...params, safeLimit, offset]);

        return { rows, total, page: safePage, limit: safeLimit };
    }
};

module.exports = transactionsRepository;
