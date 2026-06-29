const pool = require('../config/db');

const verifyApiKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        return res.status(401).json({ error: 'Thiếu API Key' });
    }

    try {
        const query = `
            SELECT m.id AS merchant_id, m.status 
            FROM merchant_api_keys mak
            JOIN merchants m ON mak.merchant_id = m.id
            WHERE mak.api_key = $1 AND (mak.expired_at IS NULL OR mak.expired_at > CURRENT_TIMESTAMP)
        `;
        const result = await pool.query(query, [apiKey]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'API Key không hợp lệ hoặc đã hết hạn' });
        }

        if (result.rows[0].status !== 'ACTIVE') {
            return res.status(403).json({ error: 'Tài khoản Merchant đã bị khóa' });
        }

        req.merchant = result.rows[0];
        next();
    } catch (error) {
        console.error('Lỗi xác thực API Key:', error);
        res.status(500).json({ error: 'Lỗi hệ thống xác thực' });
    }
};

module.exports = verifyApiKey;