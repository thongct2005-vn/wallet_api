const aiService = require('./ai.service');
const walletRepository = require('../wallet/wallet.repository');

const aiController = {
    scanReceipt: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: "Vui lòng đính kèm hình ảnh hóa đơn" });
            }

            let mimeType = req.file.mimetype;
            if (mimeType === 'application/octet-stream') {
                mimeType = 'image/jpeg';
            }

            const receiptData = await aiService.scanReceipt(req.file.buffer, mimeType);

            return res.status(200).json({
                message: "Quét hóa đơn thành công",
                data: receiptData
            });

        } catch (error) {
            console.error("Lỗi scanReceipt:", error);
            return res.status(500).json({ error: "Không thể xử lý hóa đơn, vui lòng thử lại sau" });
        }
    },

    extractIntent: async (req, res) => {
        try {
            const { text } = req.body;
            if (!text) {
                return res.status(400).json({ error: "Vui lòng cung cấp văn bản" });
            }

            const data = await aiService.extractIntent(text);

            if (data.action_type === 'TRANSFER') {
                if (!data.amount || isNaN(data.amount) || data.amount <= 0) {
                    return res.status(400).json({ error: "Xin lỗi, tôi chưa nghe rõ số tiền bạn muốn chuyển. Vui lòng nói lại." });
                }

                const userId = req.user.userId;
                const walletBalance = await walletRepository.getBalanceByUserId(userId);
                if (!walletBalance) {
                    return res.status(400).json({ error: "Không tìm thấy ví của bạn" });
                }

                if (BigInt(walletBalance.available_balance) < BigInt(data.amount)) {
                    return res.status(400).json({ error: "Số dư trong ví không đủ để thực hiện giao dịch này" });
                }
            }

            return res.status(200).json({
                message: "Trích xuất thành công",
                data: data
            });

        } catch (error) {

            console.error("Lỗi extractIntent:", error);
            return res.status(500).json({ error: "Không thể trích xuất thông tin, vui lòng thử lại sau" });
        }
    },

    chatWithAssistant: async (req, res) => {
        try {
            const { message } = req.body;
            const userId = req.user?.userId;
            
            const wallet = await walletRepository.findByUserId(userId);
            const walletId = wallet ? wallet.id : null;
            if (!message) {
                return res.status(400).json({ error: "Vui lòng nhập tin nhắn" });
            }

            const reply = await aiService.chatWithAssistant(message, walletId);

            return res.status(200).json({
                message: "Thành công",
                data: reply
            });

        } catch (error) {
            console.error("Lỗi chatWithAssistant:", error);
            return res.status(500).json({ error: "AI đang bận, vui lòng thử lại sau" });
        }
    }
};

module.exports = aiController;
