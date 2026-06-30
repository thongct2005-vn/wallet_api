const merchantService = require('./merchant.service');
const crypto = require('crypto');
const { v7: uuidv7 } = require('uuid');
const pool = require('../../config/db');
const bcrypt = require('bcrypt');
const merchantRepository = require('./merchant.repository');

// In-memory store for Auth Codes (Demo purpose only)
// Trong thực tế sẽ dùng Redis có expire (TTL)
const authCodeMap = new Map();

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
    },

    // [Thêm mới] API cấp Auth_Code dùng 1 lần cho Deep Link
    generateAuthCode: async (req, res) => {
        try {
            const userId = req.user.userId;
            const result = await pool.query('SELECT phone FROM users WHERE id = $1', [userId]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            let phone = result.rows[0].phone;
            // Không che số điện thoại để Merchant (TikTok Shop) có thể lưu lại và dùng làm wallet_account khi gọi API Charge
            
            const authCode = crypto.randomUUID();
            
            // Lưu vào Map, hết hạn sau 5 phút
            authCodeMap.set(authCode, { 
                phone, 
                userId, 
                expiresAt: Date.now() + 5 * 60 * 1000 
            });
            
            res.status(200).json({ success: true, auth_code: authCode });
        } catch (error) {
            console.error('Lỗi sinh Auth_Code:', error);
            res.status(500).json({ error: 'Lỗi hệ thống' });
        }
    },

    // [Thêm mới] API xác thực Auth_Code từ phía Merchant/TikTok Shop gọi sang
    verifyAuthCode: async (req, res) => {
        try {
            const { auth_code, merchant_name } = req.body;
            
            if (!auth_code || !authCodeMap.has(auth_code)) {
                return res.status(400).json({ success: false, error: 'Mã xác thực không hợp lệ hoặc đã hết hạn' });
            }
            
            const data = authCodeMap.get(auth_code);
            
            if (Date.now() > data.expiresAt) {
                authCodeMap.delete(auth_code);
                return res.status(400).json({ success: false, error: 'Mã xác thực đã hết hạn' });
            }
            
            // LƯU LIÊN KẾT VÀO DATABASE
            
            if (merchant_name && data.userId) {
                const check = await pool.query('SELECT id FROM user_linked_services WHERE user_id = $1 AND service_name = $2', [data.userId, merchant_name]);
                if (check.rows.length === 0) {
                    let icon = 'https://cdn-icons-png.flaticon.com/512/2875/2875364.png';
                    if (merchant_name.toLowerCase().includes('tiktok')) {
                        icon = 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png'; // TikTok icon
                    } else if (merchant_name.toLowerCase().includes('google')) {
                        icon = 'https://cdn-icons-png.flaticon.com/512/300/300218.png'; // Google icon
                    }
                    
                    const newId = uuidv7();
                    
                    await pool.query(
                        'INSERT INTO user_linked_services (id, user_id, service_name, service_icon) VALUES ($1, $2, $3, $4)',
                        [newId, data.userId, merchant_name, icon]
                    );
                }
            }

            // THU HỒI NGAY LẬP TỨC ĐỂ CHỐNG REPLAY ATTACK (Mỗi mã chỉ được đổi 1 lần)
            authCodeMap.delete(auth_code);
            
            // GENERATE BILLING TOKEN
            const jwt = require('jsonwebtoken');
            const tokenStr = jwt.sign(
                { userId: data.userId, phone: data.phone }, 
                process.env.JWT_SECRET || 'mio_secret_key',
                { expiresIn: '3650d' } // Token siêu dài hạn (10 năm)
            );
            const billing_token = 'tok_mio_' + tokenStr;
            const masked_phone = '******' + data.phone.slice(-4);

            res.status(200).json({ 
                success: true, 
                wallet_token: billing_token,
                masked_phone: masked_phone,
                message: 'Xác thực thành công'
            });
        } catch (error) {
            console.error('Lỗi xác thực Auth_Code:', error);
            res.status(500).json({ error: 'Lỗi hệ thống' });
        }
    },

    // ===== NEW: API Ra lệnh trừ tiền tự động (Auto-Debit) =====
    charge: async (req, res) => {
        try {
            const { api_key, merchant_code, wallet_token, amount, order_id } = req.body;
            
            if (!api_key || !wallet_token || !amount) {
                return res.status(400).json({ error: 'Thiếu thông tin bắt buộc (api_key, wallet_token, amount)' });
            }

            // Bỏ hardcode AUTO_DEBIT_LIMIT ở đây, sẽ check phía dưới sau khi có thông tin ví.

            // Giải mã Token Ủy Quyền
            let wallet_account = '';
            if (wallet_token && wallet_token.startsWith('tok_mio_')) {
                try {
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.verify(
                        wallet_token.replace('tok_mio_', ''), 
                        process.env.JWT_SECRET || 'mio_secret_key'
                    );
                    wallet_account = decoded.phone;
                } catch (err) {
                    return res.status(401).json({ error: 'Token uỷ quyền không hợp lệ hoặc đã hết hạn' });
                }
            } else {
                return res.status(400).json({ error: 'Yêu cầu Token uỷ quyền hợp lệ' });
            }

            // 0. KHÔNG CẦN XÁC THỰC BẢO MẬT (Luồng Auto-Debit hoàn toàn)
            // Lấy token ủy quyền (wallet_account) là đủ để xác định user.
            // Bỏ qua check PIN hoặc Biometric để giao dịch mượt mà như Grab/Ví Mio.

            // 1. Xác thực Merchant bằng api_key
            const merchant = await merchantRepository.getMerchantByApiKey(api_key);
            if (!merchant) {
                return res.status(401).json({ error: 'Xác thực Merchant thất bại' });
            }

            // 1.5 KIỂM TRA HẠN MỨC GIAO DỊCH (Database-Driven)
            const walletRepo = require('../wallet/wallet.repository');
            const walletInfo = await merchantRepository.getWalletIdByPhone(wallet_account);
            if (!walletInfo) {
                return res.status(404).json({ error: 'Không tìm thấy ví liên kết với số điện thoại này' });
            }
            const { wallet_id, user_id } = walletInfo;

            // a. Kiểm tra hạn mức chung của Ví trong ngày
            const { limits, usage } = await walletRepo.getLimitsAndUsage(wallet_id);
            const globalLimit = BigInt(Math.floor(Number(limits.daily_transaction_limit || 50000000)));
            const globalUsage = BigInt(Math.floor(Number(usage.daily_transaction_usage || 0)));
            const requestAmount = BigInt(Math.floor(Number(amount)));
            
            if (globalUsage + requestAmount > globalLimit) {
                return res.status(400).json({ error: `Giao dịch thất bại: Vượt quá hạn mức giao dịch tối đa trong ngày của Ví Mio (${Number(globalLimit).toLocaleString('vi-VN')}đ).` });
            }

            // b. Kiểm tra hạn mức riêng của App Liên Kết (Auto-Debit Limit)
            // Tìm tên dịch vụ gốc (VD: 'TikTok Shop VN' -> lấy 'TikTok')
            const searchName = merchant.merchant_name.split(' ')[0]; 
            const linkedApp = await merchantRepository.getLinkedService(user_id, searchName);
            
            if (linkedApp && linkedApp.limit_per_day) {
                const appLimit = BigInt(Math.floor(Number(linkedApp.limit_per_day)));
                const appDailyUsage = await merchantRepository.getDailyUsageForMerchant(wallet_id, merchant.id);
                
                if (appDailyUsage + requestAmount > appLimit) {
                    return res.status(400).json({ error: `Giao dịch thất bại: Vượt quá hạn mức thanh toán tự động (${Number(appLimit).toLocaleString('vi-VN')}đ/ngày) của ứng dụng liên kết. Bạn đã tiêu ${Number(appDailyUsage).toLocaleString('vi-VN')}đ hôm nay.` });
                }
            }

            // 2. Xử lý thanh toán Auto Debit
            const paymentService = require('../payment/payment.service');
            const result = await paymentService.processAutoDebit(
                merchant.merchant_user_id,
                merchant.id,
                wallet_account, 
                amount, 
                order_id || 'AUTO_' + Date.now()
            );

            res.status(200).json({ 
                success: true, 
                message: 'Thanh toán thành công',
                data: result
            });

        } catch (error) {
            console.error('Lỗi Auto-Debit Charge:', error);
            if (error.message === 'Wallet_Not_Found') {
                return res.status(404).json({ error: 'Không tìm thấy ví liên kết với số điện thoại này' });
            }
            if (error.message === 'Insufficient_Balance') {
                return res.status(400).json({ error: 'Số dư không đủ để thanh toán' });
            }
            res.status(500).json({ error: 'Lỗi hệ thống khi thanh toán tự động' });
        }
    }
};

module.exports = merchantController;
