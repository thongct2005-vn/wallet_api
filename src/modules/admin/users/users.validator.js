const { ensureUuid } = require('../_shared');

const usersValidator = {
    validateIdParam: (req, res, next) => {
        try {
            ensureUuid(req.params.id, 'Invalid_User_Id');
            next();
        } catch (err) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                error: 'User ID khong hop le'
            });
        }
    },

    validateCreateWalletUser: (req, res, next) => {
        const { full_name, email, phone, username } = req.body || {};
        
        // Security: Remove password from body if FE sends it
        if (req.body && req.body.password) {
            delete req.body.password;
        }

        if (!full_name || !String(full_name).trim()) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                error: 'Thieu thong tin bat buoc'
            });
        }
        if (!phone) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                error: 'So dien thoai la bat buoc'
            });
        }
        next();
    },

    validateCreateStaff: (req, res, next) => {
        const { full_name, email, phone, username, role_codes } = req.body || {};

        // Security: Remove password from body if FE sends it
        if (req.body && req.body.password) {
            delete req.body.password;
        }

        if (!full_name || !String(full_name).trim()) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                error: 'Thieu thong tin bat buoc (full_name)'
            });
        }
        if (!email) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                error: 'Email là bắt buộc khi tạo tài khoản nhân viên.'
            });
        }
        
        if (phone && !/^\d{9,15}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                error: 'Số điện thoại không hợp lệ (chỉ chứa số, 9-15 ký tự).'
            });
        }
        if (!role_codes || !Array.isArray(role_codes) || role_codes.length === 0) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                error: 'role_codes khong hop le hoac bi thieu'
            });
        }
        
        // Kiểm tra xem role_codes có hợp lệ không
        const allowedRoles = ['ADMIN', 'SUPPORT_STAFF', 'SUPER_ADMIN'];
        const isValidRoles = role_codes.every(role => allowedRoles.includes(role));
        if (!isValidRoles) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                error: 'Chỉ được phép tạo tài khoản với role: ADMIN, SUPPORT_STAFF, hoặc SUPER_ADMIN'
            });
        }
        
        next();
    },

    // Bắt buộc nhập lý do khi khóa/mở khóa
    validateReason: (req, res, next) => {
        const reason = req.body?.reason;
        if (!reason || !String(reason).trim()) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                error: 'Bat buoc nhap ly do thao tac'
            });
        }
        next();
    },

    validateResetPassword: (req, res, next) => {
        const { reason } = req.body || {};
        if (!reason || !String(reason).trim()) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                error: 'Bat buoc nhap ly do thao tac'
            });
        }
        next();
    }
};

module.exports = usersValidator;
