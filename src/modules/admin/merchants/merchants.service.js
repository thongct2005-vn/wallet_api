const crypto = require('crypto');
const merchantsRepository = require('./merchants.repository');
const { ensureUuid, writeAuditLog, ensureWriteAccess } = require('../_shared');

const generateApiKey = () => `pk_live_${crypto.randomBytes(12).toString('hex')}`;
const generateApiSecret = () => `sk_live_${crypto.randomBytes(24).toString('hex')}`;
const hashApiSecret = (secret) => {
    const pepper = process.env.API_SECRET_PEPPER;
    if (!pepper) throw new Error('System_Config_Error: Missing API_SECRET_PEPPER');
    return crypto.createHmac('sha256', pepper).update(secret).digest('hex');
};

const merchantsService = {
    createMerchant: async (data, actor) => {
        ensureWriteAccess(actor);
        const pool = merchantsRepository.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Tạo merchant
            const merchant = await merchantsRepository.createMerchant(data, client);

            // Tạo Merchant Owner user
            const usersRepository = require('../users/users.repository');
            const bcrypt = require('bcrypt');
            const cryptoStr = require('crypto');
            
            const rawPassword = cryptoStr.randomBytes(6).toString('hex');
            const passwordHash = await bcrypt.hash(rawPassword, 10);
            
            const userId = await usersRepository.createUser(client, {
                fullName: data.owner_info.full_name,
                username: data.owner_info.username,
                email: data.owner_info.email,
                phone: data.owner_info.phone,
                passwordHash,
                userType: 'MERCHANT_USER',
                status: 'ACTIVE'
            });

            await usersRepository.replaceRolesByCodes(client, userId, ['MERCHANT_OWNER']);
            
            const crypto = require('crypto');
            await client.query(`
                INSERT INTO merchant_users (id, merchant_id, user_id, role_code, is_owner)
                VALUES ($1, $2, $3, $4, $5)
            `, [crypto.randomUUID(), merchant.id, userId, 'MERCHANT_OWNER', true]);
            
            // Nếu có data callback thì tạo config
            let callbackConfig = null;
            if (data.callback) {
                callbackConfig = await merchantsRepository.createCallbackConfig(merchant.id, data.callback, client);
            }

            const sanitizeCallbackConfig = (config) => {
                if (!config) return null;
                const { webhook_secret_hash, ...rest } = config;
                return rest;
            };

            await writeAuditLog({
                actorId: actor.userId,
                action: 'merchant.create',
                entityType: 'MERCHANT',
                entityId: merchant.id,
                oldData: null,
                newData: { merchant, callbackConfig: sanitizeCallbackConfig(callbackConfig), owner_user_id: userId },
                ipAddress: actor.ipAddress,
                userAgent: actor.userAgent
            });

            await client.query('COMMIT');
            return { ...merchant, callback_config: sanitizeCallbackConfig(callbackConfig), owner_password: rawPassword };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    updateMerchant: async (id, data, actor) => {
        ensureWriteAccess(actor);
        ensureUuid(id, 'Invalid_Merchant_Id');
        
        const pool = merchantsRepository.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const merchant = await merchantsRepository.findMerchantById(id);
            if (!merchant) throw new Error('Merchant_Not_Found');

            const oldCallbackConfig = await merchantsRepository.findCallbackConfig(id, client);

            const updatedMerchant = await merchantsRepository.updateMerchantInfo(id, data.profile || data, client);
            
            let updatedCallback = null;
            if (data.callback) {
                if (oldCallbackConfig) {
                    updatedCallback = await merchantsRepository.updateCallbackConfig(oldCallbackConfig.id, data.callback, client);
                } else {
                    updatedCallback = await merchantsRepository.createCallbackConfig(id, data.callback, client);
                }
            }

            const sanitizeCallbackConfig = (config) => {
                if (!config) return null;
                const { webhook_secret_hash, ...rest } = config;
                return rest;
            };

            await writeAuditLog({
                actorId: actor.userId,
                action: 'merchant.update',
                entityType: 'MERCHANT',
                entityId: id,
                oldData: { merchant, callback_config: sanitizeCallbackConfig(oldCallbackConfig) },
                newData: { merchant: updatedMerchant, callback_config: sanitizeCallbackConfig(updatedCallback) },
                ipAddress: actor.ipAddress,
                userAgent: actor.userAgent
            });

            await client.query('COMMIT');
            return {
                merchant: updatedMerchant || merchant,
                callback_config: sanitizeCallbackConfig(updatedCallback || oldCallbackConfig)
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    createApiKey: async (id, data, actor) => {
        ensureWriteAccess(actor);
        ensureUuid(id, 'Invalid_Merchant_Id');

        const merchant = await merchantsRepository.findMerchantById(id);
        if (!merchant) throw new Error('Merchant_Not_Found');

        const rawApiKey = generateApiKey();
        const rawSecret = generateApiSecret();
        const secretHash = hashApiSecret(rawSecret);

        const newKey = await merchantsRepository.createApiKey(id, data.key_name, rawApiKey, secretHash, data.environment);

        await writeAuditLog({
            actorId: actor.userId,
            action: 'merchant_api_key.create',
            entityType: 'MERCHANT_API_KEY',
            entityId: newKey.id,
            oldData: null,
            newData: { merchant_id: id, key_name: data.key_name, environment: data.environment },
            ipAddress: actor.ipAddress,
            userAgent: actor.userAgent
        });

        // Trả về duy nhất 1 lần
        return {
            ...newKey,
            raw_secret: rawSecret
        };
    },

    rotateApiKey: async (id, keyId, actor) => {
        ensureWriteAccess(actor);
        ensureUuid(id, 'Invalid_Merchant_Id');
        ensureUuid(keyId, 'Invalid_Key_Id');

        const pool = merchantsRepository.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const oldKey = await merchantsRepository.findApiKeyById(keyId, client);
            if (!oldKey || oldKey.merchant_id !== id) throw new Error('Api_Key_Not_Found');
            if (oldKey.status === 'REVOKED') throw new Error('Api_Key_Already_Revoked');

            // Thu hồi key cũ
            await merchantsRepository.updateApiKeyStatus(keyId, 'REVOKED', client);

            // Tạo key mới
            const rawApiKey = generateApiKey();
            const rawSecret = generateApiSecret();
            const secretHash = hashApiSecret(rawSecret);

            const newKey = await merchantsRepository.createApiKey(id, `${oldKey.key_name} (Rotated)`, rawApiKey, secretHash, oldKey.environment, client);

            await writeAuditLog({
                actorId: actor.userId,
                action: 'merchant_api_key.rotate',
                entityType: 'MERCHANT_API_KEY',
                entityId: newKey.id,
                oldData: { old_key_id: oldKey.id, status: oldKey.status },
                newData: { new_key_id: newKey.id },
                ipAddress: actor.ipAddress,
                userAgent: actor.userAgent
            });

            await client.query('COMMIT');
            return {
                ...newKey,
                raw_secret: rawSecret
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    revokeApiKey: async (id, keyId, reason, actor) => {
        ensureWriteAccess(actor);
        ensureUuid(id, 'Invalid_Merchant_Id');
        ensureUuid(keyId, 'Invalid_Key_Id');
        if (!reason || reason.trim() === '') throw new Error('Reason_Required');

        const oldKey = await merchantsRepository.findApiKeyById(keyId);
        if (!oldKey || oldKey.merchant_id !== id) throw new Error('Api_Key_Not_Found');
        if (oldKey.status === 'REVOKED') throw new Error('Api_Key_Already_Revoked');

        const revokedKey = await merchantsRepository.updateApiKeyStatus(keyId, 'REVOKED');

        await writeAuditLog({
            actorId: actor.userId,
            action: 'merchant_api_key.revoke',
            entityType: 'MERCHANT_API_KEY',
            entityId: keyId,
            oldData: { status: oldKey.status },
            newData: { status: 'REVOKED', reason },
            ipAddress: actor.ipAddress,
            userAgent: actor.userAgent
        });

        return revokedKey;
    },

    listMerchants: async (page, limit, search) => {
        return await merchantsRepository.listMerchants(page, limit, search);
    },

    getMerchantDetail: async (id) => {
        ensureUuid(id, 'Invalid_Merchant_Id');
        const merchant = await merchantsRepository.findMerchantById(id);
        if (!merchant) throw new Error('Merchant_Not_Found');

        const callbackConfig = await merchantsRepository.findCallbackConfig(id);
        if (callbackConfig) delete callbackConfig.webhook_secret_hash; // Không trả về secret hash ra ngoài

        return {
            merchant,
            callback_config: callbackConfig || null
        };
    },

    approveMerchant: async (id, reason, actor) => {
        ensureWriteAccess(actor);
        ensureUuid(id, 'Invalid_Merchant_Id');
        
        const merchant = await merchantsRepository.findMerchantById(id);
        if (!merchant) throw new Error('Merchant_Not_Found');
        if (merchant.status === 'ACTIVE') throw new Error('Merchant_Already_Active');

        const updated = await merchantsRepository.updateMerchantStatus(id, 'ACTIVE', reason);

        await writeAuditLog({
            actorId: actor.userId,
            action: 'merchant.approve',
            entityType: 'MERCHANT',
            entityId: id,
            oldData: { status: merchant.status },
            newData: { status: 'ACTIVE', risk_note: reason || merchant.risk_note },
            ipAddress: actor.ipAddress,
            userAgent: actor.userAgent
        });

        return updated;
    },

    rejectMerchant: async (id, reason, actor) => {
        ensureWriteAccess(actor);
        ensureUuid(id, 'Invalid_Merchant_Id');
        if (!reason || reason.trim() === '') throw new Error('Reason_Required');

        const merchant = await merchantsRepository.findMerchantById(id);
        if (!merchant) throw new Error('Merchant_Not_Found');
        if (merchant.status === 'REJECTED') throw new Error('Merchant_Already_Rejected');

        const updated = await merchantsRepository.updateMerchantStatus(id, 'REJECTED', reason);

        await writeAuditLog({
            actorId: actor.userId,
            action: 'merchant.reject',
            entityType: 'MERCHANT',
            entityId: id,
            oldData: { status: merchant.status },
            newData: { status: 'REJECTED', risk_note: reason },
            ipAddress: actor.ipAddress,
            userAgent: actor.userAgent
        });

        return updated;
    },

    suspendMerchant: async (id, reason, actor) => {
        ensureWriteAccess(actor);
        ensureUuid(id, 'Invalid_Merchant_Id');
        if (!reason || reason.trim() === '') throw new Error('Reason_Required');

        const merchant = await merchantsRepository.findMerchantById(id);
        if (!merchant) throw new Error('Merchant_Not_Found');
        if (merchant.status === 'SUSPENDED') throw new Error('Merchant_Already_Suspended');

        const updated = await merchantsRepository.updateMerchantStatus(id, 'SUSPENDED', reason);

        await writeAuditLog({
            actorId: actor.userId,
            action: 'merchant.suspend',
            entityType: 'MERCHANT',
            entityId: id,
            oldData: { status: merchant.status },
            newData: { status: 'SUSPENDED', risk_note: reason },
            ipAddress: actor.ipAddress,
            userAgent: actor.userAgent
        });

        return updated;
    },

    activateMerchant: async (id, reason, actor) => {
        ensureWriteAccess(actor);
        ensureUuid(id, 'Invalid_Merchant_Id');

        const merchant = await merchantsRepository.findMerchantById(id);
        if (!merchant) throw new Error('Merchant_Not_Found');
        if (merchant.status === 'ACTIVE') throw new Error('Merchant_Already_Active');

        const updated = await merchantsRepository.updateMerchantStatus(id, 'ACTIVE', reason);

        await writeAuditLog({
            actorId: actor.userId,
            action: 'merchant.activate',
            entityType: 'MERCHANT',
            entityId: id,
            oldData: { status: merchant.status },
            newData: { status: 'ACTIVE', risk_note: reason || merchant.risk_note },
            ipAddress: actor.ipAddress,
            userAgent: actor.userAgent
        });

        return updated;
    },

    getMerchantApiKeys: async (id) => {
        ensureUuid(id, 'Invalid_Merchant_Id');
        const merchant = await merchantsRepository.findMerchantById(id);
        if (!merchant) throw new Error('Merchant_Not_Found');

        return await merchantsRepository.getMerchantApiKeys(id);
    }
};

module.exports = merchantsService;
