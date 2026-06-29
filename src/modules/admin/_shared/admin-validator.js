const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeOptional(value) {
    if (value === undefined || value === null) return null;
    const trimmed = String(value).trim();
    return trimmed || null;
}

function sanitizeUserInput(payload = {}) {
    return {
        fullName: normalizeOptional(payload.full_name),
        username: normalizeOptional(payload.username),
        email: normalizeOptional(payload.email),
        phone: normalizeOptional(payload.phone),
        password: payload.password,
        userType: payload.user_type || 'USER',
        status: payload.status || 'ACTIVE',
        roleCode: payload.role_code || payload.user_type || 'USER',
        createWallet: payload.create_wallet !== false // Mặc định là true nếu không truyền
    };
}

function ensureUuid(value, errorCode = 'Invalid_Id') {
    if (!UUID_REGEX.test(String(value || ''))) {
        throw new Error(errorCode);
    }
}

module.exports = {
    UUID_REGEX,
    normalizeOptional,
    sanitizeUserInput,
    ensureUuid
};
