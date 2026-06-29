const auditLogRepository = require('./audit_log.repository');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateDate(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new Error('Invalid_Date_Filter');
    return date.toISOString();
}

const auditLogService = {
    listForUser: async ({ userId, query }) => {
        if (!UUID_REGEX.test(String(userId || ''))) {
            throw new Error('Invalid_User_Id');
        }

        return auditLogRepository.listByEntity({
            entityType: 'users',
            entityId: userId,
            action: query.action,
            from: validateDate(query.from),
            to: validateDate(query.to),
            page: query.page,
            pageSize: query.page_size || query.limit
        });
    }
};

module.exports = auditLogService;
