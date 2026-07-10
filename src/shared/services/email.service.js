const nodemailer = require('nodemailer');

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.MAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.MAIL_PORT || '587', 10),
        secure: process.env.MAIL_SECURE === 'true',
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        },
        tls: {
            // Do not fail on invalid certs (e.g. self-signed in local env)
            rejectUnauthorized: false
        }
    });
};

const sendOnboardingEmail = async (to, { merchantName, username, password }) => {
    try {
        const transporter = createTransporter();
        const portalUrl = process.env.MERCHANT_PORTAL_URL || 'http://localhost:5173';
        
        const mailOptions = {
            from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_EMAIL}>`,
            to,
            subject: 'Thông báo tạo tài khoản Merchant Portal',
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; padding: 20px;">
                    <h2 style="color: #007bff; text-align: center; margin-bottom: 20px;">Thông báo tạo tài khoản</h2>
                    <p>Xin chào <strong>${merchantName}</strong>,</p>
                    <p>Tài khoản Merchant Portal của Quý doanh nghiệp đã được khởi tạo thành công trên hệ thống EWallet Payment Gateway.</p>
                    
                    <div style="background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0 0 10px 0;"><strong>Thông tin đăng nhập:</strong></p>
                        <ul style="list-style-type: none; padding-left: 0; margin: 0;">
                            <li style="margin-bottom: 8px;">Tên đăng nhập: <strong>${username}</strong></li>
                            <li>Mật khẩu tạm thời: <strong style="color: #d9534f; background-color: #fdf2f2; padding: 2px 6px; border-radius: 4px;">${password}</strong></li>
                        </ul>
                    </div>

                    <p style="color: #d9534f; font-size: 14px; margin-bottom: 20px;">
                        <em>* Vì lý do bảo mật, Quý doanh nghiệp vui lòng đăng nhập vào Merchant Portal và đổi mật khẩu ngay trong lần đăng nhập đầu tiên.</em>
                    </p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${portalUrl}/login" style="display: inline-block; padding: 12px 24px; color: #fff; background-color: #007bff; text-decoration: none; border-radius: 6px; font-weight: bold;">Đăng nhập Merchant Portal</a>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
                    
                    <p style="font-size: 13px; color: #666; margin-bottom: 5px;">
                        Nếu Quý doanh nghiệp không yêu cầu tạo tài khoản này hoặc cần hỗ trợ thêm, vui lòng liên hệ bộ phận quản trị hệ thống.
                    </p>
                    <p style="font-size: 14px; margin-top: 15px;">
                        Trân trọng,<br/><strong>EWallet Payment Gateway</strong>
                    </p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Onboarding email sent to ${to}, MessageId: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`[EMAIL ERROR] Failed to send onboarding email to ${to}:`, error.message);
        return false;
    }
};

const sendStaffOnboardingEmail = async (to, { fullName, username, password }) => {
    try {
        const transporter = createTransporter();
        const portalUrl = process.env.ADMIN_PORTAL_URL || 'http://localhost:5173';
        
        const mailOptions = {
            from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_EMAIL}>`,
            to,
            subject: 'Thông báo tạo tài khoản nhân viên',
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; padding: 20px;">
                    <h2 style="color: #007bff; text-align: center; margin-bottom: 20px;">Thông báo tạo tài khoản</h2>
                    <p>Xin chào <strong>${fullName}</strong>,</p>
                    <p>Tài khoản nhân viên của bạn đã được khởi tạo thành công trên hệ thống EWallet Payment Gateway.</p>
                    
                    <div style="background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0 0 10px 0;"><strong>Thông tin đăng nhập:</strong></p>
                        <ul style="list-style-type: none; padding-left: 0; margin: 0;">
                            <li style="margin-bottom: 8px;">Email đăng nhập: <strong>${to}</strong></li>
                            <li style="margin-bottom: 8px;">Tên đăng nhập: <strong>${username}</strong></li>
                            <li>Mật khẩu tạm thời: <strong style="color: #d9534f; background-color: #fdf2f2; padding: 2px 6px; border-radius: 4px;">${password}</strong></li>
                        </ul>
                    </div>

                    <p style="color: #d9534f; font-size: 14px; margin-bottom: 20px;">
                        <em>Bạn có thể đăng nhập bằng Email hoặc Tên đăng nhập ở trên. Vì lý do bảo mật, vui lòng đăng nhập vào Admin Portal và đổi mật khẩu ngay trong lần đăng nhập đầu tiên.</em>
                    </p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${portalUrl}/login" style="display: inline-block; padding: 12px 24px; color: #fff; background-color: #007bff; text-decoration: none; border-radius: 6px; font-weight: bold;">Đăng nhập Admin Portal</a>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
                    
                    <p style="font-size: 13px; color: #666; margin-bottom: 5px;">
                        Nếu bạn không yêu cầu tạo tài khoản này hoặc cần hỗ trợ thêm, vui lòng liên hệ bộ phận quản trị hệ thống.
                    </p>
                    <p style="font-size: 14px; margin-top: 15px;">
                        Trân trọng,<br/><strong>EWallet Payment Gateway</strong>
                    </p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Staff onboarding email sent to ${to}, MessageId: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`[EMAIL ERROR] Failed to send staff onboarding email to ${to}:`, error.message);
        return false;
    }
};

module.exports = {
    sendOnboardingEmail,
    sendStaffOnboardingEmail
};
