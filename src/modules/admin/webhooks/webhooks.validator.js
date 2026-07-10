const mongoose = require('mongoose');

const webhooksValidator = {
    validateIdParam: (req, res, next) => {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                code: 'VALIDATION_ERROR',
                error: 'ID không hợp lệ'
            });
        }
        next();
    }
};

module.exports = webhooksValidator;
