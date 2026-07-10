const crypto = require('crypto');
const bcrypt = require('bcrypt');
const merchantRepository = require('./merchant.repository');
const { writeAuditLog } = require('../admin/_shared');
const { encryptApiSecret } = require('../../shared/utils/api-secret.util');
const { v7: uuidv7 } = require('uuid');
const pool = require('../../config/db');
const txRepo = require('../transaction/transaction.repository');
const generateApiKeySandbox = () => `pk_test_${crypto.randomBytes(12).toString('hex')}`;
const generateApiSecretSandbox = () => `sk_test_${crypto.randomBytes(24).toString('hex')}`;
const generateApiSecretLive = () => `sk_live_${crypto.randomBytes(24).toString('hex')}`;

const merchantService = {
    createApiKey: async (merchantId, keyName, userId, ipAddress, userAgent) => {
        const rawApiKey = generateApiKeySandbox();
        const rawSecret = generateApiSecretSandbox();
        const secretEncrypted = encryptApiSecret(rawSecret);

        const newKey = await merchantRepository.createApiKey(merchantId, keyName, rawApiKey, secretEncrypted, 'SANDBOX');

        await writeAuditLog({
            actorId: userId,
            action: 'merchant.api_key.create',
            entityType: 'MERCHANT_API_KEY',
            entityId: newKey.id,
            oldData: null,
            newData: { merchant_id: merchantId, key_name: keyName, environment: 'SANDBOX' },
            ipAddress,
            userAgent
        }).catch(err => console.error("Audit log error:", err));

        return {
            ...newKey,
            raw_secret: rawSecret
        };
    },

    rotateApiKey: async (merchantId, keyId, userId, ipAddress, userAgent) => {
        const oldKey = await merchantRepository.getApiKeyByIdAndMerchant(keyId, merchantId);
        if (!oldKey) throw new Error('Api_Key_Not_Found');
        if (oldKey.status === 'REVOKED') throw new Error('Api_Key_Already_Revoked');

        const isLive = oldKey.environment === 'LIVE';
        const rawSecret = isLive
            ? generateApiSecretLive()
            : generateApiSecretSandbox();

        const secretEncrypted = encryptApiSecret(rawSecret);
        const updatedKey = await merchantRepository.updateApiSecretHash(keyId, secretEncrypted);

        await writeAuditLog({
            actorId: userId,
            action: 'merchant.api_key.rotate',
            entityType: 'MERCHANT_API_KEY',
            entityId: keyId,
            oldData: { status: oldKey.status },
            newData: { rotated: true },
            ipAddress,
            userAgent
        }).catch(err => console.error("Audit log error:", err));

        return {
            ...updatedKey,
            raw_secret: rawSecret
        };
    },

    revokeApiKey: async (merchantId, keyId, reason, userId, ipAddress, userAgent) => {
        const oldKey = await merchantRepository.getApiKeyByIdAndMerchant(keyId, merchantId);
        if (!oldKey) throw new Error('Api_Key_Not_Found');
        if (oldKey.status === 'REVOKED') throw new Error('Api_Key_Already_Revoked');

        await merchantRepository.revokeApiKey(keyId);

        await writeAuditLog({
            actorId: userId,
            action: 'merchant.api_key.revoke',
            entityType: 'MERCHANT_API_KEY',
            entityId: keyId,
            oldData: { status: oldKey.status },
            newData: { status: 'REVOKED', reason: reason || null },
            ipAddress,
            userAgent
        }).catch(err => console.error("Audit log error:", err));

        return true;
    },

    withdrawToWallet: async (merchantId, userId, amountStr, pin) => {
        const client = await pool.connect();
        try {
            const amount = BigInt(amountStr);
            if (amount < 10000n) throw new Error('Số tiền rút tối thiểu là 10.000đ');
            if (amount > 50000000n) throw new Error('Số tiền rút tối đa là 50.000.000đ/lần');

            await client.query('BEGIN');

            const merchantWalletId = merchantId; 
            const userWallet = await txRepo.getWalletByUserId(userId);
            if (!userWallet) throw new Error('Không tìm thấy ví cá nhân của bạn');
            
            // Khóa và lấy thông tin rút tiền (cùng với số dư)
            const query = `
                SELECT available_balance, daily_withdraw_usage, last_withdraw_date
                FROM merchant_balances
                WHERE merchant_id = $1
                FOR UPDATE
            `;
            const result = await client.query(query, [merchantWalletId]);
            if (result.rows.length === 0) throw new Error('Không tìm thấy ví doanh nghiệp');

            const mBalanceBefore = BigInt(result.rows[0].available_balance);
            let dailyUsage = BigInt(result.rows[0].daily_withdraw_usage || 0);
            const lastDate = result.rows[0].last_withdraw_date;

            const today = new Date().toISOString().split('T')[0];
            let isNewDay = false;
            
            // Nếu qua ngày mới thì reset usage
            if (!lastDate || new Date(lastDate).toISOString().split('T')[0] !== today) {
                dailyUsage = 0n;
                isNewDay = true;
            }

            if (dailyUsage + amount > 50000000n) {
                throw new Error(`Rút tiền thất bại. Tổng hạn mức rút tối đa là 50.000.000đ/ngày. Bạn đã rút ${dailyUsage.toString()}đ hôm nay.`);
            }

            if (mBalanceBefore < amount) throw new Error('Số dư cửa hàng không đủ để rút');

            const uBalanceBefore = await txRepo.lockAndGetBalance(client, userWallet.id);

            const mBalanceAfter = await txRepo.addMerchantBalance(client, merchantWalletId, -amount);
            const uBalanceAfter = await txRepo.addBalance(client, userWallet.id, amount);

            // Cập nhật lại hạn mức trong DB
            await client.query(`
                UPDATE merchant_balances
                SET daily_withdraw_usage = $1, last_withdraw_date = CURRENT_DATE
                WHERE merchant_id = $2
            `, [(dailyUsage + amount).toString(), merchantWalletId]);

            const tId = uuidv7();
            const ledgerTxId = await txRepo.createLedgerTransaction(client, 'MERCHANT_PAYOUT', tId, 'TRANSFER', 'Rút tiền doanh thu về ví cá nhân', amount);

            await txRepo.createLedgerEntry(client, ledgerTxId, merchantWalletId, 'DEBIT', amount, mBalanceBefore, mBalanceAfter, 'MERCHANT');
            await txRepo.createLedgerEntry(client, ledgerTxId, userWallet.id, 'CREDIT', amount, uBalanceBefore, uBalanceAfter, 'PERSONAL');

            await writeAuditLog({
                actorId: userId,
                action: 'merchant.withdraw_to_wallet',
                entityType: 'MERCHANT',
                entityId: merchantId,
                oldData: { balance: mBalanceBefore.toString() },
                newData: { balance: mBalanceAfter.toString(), amount: amount.toString() },
                ipAddress: 'system',
                userAgent: 'merchant.service'
            });

            await client.query('COMMIT');
            
            // [NEW] Emit realtime balance to merchant owner
            if (merchantId) {
                const ownerId = await merchantRepository.getMerchantUserId(merchantId);
                if (ownerId) {
                    const { emitToUser } = require('../../utils/socket');
                    emitToUser(ownerId, 'merchant_balance_update', { newBalance: mBalanceAfter.toString() });
                }
            }

            return {
                amount: amount.toString(),
                merchantBalance: mBalanceAfter.toString(),
                userBalance: uBalanceAfter.toString(),
                transactionId: tId
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    withdrawToBank: async (merchantId, userId, amountStr, pin, bankCode, accountNumber, idempotencyKey = null) => {
        const client = await pool.connect();
        try {
            const amount = BigInt(amountStr);
            if (amount < 50000n) throw new Error('Số tiền rút tối thiểu là 50.000đ');

            // Xác thực mã PIN trước (Sử dụng ví cá nhân của owner để xác thực)
            const userWallet = await txRepo.getWalletForPinCheck(userId);
            if (!userWallet) throw new Error('Không tìm thấy ví cá nhân của bạn');
            
            const pepper = process.env.PIN_PEPPER || '';
            let isPinValid = await bcrypt.compare(pin + pepper, userWallet.pin_hash);
            if (!isPinValid && pepper !== '') {
                isPinValid = await bcrypt.compare(pin, userWallet.pin_hash);
            }
            if (!isPinValid) throw new Error('Mã PIN không chính xác');

            await client.query('BEGIN');

            const merchantWalletId = merchantId; 
            
            const query = `
                SELECT available_balance
                FROM merchant_balances
                WHERE merchant_id = $1
                FOR UPDATE
            `;
            const result = await client.query(query, [merchantWalletId]);
            if (result.rows.length === 0) throw new Error('Không tìm thấy ví doanh nghiệp');

            const mBalanceBefore = BigInt(result.rows[0].available_balance);

            // KHÔNG KIỂM TRA HẠN MỨC NGÀY (UNLIMITED LIMIT)
            if (mBalanceBefore < amount) throw new Error('Số dư cửa hàng không đủ để rút');

            const mBalanceAfter = await txRepo.addMerchantBalance(client, merchantWalletId, -amount);

            const tId = uuidv7();
            
            const metadataStr = JSON.stringify({
                bank_code: bankCode,
                account_number: accountNumber
            });

            const ledgerTxId = await txRepo.createLedgerTransaction(client, 'MERCHANT_BANK_PAYOUT', tId, 'WITHDRAW', `Rút tiền doanh thu về tài khoản ngân hàng ${bankCode} - ${accountNumber}`, amount, 'VND', metadataStr, idempotencyKey);

            await txRepo.createLedgerEntry(client, ledgerTxId, merchantWalletId, 'DEBIT', amount, mBalanceBefore, mBalanceAfter, 'MERCHANT');

            await writeAuditLog({
                actorId: userId,
                action: 'merchant.withdraw_to_bank',
                entityType: 'MERCHANT',
                entityId: merchantId,
                oldData: { balance: mBalanceBefore.toString() },
                newData: { balance: mBalanceAfter.toString(), amount: amount.toString(), bankCode, accountNumber },
                ipAddress: 'system',
                userAgent: 'merchant.service'
            });

            await client.query('COMMIT');
            
            // [NEW] Emit realtime balance to merchant owner
            if (merchantId) {
                const ownerId = await merchantRepository.getMerchantUserId(merchantId);
                if (ownerId) {
                    const { emitToUser } = require('../../utils/socket');
                    emitToUser(ownerId, 'merchant_balance_update', { newBalance: mBalanceAfter.toString() });
                }
            }

            return {
                amount: amount.toString(),
                merchantBalance: mBalanceAfter.toString(),
                bankCode,
                accountNumber,
                transactionId: tId
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = merchantService;
