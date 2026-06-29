const rolesRepository = require('./roles.repository');
const { ensureUuid, writeAuditLog, ensureWriteAccess } = require('../_shared');

const SYSTEM_ROLES = ['ADMIN', 'SUPER_ADMIN', 'USER', 'MERCHANT'];

const rolesService = {
    listRoles: async () => {
        return rolesRepository.listRoles();
    },

    getRoleDetail: async (id) => {
        ensureUuid(id, 'Invalid_Role_Id');
        const role = await rolesRepository.findRoleById(id);
        if (!role) throw new Error('Role_Not_Found');
        return role;
    },

    createRole: async (payload, actor) => {
        ensureWriteAccess(actor);
        
        const existing = await rolesRepository.findByCode(payload.code);
        if (existing) throw new Error('Role_Code_Exists');

        const roleData = {
            code: payload.code.toUpperCase().replace(/\s+/g, '_'),
            name: payload.name,
            description: payload.description || null
        };

        const newRole = await rolesRepository.createRole(roleData);

        if (payload.permissions && Array.isArray(payload.permissions)) {
            await rolesRepository.assignPermissions(newRole.id, payload.permissions);
        }

        await writeAuditLog({
            actorId: actor.userId,
            action: 'role.create',
            entityType: 'ROLE',
            entityId: newRole.id,
            newData: { ...roleData, permissions: payload.permissions },
            ipAddress: payload.ipAddress,
            userAgent: payload.userAgent
        });

        return newRole;
    },

    updateRole: async (id, payload, actor) => {
        ensureWriteAccess(actor);
        ensureUuid(id, 'Invalid_Role_Id');

        const role = await rolesRepository.findRoleById(id);
        if (!role) throw new Error('Role_Not_Found');

        if (SYSTEM_ROLES.includes(role.code) && payload.is_active === false) {
            throw new Error('Cannot_Disable_System_Role');
        }

        const updatedRole = await rolesRepository.updateRole(id, {
            name: payload.name,
            description: payload.description,
            is_active: payload.is_active
        });

        if (payload.permissions && Array.isArray(payload.permissions)) {
            await rolesRepository.assignPermissions(id, payload.permissions);
        }

        await writeAuditLog({
            actorId: actor.userId,
            action: 'role.update',
            entityType: 'ROLE',
            entityId: id,
            oldData: { name: role.name, is_active: role.is_active },
            newData: payload,
            ipAddress: payload.ipAddress,
            userAgent: payload.userAgent
        });

        return updatedRole;
    },

    listPermissions: async () => {
        return rolesRepository.listPermissions();
    }
};

module.exports = rolesService;
