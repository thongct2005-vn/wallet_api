function success(res, data, message = 'OK', status = 200) {
    return res.status(status).json({
        success: true,
        code: 'OK',
        message,
        data
    });
}

function error(res, status, code, message) {
    return res.status(status).json({
        success: false,
        code,
        error: message
    });
}

module.exports = { success, error };
