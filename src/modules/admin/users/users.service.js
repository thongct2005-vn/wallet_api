const bcrypt = require('bcrypt');
const usersRepository = require('./users.repository');
const walletRepository = require('../../wallet/wallet.repository');
const authService = require('../../auth/auth.service');
const auditLogService = require('../../system/audit_log.service');
const { ensureWriteAccess, sanitizeUserInput, normalizeOptional, isSuperAdmin, SYSTEM_ROLES, withTransaction, writeAuditLog } = require('../_shared');

function deriveUserType(roleCodes) {
    if (!roleCodes || roleCodes.length === 0) return 'USER';
    if (roleCodes.includes('SUPER_ADMIN')) return 'SUPER_ADMIN';
    if (roleCodes.includes('ADMIN')) return 'ADMIN';
    if (roleCodes.includes('SUPPORT_STAFF')) return 'SUPPORT_STAFF';
    if (roleCodes.includes('MERCHANT_OWNER') || roleCodes.includes('MERCHANT_STAFF')) return 'MERCHANT_USER';
    return 'USER';
}

const usersService = {
    listUsers: async (query) => {
        return usersRepository.listUsers({
            page: query.page,
            limit: query.limit,
            q: query.q || query.search,
            status: query.status,
            userType: query.user_type
        });
    },

    getUserDetail: async (userId) => {
        const user = await usersRepository.findUserById(userId);
        if (!user) throw new Error('User_Not_Found');
        return user;
    },

    createCustomer: async ({ actor, payload, ipAddress, userAgent }) => {
        ensureWriteAccess(actor);
        const data = sanitizeUserInput(payload);

        const conflict = await usersRepository.checkUserConflict({
            username: data.username,
            email: data.email,
            phone: data.phone
        });
        if (conflict) throw new Error('User_Conflict');

        const crypto = require('crypto');
        const rawPassword = payload.password || crypto.randomBytes(6).toString('hex');
        const passwordHash = await bcrypt.hash(rawPassword, 10);
        
        const derivedUserType = 'USER';
        const roleCodes = ['USER'];

        const created = await withTransaction(async (client) => {
            const userId = await usersRepository.createUser(client, {
                fullName: data.fullName,
                username: data.username,
                email: data.email,
                phone: data.phone,
                passwordHash,
                userType: derivedUserType,
                status: data.status || 'ACTIVE'
            });

            const rolesAssigned = await usersRepository.replaceRolesByCodes(client, userId, roleCodes);
            if (!rolesAssigned) throw new Error('Role_Not_Found');

            const authRepository = require('../../auth/auth.repository');
            const walletId = await authRepository.createWallet(client, userId);

            return { userId, walletId };
        });

        await writeAuditLog({
            actorId: actor.userId || actor.id,
            action: 'admin.customer_created',
            entityType: 'users',
            entityId: created.userId,
            newData: {
                user_type: derivedUserType,
                roles: roleCodes,
                status: data.status || 'ACTIVE',
                wallet_id: created.walletId
            },
            ipAddress,
            userAgent
        });

        const user = await usersService.getUserDetail(created.userId);
        return { ...user, generated_password: rawPassword };
    },

    createStaff: async ({ actor, payload, ipAddress, userAgent }) => {
        ensureWriteAccess(actor);
        const data = sanitizeUserInput(payload);
        
        const roleCodes = Array.isArray(data.roleCodes) ? data.roleCodes : [data.roleCodes];
        
        let derivedUserType = 'SUPPORT_STAFF';
        if (roleCodes.includes('SUPER_ADMIN')) {
            derivedUserType = 'SUPER_ADMIN';
            if (!isSuperAdmin(actor)) throw new Error('Super_Admin_Required');
        } else if (roleCodes.includes('ADMIN')) {
            derivedUserType = 'ADMIN';
            if (!isSuperAdmin(actor)) throw new Error('Super_Admin_Required');
        }

        const conflict = await usersRepository.checkUserConflict({
            username: data.username,
            email: data.email,
            phone: data.phone
        });
        if (conflict) throw new Error('User_Conflict');

        const crypto = require('crypto');
        const rawPassword = payload.password || crypto.randomBytes(6).toString('hex');
        const passwordHash = await bcrypt.hash(rawPassword, 10);

        const created = await withTransaction(async (client) => {
            const userId = await usersRepository.createUser(client, {
                fullName: data.fullName,
                username: data.username,
                email: data.email,
                phone: data.phone,
                passwordHash,
                userType: derivedUserType,
                status: data.status || 'ACTIVE'
            });

            const rolesAssigned = await usersRepository.replaceRolesByCodes(client, userId, roleCodes);
            if (!rolesAssigned) throw new Error('Role_Not_Found');

            return { userId };
        });

        await writeAuditLog({
            actorId: actor.userId || actor.id,
            action: 'admin.staff_created',
            entityType: 'users',
            entityId: created.userId,
            newData: {
                user_type: derivedUserType,
                roles: roleCodes,
                status: data.status || 'ACTIVE'
            },
            ipAddress,
            userAgent
        });

        const user = await usersService.getUserDetail(created.userId);
        return { ...user, generated_password: rawPassword };
    },

    updateUser: async ({ actor, userId, payload, ipAddress, userAgent }) => {
        ensureWriteAccess(actor);
        const oldUser = await usersRepository.findUserRawById(userId);
        if (!oldUser) throw new Error('User_Not_Found');

        const updates = {};
        ['full_name', 'username', 'email', 'phone'].forEach(key => {
            if (Object.prototype.hasOwnProperty.call(payload, key)) {
                updates[key] = normalizeOptional(payload[key]);
            }
        });
        if (Object.prototype.hasOwnProperty.call(payload, 'is_kyc_verified')) {
            updates.is_kyc_verified = Boolean(payload.is_kyc_verified);
        }

        let roleCodes = null;
        if (payload.role_codes && Array.isArray(payload.role_codes)) {
            roleCodes = payload.role_codes;
        } else if (payload.role_code) {
            roleCodes = [payload.role_code];
        }

        const isChangingRole = roleCodes !== null;
        let newType = oldUser.user_type;

        if (isChangingRole) {
            newType = deriveUserType(roleCodes);
            updates.user_type = newType;
            
            const involvesSystemRole = SYSTEM_ROLES.includes(oldUser.user_type) || SYSTEM_ROLES.includes(newType);
            if (involvesSystemRole && !isSuperAdmin(actor)) {
                throw new Error('Super_Admin_Required');
            }
            if ((actor.userId || actor.id) === userId) {
                throw new Error('Cannot_Change_Own_Role');
            }
        }

        if (Object.keys(updates).length === 0 && !isChangingRole) throw new Error('No_Update_Field');

        const conflict = await usersRepository.checkUserConflict({
            username: updates.username,
            email: updates.email,
            phone: updates.phone,
            excludeUserId: userId
        });
        if (conflict) throw new Error('User_Conflict');

        const updated = await withTransaction(async (client) => {
            let updatedUser = oldUser;
            if (Object.keys(updates).length > 0) {
                updatedUser = await usersRepository.updateUser(client, userId, updates);
            }
            
            if (isChangingRole) {
                const roleAssigned = await usersRepository.replaceRolesByCodes(client, userId, roleCodes);
                if (!roleAssigned) throw new Error('Role_Not_Found');
                await usersRepository.incrementTokenVersion(client, userId);
                updatedUser.token_version += 1;
            }
            return updatedUser;
        });

        await writeAuditLog({
            actorId: actor.userId || actor.id,
            action: 'admin.user_updated',
            entityType: 'users',
            entityId: userId,
            oldData: { ...oldUser },
            newData: { ...updated, roles: isChangingRole ? roleCodes : oldUser.roles },
            ipAddress,
            userAgent
        });

        return usersService.getUserDetail(userId);
    },

    lockUser: async ({ actor, userId, reason, ipAddress, userAgent }) => {
        ensureWriteAccess(actor);
        if ((actor.userId || actor.id) === userId) throw new Error('Cannot_Lock_Self');

        const oldUser = await usersRepository.findUserRawById(userId);
        if (!oldUser) throw new Error('User_Not_Found');
        if (SYSTEM_ROLES.includes(oldUser.user_type) && !isSuperAdmin(actor)) {
            throw new Error('Super_Admin_Required');
        }

        const updated = await usersRepository.lockUser(userId);
        await writeAuditLog({
            actorId: actor.userId || actor.id,
            action: 'admin.user_locked',
            entityType: 'users',
            entityId: userId,
            oldData: { status: oldUser.status, token_version: oldUser.token_version },
            newData: { status: updated.status, token_version: updated.token_version },
            reason,
            ipAddress,
            userAgent
        });

        return usersService.getUserDetail(userId);
    },

    unlockUser: async ({ actor, userId, reason, ipAddress, userAgent }) => {
        ensureWriteAccess(actor);
        const oldUser = await usersRepository.findUserRawById(userId);
        if (!oldUser) throw new Error('User_Not_Found');
        if (SYSTEM_ROLES.includes(oldUser.user_type) && !isSuperAdmin(actor)) {
            throw new Error('Super_Admin_Required');
        }

        const updated = await usersRepository.unlockUser(userId);
        await writeAuditLog({
            actorId: actor.userId || actor.id,
            action: 'admin.user_unlocked',
            entityType: 'users',
            entityId: userId,
            oldData: { status: oldUser.status, token_version: oldUser.token_version },
            newData: { status: updated.status, token_version: updated.token_version },
            reason,
            ipAddress,
            userAgent
        });

        return usersService.getUserDetail(userId);
    },

    resetUserPassword: async ({ actor, userId, newPassword, confirmNewPassword, reason, ipAddress, userAgent }) => {
        ensureWriteAccess(actor);
        const user = await usersRepository.findUserRawById(userId);
        if (!user) throw new Error('User_Not_Found');
        if (SYSTEM_ROLES.includes(user.user_type) && !isSuperAdmin(actor)) {
            throw new Error('Super_Admin_Required');
        }

        await authService.resetPasswordByAdmin({
            actorId: actor.userId || actor.id,
            userId,
            newPassword,
            confirmNewPassword,
            reason,
            ipAddress,
            userAgent
        });

        return usersService.getUserDetail(userId);
    },

    getUserAuditLogs: async ({ userId, query }) => {
        await usersService.getUserDetail(userId);
        return auditLogService.listForUser({ userId, query });
    },

    getUserWallet: async (userId) => {
        const user = await usersService.getUserDetail(userId);
        if (!user.wallet) throw new Error('Wallet_Not_Found');
        return user.wallet;
    }
};

module.exports = usersService;
