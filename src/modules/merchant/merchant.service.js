const merchantRepository = require('./merchant.repository');
const crypto = require('crypto');

const merchantService = {
    register: async (userId, merchantName, contactPhone, callbackUrl) => {
        // 1. Kiểm tra User này đã là Merchant chưa
        const isMerchant = await merchantRepository.checkMerchantExistsByUser(userId);
        if (isMerchant) {
            throw new Error('Merchant_Exists');
        }
        
        // 2. Tạo Secret Key (HMAC verification)
        const secretKey = crypto.randomBytes(32).toString('hex');
        
        // 3. Tạo API Key (Prefix mio_live_ + chuỗi ngẫu nhiên)
        const apiKey = 'mio_' + crypto.randomBytes(24).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
        
        const merchantData = {
            user_id: userId,
            merchant_name: merchantName,
            contact_phone: contactPhone,
            callback_url: callbackUrl,
            secret_key: secretKey
        };
        
        // 4. Lưu vào Database
        const merchantId = await merchantRepository.registerMerchant(merchantData, apiKey);
        
        return {
            merchant_id: merchantId,
            api_key: apiKey,
            secret_key: secretKey
        };
    },

    getMe: async (userId) => {
        const merchant = await merchantRepository.getMerchantByUserId(userId);
        if (!merchant) {
            throw new Error('Not_A_Merchant');
        }
        return merchant;
    },

    updateWebhook: async (userId, callbackUrl) => {
        const merchant = await merchantRepository.getMerchantByUserId(userId);
        if (!merchant) {
            throw new Error('Not_A_Merchant');
        }
        return await merchantRepository.updateWebhookUrl(merchant.merchant_id, callbackUrl);
    }
};

module.exports = merchantService;
