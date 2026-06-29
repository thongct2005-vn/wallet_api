const mongoose = require('mongoose');
const logRepo = require('../modules/system/log.repository'); 

const apiLogger = (req, res, next) => {
    const startTime = Date.now();

    res.on('finish', async () => {
        const duration = Date.now() - startTime;
        
        // 1. Tạo gói dữ liệu chuẩn Schema MongoDB
        const apiLogData = {
            method: req.method,
            path: req.originalUrl || req.url,
            status_code: res.statusCode,
            duration_ms: duration, // Kiểu Int, không có chữ "ms"
            ip_address: req.ip || req.connection?.remoteAddress,
            user_agent: req.headers['user-agent'] || '',
            actor_id: req.user ? String(req.user.userId) : null,
            created_at: new Date()
        };

        // 2. GHI TRỰC TIẾP VÀO MONGODB (Khỏi lo lỗi thiếu hàm)
        try {
            const db = mongoose.connection.db;
            if (db) {
                // Bỏ qua các API gọi lấy Log để tránh bị đệ quy rác dữ liệu
                if (!apiLogData.path.includes('/admin/logs')) {
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