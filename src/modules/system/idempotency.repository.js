const pool = require('../../config/db');
const { v7: uuidv7 } = require('uuid');

const idempotencyRepository = {
    findByKey: async (key) => {
        const query = `SELECT request_hash, response_body AS response_data FROM idempotency_keys WHERE idempotency_key = $1`;
        const result = await pool.query(query, [key]);
        return result.rows[0];
    },

    saveKey: async (key, requestHash, responseData, actorId, actorType, requestPath) => {
        const newId = uuidv7();
        const query = `
            INSERT INTO idempotency_keys (id, idempotency_key, request_hash, response_body, actor_id, actor_type, request_path, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP + INTERVAL '24 hours')
            ON CONFLICT (idempotency_key) DO NOTHING;
        `;
        
        await pool.query(query, [newId, key, requestHash, JSON.stringify(responseData), actorId, actorType, requestPath]);
        return newId;
    }
};

module.exports = idempotencyRepository;