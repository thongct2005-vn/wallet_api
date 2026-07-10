const userRepository = require('./user.repository');

const userService = {
    searchUsers: async (searchQuery, currentUserId) => {
        const cleanQuery = searchQuery.trim();
        const users = await userRepository.searchUsers(cleanQuery, currentUserId);
        return users;
    },

    checkContacts: async (phones, currentUserId) => {
        return await userRepository.getUsersByPhones(phones, currentUserId);
    },

    getUserProfile: async (userId) => {
        const user = await userRepository.getUserProfile(userId);
        return user;
    },


    requestEmailOtp: async (userId, email) => {
        // Kiểm tra xem email đã được sử dụng bởi user khác chưa
        const existingUser = await userRepository.getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
            throw new Error('Email này đã được sử dụng bởi một tài khoản khác.');
        }

        // Sinh mã OTP 6 số ngẫu nhiên
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        // Lưu vào DB (5 phút)
        await userRepository.saveEmailOtp(userId, otpCode, 5);
        // Gửi email
        const mailer = require('../../utils/mailer');
        await mailer.sendOtpEmail(email, otpCode);
    },

    verifyEmailOtp: async (userId, email, otpCode) => {
        const otpRecord = await userRepository.checkEmailOtp(userId);
        if (!otpRecord || !otpRecord.email_otp) {
            throw new Error('Bạn chưa yêu cầu mã OTP');
        }
        if (otpRecord.email_otp !== otpCode) {
            throw new Error('Mã OTP không chính xác');
        }
        if (new Date(otpRecord.email_otp_expired_at) < new Date()) {
            throw new Error('Mã OTP đã hết hạn');
        }

        // OTP hợp lệ -> Cập nhật email và xóa OTP
        await userRepository.updateUserEmail(userId, email);
        await userRepository.clearEmailOtp(userId);
    }
};

module.exports = userService;