const pool = require('../../../config/db');
const { buildPagination } = require('../_shared');
const { mapWalletRow } = require('./wallets.mapper');

const walletsRepository = {
    listWallets: async ({ page, limit, q, status, userId }) => {
        const pagination = buildPagination(page, limit);
        const params = [];
        const where = [];

        if (q) {
            params.push(`%${q.trim()}%`);
            where.push(`(w.wallet_no ILIKE $${params.length} OR w.wallet_code ILIKE $${params.length} OR u.full_name ILIKE $${params.length} OR u.phone ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
        }
        if (status) {
            params.push(status);
            where.push(`w.status = $${params.length}::wallet_status`);
        }
        if (userId) {
            params.push(userId);
            where.push(`w.user_id = $${params.length}`);
        }

        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const countResult = await pool.query(`
            SELECT COUNT(*)::int AS total
            FROM wallets w
            JOIN users u ON u.id = w.user_id
            ${whereSql}
        `, params);

        params.push(pagination.limit, pagination.offset);
        const result = await pool.query(`
            SELECT
                w.id, w.user_id, w.wallet_no, w.wallet_code, w.wallet_type, w.currency,
                w.status, w.lock_reason, w.locked_at, w.locked_by, w.pin_failed_attempts,
                w.pin_locked_until, w.created_at, w.updated_at,
                wb.available_balance, wb.locked_balance, wb.updated_at AS balance_updated_at,
                u.full_name, u.username, u.email, u.phone, u.user_type, u.status AS user_status
            FROM wallets w
            JOIN users u ON u.id = w.user_id
            LEFT JOIN wallet_balances wb ON wb.wallet_id = w.id
            ${whereSql}
            ORDER BY w.created_at DESC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `, params);

        return {
            items: result.rows.map(mapWalletRow),
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total: countResult.rows[0].total
            }
        };
    },

    findWalletById: async (walletId) => {
        const result = await pool.query(`
            SELECT
                w.id, w.user_id, w.wallet_no, w.wallet_code, w.wallet_type, w.currency,
                w.status, w.lock_reason, w.locked_at, w.locked_by, w.pin_failed_attempts,
                w.pin_locked_until, w.created_at, w.updated_at,
                wb.available_balance, wb.locked_balance, wb.updated_at AS balance_updated_at,
                u.full_name, u.username, u.email, u.phone, u.user_type, u.status AS user_status
            FROM wallets w
            JOIN users u ON u.id = w.user_id
            LEFT JOIN wallet_balances wb ON wb.wallet_id = w.id
            WHERE w.id = $1
        `, [walletId]);
        return mapWalletRow(result.rows[0]);
    },

    listWalletLedger: async ({ walletId, page, limit }) => {
        const pagination = buildPagination(page, limit);
        const countResult = await pool.query(`
            SELECT COUNT(*)::int AS total
            FROM ledger_entries
            WHERE wallet_id = $1
        `, [walletId]);

        const result = await pool.query(`
            SELECT
                le.id, le.entry_type, le.amount, le.balance_before, le.balance_after,
                le.description, le.created_at,
                lt.id AS ledger_transaction_id, lt.transaction_no, lt.transaction_type,
                lt.status, lt.source_type, lt.source_id, lt.completed_at
            FROM ledger_entries le
            JOIN ledger_transactions lt ON lt.id = le.ledger_transaction_id
            WHERE le.wallet_id = $1
            ORDER BY le.created_at DESC
            LIMIT $2 OFFSET $3
        `, [walletId, pagination.limit, pagination.offset]);

        return {
            items: result.rows,
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total: countResult.rows[0].total
            }
        };
    },

    lockWalletByAdmin: async (client, walletId, actorId, reason) => {
        const result = await client.query(`
            UPDATE wallets
            SET status = 'LOCKED',
                lock_reason = $2,
                locked_at = CURRENT_TIMESTAMP,
                locked_by = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `, [walletId, reason, actorId]);
        return result.rows[0];
    },

    unlockWalletByAdmin: async (client, walletId) => {
        const result = await client.query(`
            UPDATE wallets
            SET status = 'ACTIVE',
                lock_reason = NULL,
                locked_at = NULL,
                locked_by = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `, [walletId]);
        return result.rows[0];
    }
};

module.exports = walletsRepository;
