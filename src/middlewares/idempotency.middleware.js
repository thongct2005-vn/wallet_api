const crypto = require('crypto');
const idempotencyRepo = require('../modules/system/idempotency.repository');
const redis = require('../config/redis');

const withIdempotency = async (req, res, next) => {
    const idempotencyKey = req.headers['idempotency-key'];
    // [SECURITY FIX] Bắt buộc Idempotency-Key cho giao dịch tài chính — chống duplicate transactions
    if (!idempotencyKey) {
        return res.status(400).json({
            success: false,
            error_code: 'IDEMPOTENCY_KEY_REQUIRED',
            message: 'Thiếu header Idempotency-Key. Mỗi giao dịch tài chính cần có mã duy nhất để chống trùng lặp.'
        });
    }
    try {
        const existingRecord = await idempotencyRepo.findByKey(idempotencyKey);
        if (existingRecord) {
            const currentHash = crypto.createHash('sha256').update(JSON.stringify(req.body || {})).digest('hex');
            if (existingRecord.request_hash && existingRecord.request_hash !== currentHash) {
                return res.status(409).json({
                    success: false,
                    error_code: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
                    message: 'Idempotency Key đã được sử dụng với một nội dung Payload khác. Vui lòng tạo Key mới.'
                });
            }
            return res.status(200).json(existingRecord.response_data);
        }

        // Lock bằng Redis (Chống Concurrency 100 requests cùng lúc)
        let lockKey = null;
        if (redis.status === 'ready') {
            lockKey = `idempotency_lock:${idempotencyKey}`;
            const acquired = await redis.setnx(lockKey, 'locked');
            if (!acquired) {
                return res.status(409).json({ message: 'Giao dịch đang được xử lý, vui lòng không lặp lại yêu cầu.' });
            }
            await redis.expire(lockKey, 30);
        }

        const originalJson = res.json;
        res.json = function (body) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const requestHash = crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
                let actorId = '00000000-0000-0000-0000-000000000000';
                let actorType = 'UNKNOWN';
                if (req.user && req.user.userId) {
                    actorId = req.user.userId;
                    actorType = 'USER';
                } else if (req.merchant && req.merchant.merchant_id) {
                    actorId = req.merchant.merchant_id;
                    actorType = 'MERCHANT';
                }
                const requestPath = req.originalUrl;
                idempotencyRepo.saveKey(idempotencyKey, requestHash, body, actorId, actorType, requestPath)
                    .catch(err => console.error('Lỗi lưu Idempotency Key:', err));
            }
            if (lockKey && redis.status === 'ready') {
                redis.del(lockKey).catch(() => { });
            }
            return originalJson.call(this, body);
        };
        next();
    } catch (error) {
        console.error('Lỗi kiểm tra Idempotency:', error);
        next();
    }
};

module.exports = withIdempotency;