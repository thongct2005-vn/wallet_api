const { ensureUuid } = require('../_shared');

const transactionsValidator = {
    validateIdParam: (req, res, next) => {
        try {
            ensureUuid(req.params.id, 'Invalid_Id');
            next();
        } catch (err) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                error: 'ID giao dich khong hop le'
            });
        }
    }
};

module.exports = transactionsValidator;
