const walletService = require('./wallet.service');
const pool = require('../../config/db');

const walletController = {
    getBalance: async (req, res) => {
        try {
            const userId = req.user.userId;

            const result = await walletService.getWalletInfo(userId);

            res.status(200).json({
                message: 'Lấy thông tin số dư thành công',
                data: result
            });
        } catch (error) {
            if (error.message === 'Wallet_Not_Found') {
                return res.status(404).json({ error: 'Không tìm thấy ví của người dùng này' });
            }
            console.error("Lỗi lấy số dư ví:", error);
            res.status(500).json({ error: 'Lỗi hệ thống khi lấy số dư' });
        }
    },

    getLimits: async (req, res) => {
        try {
            const userId = req.user.userId;

            const result = await walletService.getLimits(userId);

            res.status(200).json({
                message: 'Lấy thông tin hạn mức thành công',
                data: result
            });
        } catch (error) {
            if (error.message === 'Wallet_Not_Found') {
                return res.status(404).json({ error: 'Không tìm thấy ví của người dùng này' });
            }
            console.error("Lỗi lấy thông tin hạn mức:", error);
            res.status(500).json({ error: 'Lỗi hệ thống khi lấy hạn mức' });
        }
    },

    setWalletCode: async (req, res) => {
        const userId = req.user.userId;
        const { wallet_code } = req.body;

        if (!wallet_code) {
            return res.status(400).json({ error: 'Vui lòng nhập mã ví.' });
        }

        const cleanCode = wallet_code.trim();

        const isValidFormat = /^\d{6}$/.test(cleanCode);
        if (!isValidFormat) {
            return res.status(400).json({ error: 'Mã ví không hợp lệ (Bắt buộc phải là 6 chữ số).' });
        }

        try {

            await walletService.setWalletCode(userId, cleanCode);

            // [SECURITY FIX] Không trả PIN plaintext trong HTTP response
            res.status(200).json({
                message: 'Tạo mã ví thành công'
            });

        } catch (error) {
            if (error.message === 'Wallet_Not_Found') {
                return res.status(404).json({ error: 'Không tìm thấy ví của người dùng.' });
            }
            if (error.message === 'Wallet_Code_Exists') {
                return res.status(400).json({ error: 'Mã ví này đã có người sử dụng. Vui lòng chọn mã khác.' });
            }

            console.error('Lỗi set wallet code:', error);
            res.status(500).json({ error: 'Lỗi hệ thống khi tạo mã ví' });
        }
    },

    getPersonalQR: async (req, res) => {
        const userId = req.user.userId;
        const { amount, note } = req.query;

        try {
            if (amount) {
                const parsedAmount = BigInt(amount);
                if (parsedAmount <= 0n) {
                    return res.status(400).json({ error: 'Số tiền phải lớn hơn 0' });
                }
            }
        } catch (e) {
            return res.status(400).json({ error: 'Số tiền không hợp lệ' });
        }

        try {
            const result = await walletService.getPersonalQR(userId, amount, note);
            res.status(200).json({
                message: 'Tạo mã QR thanh toán thành công',
                data: result
            });
        } catch (error) {
            if (error.message === 'User_Not_Found') {
                return res.status(404).json({ error: 'Không tìm thấy thông tin người dùng.' });
            }
            console.error('Lỗi sinh mã QR chuyển tiền:', error);
            res.status(500).json({ error: 'Lỗi hệ thống khi tạo mã QR thanh toán' });
        }
    },

    getLinkedBanks: async (req, res) => {
        try {
            const userId = req.user.userId;
            const result = await walletService.getLinkedBanks(userId);
            res.status(200).json({
                message: 'Lấy danh sách ngân hàng liên kết thành công',
                data: result
            });
        } catch (error) {
            console.error('Lỗi lấy danh sách ngân hàng liên kết:', error);
            res.status(500).json({ error: 'Lỗi hệ thống khi lấy danh sách ngân hàng liên kết' });
        }
    },

    linkBank: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { bank_name, bank_code, card_number, card_holder_name, pin } = req.body;

            if (!bank_name || !card_number || !card_holder_name || !pin) {
                return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin liên kết ngân hàng' });
            }

            const result = await walletService.linkBank(userId, bank_name, bank_code, card_number, card_holder_name, pin);
            res.status(200).json({
                message: 'Liên kết ngân hàng thành công',
                data: result
            });
        } catch (error) {
            if (error.message.startsWith('Wrong_PIN_')) {
                const attemptsLeft = error.message.split('_')[2];
                return res.status(400).json({ error: `Mã PIN không chính xác, bạn còn ${attemptsLeft} lần thử.` });
            }
            if (error.message === 'Wallet_Locked_PIN') {
                return res.status(400).json({ error: 'Tài khoản tạm khóa tính năng liên kết trong 30 phút do nhập sai mã PIN quá 3 lần.' });
            }
            if (error.message === 'Wallet_Not_Found') {
                return res.status(404).json({ error: 'Không tìm thấy ví của bạn' });
            }
            console.error('Lỗi liên kết ngân hàng:', error);
            res.status(500).json({ error: 'Lỗi hệ thống khi liên kết ngân hàng' });
        }
    },

    verifyPin: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { pin } = req.body;

            if (!pin) {
                return res.status(400).json({ error: 'Vui lòng nhập mã PIN' });
            }

            const isValid = await walletService.verifyPin(userId, pin);
            if (!isValid) {
                return res.status(400).json({ error: 'Mã PIN không chính xác' });
            }
            res.status(200).json({ message: 'Mã PIN chính xác' });
        } catch (error) {
            if (error.message.startsWith('Wrong_PIN_')) {
                const attemptsLeft = error.message.split('_')[2];
                return res.status(400).json({ error: `Mã PIN không chính xác, bạn còn ${attemptsLeft} lần thử.` });
            }
            if (error.message === 'Wallet_Locked_PIN') {
                return res.status(400).json({ error: 'Tài khoản tạm khóa trong 30 phút do nhập sai mã PIN quá 3 lần.' });
            }
            if (error.message === 'Wallet_Not_Found') {
                return res.status(404).json({ error: 'Không tìm thấy ví của bạn' });
            }
            if (error.message === 'PIN_Not_Set') {
                return res.status(400).json({ error: 'Bạn chưa cài đặt mã PIN cho ví' });
            }
            console.error('Lỗi kiểm tra mã PIN:', error);
            res.status(500).json({ error: 'Lỗi hệ thống khi kiểm tra mã PIN' });
        }
    },

    getLinkedServices: async (req, res) => {
        try {
            const userId = req.user.userId;
            const result = await pool.query(`
                SELECT id, service_name, service_icon, limit_per_day, limit_per_transaction, status, created_at 
                FROM user_linked_services 
                WHERE user_id = $1 AND status != 'UNLINKED'
                ORDER BY created_at DESC
            `, [userId]);

            res.status(200).json({
                message: 'Lấy danh sách dịch vụ liên kết thành công',
                data: result.rows
            });
        } catch (error) {
            console.error('Lỗi lấy danh sách dịch vụ liên kết:', error);
            res.status(500).json({ error: 'Lỗi hệ thống khi lấy dịch vụ liên kết' });
        }
    },

    updateLinkedServiceLimits: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { id } = req.params;
            const { limit_per_day, limit_per_transaction, status } = req.body;

            const result = await pool.query(
                'UPDATE user_linked_services SET limit_per_day = COALESCE($1, limit_per_day), limit_per_transaction = COALESCE($2, limit_per_transaction), status = COALESCE($3, status) WHERE id = $4 AND user_id = $5 RETURNING *',
                [limit_per_day ?? null, limit_per_transaction ?? null, status ?? null, id, userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Không tìm thấy dịch vụ liên kết' });
            }

            res.status(200).json({
                message: 'Cập nhật hạn mức thành công',
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Lỗi cập nhật hạn mức dịch vụ liên kết:', error);
            res.status(500).json({ error: 'Lỗi hệ thống' });
        }
    },

    unlinkService: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { id } = req.params;

            const result = await pool.query(
                "UPDATE user_linked_services SET status = 'UNLINKED' WHERE id = $1 AND user_id = $2 RETURNING service_name, wallet_token, merchant_id",
                [id, userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Không tìm thấy dịch vụ liên kết' });
            }

            // Bắn Webhook sang Merchant
            try {
                const serviceName = result.rows[0].service_name;
                const walletToken = result.rows[0].wallet_token;
                const merchantId = result.rows[0].merchant_id;

                let walletAccount = walletToken;
                if (!walletAccount) {
                    const userRes = await pool.query('SELECT phone FROM users WHERE id = $1', [userId]);
                    walletAccount = userRes.rows[0]?.phone;
                }

                if (merchantId && walletAccount) {
                    // Dùng merchant_id trực tiếp (FK) - không cần fuzzy search theo tên nữa
                    const configRes = await pool.query(
                        "SELECT unlink_callback_url, default_callback_url FROM merchant_callback_configs WHERE merchant_id = $1",
                        [merchantId]
                    );
                    if (configRes.rows.length > 0) {
                        const callbackUrl = configRes.rows[0].unlink_callback_url || configRes.rows[0].default_callback_url;
                        if (callbackUrl) {
                            const axios = require('axios');
                            // Fire and forget
                            axios.post(callbackUrl, {
                                event: 'USER_UNLINKED',
                                wallet_account: walletAccount,
                                service_name: serviceName,
                                timestamp: Date.now()
                            }).catch(err => console.error('Lỗi gửi webhook hủy liên kết:', err.message));
                        }
                    }
                }
            } catch (webhookErr) {
                console.error('Lỗi nội bộ khi xử lý webhook:', webhookErr);
            }

            res.status(200).json({
                message: 'Hủy liên kết thành công'
            });
        } catch (error) {
            console.error('Lỗi hủy dịch vụ liên kết:', error);
            res.status(500).json({ error: 'Lỗi hệ thống' });
        }
    },

    getLinkedServiceTransactions: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { id } = req.params;

            // Tìm service name và icon
            const serviceQuery = await pool.query('SELECT service_name, service_icon FROM user_linked_services WHERE id = $1 AND user_id = $2', [id, userId]);
            if (serviceQuery.rows.length === 0) {
                return res.status(404).json({ error: 'Không tìm thấy dịch vụ liên kết' });
            }
            const serviceName = serviceQuery.rows[0].service_name;
            const serviceIcon = serviceQuery.rows[0].service_icon;
            const searchName = serviceName.split(' ')[0];

            // Tìm các giao dịch tương ứng
            const query = `
                SELECT pt.id, pt.amount, pt.status, pt.created_at, po.description AS order_info, m.merchant_name, $3 AS merchant_icon
                FROM payment_transactions pt
                JOIN payment_orders po ON pt.payment_order_id = po.id
                JOIN merchants m ON po.merchant_id = m.id
                JOIN wallets w ON pt.payer_wallet_id = w.id
                WHERE w.user_id = $1 AND m.merchant_name LIKE $2
                ORDER BY pt.created_at DESC
                LIMIT 20
            `;
            const result = await pool.query(query, [userId, '%' + searchName + '%', serviceIcon]);

            res.status(200).json({
                message: 'Lấy danh sách giao dịch thành công',
                data: result.rows
            });
        } catch (error) {
            console.error('Lỗi lấy danh sách giao dịch dịch vụ liên kết:', error);
            res.status(500).json({ error: 'Lỗi hệ thống' });
        }
    }
};

module.exports = walletController;