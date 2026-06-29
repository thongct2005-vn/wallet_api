const { success } = require('../../utils/response.util');

const authService = require('./auth.service');
const authRepository = require('./auth.repository');







function requestMeta(req) {
    return {
        ipAddress: req.ip || req.socket?.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null
    };
}



const authController = {
    register: async (req, res, next) => {
        try {
            const data = await authService.register({ payload: req.body, ...requestMeta(req) });
            return success(req, res, 201, 'User registered', data);
        } catch (error) {
            return next(error);
        }
    },

    login: async (req, res, next) => {
        const isMobileLegacyLogin = req.body.identifier && !req.body.login_id;
        try {
            if (isMobileLegacyLogin) {
                const data = await authService.loginMobileLegacy({
                    identifier: req.body.identifier,
                    password: req.body.password,
                    ...requestMeta(req)
                });
                return res.status(200).json({
                    message: 'Đăng nhập thành công',
                    data
                });
            }
            const data = await authService.login({
                loginId: req.body.login_id,
                password: req.body.password,
                rememberMe: Boolean(req.body.remember_me),
                ...requestMeta(req)
            });
            // Keep user_info temporarily for the existing Flutter client.
            return success(req, res, 200, 'Login success', {
                ...data,
                user_info: data.user
            });
        } catch (error) {
            if (isMobileLegacyLogin) {
                if (error.message === 'Account_Locked' || error.message === 'Account_Locked_Now') {
                    return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa 30 phút do nhập sai mật khẩu quá nhiều lần.' });
                }
                if (error.message === 'Invalid_Credentials') {
                    const remaining = error.remainingAttempts;
                    return res.status(401).json({
                        error: remaining ? `Mật khẩu không chính xác. Bạn còn ${remaining} lần thử.` : 'Tài khoản hoặc mật khẩu không chính xác.',
                        remainingAttempts: remaining
                    });
                }
                if (error.message === 'Account_Inactive') {
                    return res.status(403).json({ error: 'Tài khoản đã bị khóa hoặc chưa kích hoạt' });
                }
                if (error.message === 'Validation_Error') {
                    return res.status(400).json({ error: 'Vui lòng nhập Email/Số điện thoại và Mật khẩu' });
                }
                console.error('Lỗi API Login:', error);
                return res.status(500).json({ error: 'Lỗi hệ thống khi đăng nhập' });
            }
            return next(error);
        }
    },

    refreshToken: async (req, res, next) => {
        try {
            if (!req.body.refresh_token) throw new Error('Invalid_Refresh_Token');
            const data = await authService.refreshToken({
                refreshToken: req.body.refresh_token,
                ...requestMeta(req)
            });
            return success(req, res, 200, 'Token refreshed', data);
        } catch (error) {
            return next(error);
        }
    },

    logout: async (req, res, next) => {
        try {
            if (!req.body.refresh_token) throw new Error('Invalid_Refresh_Token');
            await authService.logout({
                userId: req.user.userId,
                refreshToken: req.body.refresh_token,
                ...requestMeta(req)
            });
            return success(req, res, 200, 'Logout success');
        } catch (error) {
            return next(error);
        }
    },

    me: async (req, res, next) => {
        try {
            return success(req, res, 200, 'Current user', await authService.getMe(req.user.userId));
        } catch (error) {
            return next(error);
        }
    },

    changePassword: async (req, res, next) => {
        try {
            await authService.changePassword({
                userId: req.user.userId,
                currentPassword: req.body.current_password,
                newPassword: req.body.new_password,
                confirmNewPassword: req.body.confirm_new_password,
                ...requestMeta(req)
            });
            return success(req, res, 200, 'Password changed');
        } catch (error) {
            return next(error);
        }
    },

    forgotPassword: async (req, res, next) => {
        try {
            const data = await authService.forgotPassword({
                identifier: req.body.identifier || req.body.phone || req.body.email,
                ...requestMeta(req)
            });
            return success(req, res, 200, 'If the account exists, reset instructions have been created', data);
        } catch (error) {
            return next(error);
        }
    },

    resetPassword: async (req, res, next) => {
        const isMobileLegacyReset = req.body.register_token && req.body.new_password && !req.body.reset_token;
        try {
            if (isMobileLegacyReset) {
                const meta = requestMeta(req);
                await authService.resetPasswordMobileLegacy(
                    req.body.register_token,
                    req.body.new_password,
                    meta.ipAddress,
                    meta.userAgent
                );
                return res.status(200).json({ message: 'Đặt lại mật khẩu thành công!' });
            }
            await authService.resetPassword({
                resetToken: req.body.reset_token || req.body.register_token,
                newPassword: req.body.new_password,
                confirmNewPassword: req.body.confirm_new_password || req.body.new_password,
                ...requestMeta(req)
            });
            return success(req, res, 200, 'Password reset');
        } catch (error) {
            if (isMobileLegacyReset) {
                if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError' || error.message === 'Invalid_Token') {
                    return res.status(401).json({ error: 'Token đổi mật khẩu không hợp lệ hoặc đã hết hạn' });
                }
                if (error.message === 'User_Not_Found') {
                    return res.status(404).json({ error: 'Không tìm thấy tài khoản người dùng' });
                }
                console.error('Lỗi đổi mật khẩu:', error);
                return res.status(500).json({ error: 'Lỗi hệ thống khi đổi mật khẩu' });
            }
            return next(error);
        }
    },

    forgotPasswordOtp: async (req, res, next) => {
        try {
            await authService.forgotPasswordOtp(req.body.phone);
            return res.status(200).json({ message: 'Đã gửi mã OTP qua tin nhắn SMS' });
        } catch (error) {
            if (error.message === 'Phone_Not_Found') {
                return res.status(404).json({ error: 'Số điện thoại này chưa được đăng ký' });
            }
            if (error.message === 'Account_Locked') {
                return res.status(403).json({ error: 'Tài khoản đang bị khóa tạm thời do gửi OTP quá nhiều lần' });
            }
            return next(error);
        }
    },

    checkPhone: async (req, res, next) => {
        try {
            const isExist = await authRepository.checkExists(null, req.body.phone);
            return res.status(200).json({ isExist });
        } catch (error) {
            return next(error);
        }
    },

    sendOtp: async (req, res, next) => {
        try {
            await authService.requestOtp(req.body.email || req.body.phone, req.body.email ? req.body.phone : undefined);
            return res.status(200).json({ message: 'Đã gửi mã OTP qua tin nhắn SMS' });
        } catch (error) {
            if (error.message === 'Email_Phone_Exists') {
                return res.status(400).json({ error: 'Email hoặc Số điện thoại đã được đăng ký', isExist: true });
            }
            if (error.message === 'Account_Locked') {
                return res.status(403).json({ error: 'Số điện thoại này đang bị khóa bảo mật. Vui lòng thử lại sau 30 phút.' });
            }
            return next(error);
        }
    },

    verifyOtp: async (req, res, next) => {
        try {
            const registerToken = await authService.verifyOtp(req.body.phone, req.body.otp);
            return res.status(200).json({
                message: 'Xác thực OTP thành công',
                register_token: registerToken
            });
        } catch (error) {
            if (error.message === 'Account_Locked' || error.message === 'Account_Locked_Now') {
                return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa do nhập sai quá nhiều lần. Vui lòng thử lại sau 30 phút.' });
            }
            if (error.message === 'OTP_Invalid') {
                return res.status(400).json({
                    error: `Mã OTP không chính xác. Bạn còn ${error.remainingAttempts} lần thử.`,
                    remainingAttempts: error.remainingAttempts
                });
            }
            if (error.message === 'OTP_Expired') {
                return res.status(400).json({ error: 'Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.' });
            }
            if (error.message === 'OTP_Not_Found') {
                return res.status(400).json({ error: 'Không tìm thấy yêu cầu OTP. Vui lòng gửi lại mã.' });
            }
            return next(error);
        }
    },

    setPassword: async (req, res, next) => {
        try {
            const data = await authService.registerUserAndWallet(
                req.body.register_token,
                req.body.password,
                req.body.full_name
            );
            return res.status(201).json({ message: 'Tạo tài khoản và Ví thành công!' });
        } catch (error) {
            if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                return res.status(401).json({ error: 'Token đăng ký không hợp lệ hoặc đã hết hạn' });
            }
            return next(error);
        }
    }
};

module.exports = authController;
