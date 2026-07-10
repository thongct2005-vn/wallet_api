const pool = require('../../../config/db');
const { buildPagination } = require('../_shared');
const { mapMerchantRow, mapMerchantDetailRow, mapApiKeyRow } = require('./merchants.mapper');

const merchantsRepository = {
    listMerchants: async (page, limit, search) => {
        const { limitVal, offsetVal } = buildPagination(page, limit);
        let whereClause = '1=1';
        const params = [];

        if (search) {
            params.push(`%${search}%`);
            whereClause += ` AND (merchant_name ILIKE $1 OR merchant_code ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1)`;
        }

        const countQuery = `SELECT COUNT(*) FROM merchants WHERE ${whereClause}`;
        const countRes = await pool.query(countQuery, params);
        const total = parseInt(countRes.rows[0].count, 10);

        const listQuery = `
            SELECT id, merchant_code, merchant_name, business_type, email, phone, status, created_at,
                   EXISTS(SELECT 1 FROM merchant_api_keys mak WHERE mak.merchant_id = merchants.id AND mak.status = 'ACTIVE') as has_api_key,
                   (SELECT default_callback_url FROM merchant_callback_configs mcc WHERE mcc.merchant_id = merchants.id LIMIT 1) as default_callback_url,
                   (SELECT callback_enabled FROM merchant_callback_configs mcc WHERE mcc.merchant_id = merchants.id LIMIT 1) as callback_enabled
            FROM merchants
            WHERE ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        const listParams = [...params, limitVal, offsetVal];
        const listRes = await pool.query(listQuery, listParams);

        return {
            total,
            page: parseInt(page, 10) || 1,
            limit: limitVal,
            data: listRes.rows.map(mapMerchantRow)
        };
    },

    findMerchantById: async (id) => {
        const query = `
            SELECT id, merchant_code, merchant_name, business_type, representative_name, 
                   tax_code, email, phone, address, status, risk_note, created_at, updated_at
            FROM merchants
            WHERE id = $1
        `;
        const res = await pool.query(query, [id]);
        if (res.rows.length === 0) return null;
        return mapMerchantDetailRow(res.rows[0]);
    },

    updateMerchantStatus: async (id, status, riskNote) => {
        let query = `
            UPDATE merchants 
            SET status = $1, updated_at = NOW()
        `;
        const params = [status, id];
        
        if (riskNote !== undefined && riskNote !== null) {
            query += `, risk_note = $3`;
            params.push(riskNote);
        }
        
        query += ` WHERE id = $2 RETURNING *`;
        
        const res = await pool.query(query, params);
        if (res.rows.length === 0) return null;
        return mapMerchantDetailRow(res.rows[0]);
    },

    getMerchantApiKeys: async (merchantId) => {
        const query = `
            SELECT id, key_name, api_key, environment, status, last_used_at, expired_at, revoked_at, created_at
            FROM merchant_api_keys
            WHERE merchant_id = $1
            ORDER BY created_at DESC
        `;
        const res = await pool.query(query, [merchantId]);
        return res.rows.map(mapApiKeyRow);
    },

    generateNextMerchantCode: async (client) => {
        // 1. Sync if not exists
        await client.query(`
            INSERT INTO code_sequences (id, resource_name, prefix, current_value, padding, reset_policy)
            SELECT gen_random_uuid(), 'MERCHANT', 'MER', COALESCE((
                SELECT MAX(CAST(SUBSTRING(merchant_code FROM 4) AS INTEGER))
                FROM merchants
                WHERE merchant_code ~ '^MER[0-9]{6}$'
            ), 0), 6, 'NEVER'
            WHERE NOT EXISTS (SELECT 1 FROM code_sequences WHERE resource_name = 'MERCHANT');
        `);

        // 2. Increment and return
        const res = await client.query(`
            UPDATE code_sequences
            SET current_value = current_value + 1, updated_at = CURRENT_TIMESTAMP
            WHERE resource_name = 'MERCHANT'
            RETURNING prefix || LPAD(current_value::text, padding, '0') AS merchant_code
        `);
        return res.rows[0].merchant_code;
    },

    createMerchantBalance: async (merchantId, client) => {
        await client.query(`
            INSERT INTO merchant_balances (merchant_id, available_balance, pending_balance, updated_at)
            VALUES ($1, 0, 0, CURRENT_TIMESTAMP)
        `, [merchantId]);
    },

    createMerchant: async (merchantData, client = pool) => {
        const { merchant_code, merchant_name, business_type, representative_name, tax_code, phone, email, address, status = 'PENDING_REVIEW' } = merchantData;
        const { v7: uuidv7 } = require('uuid');
        const newId = uuidv7();
        const query = `
            INSERT INTO merchants (id, merchant_code, merchant_name, business_type, representative_name, tax_code, phone, email, address, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        const params = [newId, merchant_code, merchant_name, business_type, representative_name, tax_code, phone, email, address, status];
        const res = await client.query(query, params);
        return res.rows[0];
    },

    updateMerchantInfo: async (id, data, client = pool) => {
        const fields = [];
        const params = [id];
        let paramIdx = 2;

        const updatableFields = ['merchant_name', 'business_type', 'representative_name', 'tax_code', 'phone', 'email', 'address'];
        
        for (const field of updatableFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = $${paramIdx}`);
                params.push(data[field]);
                paramIdx++;
            }
        }

        if (fields.length === 0) return null;

        const query = `
            UPDATE merchants 
            SET ${fields.join(', ')}, updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `;
        const res = await client.query(query, params);
        return res.rows.length ? res.rows[0] : null;
    },

    findCallbackConfig: async (merchantId, client = pool) => {
        const res = await client.query('SELECT * FROM merchant_callback_configs WHERE merchant_id = $1', [merchantId]);
        return res.rows.length ? res.rows[0] : null;
    },

    createCallbackConfig: async (merchantId, data, client = pool) => {
        const { v7: uuidv7 } = require('uuid');
        const newId = uuidv7();
        const query = `
            INSERT INTO merchant_callback_configs (id, merchant_id, default_callback_url, default_redirect_url, webhook_secret_hash, callback_enabled, retry_enabled)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const params = [
            newId,
            merchantId, 
            data.default_callback_url || '', 
            data.default_redirect_url || null, 
            data.webhook_secret_hash || '', 
            data.callback_enabled ?? true, 
            data.retry_enabled ?? true
        ];
        const res = await client.query(query, params);
        return res.rows[0];
    },

    updateCallbackConfig: async (id, data, client = pool) => {
        const fields = [];
        const params = [id];
        let paramIdx = 2;

        const updatableFields = ['default_callback_url', 'default_redirect_url', 'webhook_secret_hash', 'callback_enabled', 'retry_enabled'];
        for (const field of updatableFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = $${paramIdx}`);
                params.push(data[field]);
                paramIdx++;
            }
        }

        if (fields.length === 0) return null;

        const query = `
            UPDATE merchant_callback_configs
            SET ${fields.join(', ')}, updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `;
        const res = await client.query(query, params);
        return res.rows.length ? res.rows[0] : null;
    },

    createApiKey: async (merchantId, keyName, apiKey, apiSecretHash, environment, client = pool) => {
        const { v7: uuidv7 } = require('uuid');
        const newId = uuidv7();
        const query = `
            INSERT INTO merchant_api_keys (id, merchant_id, key_name, api_key, api_secret_hash, environment, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
            RETURNING id, key_name, api_key, environment, status, created_at
        `;
        const res = await client.query(query, [newId, merchantId, keyName, apiKey, apiSecretHash, environment]);
        return res.rows[0];
    },

    findApiKeyById: async (keyId, client = pool) => {
        const query = `SELECT * FROM merchant_api_keys WHERE id = $1`;
        const res = await client.query(query, [keyId]);
        return res.rows.length ? res.rows[0] : null;
    },

    updateApiKeyStatus: async (keyId, status, client = pool) => {
        const query = `
            UPDATE merchant_api_keys
            SET status = $2::api_key_status, revoked_at = CASE WHEN $2::text = 'REVOKED' THEN NOW() ELSE revoked_at END, updated_at = NOW()
            WHERE id = $1
            RETURNING id, key_name, status, revoked_at
        `;
        const res = await client.query(query, [keyId, status]);
        return res.rows.length ? res.rows[0] : null;
    },

    getPool: () => pool
};

module.exports = merchantsRepository;
