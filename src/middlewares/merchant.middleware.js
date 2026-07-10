const pool = require('../config/db');
const { decryptApiSecret, verifyHmacSignature } = require('../shared/utils/api-secret.util');

const verifyApiKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        return res.status(401).json({ error: 'Thiếu API Key' });
    }

    try {
        const query = `
            SELECT m.id AS merchant_id, m.status AS merchant_status, mak.status AS key_status
            FROM merchant_api_keys mak
            JOIN merchants m ON mak.merchant_id = m.id
            WHERE mak.api_key = $1 AND (mak.expired_at IS NULL OR mak.expired_at > CURRENT_TIMESTAMP)
        `;
        const result = await pool.query(query, [apiKey]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'API Key không tồn tại hoặc đã hết hạn' });
        }

        const row = result.rows[0];

        if (row.key_status !== 'ACTIVE') {
            return res.status(401).json({ error: `API Key này đã bị ${row.key_status === 'REVOKED' ? 'thu hồi' : 'vô hiệu hóa'}` });
        }

        if (row.merchant_status !== 'ACTIVE') {
            const status = row.merchant_status;
            let message = 'Tài khoản Merchant của bạn chưa được kích hoạt.';
            if (status === 'PENDING_REVIEW') message = 'Tài khoản Merchant đang chờ duyệt.';
            else if (status === 'SUSPENDED') message = 'Tài khoản Merchant đã bị tạm ngưng.';
            else if (status === 'REJECTED') message = 'Hồ sơ Merchant đã bị từ chối.';
            else if (status === 'CLOSED') message = 'Tài khoản Merchant đã bị đóng.';
            return res.status(403).json({ error: message });
        }

        req.merchant = { merchant_id: row.merchant_id, status: row.merchant_status };
        next();
    } catch (error) {
        console.error('Lỗi xác thực API Key:', error);
        res.status(500).json({ error: 'Lỗi hệ thống xác thực' });
    }
};

/**
 * Middleware xác thực nâng cao: kiểm tra public key + HMAC signature.
 * Dùng cho các endpoint nhạy cảm phía backend của bên thứ ba (VD: charge, tạo order).
 *
 * Ben thu ba phai gui them:
 *   X-Timestamp : unix timestamp (ms) khi tao request
 *   X-Signature : HMAC_SHA256("<timestamp>.<JSON.stringify(body)>", raw_secret)
 */
const verifyApiKeyWithSignature = async (req, res, next) => {
    const apiKey    = req.headers['x-api-key'];
    const signature = req.headers['x-signature'];
    const timestamp = req.headers['x-timestamp'];

    if (!apiKey) {
        return res.status(401).json({ error: 'Thieu X-Api-Key header' });
    }
    if (!signature || !timestamp) {
        return res.status(401).json({
            error: 'Thieu X-Signature hoac X-Timestamp. Endpoint nay yeu cau HMAC signature.',
            hint: 'Xem tai lieu tich hop de biet cach ky request.'
        });
    }

    try {
        const query = `
            SELECT m.id AS merchant_id, m.status AS merchant_status,
                   mak.status AS key_status, mak.api_secret_hash
            FROM merchant_api_keys mak
            JOIN merchants m ON mak.merchant_id = m.id
            WHERE mak.api_key = $1
            AND (mak.expired_at IS NULL OR mak.expired_at > CURRENT_TIMESTAMP)
        `;
        const result = await pool.query(query, [apiKey]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'API Key khong ton tai hoac da het han' });
        }

        const row = result.rows[0];

        if (row.key_status !== 'ACTIVE') {
            return res.status(401).json({
                error: `API Key da bi ${row.key_status === 'REVOKED' ? 'thu hoi' : 'vo hieu hoa'}`
            });
        }

        if (row.merchant_status !== 'ACTIVE') {
            return res.status(403).json({ error: 'Tai khoan Merchant khong kha dung' });
        }

        // Giai ma secret de verify HMAC
        const rawSecret = decryptApiSecret(row.api_secret_hash);
        if (!rawSecret) {
            // Key cu dung HMAC one-way hash → khong ho tro signature
            return res.status(401).json({
                error: 'Key nay khong ho tro HMAC signature. Vui long tao key moi tai Merchant Portal.'
            });
        }

        const { valid, reason } = verifyHmacSignature(timestamp, req.body, signature, rawSecret);
        if (!valid) {
            return res.status(401).json({
                error: `Chu ky khong hop le${reason ? ': ' + reason : ''}`
            });
        }

        req.merchant = { merchant_id: row.merchant_id, status: row.merchant_status };
        next();
    } catch (error) {
        console.error('Loi xac thuc HMAC signature:', error);
        res.status(500).json({ error: 'Loi he thong xac thuc' });
    }
};

const { verifyToken, requireMerchant } = require('./auth.middleware');

const resolveMerchantContext = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        const result = await pool.query(`
            SELECT mu.merchant_id, mu.role_code, mu.is_owner, mu.is_active, m.status AS merchant_status
            FROM merchant_users mu
            JOIN merchants m ON m.id = mu.merchant_id
            WHERE mu.user_id = $1 AND mu.is_active = true
            LIMIT 1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(403).json({
                success: false,
                error_code: 'FORBIDDEN',
                message: 'Tài khoản không thuộc về bất kỳ Merchant nào hoặc đã bị vô hiệu hóa'
            });
        }

        const context = result.rows[0];
        req.merchantContext = {
            merchant_id: context.merchant_id,
            role_code: context.role_code,
            is_owner: context.is_owner,
            merchant_status: context.merchant_status
        };

        next();
    } catch (error) {
        console.error('Error resolving merchant context:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi kiểm tra quyền merchant',
            error_code: 'Internal_Server_Error'
        });
    }
};

const requireMerchantUser = [verifyToken, requireMerchant, resolveMerchantContext];

const requireActiveMerchant = (req, res, next) => {
    if (req.merchantContext && req.merchantContext.merchant_status !== 'ACTIVE') {
        const status = req.merchantContext.merchant_status;
        let message = 'Tài khoản Merchant của bạn chưa được kích hoạt.';
        
        if (status === 'PENDING_REVIEW') {
            message = 'Tài khoản Merchant đang chờ duyệt. Chức năng này chỉ khả dụng khi tài khoản đã được kích hoạt.';
        } else if (status === 'SUSPENDED') {
            message = 'Tài khoản Merchant đã bị tạm ngưng. Vui lòng liên hệ hỗ trợ để biết thêm chi tiết.';
        } else if (status === 'REJECTED') {
            message = 'Hồ sơ Merchant đã bị từ chối.';
        } else if (status === 'CLOSED') {
            message = 'Tài khoản Merchant đã bị đóng.';
        }

        return res.status(403).json({
            success: false,
            error_code: 'MERCHANT_NOT_ACTIVE',
            message: message
        });
    }
    next();
};

module.exports = {
    verifyApiKey,
    verifyApiKeyWithSignature,
    resolveMerchantContext,
    requireMerchantUser,
    requireActiveMerchant
};