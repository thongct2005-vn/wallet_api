const pool = require('../../config/db');
const { v7: uuidv7 } = require('uuid');

const merchantRepository = {
    registerMerchant: async (merchantData, apiKey) => {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // 1. Insert into merchants
            const merchantId = uuidv7();
            const merchantCode = 'MC' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
            const merchantQuery = `
                INSERT INTO merchants (id, merchant_code, merchant_name, phone, status, business_type)
                VALUES ($1, $2, $3, $4, 'ACTIVE', 'ONLINE')
                RETURNING id;
            `;
            const merchantValues = [
                merchantId,
                merchantCode,
                merchantData.merchant_name,
                merchantData.contact_phone
            ];
            
            await client.query(merchantQuery, merchantValues);
            
            // 2. Insert into merchant_users
            const muId = uuidv7();
            await client.query(
                `INSERT INTO merchant_users (id, merchant_id, user_id, is_owner, is_active, role_code) VALUES ($1, $2, $3, true, true, 'ADMIN')`,
                [muId, merchantId, merchantData.user_id]
            );

            // 3. Insert into merchant_callback_configs
            const mccId = uuidv7();
            await client.query(
                `INSERT INTO merchant_callback_configs (id, merchant_id, default_callback_url, webhook_secret_hash, callback_enabled) VALUES ($1, $2, $3, $4, true)`,
                [mccId, merchantId, merchantData.callback_url || '', merchantData.secret_key]
            );

            // 4. Insert into merchant_api_keys
            const apiKeyId = uuidv7();
            const apiKeyQuery = `
                INSERT INTO merchant_api_keys (id, merchant_id, api_key, key_name, api_secret_hash)
                VALUES ($1, $2, $3, 'Default Key', $4)
            `;
            const apiKeyValues = [apiKeyId, merchantId, apiKey, merchantData.secret_key];
            
            await client.query(apiKeyQuery, apiKeyValues);
            
            await client.query('COMMIT');
            return merchantId;
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },
    
    findUserByPhone: async (phone) => {
        const query = 'SELECT id FROM users WHERE phone = $1';
        const result = await pool.query(query, [phone]);
        return result.rows.length > 0 ? result.rows[0].id : null;
    },

    checkMerchantExistsByUser: async (userId) => {
        const query = 'SELECT id FROM merchant_users WHERE user_id = $1';
        const result = await pool.query(query, [userId]);
        return result.rows.length > 0;
    },
    
    getMerchantUserId: async (merchantId) => {
        const query = 'SELECT user_id FROM merchant_users WHERE merchant_id = $1 AND is_owner = true LIMIT 1';
        const result = await pool.query(query, [merchantId]);
        return result.rows.length > 0 ? result.rows[0].user_id : null;
    },

    getMerchantByUserId: async (userId) => {
        const query = `
            SELECT m.id as merchant_id, m.merchant_name, m.phone as contact_phone, 
                   mcc.default_callback_url as callback_url, m.status, 
                   mcc.webhook_secret_hash as secret_key,
                   mak.api_key
            FROM merchants m
            JOIN merchant_users mu ON m.id = mu.merchant_id
            LEFT JOIN merchant_callback_configs mcc ON m.id = mcc.merchant_id
            LEFT JOIN merchant_api_keys mak ON m.id = mak.merchant_id
            WHERE mu.user_id = $1
        `;
        const result = await pool.query(query, [userId]);
        return result.rows.length > 0 ? result.rows[0] : null;
    },

    updateWebhookUrl: async (merchantId, callbackUrl) => {
        const query = `
            UPDATE merchant_callback_configs 
            SET default_callback_url = $1 
            WHERE merchant_id = $2 
            RETURNING default_callback_url as callback_url
        `;
        const result = await pool.query(query, [callbackUrl, merchantId]);
        return result.rows[0].callback_url;
    }
};

module.exports = merchantRepository;
