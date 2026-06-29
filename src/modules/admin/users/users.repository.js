const pool = require('../../../config/db');
const { v7: uuidv7 } = require('uuid');
const { buildPagination } = require('../_shared');
const { mapUserRow } = require('./users.mapper');

/**
 * SQL SELECT dùng chung cho listUsers và findUserById
 * Tránh duplicate query
 */
const USER_SELECT = `
    u.id, u.user_type, u.full_name, u.username, u.email, u.phone, u.status,
    u.failed_login_attempts, u.locked_until, u.last_login_at,
    u.is_kyc_verified, u.token_version, u.created_at, u.updated_at,
    COALESCE(ARRAY_AGG(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL), '{}') AS roles,
    w.id AS wallet_id, w.wallet_no, w.wallet_code, w.wallet_type, w.currency,
    w.status AS wallet_status, wb.available_balance, wb.locked_balance,
    wb.updated_at AS balance_updated_at
`;

const USER_JOIN = `
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    LEFT JOIN wallets w ON w.user_id = u.id
    LEFT JOIN wallet_balances wb ON wb.wallet_id = w.id
`;

const usersRepository = {
    listUsers: async ({ page, limit, q, status, userType }) => {
        const pagination = buildPagination(page, limit);
        const params = [];
        const where = [];

        if (q) {
            params.push(`%${q.trim()}%`);
            where.push(`(u.full_name ILIKE $${params.length} OR u.username ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.phone ILIKE $${params.length})`);
        }
        if (status) {
            params.push(status);
            where.push(`u.status = $${params.length}::user_status`);
        }
        if (userType) {
            params.push(userType);
            where.push(`u.user_type = $${params.length}::user_type`);
        }

        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM users u ${whereSql}`, params);

        params.push(pagination.limit, pagination.offset);
        const result = await pool.query(`
            SELECT ${USER_SELECT}
            ${USER_JOIN}
            ${whereSql}
            GROUP BY u.id, w.id, wb.wallet_id
            ORDER BY u.created_at DESC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `, params);

        return {
            items: result.rows.map(mapUserRow),
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total: countResult.rows[0].total
            }
        };
    },

    findUserById: async (userId) => {
        const result = await pool.query(`
            SELECT ${USER_SELECT}
            ${USER_JOIN}
            WHERE u.id = $1
            GROUP BY u.id, w.id, wb.wallet_id
        `, [userId]);
        return mapUserRow(result.rows[0]);
    },

    findUserRawById: async (userId) => {
        const result = await pool.query(
            `SELECT u.id, u.user_type, u.full_name, u.username, u.email, u.phone, u.status,
                    u.failed_login_attempts, u.locked_until, u.is_kyc_verified, u.token_version,
                    u.created_at, u.updated_at,
                    COALESCE(ARRAY_AGG(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL), '{}') AS roles
             FROM users u
             LEFT JOIN user_roles ur ON ur.user_id = u.id
             LEFT JOIN roles r ON r.id = ur.role_id
             WHERE u.id = $1
             GROUP BY u.id`,
            [userId]
        );
        return result.rows[0];
    },

    checkUserConflict: async ({ username, email, phone, excludeUserId }) => {
        const result = await pool.query(`
            SELECT id, username, email, phone
            FROM users
            WHERE ($1::text IS NOT NULL AND username = $1)
               OR ($2::text IS NOT NULL AND email = $2)
               OR ($3::text IS NOT NULL AND phone = $3)
        `, [username || null, email || null, phone || null]);

        return result.rows.find(row => row.id !== excludeUserId) || null;
    },

    createUser: async (client, { fullName, username, email, phone, passwordHash, userType, status }) => {
        const id = uuidv7();
        const result = await client.query(`
            INSERT INTO users (id, user_type, full_name, username, email, phone, password_hash, status)
            VALUES ($1, $2::user_type, $3, $4, $5, $6, $7, $8::user_status)
            RETURNING id
        `, [
            id,
            userType,
            fullName,
            username || null,
            email || null,
            phone || null,
            passwordHash,
            status || 'ACTIVE'
        ]);
        return result.rows[0].id;
    },

    assignRoleByCode: async (client, userId, roleCode) => {
        const result = await client.query(`
            INSERT INTO user_roles (user_id, role_id)
            SELECT $1, id
            FROM roles
            WHERE code = $2 AND is_active = true
            ON CONFLICT DO NOTHING
            RETURNING role_id
        `, [userId, roleCode]);
        return result.rowCount > 0;
    },

    replaceRolesByCodes: async (client, userId, roleCodes) => {
        await client.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
        if (!roleCodes || roleCodes.length === 0) return true;

        let inserted = 0;
        for (const code of roleCodes) {
            const result = await client.query(`
                INSERT INTO user_roles (user_id, role_id)
                SELECT $1, id
                FROM roles
                WHERE code = $2 AND is_active = true
                RETURNING role_id
            `, [userId, code]);
            if (result.rowCount > 0) inserted++;
        }
        return inserted > 0;
    },

    incrementTokenVersion: async (client, userId) => {
        await client.query(`UPDATE users SET token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [userId]);
    },

    updateUser: async (clientOrPool, userId, updates) => {
        const fields = [];
        const params = [];
        const allowed = {
            full_name: 'full_name',
            username: 'username',
            email: 'email',
            phone: 'phone',
            is_kyc_verified: 'is_kyc_verified',
            user_type: 'user_type'
        };

        Object.entries(allowed).forEach(([inputKey, column]) => {
            if (Object.prototype.hasOwnProperty.call(updates, inputKey)) {
                if (inputKey === 'user_type') {
                    params.push(updates[inputKey]);
                    fields.push(`${column} = $${params.length}::user_type`);
                } else {
                    params.push(updates[inputKey]);
                    fields.push(`${column} = $${params.length}`);
                }
            }
        });

        if (fields.length === 0) return null;
        params.push(userId);

        const result = await clientOrPool.query(`
            UPDATE users
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${params.length}
            RETURNING *
        `, params);
        return result.rows[0];
    },

    lockUser: async (userId) => {
        const result = await pool.query(`
            UPDATE users
            SET status = 'LOCKED',
                locked_until = NULL,
                token_version = token_version + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `, [userId]);
        return result.rows[0];
    },

    unlockUser: async (userId) => {
        const result = await pool.query(`
            UPDATE users
            SET status = 'ACTIVE',
                failed_login_attempts = 0,
                locked_until = NULL,
                token_version = token_version + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `, [userId]);
        return result.rows[0];
    }
};

module.exports = usersRepository;
