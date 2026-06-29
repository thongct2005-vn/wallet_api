const SYSTEM_ROLES = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT_STAFF'];

function isSuperAdmin(actor) {
    return (actor.roles || []).includes('SUPER_ADMIN');
}

function hasWriteAccess(actor) {
    const roles = actor.roles || [];
    return roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
}

function ensureWriteAccess(actor) {
    if (!hasWriteAccess(actor)) {
        throw new Error('Admin_Write_Forbidden');
    }
}

module.exports = {
    SYSTEM_ROLES,
    isSuperAdmin,
    hasWriteAccess,
    ensureWriteAccess
};
