const merchantService = require('./merchant.service');

const merchantController = {
    register: async (req, res) => {
        const { merchant_name, contact_phone, callback_url } = req.body;
        const userId = req.user.userId; // Lấy từ verifyToken
        
        if (!merchant_name || !contact_phone) {
            return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ tên doanh nghiệp và số điện thoại liên hệ' });
        }
        
        try {
            const result = await merchantService.register(userId, merchant_name, contact_phone, callback_url);
            
            res.status(201).json({
                message: 'Đăng ký Merchant thành công',
                data: result
            });
            
        } catch (error) {
            if (error.message === 'Merchant_Exists') {
                return res.status(400).json({ error: 'Tài khoản của bạn đã được đăng ký Merchant rồi.' });
            }
            if (error.message === 'Email_Exists') {
                return res.status(400).json({ error: 'Số điện thoại này đã được đăng ký cho một Merchant khác' });
            }
            
            console.error('Lỗi đăng ký Merchant:', error);
            res.status(500).json({ error: 'Lỗi hệ thống khi đăng ký Merchant' });
        }
    },

    getMe: async (req, res) => {
        try {
            const userId = req.user.userId;
            const merchant = await merchantService.getMe(userId);
            res.status(200).json({ data: merchant });
        } catch (error) {
            if (error.message === 'Not_A_Merchant') {
                return res.status(404).json({ error: 'Bạn chưa đăng ký tài khoản Merchant' });
            }
            console.error('Lỗi lấy thông tin Merchant:', error);
            res.status(500).json({ error: 'Lỗi hệ thống' });
        }
    },

    updateWebhook: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { callback_url } = req.body;
            
            if (!callback_url) {
                return res.status(400).json({ error: 'Vui lòng cung cấp Webhook URL' });
            }

            const updatedUrl = await merchantService.updateWebhook(userId, callback_url);
            res.status(200).json({ 
                message: 'Cập nhật Webhook URL thành công',
                callback_url: updatedUrl
            });
        } catch (error) {
            if (error.message === 'Not_A_Merchant') {
                return res.status(404).json({ error: 'Bạn chưa đăng ký tài khoản Merchant' });
            }
            console.error('Lỗi cập nhật Webhook:', error);
            res.status(500).json({ error: 'Lỗi hệ thống' });
        }
    }
};

module.exports = merchantController;
