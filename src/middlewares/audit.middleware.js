const auditLogRepository = require('../modules/system/audit_log.repository');

// Hàm che dấu thông tin nhạy cảm để tuân thủ bảo mật PCI-DSS
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

const auditLogger = (req, res, next) => {
    // Chỉ bắt các request làm thay đổi dữ liệu (POST, PUT, PATCH, DELETE)
    const modifyingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    
    if (modifyingMethods.includes(req.method)) {
        res.on('finish', () => {
            // Chỉ ghi nhận log khi hành động thành công (status 2xx hoặc 3xx)
            if (res.statusCode >= 200 && res.statusCode < 400) {
                const actorId = req.user ? req.user.userId : null;
                const action = `${req.method}_${req.originalUrl.split('?')[0]}`;
                
                // Xác định entity_type dựa trên URL path (ví dụ: /api/wallet/transfer -> wallet)
                const pathParts = req.originalUrl.split('/').filter(p => p && p !== 'api');
                const entityType = pathParts.length > 0 ? pathParts[0] : 'system';
                
                // Tìm entity_id từ request params hoặc body nếu có
                const rawEntityId = req.params.id || req.body.id || req.body.wallet_id || req.body.userId || null;
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                const entityId = (rawEntityId && uuidRegex.test(rawEntityId)) ? rawEntityId : null;
                
                const ipAddress = req.ip || req.connection.remoteAddress;
                
                // Che các thông tin nhạy cảm trước khi lưu
                const newData = maskSensitiveData(req.body);

                // Ghi audit log bất đồng bộ chạy nền
                auditLogRepository.writeAuditLog(
                    actorId,
                    action,
                    entityType,
                    entityId,
                    null, // oldData (middleware dùng chung không lấy dữ liệu cũ để tránh gánh nặng query DB)
                    newData,
                    ipAddress
                );
            }
        });
    }
    next();
};

module.exports = auditLogger;
