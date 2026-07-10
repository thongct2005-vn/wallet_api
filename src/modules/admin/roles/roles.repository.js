const pool = require('../../../config/db');
const { buildPagination } = require('../_shared');
const { mapRoleRow, mapRoleDetailRow, mapPermissionRow } = require('./roles.mapper');

const { v7: uuidv7 } = require('uuid');

const ROLE_SELECT = `
    SELECT id, code, name, description, is_active, created_at, updated_at
    FROM roles
`;

const rolesRepository = {
    listRoles: async () => {
        const query = `
            SELECT r.*, 
                   COALESCE(
                       json_agg(p.code) FILTER (WHERE p.code IS NOT NULL), 
                       '[]'
                   ) as permissions
            FROM roles r
            LEFT JOIN role_permissions rp ON r.id = rp.role_id
            LEFT JOIN permissions p ON rp.permission_id = p.id
            GROUP BY r.id
            ORDER BY r.created_at DESC
        `;
        const res = await pool.query(query);
        return res.rows.map(row => ({
            ...mapRoleRow(row),
            permissions: row.permissions
        }));
    },

    findRoleById: async (id) => {
        const roleQuery = `
            ${ROLE_SELECT}
            WHERE id = $1
        `;
        const roleRes = await pool.query(roleQuery, [id]);
        if (roleRes.rows.length === 0) return null;
        
        const role = roleRes.rows[0];

        const permQuery = `
            SELECT p.id, p.code, p.name, p.description, p.created_at
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = $1
        `;
        const permRes = await pool.query(permQuery, [id]);
        
        role.permissions = permRes.rows.map(mapPermissionRow);
        
        return mapRoleDetailRow(role);
    },

    findByCode: async (code) => {
        const res = await pool.query(`SELECT id FROM roles WHERE code = $1`, [code]);
        return res.rows[0] || null;
    },

    createRole: async (roleData) => {
        const query = `
            INSERT INTO roles (id, code, name, description, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, code, name, description, is_active, created_at
        `;
        const id = uuidv7();
        const values = [id, roleData.code, roleData.name, roleData.description, true];
        const res = await pool.query(query, values);
        return mapRoleRow(res.rows[0]);
    },

    updateRole: async (id, updateData) => {
        const fields = [];
        const values = [];
        let index = 1;

        if (updateData.name !== undefined) {
            fields.push(`name = $${index++}`);
            values.push(updateData.name);
        }
        if (updateData.description !== undefined) {
            fields.push(`description = $${index++}`);
            values.push(updateData.description);
        }
        if (updateData.is_active !== undefined) {
            fields.push(`is_active = $${index++}`);
            values.push(updateData.is_active);
        }

        if (fields.length === 0) return null;

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const query = `
            UPDATE roles
            SET ${fields.join(', ')}
            WHERE id = $${index}
            RETURNING id, code, name, description, is_active, created_at, updated_at
        `;
        const res = await pool.query(query, values);
        return res.rows.length > 0 ? mapRoleRow(res.rows[0]) : null;
    },

    assignPermissions: async (roleId, permissionCodes) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Delete old permissions
            await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
            
            if (permissionCodes && permissionCodes.length > 0) {
                // Find permission IDs by codes
                const permRes = await client.query(`
                    SELECT id FROM permissions WHERE code = ANY($1)
                `, [permissionCodes]);
                
                const permIds = permRes.rows.map(row => row.id);
                
                if (permIds.length > 0) {
                    const values = [];
                    const params = [];
                    let idx = 1;
                    
                    permIds.forEach(pId => {
                        values.push(`($${idx++}, $${idx++})`);
                        params.push(roleId, pId);
                    });
                    
                    await client.query(`
                        INSERT INTO role_permissions (role_id, permission_id)
                        VALUES ${values.join(', ')}
                    `, params);
                }
            }
            
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    listPermissions: async () => {
        const query = `
            SELECT id, code, name, description, created_at
            FROM permissions
            ORDER BY code ASC
        `;
        const res = await pool.query(query);
        return res.rows.map(mapPermissionRow);
    }
};

module.exports = rolesRepository;
