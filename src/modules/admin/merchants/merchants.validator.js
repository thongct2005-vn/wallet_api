const { ensureUuid, handleAdminError } = require('../_shared');

const merchantsValidator = {
    validateIdParam: (req, res, next) => {
        try {
            ensureUuid(req.params.id, 'Invalid_Merchant_Id');
            next();
        } catch (error) {
            return handleAdminError(res, error, 'Validation Error:');
        }
    },

    validateActionReason: (req, res, next) => {
        // reason is required for reject and suspend
        const action = req.path.split('/').pop(); // "approve", "reject", "suspend", "activate", "rotate", "revoke"
        const reason = (req.body || {}).reason;

        if (['reject', 'suspend', 'revoke'].includes(action)) {
            if (!reason || typeof reason !== 'string' || reason.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Reason is required for this action',
                    error_code: 'Reason_Required'
                });
            }
        }
        next();
    },

    validateKeyIdParam: (req, res, next) => {
        try {
            ensureUuid(req.params.keyId, 'Invalid_Key_Id');
            next();
        } catch (error) {
            return handleAdminError(res, error, 'Validation Error:');
        }
    },

    validateCreateMerchant: (req, res, next) => {
        const { merchant_name, business_type, owner_info } = req.body;
        if (!merchant_name || !business_type) {
            return res.status(400).json({
                success: false,
                message: 'merchant_name, business_type are required',
                error_code: 'Validation_Error'
            });
        }
        if (!owner_info || !owner_info.full_name || !owner_info.username || !owner_info.email) {
             return res.status(400).json({
                success: false,
                message: 'owner_info with full_name, username, and email is required (email la bat buoc doi voi merchant)',
                error_code: 'Validation_Error'
            });
        }
        next();
    },

    validateCreateApiKey: (req, res, next) => {
        const body = req.body || {};
        const { key_name, environment } = body;
        if (!key_name || !environment) {
            return res.status(400).json({
                success: false,
                message: 'key_name, environment are required',
                error_code: 'Validation_Error'
            });
        }
        if (!['SANDBOX', 'LIVE'].includes(environment)) {
            return res.status(400).json({
                success: false,
                message: 'environment must be SANDBOX or LIVE',
                error_code: 'Validation_Error'
            });
        }
        next();
    }
};

module.exports = merchantsValidator;
