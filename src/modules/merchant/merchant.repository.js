const pool = require('../../config/db');
const { v7: uuidv7 } = require('uuid');

const merchantRepository = {
    registerMerchant: async (merchantData, apiKey) => {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // 0. Generate merchant code using code_sequences
            await client.query(`
                INSERT INTO code_sequences (id, resource_name, prefix, current_value, padding, reset_policy)
                SELECT gen_random_uuid(), 'MERCHANT', 'MER', COALESCE((
                    SELECT MAX(CAST(SUBSTRING(merchant_code FROM 4) AS INTEGER))
                    FROM merchants
                    WHERE merchant_code ~ '^MER[0-9]{6}$'
                ), 0), 6, 'NEVER'
                WHERE NOT EXISTS (SELECT 1 FROM code_sequences WHERE resource_name = 'MERCHANT');
            `);

            const seqRes = await client.query(`
                UPDATE code_sequences
                SET current_value = current_value + 1, updated_at = CURRENT_TIMESTAMP
                WHERE resource_name = 'MERCHANT'
                RETURNING prefix || LPAD(current_value::text, padding, '0') AS merchant_code
            `);
            const merchantCode = seqRes.rows[0].merchant_code;

            // 1. Insert into merchants
            const merchantId = uuidv7();
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
                `INSERT INTO merchant_users (id, merchant_id, user_id, is_owner, is_active, role_code) VALUES ($1, $2, $3, true, true, 'MERCHANT_OWNER')`,
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

            // 5. Initialize merchant_balances
            await client.query(`
                INSERT INTO merchant_balances (merchant_id, available_balance, pending_balance, updated_at)
                VALUES ($1, 0, 0, CURRENT_TIMESTAMP)
            `, [merchantId]);

            // 6. Assign global MERCHANT_OWNER role to the user
            await client.query(`
                INSERT INTO user_roles (user_id, role_id)
                SELECT $1, id FROM roles WHERE code = 'MERCHANT_OWNER'
                ON CONFLICT DO NOTHING
            `, [merchantData.user_id]);
            
            await client.query('COMMIT');
            return merchantId;
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    getMerchantProfile: async (merchantId) => {
        // Hàm này đã được chuyển xuống dưới
    },
    
    findUserByPhone: async (phone) => {
        const query = 'SELECT id FROM users WHERE phone = $1';
        const result = await pool.query(query, [phone]);
        return result.rows.length > 0 ? result.rows[0].id : null;
    },

    getWalletIdByPhone: async (phone) => {
        const query = `
            SELECT w.id as wallet_id, u.id as user_id 
            FROM users u 
            JOIN wallets w ON u.id = w.user_id 
            WHERE u.phone = $1 LIMIT 1
        `;
        const result = await pool.query(query, [phone]);
        return result.rows.length > 0 ? result.rows[0] : null;
    },

    getLinkedService: async (userId, merchantId) => {
        // Tìm theo merchant_id (FK) thay vì tên - chính xác 100%
        const query = "SELECT limit_per_day, limit_per_transaction, status FROM user_linked_services WHERE user_id = $1 AND merchant_id = $2 LIMIT 1";
        const result = await pool.query(query, [userId, merchantId]);
        return result.rows.length > 0 ? result.rows[0] : null;
    },

    getDailyUsageForMerchant: async (walletId, merchantId) => {
        const query = `
            SELECT SUM(pt.amount) as total
            FROM payment_transactions pt
            JOIN payment_orders po ON pt.payment_order_id = po.id
            WHERE pt.payer_wallet_id = $1 
              AND po.merchant_id = $2 
              AND pt.created_at >= CURRENT_DATE
              AND pt.status = 'SUCCESS'
        `;
        const result = await pool.query(query, [walletId, merchantId]);
        return result.rows.length > 0 && result.rows[0].total ? BigInt(result.rows[0].total) : 0n;
    },

    getUserPinHashByPhone: async (phone) => {
        const query = 'SELECT pin_hash FROM users WHERE phone = $1 LIMIT 1';
        const result = await pool.query(query, [phone]);
        return result.rows.length > 0 ? result.rows[0].pin_hash : null;
    },

    getMerchantByApiKey: async (apiKey) => {
        const query = `
            SELECT m.id, m.merchant_name, mu.user_id as merchant_user_id 
            FROM merchants m
            JOIN merchant_api_keys mak ON m.id = mak.merchant_id
            JOIN merchant_users mu ON m.id = mu.merchant_id
            WHERE mak.api_key = $1 AND mu.is_owner = true LIMIT 1
        `;
        const result = await pool.query(query, [apiKey]);
        return result.rows.length > 0 ? result.rows[0] : null;
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
    },
    // --- MERCHANT PORTAL NEW APIs ---

    getMerchantProfile: async (merchantId) => {
        const query = `
            SELECT m.id AS merchant_id, m.merchant_code, m.merchant_name, m.business_type, m.representative_name, m.tax_code, m.phone AS contact_phone, m.email, m.address, m.status,
                   mcc.default_callback_url AS callback_url, mcc.default_redirect_url, mcc.callback_enabled, mcc.retry_enabled,
                   k.api_key, k.api_secret_hash AS secret_key
            FROM merchants m
            LEFT JOIN merchant_callback_configs mcc ON m.id = mcc.merchant_id
            LEFT JOIN merchant_api_keys k ON m.id = k.merchant_id
            WHERE m.id = $1
            ORDER BY k.created_at DESC
            LIMIT 1
        `;
        const result = await pool.query(query, [merchantId]);
        return result.rows.length > 0 ? result.rows[0] : null;
    },

    updateCallbackConfig: async (merchantId, data) => {
        const query = `
            UPDATE merchant_callback_configs
            SET default_callback_url = COALESCE($1, default_callback_url),
                default_redirect_url = COALESCE($2, default_redirect_url),
                updated_at = NOW()
            WHERE merchant_id = $3
            RETURNING default_callback_url, default_redirect_url
        `;
        const result = await pool.query(query, [data.default_callback_url, data.default_redirect_url, merchantId]);
        return result.rows[0];
    },

    getApiKeys: async (merchantId) => {
        const result = await pool.query(`
            SELECT id, key_name, api_key, environment, status, created_at, last_used_at, expired_at
            FROM merchant_api_keys
            WHERE merchant_id = $1
            ORDER BY created_at DESC
        `, [merchantId]);
        return result.rows;
    },

    createApiKey: async (merchantId, keyName, apiKey, apiSecretHash, environment) => {
        const id = uuidv7();
        const query = `
            INSERT INTO merchant_api_keys (id, merchant_id, key_name, api_key, api_secret_hash, environment, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', NOW())
            RETURNING id, key_name, api_key, environment, status, created_at
        `;
        const result = await pool.query(query, [id, merchantId, keyName, apiKey, apiSecretHash, environment]);
        return result.rows[0];
    },

    getApiKeyByIdAndMerchant: async (keyId, merchantId) => {
        const result = await pool.query(`
            SELECT id, status, environment
            FROM merchant_api_keys
            WHERE id = $1 AND merchant_id = $2
        `, [keyId, merchantId]);
        return result.rows[0];
    },

    updateApiSecretHash: async (keyId, secretHash) => {
        const result = await pool.query(`
            UPDATE merchant_api_keys
            SET api_secret_hash = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, key_name, api_key, environment, status, created_at, updated_at
        `, [secretHash, keyId]);
        return result.rows[0];
    },

    revokeApiKey: async (keyId) => {
        await pool.query(`
            UPDATE merchant_api_keys
            SET status = 'REVOKED', revoked_at = NOW(), updated_at = NOW()
            WHERE id = $1
        `, [keyId]);
    },

    getPaymentOrders: async (merchantId, filters) => {
        const { page = 1, limit = 20, status, date_from, date_to, keyword, sort_by = 'created_at', sort_order = 'desc' } = filters;
        const offset = (page - 1) * limit;
        const params = [merchantId];
        const where = ['merchant_id = $1'];

        if (status) {
            params.push(status);
            where.push(`status = $${params.length}`);
        }
        if (date_from) {
            params.push(date_from);
            where.push(`created_at >= $${params.length}`);
        }
        if (date_to) {
            params.push(date_to);
            where.push(`created_at <= $${params.length}`);
        }
        if (keyword) {
            params.push(`%${keyword}%`);
            where.push(`(payment_no ILIKE $${params.length} OR merchant_order_id ILIKE $${params.length})`);
        }

        const whereSql = where.join(' AND ');
        
        const countResult = await pool.query(`SELECT COUNT(*)::int as total FROM payment_orders WHERE ${whereSql}`, params);
        const total = countResult.rows[0].total;

        params.push(limit, offset);
        const result = await pool.query(`
            SELECT id, payment_no, merchant_order_id, amount, currency, status, refund_status, refunded_amount, created_at, expired_at
            FROM payment_orders
            WHERE ${whereSql}
            ORDER BY ${sort_by} ${sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `, params);

        return { items: result.rows, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } };
    },

    getPaymentOrderById: async (merchantId, orderId) => {
        const query = `SELECT * FROM payment_orders WHERE merchant_id = $1 AND id = $2`;
        const result = await pool.query(query, [merchantId, orderId]);
        return result.rows[0];
    },

    getTransactions: async (merchantId, filters) => {
        const { page = 1, limit = 20, status, date_from, date_to, sort_by = 'created_at', sort_order = 'desc' } = filters;
        const offset = (page - 1) * limit;
        const params = [merchantId];
        
        // We join payment_orders to ensure we only get transactions for this merchant
        const where = ['po.merchant_id = $1'];

        if (status) {
            params.push(status);
            where.push(`pt.status = $${params.length}`);
        }
        if (date_from) {
            params.push(date_from);
            where.push(`pt.created_at >= $${params.length}`);
        }
        if (date_to) {
            params.push(date_to);
            where.push(`pt.created_at <= $${params.length}`);
        }

        const whereSql = where.join(' AND ');
        
        const countQuery = `
            SELECT COUNT(*)::int as total 
            FROM payment_transactions pt
            JOIN payment_orders po ON pt.payment_order_id = po.id
            WHERE ${whereSql}
        `;
        const countResult = await pool.query(countQuery, params);
        const total = countResult.rows[0].total;

        params.push(limit, offset);
        const result = await pool.query(`
            SELECT pt.id, pt.payment_order_id, pt.amount, pt.currency, pt.status, pt.paid_at, pt.created_at, po.payment_no
            FROM payment_transactions pt
            JOIN payment_orders po ON pt.payment_order_id = po.id
            WHERE ${whereSql}
            ORDER BY pt.${sort_by} ${sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `, params);

        return { items: result.rows, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } };
    },

    getTransactionById: async (merchantId, transactionId) => {
        const query = `
            SELECT pt.*, po.payment_no 
            FROM payment_transactions pt
            JOIN payment_orders po ON pt.payment_order_id = po.id
            WHERE po.merchant_id = $1 AND pt.id = $2
        `;
        const result = await pool.query(query, [merchantId, transactionId]);
        return result.rows[0];
    },

    getWebhooks: async (merchantId, filters) => {
        const { page = 1, limit = 20, status, date_from, date_to, sort_by = 'created_at', sort_order = 'desc' } = filters;
        const offset = (page - 1) * limit;
        const params = [merchantId];
        
        const where = ["po.merchant_id = $1", "oe.aggregate_type = 'PAYMENT_ORDER'"];

        if (status) {
            params.push(status);
            where.push(`oe.status = $${params.length}`);
        }
        if (date_from) {
            params.push(date_from);
            where.push(`oe.created_at >= $${params.length}`);
        }
        if (date_to) {
            params.push(date_to);
            where.push(`oe.created_at <= $${params.length}`);
        }

        const whereSql = where.join(' AND ');
        
        const countQuery = `
            SELECT COUNT(*)::int as total 
            FROM outbox_events oe
            JOIN payment_orders po ON oe.aggregate_id::text = po.id::text
            WHERE ${whereSql}
        `;
        const countResult = await pool.query(countQuery, params);
        const total = countResult.rows[0].total;

        params.push(limit, offset);
        const result = await pool.query(`
            SELECT oe.id, oe.aggregate_id as payment_order_id, oe.event_type, oe.payload, oe.status, oe.created_at, po.payment_no
            FROM outbox_events oe
            JOIN payment_orders po ON oe.aggregate_id::text = po.id::text
            WHERE ${whereSql}
            ORDER BY oe.${sort_by} ${sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `, params);

        return { items: result.rows, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } };
    },

    getWebhookById: async (merchantId, webhookId) => {
        const query = `
            SELECT oe.*, po.payment_no 
            FROM outbox_events oe
            JOIN payment_orders po ON oe.aggregate_id::text = po.id::text
            WHERE po.merchant_id = $1 AND oe.id = $2
        `;
        const result = await pool.query(query, [merchantId, webhookId]);
        return result.rows[0];
    },

    retryWebhook: async (merchantId, webhookId) => {
        // Enqueue a new retry event. We find the original outbox_event, verify it belongs to merchant, 
        // and insert a new outbox_event for retrying.
        const original = await merchantRepository.getWebhookById(merchantId, webhookId);
        if (!original) throw new Error('Webhook event not found');

        const { v7: uuidv7 } = require('uuid');
        const newId = uuidv7();
        
        const query = `
            INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload, status)
            VALUES ($1, $2, $3, $4, $5, 'PENDING')
            RETURNING id, status, created_at
        `;
        // Add retry context to payload
        const newPayload = { ...original.payload, is_retry: true, original_event_id: original.id };
        const result = await pool.query(query, [newId, original.aggregate_type, original.aggregate_id, original.event_type, newPayload]);
        return result.rows[0];
    },

    getMerchantBalance: async (merchantId) => {
        const query = `SELECT available_balance, pending_balance FROM merchant_balances WHERE merchant_id = $1`;
        const result = await pool.query(query, [merchantId]);
        return result.rows[0];
    },

    getMerchantStatement: async (merchantId, filters) => {
        const { page = 1, limit = 20, date_from, date_to, type, sort_by = 'created_at', sort_order = 'desc' } = filters;
        const offset = (page - 1) * limit;
        const params = [merchantId];
        const where = ['le.merchant_id = $1'];

        if (date_from) {
            params.push(date_from);
            where.push(`le.created_at >= $${params.length}`);
        }
        if (date_to) {
            params.push(date_to);
            where.push(`le.created_at <= $${params.length}`);
        }
        if (type) {
            params.push(type.toUpperCase());
            where.push(`le.entry_type = $${params.length}`);
        }

        const whereSql = where.join(' AND ');
        
        const countResult = await pool.query(`SELECT COUNT(*)::int as total FROM ledger_entries le WHERE ${whereSql}`, params);
        const total = countResult.rows[0].total;

        params.push(limit, offset);
        const result = await pool.query(`
            SELECT 
                le.id,
                le.ledger_transaction_id,
                le.entry_type,
                le.amount,
                le.balance_before,
                le.balance_after,
                le.description,
                le.created_at,
                lt.transaction_type,
                lt.source_type,
                lt.source_id,
                -- Thông tin đơn hàng (khi là CREDIT từ PAYMENT)
                po.payment_no,
                po.amount AS order_amount,
                -- Thông tin khách hàng thanh toán
                u_payer.full_name AS payer_name,
                u_payer.phone AS payer_phone,
                -- Thông tin rút tiền
                wt_act.bank_code,
                wt_act.account_number AS bank_account_number,
                -- Thông tin rút về ví cá nhân
                u_wallet.full_name AS wallet_owner_name,
                u_wallet.phone AS wallet_owner_phone
            FROM ledger_entries le
            JOIN ledger_transactions lt ON le.ledger_transaction_id = lt.id
            -- JOIN payment (nhận doanh thu từ đơn hàng)
            LEFT JOIN payment_transactions pt ON lt.source_type = 'PAYMENT' AND lt.source_id = pt.id
            LEFT JOIN payment_orders po ON pt.payment_order_id = po.id
            LEFT JOIN wallets w_payer ON pt.payer_wallet_id = w_payer.id
            LEFT JOIN users u_payer ON w_payer.user_id = u_payer.id
            -- JOIN withdrawal (rút về ngân hàng)
            LEFT JOIN withdrawal_transactions wt_act ON lt.source_type = 'WITHDRAWAL' AND lt.source_id = wt_act.id
            -- JOIN transfer (rút về ví cá nhân)
            LEFT JOIN wallet_transfers wtr ON lt.source_type = 'TRANSFER' AND lt.source_id = wtr.id
            LEFT JOIN wallets w_recv ON wtr.receiver_wallet_id = w_recv.id
            LEFT JOIN users u_wallet ON w_recv.user_id = u_wallet.id
            WHERE ${whereSql}
            ORDER BY le.created_at ${sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `, params);

        return { items: result.rows, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } };
    }
};

module.exports = merchantRepository;
