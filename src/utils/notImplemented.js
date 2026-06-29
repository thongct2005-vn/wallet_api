function notImplemented(featureName) {
    return (req, res) => res.status(501).json({
        success: false,
        code: 'NOT_IMPLEMENTED',
        message: `${featureName} chưa triển khai logic xử lý`,
        data: null
    });
}

module.exports = notImplemented;
