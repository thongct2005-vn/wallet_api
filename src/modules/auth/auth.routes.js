const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('./auth.controller');
const { authenticateJwt } = require('../../middlewares/auth.middleware');

const router = express.Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    limit: 10, // Tối đa 10 lần thử mỗi 15 phút
    message: { error: 'Bạn thao tác quá nhanh hoặc số điện thoại này đã vượt quá giới hạn gửi. Vui lòng thử lại sau 15 phút.' },
    keyGenerator: (req) => {
        const identifier = req.body.phone || req.body.email || req.body.identifier || req.body.login_id || req.body.username;
        return identifier ? String(identifier).trim() : 'anonymous';
    }
});



// --- OTP & Kiểm tra ---
router.post('/check-phone', authController.checkPhone);
router.post('/send-otp', authLimiter, authController.sendOtp);
router.post('/verify-otp', authLimiter, authController.verifyOtp);

// --- Tính năng Authentication cốt lõi ---
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh-token', authLimiter, authController.refreshToken);
router.post('/logout', authenticateJwt, authController.logout);

// --- Quản lý Mật khẩu ---
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.post('/change-password', authenticateJwt, authController.changePassword);

// --- Chức năng riêng cho Mobile OTP ---
router.post('/forgot-password-otp', authLimiter, authController.forgotPasswordOtp);
router.post('/set-password', authLimiter, authController.setPassword);

// --- Chức năng Twilio Verify OTP ---
router.post('/verify-phone', authLimiter, authController.verifyPhone);
router.post('/set-password-after-verify', authLimiter, authController.setPasswordAfterVerify);

// --- Lấy thông tin Cá nhân ---
router.get('/me', authenticateJwt, authController.me);

module.exports = router;
