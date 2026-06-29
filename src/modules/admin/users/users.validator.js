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

    validateCreateCustomer: (req, res, next) => {
        const { full_name, email, phone, username } = req.body || {};

        if (!full_name || !String(full_name).trim()) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                error: 'Thieu thong tin bat buoc'
            });
        }
        if (!email && !phone && !username) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                error: 'Thieu thong tin bat buoc'
            });
        }
        next();
    },

    validateCreateStaff: (req, res, next) => {
        const { full_name, email, phone, username, role_codes } = req.body || {};

        if (!full_name || !String(full_name).trim()) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                error: 'Thieu thong tin bat buoc (full_name)'
            });
        }
        if (!email && !phone && !username) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                error: 'Thieu thong tin bat buoc (email/phone/username)'
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
        const { new_password, confirm_new_password, reason } = req.body || {};

        if (!new_password || new_password.length < 8) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                error: 'Mat khau phai co toi thieu 8 ky tu'
            });
        }
        if (new_password !== confirm_new_password) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                error: 'Mat khau xac nhan khong khop'
            });
        }
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
