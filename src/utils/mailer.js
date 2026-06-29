const nodemailer = require('nodemailer');

// MOCK MAILER CHO MỤC ĐÍCH DEVELOPMENT NẾU CHƯA CÓ THÔNG TIN CẤU HÌNH
// Nếu đã cấu hình .env (EMAIL_USER, EMAIL_PASS), nodemailer sẽ gửi thư thật

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'dummy@gmail.com',
        pass: process.env.EMAIL_PASS || 'dummypass',
    },
});

const mailer = {
    sendOtpEmail: async (toEmail, otpCode) => {
        // NẾU MOCK (Chưa có .env cho email) => In ra console
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('\n====================================================');
            console.log(`[MOCK EMAIL] Gửi tới: ${toEmail}`);
            console.log(`[MOCK EMAIL] Mã OTP Xác Thực Gmail của bạn là: ${otpCode}`);
            console.log('====================================================\n');
            return true;
        }

        // GỬI EMAIL THẬT
        const mailOptions = {
            from: `"Ví Điện Tử Mio" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: 'Mã xác thực Email của bạn',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Xác thực tài khoản Email</h2>
                    <p>Xin chào,</p>
                    <p>Đây là mã OTP để xác thực tài khoản Email của bạn trên Ví điện tử:</p>
                    <h1 style="color: #FF1493; letter-spacing: 5px; text-align: center;">${otpCode}</h1>
                    <p>Mã này có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
                    <hr>
                    <p style="font-size: 12px; color: #888;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.</p>
                </div>
            `,
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log('[MAILER] Đã gửi email thành công: ' + info.response);
            return true;
        } catch (error) {
            console.error('[MAILER] Lỗi khi gửi email:', error.message);
            console.log('--- FALLBACK TO MOCK EMAIL VÌ LỖI XÁC THỰC ---');
            console.log(`[MOCK EMAIL] Gửi tới: ${toEmail}`);
            console.log(`[MOCK EMAIL] Mã OTP Xác Thực Gmail của bạn là: ${otpCode}`);
            console.log('----------------------------------------------');
            // Vẫn return true để flow app chạy tiếp mà không bị sập API
            return true;
        }
    }
};

module.exports = mailer;
