const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v7: uuidv7 } = require('uuid');
const { sendOTP, verifyOTP } = require('../../utils/sms');
const authRepository = require('./auth.repository');
const otpRepository = require('../system/otp.repository');
const auditLogRepository = require('../system/audit_log.repository');
const mongoose = require('mongoose');

const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.JWT_EXPIRES_SECONDS || 3600);
const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 7);
const REFRESH_TOKEN_REMEMBER_DAYS = Number(process.env.REFRESH_TOKEN_REMEMBER_DAYS || 30);
const MAX_FAILED_LOGIN = Number(process.env.MAX_FAILED_LOGIN || 5);
const LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MINUTES || 30);
const RESET_TOKEN_MINUTES = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 15);

function ensureJwtSecret() {
    if (!process.env.JWT_SECRET) throw new Error('Auth_Config_Missing');
    return process.env.JWT_SECRET;
}

function opaqueToken() {
    return crypto.randomBytes(48).toString('base64url');
}

function tokenHash(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function normalizeOptional(value) {
    if (value === undefined || value === null) return null;
    return String(value).trim() || null;
}

function validatePassword(password) {
    if (typeof password !== 'string' || password.length < 8) {
        throw new Error('Password_Policy_Invalid');
    }
}

function validatePinPassword(password) {
    if (typeof password !== 'string' || !/^\d{6}$/.test(password)) {
        throw new Error('PIN_Policy_Invalid');
    }
}

function publicUser(user, context) {
    return {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        phone: user.phone,
        email: user.email,
        status: user.status,
        is_kyc_verified: user.is_kyc_verified,
        is_force_change_password: user.is_force_change_password || false,
        roles: context.roles.map(role => role.code),
        permissions: context.permissions
    };
}

function signAccessToken(user, context) {
    return jwt.sign({
        sub: user.id,
        userId: user.id,
        user_type: user.user_type,
        roles: context.roles.map(role => role.code),
        permissions: context.permissions,
        token_type: 'ACCESS',
        tokenVersion: Number(user.token_version)
    }, ensureJwtSecret(), { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}

async function writeSecurityLog(data) {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) return null;
    try {
        return await mongoose.connection.db.collection('security_logs').insertOne({
            ...data,
            created_at: new Date()
        });
    } catch (error) {
        console.error('[SECURITY_LOG_ERROR]', error.message);
        return null;
    }
}

async function issueTokenPair(user, context, { rememberMe, ipAddress, userAgent, familyId, client }) {
    const rawRefreshToken = opaqueToken();
    const refreshDays = rememberMe ? REFRESH_TOKEN_REMEMBER_DAYS : REFRESH_TOKEN_DAYS;
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);
    await authRepository.saveRefreshToken(client, {
        userId: user.id,
        tokenHash: tokenHash(rawRefreshToken),
        tokenFamilyId: familyId || uuidv7(),
        expiresAt,
        ipAddress,
        userAgent
    });
    return {
        access_token: signAccessToken(user, context),
        refresh_token: rawRefreshToken,
        expires_in: ACCESS_TOKEN_TTL_SECONDS
    };
}

const authService = {
    register: async ({ payload, ipAddress, userAgent, skipPasswordPolicy = false }) => {
        const fullName = normalizeOptional(payload.full_name);
        const username = normalizeOptional(payload.username);
        const email = normalizeOptional(payload.email);
        const phone = normalizeOptional(payload.phone);
        const password = payload.password;
        if (!fullName || fullName.length < 2 || !phone || !password) throw new Error('Validation_Error');
        if (password !== payload.confirm_password) throw new Error('Password_Confirm_Not_Match');
        if (skipPasswordPolicy) {
            // Mobile legacy flow keeps the old behavior: the Flutter app owns the 6-digit PIN validation.
        } else {
            validatePassword(password);
        }
        if (await authRepository.checkExists(email, phone, username)) throw new Error('User_Conflict');

        const passwordHash = await bcrypt.hash(password, 10);
        const created = await authRepository.withTransaction(async client => {
            const user = await authRepository.createUser(client, {
                fullName, username, email, phone, passwordHash
            });
            const roleAssigned = await authRepository.assignRoleByCode(client, user.id, 'USER');
            if (!roleAssigned) throw new Error('Role_Not_Found');
            const wallet = await authRepository.createWallet(client, user.id);
            return { user, wallet };
        });

        await auditLogRepository.create({
            actorType: 'USER',
            actorId: created.user.id,
            action: 'auth.user_registered',
            entityType: 'users',
            entityId: created.user.id,
            newData: { phone, email, role: 'USER', wallet_id: created.wallet.id },
            ipAddress,
            userAgent
        });
        return created;
    },

    login: async ({ loginId, password, rememberMe, ipAddress, userAgent }) => {
        if (!loginId || !password) throw new Error('Validation_Error');
        const sanitizedLoginId = String(loginId).trim();
        const user = await authRepository.findByLoginId(sanitizedLoginId);
        if (!user) {
            await writeSecurityLog({ event: 'LOGIN_FAILED', login_id: loginId, reason: 'INVALID_CREDENTIALS', ip_address: ipAddress });
            throw new Error('Invalid_Credentials');
        }

        if (user.locked_until) {
            if (new Date(user.locked_until) > new Date()) {
                throw new Error('Account_Locked');
            }
            await authRepository.markLoginSuccess(user.id);
            user.failed_login_attempts = 0;
            user.locked_until = null;
        }

        const passwordMatches = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatches) {
            const attempts = Number(user.failed_login_attempts || 0) + 1;
            await authRepository.updateFailedLogin(user.id, attempts, attempts >= MAX_FAILED_LOGIN ? LOCK_MINUTES : 0);
            const error = new Error(attempts >= MAX_FAILED_LOGIN ? 'Account_Locked_Now' : 'Invalid_Credentials');
            error.remainingAttempts = Math.max(MAX_FAILED_LOGIN - attempts, 0);
            throw error;
        }

        if (user.status !== 'ACTIVE') throw new Error('Account_Inactive');

        if (user.is_force_change_password && user.temporary_password_expires_at) {
            if (new Date(user.temporary_password_expires_at) < new Date()) {
                throw new Error('Temporary_Password_Expired');
            }
        }

        if (Number(user.failed_login_attempts || 0) > 0 || user.locked_until) {
            await authRepository.markLoginSuccess(user.id);
            user.failed_login_attempts = 0;
            user.locked_until = null;
        }

        const context = await authRepository.getRolesAndPermissions(user.id);
        const tokens = await authRepository.withTransaction(client =>
            issueTokenPair(user, context, { rememberMe, ipAddress, userAgent, client })
        );
        await auditLogRepository.create({
            actorType: 'USER',
            actorId: user.id,
            action: 'auth.login_succeeded',
            entityType: 'users',
            entityId: user.id,
            ipAddress,
            userAgent
        });
        return { ...tokens, user: publicUser(user, context) };
    },

    loginMobileLegacy: async ({ identifier, password, ipAddress, userAgent }) => {
        if (!identifier || !password) throw new Error('Validation_Error');
        const user = await authRepository.findByLoginId(identifier);
        if (!user) throw new Error('Invalid_Credentials');

        if (user.locked_until) {
            if (new Date(user.locked_until) > new Date()) {
                throw new Error('Account_Locked');
            }
            await authRepository.markLoginSuccess(user.id);
            user.failed_login_attempts = 0;
            user.locked_until = null;
        }

        const passwordMatches = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatches) {
            const attempts = Number(user.failed_login_attempts || 0) + 1;
            await authRepository.updateFailedLogin(user.id, attempts, attempts >= MAX_FAILED_LOGIN ? LOCK_MINUTES : 0);
            const error = new Error(attempts >= MAX_FAILED_LOGIN ? 'Account_Locked_Now' : 'Invalid_Credentials');
            error.remainingAttempts = Math.max(MAX_FAILED_LOGIN - attempts, 0);
            throw error;
        }

        if (user.status !== 'ACTIVE') throw new Error('Account_Inactive');

        if (user.is_force_change_password && user.temporary_password_expires_at) {
            if (new Date(user.temporary_password_expires_at) < new Date()) {
                throw new Error('Temporary_Password_Expired');
            }
        }

        if (Number(user.failed_login_attempts || 0) > 0 || user.locked_until) {
            await authRepository.markLoginSuccess(user.id);
        }

        // Lấy roles & permissions để tạo JWT chuẩn (thống nhất với login và refreshToken flow)
        const context = await authRepository.getRolesAndPermissions(user.id);
        const tokens = await authRepository.withTransaction(async client => {
            // Thu hồi toàn bộ refresh token cũ (chính sách single-device cho mobile)
            await authRepository.revokeAllUserRefreshTokens(client, user.id, ipAddress);
            // Dùng issueTokenPair() để tạo access_token + refresh_token nhất quán
            return issueTokenPair(user, context, { ipAddress, userAgent, client });
        });

        // Gửi sự kiện kick-out cho các phiên đăng nhập cũ trên thiết bị khác
        try {
            const { emitToUser } = require('../../utils/socket');
            emitToUser(user.id, 'force_logout', { reason: 'logged_in_elsewhere' });
        } catch (socketErr) {
            console.error('Loi khi gui su kien kick-out qua socket:', socketErr);
        }

        return {
            ...tokens,
            user_info: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                role: user.user_type,
                is_kyc_verified: user.is_kyc_verified,
                is_force_change_password: user.is_force_change_password || false
            }
        };
    },

    refreshToken: async ({ refreshToken, ipAddress, userAgent }) => {
        const hash = tokenHash(refreshToken);
        let reuseDetected = false;
        const result = await authRepository.withTransaction(async client => {
            const record = await authRepository.findRefreshTokenForUpdate(client, hash);
            if (!record) throw new Error('Invalid_Refresh_Token');
            if (record.revoked_at) {
                await authRepository.markRefreshTokenReused(client, record.id);
                await authRepository.revokeRefreshTokenFamily(client, record.token_family_id, ipAddress);
                reuseDetected = true;
                return null;
            }
            if (new Date(record.expires_at) <= new Date()) throw new Error('Refresh_Token_Expired');

            const user = await authRepository.findById(record.user_id);
            if (!user || user.status !== 'ACTIVE') throw new Error('Account_Inactive');
            const context = await authRepository.getRolesAndPermissions(user.id);
            await authRepository.markRefreshTokenUsed(client, record.id, ipAddress);
            return issueTokenPair(user, context, {
                ipAddress,
                userAgent,
                familyId: record.token_family_id,
                client
            });
        });
        if (reuseDetected) {
            await writeSecurityLog({ event: 'REFRESH_TOKEN_REUSE', token_hash_prefix: hash.slice(0, 12), ip_address: ipAddress });
            throw new Error('Refresh_Token_Reused');
        }
        return result;
    },

    logout: async ({ userId, refreshToken, ipAddress, userAgent }) => {
        await authRepository.revokeOne(tokenHash(refreshToken), userId, ipAddress);
        await auditLogRepository.create({
            actorType: 'USER',
            actorId: userId,
            action: 'auth.logout',
            entityType: 'users',
            entityId: userId,
            ipAddress,
            userAgent
        });
    },

    getMe: async userId => {
        const user = await authRepository.findById(userId);
        if (!user) throw new Error('User_Not_Found');
        const context = await authRepository.getRolesAndPermissions(userId);
        return {
            ...publicUser(user, context),
            roles: context.roles
        };
    },

    changePassword: async ({ userId, currentPassword, newPassword, confirmNewPassword, ipAddress, userAgent }) => {
        if (newPassword !== confirmNewPassword) throw new Error('Password_Confirm_Not_Match');

        const user = await authRepository.findById(userId);
        if (!user) throw new Error('User_Not_Found');

        if (user.user_type === 'USER') {
            validatePinPassword(newPassword);
        } else {
            validatePassword(newPassword);
        }

        if (!await bcrypt.compare(currentPassword, user.password_hash)) throw new Error('Current_Password_Invalid');
        if (await bcrypt.compare(newPassword, user.password_hash)) throw new Error('Password_Must_Be_Different');

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await authRepository.withTransaction(async client => {
            await authRepository.updatePassword(client, userId, passwordHash);
            await authRepository.revokeAllUserRefreshTokens(client, userId, ipAddress);
        });
        await auditLogRepository.create({
            actorType: 'USER',
            actorId: userId,
            action: 'auth.password_changed',
            entityType: 'users',
            entityId: userId,
            ipAddress,
            userAgent
        });
    },

    forgotPassword: async ({ identifier, ipAddress, userAgent }) => {
        const user = identifier ? await authRepository.findByLoginId(identifier) : null;
        if (!user) return { accepted: true };
        const rawToken = opaqueToken();
        await authRepository.createPasswordReset({
            userId: user.id,
            tokenHash: tokenHash(rawToken),
            expiresAt: new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000),
            ipAddress,
            userAgent
        });
        await auditLogRepository.create({
            actorType: 'USER',
            actorId: user.id,
            action: 'auth.password_reset_requested',
            entityType: 'users',
            entityId: user.id,
            ipAddress,
            userAgent
        });
        // [SECURITY FIX] Luôn chỉ trả { accepted: true }, KHÔNG BAO GIỜ leak reset token trong response
        // Token chỉ được gửi qua kênh an toàn (SMS/Email)
        return { accepted: true };
    },

    resetPassword: async ({ resetToken, newPassword, confirmNewPassword, ipAddress, userAgent }) => {
        validatePinPassword(newPassword);
        if (newPassword !== confirmNewPassword) throw new Error('Password_Confirm_Not_Match');
        const hash = tokenHash(resetToken);
        let userId;
        await authRepository.withTransaction(async client => {
            const reset = await authRepository.findPasswordResetForUpdate(client, hash);
            if (!reset || reset.used_at || new Date(reset.expires_at) <= new Date()) {
                throw new Error('Password_Reset_Token_Invalid');
            }
            userId = reset.user_id;
            await authRepository.updatePassword(client, userId, await bcrypt.hash(newPassword, 10));
            await authRepository.consumePasswordReset(client, reset.id);
            await authRepository.revokeAllUserRefreshTokens(client, userId, ipAddress);
        });
        await auditLogRepository.create({
            actorType: 'USER',
            actorId: userId,
            action: 'auth.password_reset_completed',
            entityType: 'users',
            entityId: userId,
            ipAddress,
            userAgent
        });
    },

    requestOtp: async (emailOrPhone, phoneOpt) => {
        const phone = phoneOpt || emailOrPhone;
        const email = phoneOpt ? emailOrPhone : null;
        if (await authRepository.checkExists(email, phone)) throw new Error('Email_Phone_Exists');
        const existing = await otpRepository.findByPhone(phone);
        if (existing?.locked_until && new Date(existing.locked_until) > new Date()) throw new Error('Account_Locked');
        await otpRepository.upsertOtp(phone, email, tokenHash(opaqueToken()), 'REGISTER');
        const sent = await sendOTP(phone);
        if (!sent.success) throw new Error('OTP_Send_Failed');
    },

    forgotPasswordOtp: async phone => {
        const user = phone ? await authRepository.findByLoginId(phone) : null;
        if (!user) throw new Error('Phone_Not_Found');
        const existing = await otpRepository.findByPhone(phone);
        if (existing?.locked_until && new Date(existing.locked_until) > new Date()) throw new Error('Account_Locked');
        await otpRepository.upsertOtp(phone, null, tokenHash(opaqueToken()), 'FORGOT_PASSWORD');
        const sent = await sendOTP(phone);
        if (!sent.success) throw new Error('OTP_Send_Failed');
    },

    verifyOtp: async (phone, otp) => {
        const record = await otpRepository.findByPhone(phone);
        if (!record) throw new Error('OTP_Not_Found');
        if (new Date(record.expired_at) <= new Date()) throw new Error('OTP_Expired');
        if (record.locked_until && new Date(record.locked_until) > new Date()) throw new Error('Account_Locked');
        const verified = await verifyOTP(phone, otp);
        if (!verified.valid) {
            const attempts = Number(record.failed_attempts || 0) + 1;
            if (attempts >= MAX_FAILED_LOGIN) {
                await otpRepository.lockAccount(phone, attempts, LOCK_MINUTES);
                throw new Error('Account_Locked_Now');
            }
            await otpRepository.updateAttempts(phone, attempts);
            const error = new Error('OTP_Invalid');
            error.remainingAttempts = MAX_FAILED_LOGIN - attempts;
            throw error;
        }
        await otpRepository.deleteByPhone(phone);
        return jwt.sign({
            phone,
            email: record.email,
            purpose: record.purpose,
            token_type: 'REGISTRATION'
        }, ensureJwtSecret(), { expiresIn: '15m' });
    },

    registerUserAndWallet: async (registerToken, password, fullName = null) => {
        const decoded = jwt.verify(registerToken, ensureJwtSecret());
        if (decoded.token_type !== 'REGISTRATION' || decoded.purpose !== 'REGISTER') throw new Error('Invalid_Token');
        return authService.register({
            payload: {
                full_name: fullName || `User ${String(decoded.phone).slice(-4)}`,
                phone: decoded.phone,
                email: decoded.email,
                password,
                confirm_password: password
            },
            skipPasswordPolicy: true
        });
    },

    resetPasswordMobileLegacy: async (registerToken, newPassword, ipAddress, userAgent) => {
        const decoded = jwt.verify(registerToken, ensureJwtSecret());
        if (decoded.token_type !== 'REGISTRATION' || decoded.purpose !== 'FORGOT_PASSWORD') throw new Error('Invalid_Token');
        const user = await authRepository.findByLoginId(decoded.phone);
        if (!user) throw new Error('User_Not_Found');
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await authRepository.withTransaction(async client => {
            await authRepository.updatePassword(client, user.id, passwordHash);
            await authRepository.revokeAllUserRefreshTokens(client, user.id, ipAddress);
        });
        await auditLogRepository.create({
            actorType: 'USER',
            actorId: user.id,
            action: 'auth.password_reset_completed_mobile_legacy',
            entityType: 'users',
            entityId: user.id,
            ipAddress,
            userAgent
        });
    },

    verifyPhoneOTP: async (phone, code) => {
        const user = await authRepository.findByLoginId(phone);
        if (!user) throw new Error('User_Not_Found');

        const twilioVerifyService = require('../../shared/services/twilio-verify.service');
        const verifyRes = await twilioVerifyService.checkVerification({ phone, code });
        if (!verifyRes.success) {
            throw new Error(verifyRes.status === 'pending' || verifyRes.status === 'invalid' ? 'VERIFY_CODE_INVALID' : 'TWILIO_VERIFY_ERROR');
        }

        const normalizedPhone = twilioVerifyService.formatPhoneForTwilio(phone);

        return jwt.sign({
            sub: user.id,
            phone: normalizedPhone,
            purpose: 'SET_PASSWORD_AFTER_VERIFY',
            token_type: 'VERIFY_TOKEN'
        }, ensureJwtSecret(), { expiresIn: '15m' });
    },

    setPasswordAfterVerify: async (verifyToken, newPassword, confirmPassword) => {
        let decoded;
        try {
            decoded = jwt.verify(verifyToken, ensureJwtSecret());
        } catch (err) {
            throw new Error('Invalid_Verify_Token');
        }

        if (decoded.token_type !== 'VERIFY_TOKEN' || decoded.purpose !== 'SET_PASSWORD_AFTER_VERIFY') {
            throw new Error('Invalid_Verify_Token');
        }

        if (newPassword !== confirmPassword) throw new Error('Validation_Error');
        validatePinPassword(newPassword);

        const userId = decoded.sub;
        const user = await authRepository.findById(userId);
        if (!user) throw new Error('User_Not_Found');

        const passwordHash = await bcrypt.hash(newPassword, 10);

        await authRepository.withTransaction(async client => {
            const status = user.status === 'PENDING_VERIFY' ? 'ACTIVE' : user.status;

            await client.query(`
                UPDATE users
                SET password_hash = $1,
                    is_force_change_password = false,
                    temporary_password_expires_at = null,
                    status = $2::user_status,
                    token_version = token_version + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
            `, [passwordHash, status, userId]);

            await authRepository.revokeAllUserRefreshTokens(client, userId, null);
        });
    }
};

module.exports = authService;
