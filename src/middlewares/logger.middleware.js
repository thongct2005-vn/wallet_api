const mongoose = require('mongoose');
const logRepo = require('../modules/system/log.repository');

// Hàm che dấu thông tin nhạy cảm
function maskSensitiveData(data) {
    if (!data) return data;
    if (typeof data !== 'object') return data;

    const masked = Array.isArray(data) ? [...data] : { ...data };
    const sensitiveKeys = ['password', 'pin', 'otp', 'token', 'cardnumber', 'cvv', 'card_number', 'secret'];

    for (const key of Object.keys(masked)) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
            masked[key] = '********';
        } else if (typeof masked[key] === 'object' && masked[key] !== null) {
            masked[key] = maskSensitiveData(masked[key]);
        }
    }
    return masked;
}

const apiLogger = (req, res, next) => {
    const startTime = Date.now();

    // Override res.send to capture response body
    const originalSend = res.send;
    res.send = function (body) {
        res.locals.responseBody = body;
        return originalSend.apply(this, arguments);
    };

    res.on('finish', async () => {
        const duration = Date.now() - startTime;

        let parsedResBody = null;
        try {
            parsedResBody = typeof res.locals.responseBody === 'string' ? JSON.parse(res.locals.responseBody) : res.locals.responseBody;
        } catch (e) {
            parsedResBody = res.locals.responseBody;
        }

        // 1. Tạo gói dữ liệu chuẩn Schema MongoDB
        const apiLogData = {
            method: req.method,
            path: req.originalUrl || req.url,
            status_code: res.statusCode,
            duration_ms: duration, // Kiểu Int, không có chữ "ms"
            ip_address: req.ip || req.connection?.remoteAddress,
            user_agent: req.headers['user-agent'] || '',
            actor_id: req.user ? String(req.user.userId) : null,
            created_at: new Date(),
            request: req.body && Object.keys(req.body).length > 0 ? req.body : null,
            response: parsedResBody
        };

        // 2. GHI TRỰC TIẾP VÀO MONGODB (Khỏi lo lỗi thiếu hàm)
        try {
            const db = mongoose.connection.db;
            if (db) {
                // Bỏ qua các API gọi lấy Log để tránh bị đệ quy rác dữ liệu
                if (!apiLogData.path.includes('/admin/logs') && !apiLogData.path.includes('/api-docs')) {
                    await db.collection('api_request_logs').insertOne(apiLogData);
                }
            }
        } catch (error) {
            console.error('Lỗi ghi API Log thẳng vào Mongo:', error);
        }

        // 3. GHI SYSTEM LOG (Chỉ áp dụng nếu hệ thống bị sập - lỗi 5xx)
        if (res.statusCode >= 500 && logRepo && logRepo.writeSystemLog) {
            logRepo.writeSystemLog(
                'API_GATEWAY',
                'ERROR',
                `API Failed: ${req.method} ${req.originalUrl}`,
                { ...apiLogData, error_details: res.statusMessage }
            ).catch(err => console.error('Lỗi ghi System Log:', err));
        }
    });

    next();
};

module.exports = apiLogger;