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
    
            const newWalletCode = await walletService.setWalletCode(userId, cleanCode);
            
            res.status(200).json({ 
                message: 'Tạo mã ví thành công', 
                wallet_code: newWalletCode 
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

            await walletService.verifyPin(userId, pin);
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
    }
};

module.exports = walletController;