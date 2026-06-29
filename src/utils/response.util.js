const { v7: uuidv7 } = require('uuid');

function traceId(req) {
    return req.headers['x-request-id'] || `trace-${uuidv7()}`;
}

const responseUtil = {
    success: (req, res, status, message, data = null) => {
        return res.status(status).json({
            success: true,
            message,
            data,
            trace_id: traceId(req)
        });
    },

    failure: (req, res, status, errorCode, message, errors = null) => {
        return res.status(status).json({
            success: false,
            message,
            error_code: errorCode,
            ...(errors ? { errors } : {}),
            trace_id: traceId(req)
        });
    }
};

module.exports = responseUtil;
