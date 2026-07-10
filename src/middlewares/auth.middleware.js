const jwt = require('jsonwebtoken');
const pool = require('../config/db');

function unauthorized(res, code, message) {
    return res.status(401).json({ success: false, message, error_code: code });
}

function forbidden(res, message) {
    return res.status(403).json({ success: false, message, error_code: 'FORBIDDEN' });
}

const authenticateJwt = async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !/^Bearer\s+/i.test(header)) {
        return unauthorized(res, 'UNAUTHORIZED', 'Thiếu access token');
    }
    try {
        const token = header.replace(/^Bearer\s+/i, '').trim();
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.token_type && decoded.token_type !== 'ACCESS') {
            return unauthorized(res, 'UNAUTHORIZED', 'Token không đúng loại');
        }
        const userId = decoded.sub || decoded.userId || decoded.id;
        const result = await pool.query(`
            SELECT id, user_type, status, token_version, is_force_change_password
            FROM users
            WHERE id = $1
        `, [userId]);
        const user = result.rows[0];
        if (!user) return unauthorized(res, 'UNAUTHORIZED', 'Người dùng không tồn tại');
        if (['LOCKED', 'BLOCKED', 'INACTIVE'].includes(user.status)) {
            return forbidden(res, 'Tài khoản đã bị khóa hoặc chưa kích hoạt');
        }
        
        if (user.is_force_change_password) {
            const isAllowed = 
                (req.method === 'GET' && req.originalUrl.includes('/auth/me')) ||
                (req.method === 'POST' && req.originalUrl.includes('/auth/change-password')) ||
                (req.method === 'POST' && req.originalUrl.includes('/auth/logout'));
            if (!isAllowed) {
                return res.status(403).json({
                    success: false,
                    error_code: 'FORCE_CHANGE_PASSWORD',
                    message: 'Bạn phải đổi mật khẩu trước khi tiếp tục sử dụng hệ thống'
                });
            }
        }

        if (Number(decoded.tokenVersion) !== Number(user.token_version)) {
            return unauthorized(res, 'TOKEN_REVOKED', 'Token đã bị thu hồi');
        }
        const roles = Array.isArray(decoded.roles)
            ? decoded.roles
            : [decoded.role || user.user_type].filter(Boolean);
        req.user = {
            ...decoded,
            id: userId,
            userId,
            sub: userId,
            user_type: decoded.user_type || user.user_type,
            role: roles[0],
            roles,
            permissions: Array.isArray(decoded.permissions) ? decoded.permissions : []
        };
        return next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return unauthorized(res, 'TOKEN_EXPIRED', 'Access token đã hết hạn');
        }
        return unauthorized(res, 'UNAUTHORIZED', 'Access token không hợp lệ');
    }
};

const requireRole = (...allowedRoles) => (req, res, next) => {
    const roles = req.user?.roles || [];
    if (!allowedRoles.some(role => roles.includes(role))) {
        return forbidden(res, 'Không có vai trò phù hợp');
    }
    return next();
};

const requirePermission = (...requiredPermissions) => (req, res, next) => {
    const permissions = req.user?.permissions || [];
    if (!requiredPermissions.every(permission => permissions.includes(permission))) {
        return forbidden(res, 'Không có quyền truy cập tài nguyên này');
    }
    return next();
};

const requireAdmin = requireRole('ADMIN', 'SUPER_ADMIN', 'SUPPORT_STAFF');
const requireMerchant = requireRole('MERCHANT_OWNER', 'MERCHANT_STAFF');

module.exports = authenticateJwt;
module.exports.verifyToken = authenticateJwt;
module.exports.authenticateJwt = authenticateJwt;
module.exports.requireRole = requireRole;
module.exports.requirePermission = requirePermission;
module.exports.requireAdmin = requireAdmin;
module.exports.requireMerchant = requireMerchant;
