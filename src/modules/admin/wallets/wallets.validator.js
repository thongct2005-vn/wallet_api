const { ensureUuid } = require('../_shared');

const walletsValidator = {
    validateIdParam: (req, res, next) => {
        try {
            ensureUuid(req.params.id, 'Invalid_Wallet_Id');
            next();
        } catch (err) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                error: 'Wallet ID khong hop le'
            });
        }
    },

    validateReason: (req, res, next) => {
        const reason = req.body?.reason;
        if (!reason || String(reason).trim() === '') {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                error: 'Bat buoc nhap ly do thao tac'
            });
        }
        next();
    }
};

module.exports = walletsValidator;
