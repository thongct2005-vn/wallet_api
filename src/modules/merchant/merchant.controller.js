const merchantRepository = require('./merchant.repository');
const merchantService = require('./merchant.service');
const crypto = require('crypto');
const { v7: uuidv7 } = require('uuid');
const pool = require('../../config/db');
const bcrypt = require('bcrypt');
const notificationService = require('../notification/notification.service');
const { writeAuditLog } = require('../admin/_shared');
// In-memory store for Auth Codes (Demo purpose only)
// Trong thực tế sẽ dùng Redis có expire (TTL)
const authCodeMap = new Map();

const merchantController = {
    register: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { merchant_name, contact_phone, callback_url } = req.body;

            if (!merchant_name || !contact_phone) {
                return res.status(400).json({ error: 'Tên và số điện thoại đối tác là bắt buộc' });
            }

            const rawApiKey = `ak_mio_${crypto.randomBytes(12).toString('hex')}`;
            const rawSecret = `sk_mio_${crypto.randomBytes(24).toString('hex')}`;

            const pepper = process.env.API_SECRET_PEPPER || 'mio_pepper';
            const secretHash = crypto.createHmac('sha256', pepper).update(rawSecret).digest('hex');

            const merchantData = {
                merchant_name,
                contact_phone,
                callback_url,
                user_id: userId,
                secret_key: secretHash
            };

            const merchantId = await merchantRepository.registerMerchant(merchantData, rawApiKey);

            await writeAuditLog({
                actorId: userId,
                action: 'merchant.self_register',
                entityType: 'MERCHANT',
                entityId: merchantId,
                oldData: null,
                newData: { merchant_name, contact_phone },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.status(201).json({
                message: 'Đăng ký Merchant thành công',
                data: { merchant_id: merchantId, api_key: rawApiKey, secret_key: rawSecret }
            });
        } catch (error) {
            console.error('Lỗi đăng ký merchant:', error);
            res.status(500).json({ error: 'Lỗi hệ thống khi đăng ký' });
        }
    },

    getMe: async (req, res) => {
        try {
            const userId = req.user.userId;
            const pool = require('../../config/db');
            const result = await pool.query(`
                SELECT merchant_id, role_code, is_owner
                FROM merchant_users
                WHERE user_id = $1 AND is_active = true
                LIMIT 1
            `, [userId]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Not a merchant' });
            }

            const { merchant_id, role_code, is_owner } = result.rows[0];
            const profile = await merchantRepository.getMerchantProfile(merchant_id);
            if (!profile) return res.status(404).json({ success: false, message: 'Merchant not found' });

            res.json({ success: true, data: { ...profile, role_code, is_owner } });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
        }
    },

    getProfile: async (req, res) => {
        try {
            const { merchant_id, role_code, is_owner } = req.merchantContext;
            const profile = await merchantRepository.getMerchantProfile(merchant_id);
            if (!profile) return res.status(404).json({ success: false, message: 'Merchant not found' });

            res.json({ success: true, data: { ...profile, role_code, is_owner } });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
        }
    },

    updateCallback: async (req, res) => {
        try {
            const { merchant_id, role_code, is_owner } = req.merchantContext;
            const permissions = req.user.permissions || [];

            if (!is_owner && role_code !== 'MERCHANT_OWNER' && !permissions.includes('merchant.profile.update')) {
                return res.status(403).json({ success: false, message: 'Bạn không có quyền cập nhật cấu hình Callback' });
            }

            const { default_callback_url, default_redirect_url } = req.body;
            if (default_callback_url && !/^https?:\/\//.test(default_callback_url)) {
                return res.status(400).json({ success: false, message: 'URL không hợp lệ' });
            }

            const updated = await merchantRepository.updateCallbackConfig(merchant_id, { default_callback_url, default_redirect_url });
            res.json({ success: true, message: 'Cập nhật thành công', data: updated });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
        }
    },

    getApiKeys: async (req, res) => {
        try {
            const keys = await merchantRepository.getApiKeys(req.merchantContext.merchant_id);
            res.json({ success: true, data: keys });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
        }
    },

    createApiKey: async (req, res) => {
        try {
            const { merchant_id, role_code, is_owner } = req.merchantContext;
            const permissions = req.user.permissions || [];

            if (!is_owner && role_code !== 'MERCHANT_OWNER' && !permissions.includes('merchant.api_keys.create')) {
                return res.status(403).json({ success: false, message: 'Bạn không có quyền tạo API Key' });
            }

            const { key_name } = req.body;
            if (!key_name) {
                return res.status(400).json({ success: false, message: 'Thiếu key_name' });
            }

            const ipAddress = req.ip || req.connection.remoteAddress;
            const userAgent = req.headers['user-agent'];

            const result = await merchantService.createApiKey(merchant_id, key_name, req.user.userId || req.user.id, ipAddress, userAgent);
            res.status(201).json({ success: true, message: 'Tạo API Key thành công', data: result });
        } catch (err) {
            if (err.code === '23505' && err.constraint === 'uq_merchant_api_keys_active_env') {
                return res.status(409).json({ success: false, message: 'Đã tồn tại API Key đang hoạt động trong môi trường này. Vui lòng thu hồi (revoke) hoặc làm mới (rotate) key cũ trước khi tạo key mới.' });
            }
            console.error(err);
            res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
        }
    },

    rotateApiKey: async (req, res) => {
        try {
            const { merchant_id, role_code, is_owner } = req.merchantContext;
            const permissions = req.user.permissions || [];

            if (!is_owner && role_code !== 'MERCHANT_OWNER' && !permissions.includes('merchant.api_keys.rotate')) {
                return res.status(403).json({ success: false, message: 'Bạn không có quyền đổi Secret API Key' });
            }

            const { keyId } = req.params;
            const ipAddress = req.ip || req.connection.remoteAddress;
            const userAgent = req.headers['user-agent'];

            const result = await merchantService.rotateApiKey(merchant_id, keyId, req.user.userId || req.user.id, ipAddress, userAgent);
            res.json({ success: true, message: 'Đổi Secret thành công', data: result });
        } catch (err) {
            if (err.message === 'Api_Key_Not_Found') return res.status(404).json({ success: false, message: 'Không tìm thấy API Key' });
            if (err.message === 'Api_Key_Already_Revoked') return res.status(400).json({ success: false, message: 'API Key đã bị thu hồi' });
            console.error(err);
            res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
        }
    },

    revokeApiKey: async (req, res) => {
        try {
            const { merchant_id, role_code, is_owner } = req.merchantContext;
            const permissions = req.user.permissions || [];

            if (!is_owner && role_code !== 'MERCHANT_OWNER' && !permissions.includes('merchant.api_keys.revoke')) {
                return res.status(403).json({ success: false, message: 'Bạn không có quyền thu hồi API Key' });
            }

            const { keyId } = req.params;
            const { reason } = req.body || {};
            const ipAddress = req.ip || req.connection.remoteAddress;
            const userAgent = req.headers['user-agent'];

            await merchantService.revokeApiKey(merchant_id, keyId, reason, req.user.userId || req.user.id, ipAddress, userAgent);
            res.json({ success: true, message: 'Thu hồi API Key thành công' });
        } catch (err) {
            if (err.message === 'Api_Key_Not_Found') return res.status(404).json({ success: false, message: 'Không tìm thấy API Key' });
            if (err.message === 'Api_Key_Already_Revoked') return res.status(400).json({ success: false, message: 'API Key đã bị thu hồi' });
            console.error(err);
            res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
        }
    },

    getPaymentOrders: async (req, res) => {
        try {
            const data = await merchantRepository.getPaymentOrders(req.merchantContext.merchant_id, req.query);
            res.json({ success: true, data });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
        }
    },

    getPaymentOrderById: async (req, res) => {
        try {
            const order = await merchantRepository.getPaymentOrderById(req.merchantContext.merchant_id, req.params.id);
            if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
            res.json({ success: true, data: order });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
        }
    },

    getTransactions: async (req, res) => {
        try {
            const data = await merchantRepository.getTransactions(req.merchantContext.merchant_id, req.query);
            res.json({ success: true, data });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
        }
    },

    getTransactionById: async (req, res) => {
        try {
            const tx = await merchantRepository.getTransactionById(req.merchantContext.merchant_id, req.params.id);
            if (!tx) return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' });
            res.json({ success: true, data: tx });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
        }
    },

    getWebhooks: async (req, res) => {
        try {
            const data = await merchantRepository.getWebhooks(req.merchantContext.merchant_id, req.query);
            res.json({ success: true, data });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
        }
    },

    getWebhookById: async (req, res) => {
        try {
            const wh = await merchantRepository.getWebhookById(req.merchantContext.merchant_id, req.params.id);
            if (!wh) return res.status(404).json({ success: false, message: 'Không tìm thấy webhook' });
            res.json({ success: true, data: wh });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
        }
    },

    retryWebhook: async (req, res) => {
        try {
            const wh = await merchantRepository.retryWebhook(req.merchantContext.merchant_id, req.params.id);
            res.json({ success: true, message: 'Đã đưa webhook vào hàng đợi retry', data: wh });
        } catch (err) {
            console.error(err);
            if (err.message === 'Webhook event not found') {
                return res.status(404).json({ success: false, message: 'Webhook không tồn tại hoặc không thuộc Merchant này' });
            }
            res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
        }
    },

    getBalance: async (req, res) => {
        try {
            const balance = await merchantRepository.getMerchantBalance(req.merchantContext.merchant_id);
            if (!balance) return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin số dư' });
            res.json({ success: true, data: balance });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
        }
    },

    getStatement: async (req, res) => {
        try {
            const data = await merchantRepository.getMerchantStatement(req.merchantContext.merchant_id, req.query);
            res.json({ success: true, data });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
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
            const authCode = uuidv7();

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

            // GENERATE BILLING TOKEN
            const jwt = require('jsonwebtoken');
            const tokenStr = jwt.sign(
                { userId: data.userId, phone: data.phone },
                process.env.JWT_SECRET || 'mio_secret_key',
                { expiresIn: '3650d' } //(10 năm)
            );
            const billing_token = 'mio_merchant_' + tokenStr;
            const masked_phone = '******' + data.phone.slice(-4);

            // LƯU LIÊN KẾT VÀO DATABASE
            if (merchant_name && data.userId) {
                // Tìm merchant_id: ưu tiên api_key, fallback theo tên
                let merchantId = null;
                const apiKeyInBody = req.body.api_key;
                if (apiKeyInBody) {
                    const mByKey = await pool.query('SELECT m.id FROM merchants m JOIN merchant_api_keys mak ON m.id = mak.merchant_id WHERE mak.api_key = $1', [apiKeyInBody]);
                    if (mByKey.rows.length > 0) merchantId = mByKey.rows[0].id;
                }
                
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
                        'INSERT INTO user_linked_services (id, user_id, service_name, service_icon, wallet_token, merchant_id) VALUES ($1, $2, $3, $4, $5, $6)',
                        [newId, data.userId, merchant_name, icon, billing_token, merchantId]
                    );
                } else {
                    // Cập nhật lại token, merchant_id, reset hạn mức và bật lại trạng thái ACTIVE
                    await pool.query(
                        'UPDATE user_linked_services SET wallet_token = $1, status = $2, merchant_id = COALESCE($3, merchant_id), limit_per_day = NULL, limit_per_transaction = NULL WHERE id = $4',
                        [billing_token, 'ACTIVE', merchantId, check.rows[0].id]
                    );
                }

                // Gửi thông báo Push Notification về app Ví Mio
                notificationService.sendSystemNotification(
                    data.userId,
                    'Liên kết thành công 🎉',
                    `Ví Mio của bạn đã được liên kết với nền tảng ${merchant_name}.`,
                    'LINK_SUCCESS'
                ).catch(e => console.error('Lỗi gửi thông báo liên kết:', e));
            }

            // THU HỒI NGAY LẬP TỨC ĐỂ CHỐNG REPLAY ATTACK (Mỗi mã chỉ được đổi 1 lần)
            authCodeMap.delete(auth_code);

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

    // ===== API Ra lenh tru tien tu dong (Auto-Debit) =====
    // Luu y: verifyApiKeyWithSignature middleware da xac thuc api_key + HMAC signature truoc khi vao day
    charge: async (req, res) => {
        try {
            const { wallet_token, amount, order_id } = req.body;
            // merchant_id da duoc middleware gan vao req.merchant
            const { merchant_id } = req.merchant;

            if (!wallet_token || !amount) {
                return res.status(400).json({ error: 'Thieu thong tin bat buoc (wallet_token, amount)' });
            }

            console.log(`[CHARGE DEBUG] api_key=${api_key}, wallet_token_tail=${wallet_token.slice(-20)}, amount=${amount}`);
            require('fs').appendFileSync('charge_debug.log', JSON.stringify(req.body) + '\n');
            
            // Bỏ hardcode AUTO_DEBIT_LIMIT ở đây, sẽ check phía dưới sau khi có thông tin ví.

            // Giải mã Token Ủy Quyền
            let wallet_account = '';
            if (wallet_token && wallet_token.startsWith('mio_merchant_')) {
                try {
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.verify(
                        wallet_token.replace('mio_merchant_', ''),
                        process.env.JWT_SECRET || 'mio_secret_key'
                    );
                    wallet_account = decoded.phone;
                } catch (err) {
                    return res.status(401).json({ error: 'Token uy quyen khong hop le hoac da het han' });
                }
            } else {
                return res.status(400).json({ error: 'Yeu cau Token uy quyen hop le (mio_merchant_...)' });
            }

            // Lay thong tin merchant de check han muc
            const merchant = await merchantRepository.getMerchantByMerchantId(merchant_id);
            if (!merchant) {
                return res.status(404).json({ error: 'Khong tim thay Merchant' });
            }

            // Kiem tra han muc giao dich
            const walletRepo = require('../wallet/wallet.repository');
            const walletInfo = await merchantRepository.getWalletIdByPhone(wallet_account);
            if (!walletInfo) {
                return res.status(404).json({ error: 'Khong tim thay vi lien ket voi so dien thoai nay' });
            }
            const { wallet_id, user_id } = walletInfo;

            // Han muc chung cua Vi trong ngay
            const { limits, usage } = await walletRepo.getLimitsAndUsage(wallet_id);
            const globalLimit = BigInt(Math.floor(Number(limits.daily_transaction_limit || 50000000)));
            const globalUsage = BigInt(Math.floor(Number(usage.daily_transaction_usage || 0)));
            const requestAmount = BigInt(Math.floor(Number(amount)));

            if (globalUsage + requestAmount > globalLimit) {
                return res.status(400).json({
                    error: `Vuot qua han muc giao dich toi da trong ngay cua Vi Mio (${Number(globalLimit).toLocaleString('vi-VN')}d).`
                });
            }

            // Kiểm tra hạn mức riêng của App Liên Kết - dùng merchant_id để tra cứu chính xác
            const linkedApp = await merchantRepository.getLinkedService(user_id, merchant.id);
        
            console.log(`[CHARGE DEBUG] user_id=${user_id}, merchant.id=${merchant.id}, linkedApp_status=${linkedApp ? linkedApp.status : 'null'}`);
            
            if (!linkedApp || linkedApp.status === 'UNLINKED') {
                return res.status(403).json({ error: 'Dịch vụ chưa được liên kết hoặc đã bị huỷ liên kết. Không thể thanh toán.' });
            }

            if (!linkedApp || linkedApp.status === 'UNLINKED') {
                return res.status(403).json({ error: 'Dich vu chua duoc lien ket hoac da bi huy. Khong the thanh toan.' });
            }
            if (linkedApp.status === 'INACTIVE') {
                return res.status(400).json({ error: 'Dich vu da bi tam khoa. Vui long mo khoa tren ung dung Vi.' });
            }
            const txLimitStr = linkedApp.limit_per_transaction || 5000000;
            const txLimit = BigInt(Math.floor(Number(txLimitStr)));
            if (requestAmount > txLimit) {
                return res.status(400).json({ error: `Giao dịch thất bại: Vượt quá hạn mức thanh toán tự động (${Number(txLimit).toLocaleString('vi-VN')}đ/lần) của ứng dụng liên kết.` });
            }

            const dayLimitStr = linkedApp.limit_per_day || 5000000;
            const appLimit = BigInt(Math.floor(Number(dayLimitStr)));
            const appDailyUsage = await merchantRepository.getDailyUsageForMerchant(wallet_id, merchant.id);

            if (appDailyUsage + requestAmount > appLimit) {
                return res.status(400).json({ error: `Giao dịch thất bại: Vượt quá hạn mức thanh toán tự động (${Number(appLimit).toLocaleString('vi-VN')}đ/ngày) của ứng dụng liên kết. Bạn đã tiêu ${Number(appDailyUsage).toLocaleString('vi-VN')}đ hôm nay.` });
            }

            const paymentService = require('../payment/payment.service');
            const result = await paymentService.processAutoDebit(
                merchant.merchant_user_id,
                merchant.id,
                wallet_account,
                amount,
                order_id || 'AUTO_' + Date.now(),
                wallet_token
            );

            // 3. [CHUẨN HÓA] Bắn Webhook bất đồng bộ báo kết quả cho Merchant (TikTok Shop)
            try {
                const pool = require('../../config/db');
                const configRes = await pool.query("SELECT default_callback_url FROM merchant_callback_configs WHERE merchant_id = $1", [merchant.id]);
                if (configRes.rows.length > 0 && configRes.rows[0].default_callback_url) {
                    const callbackUrl = configRes.rows[0].default_callback_url;
                    const webhookPayload = {
                        event: 'PAYMENT_SUCCESS',
                        order_id: order_id || 'AUTO_' + Date.now(),
                        amount: amount,
                        transaction_id: result.transaction_id || 'TX_' + Date.now(),
                        timestamp: Date.now()
                    };

                    const webhookService = require('../webhook/webhook.service');
                    const webhookLogId = await webhookService.createLog(
                        null,
                        merchant.id,
                        result.transaction_id || 'TX_' + Date.now(),
                        'wh_' + Date.now(),
                        webhookPayload
                    );

                    const webhookPublisher = require('../webhook/webhook.publisher');
                    webhookPublisher.publish({
                        logId: webhookLogId,
                        merchantId: merchant.id,
                        payload: webhookPayload,
                        callbackUrl: callbackUrl
                    }).catch(err => console.error('[Webhook] Đẩy Job BullMQ lỗi:', err));
                }
            } catch (webhookErr) {
                console.error('[Webhook] Lỗi khởi tạo webhook:', webhookErr);
            }

            res.status(200).json({
                success: true,
                message: 'Thanh toán thành công',
                data: result
            });

        } catch (error) {
            console.error('Loi Auto-Debit Charge:', error);
            if (error.message === 'Wallet_Not_Found') {
                return res.status(404).json({ error: 'Khong tim thay vi lien ket' });
            }
            if (error.message === 'Insufficient_Balance') {
                return res.status(400).json({ error: 'So du khong du de thanh toan' });
            }
            res.status(500).json({ error: 'Loi he thong khi thanh toan tu dong' });
        }
    },

    withdrawToWallet: async (req, res) => {
        try {
            const userId = req.user.userId || req.user.id;
            const { merchant_id: merchantId, is_owner, role_code } = req.merchantContext;
            const { amount } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Số tiền rút không hợp lệ' });
            }

            if (!is_owner && role_code !== 'MERCHANT_OWNER') {
                return res.status(403).json({ error: 'Chỉ chủ cửa hàng mới có quyền rút doanh thu' });
            }

            const result = await merchantService.withdrawToWallet(merchantId, userId, amount);

            res.status(200).json({
                message: 'Rút doanh thu về ví cá nhân thành công',
                data: result
            });
        } catch (error) {
            console.error('Lỗi rút doanh thu merchant:', error);
            if (
                error.message.includes('Số dư cửa hàng không đủ') ||
                error.message.includes('tối thiểu') ||
                error.message.includes('tối đa') ||
                error.message.includes('Rút tiền thất bại')
            ) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Lỗi hệ thống khi rút doanh thu' });
        }
    },

    withdrawToBank: async (req, res) => {
        try {
            const userId = req.user.userId || req.user.id;
            const { merchant_id: merchantId, is_owner, role_code } = req.merchantContext;
            const { amount, pin, bank_code, account_number } = req.body;
            const idempotencyKey = req.headers['idempotency-key'];

            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Số tiền rút không hợp lệ' });
            }

            if (!is_owner && role_code !== 'MERCHANT_OWNER') {
                return res.status(403).json({ error: 'Chỉ chủ cửa hàng mới có quyền rút doanh thu' });
            }

            if (!bank_code || !account_number) {
                return res.status(400).json({ error: 'Vui lòng cung cấp ngân hàng và số tài khoản nhận' });
            }

            const result = await merchantService.withdrawToBank(merchantId, userId, amount, pin, bank_code, account_number, idempotencyKey);

            res.status(200).json({
                message: 'Rút doanh thu về tài khoản ngân hàng thành công',
                data: result
            });
        } catch (error) {
            console.error('Lỗi rút doanh thu merchant về ngân hàng:', error);
            if (
                error.message.includes('Số dư cửa hàng không đủ') ||
                error.message.includes('tối thiểu') ||
                error.message.includes('tối đa') ||
                error.message.includes('Rút tiền thất bại') ||
                error.message.includes('Mã PIN không chính xác') ||
                error.message.includes('Không tìm thấy ví cá nhân')
            ) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Lỗi hệ thống khi rút doanh thu về ngân hàng' });
        }
    }

};

module.exports = merchantController;
