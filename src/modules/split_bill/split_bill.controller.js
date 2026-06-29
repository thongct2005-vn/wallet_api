const splitBillService = require('./split_bill.service');

const splitBillController = {
    create: async (req, res) => {
        try {
            const creatorId = req.user.userId;
            const { total_amount, split_amount, note, members, include_me } = req.body;

            if (!total_amount || !split_amount || !members || !Array.isArray(members)) {
                return res.status(400).json({ error: 'Invalid parameters' });
            }

            const billId = await splitBillService.createBill(creatorId, total_amount, split_amount, note, members, include_me);
            res.status(201).json({ success: true, data: { id: billId } });
        } catch (error) {
            console.error('Create split bill error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    getMe: async (req, res) => {
        try {
            const userId = req.user.userId;
            const data = await splitBillService.getBillsForUser(userId);
            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('Get split bills error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    pay: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { member_record_id, pin } = req.body;

            if (!member_record_id || !pin) {
                return res.status(400).json({ error: 'Missing parameters' });
            }

            await splitBillService.payBill(userId, member_record_id, pin);
            res.status(200).json({ success: true, message: 'Thanh toán thành công' });
        } catch (error) {
            console.error('Pay split bill error:', error);
            
            if (error.message === 'Split bill record not found') {
                return res.status(404).json({ error: error.message });
            }
            if (error.message === 'Already paid' || error.message === 'Invalid amount format') {
                return res.status(400).json({ error: error.message });
            }

            if (error.message.startsWith('Wrong_PIN_')) {
                const attemptsLeft = error.message.split('_')[2];
                return res.status(400).json({ error: `Mã PIN không chính xác, bạn còn ${attemptsLeft} thử.` });
            }
            const errorMap = {
                'Wallet_Locked_PIN': 'Tài khoản tạm khóa tính năng chuyển tiền trong 30 phút do nhập sai mã PIN quá 3 lần.',
                'Sender_Wallet_Not_Found': 'Không tìm thấy ví của bạn hoặc bạn chưa thiết lập mã PIN',
                'Receiver_Wallet_Not_Found': 'Không tìm thấy ví người nhận',
                'Insufficient_Balance': 'Số dư trong ví không đủ'
            };
            if (errorMap[error.message]) {
                return res.status(400).json({ error: errorMap[error.message] });
            }
            res.status(500).json({ error: 'Thanh toán thất bại' });
        }
    },

    remind: async (req, res) => {
        try {
            const userId = req.user.userId;
            const billId = req.params.id;
            await splitBillService.remindBill(userId, billId);
            res.status(200).json({ success: true, message: 'Đã gửi lời nhắc' });
        } catch (error) {
            console.error('Remind split bill error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    cancel: async (req, res) => {
        try {
            const userId = req.user.userId;
            const billId = req.params.id;
            await splitBillService.cancelBill(userId, billId);
            res.status(200).json({ success: true, message: 'Đã hủy yêu cầu chia tiền' });
        } catch (error) {
            console.error('Cancel split bill error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};

module.exports = splitBillController;
