const mapRoleRow = (row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at
});

const mapPermissionRow = (row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    created_at: row.created_at
});

const mapRoleDetailRow = (row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    is_active: row.is_active,
    permissions: row.permissions || [],
    created_at: row.created_at,
    updated_at: row.updated_at
});

module.exports = {
    mapRoleRow,
    mapPermissionRow,
    mapRoleDetailRow
};
