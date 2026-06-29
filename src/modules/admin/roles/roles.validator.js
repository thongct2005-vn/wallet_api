const { ensureUuid } = require('../_shared');

const rolesValidator = {
    validateIdParam: (req, res, next) => {
        try {
            ensureUuid(req.params.id, 'Invalid_Role_Id');
            next();
        } catch (error) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                error: 'Role ID khong hop le'
            });
        }
    },

    validateCreateRole: (req, res, next) => {
        const { code, name } = req.body;
        if (!code || typeof code !== 'string' || code.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Role code is required',
                error_code: 'Invalid_Input'
            });
        }
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Role name is required',
                error_code: 'Invalid_Input'
            });
        }
        next();
    },

    validateUpdateRole: (req, res, next) => {
        const { name, is_active } = req.body;
        if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
            return res.status(400).json({
                success: false,
                message: 'Role name cannot be empty',
                error_code: 'Invalid_Input'
            });
        }
        if (is_active !== undefined && typeof is_active !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'is_active must be a boolean',
                error_code: 'Invalid_Input'
            });
        }
        next();
    }
};

module.exports = rolesValidator;
