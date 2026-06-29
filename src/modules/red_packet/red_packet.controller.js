const redPacketService = require('./red_packet.service');

const redPacketController = {
    createRedPacket: async (req, res) => {
        try {
            const userId = req.user.userId || req.user.id;
            const { total_amount, total_count, type, message, pin } = req.body;

            if (!total_amount || !total_count || !type) {
                return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
            }

            const redPacket = await redPacketService.createRedPacket(userId, total_amount, total_count, type, message, pin);
            
            res.status(201).json({
                message: 'Tạo lì xì thành công',
                data: redPacket
            });
        } catch (error) {
            console.error('Lỗi tạo lì xì:', error);
            res.status(400).json({ error: error.message || 'Lỗi hệ thống khi tạo lì xì' });
        }
    },

    claimRedPacket: async (req, res) => {
        try {
            const userId = req.user.userId || req.user.id;
            const redPacketId = req.params.id;

            const amount = await redPacketService.claimRedPacket(userId, redPacketId);

            res.status(200).json({
                message: 'Nhận lì xì thành công',
                data: { amount: amount.toString() }
            });
        } catch (error) {
            console.error('Lỗi nhận lì xì:', error);
            res.status(400).json({ error: error.message || 'Lỗi hệ thống khi nhận lì xì' });
        }
    },

    getRedPacketDetails: async (req, res) => {
        try {
            const userId = req.user.userId || req.user.id;
            const redPacketId = req.params.id;

            const details = await redPacketService.getRedPacketDetails(userId, redPacketId);

            // Convert BigInts to Strings for JSON response
            const formatData = {
                ...details,
                total_amount: details.total_amount ? details.total_amount.toString() : '0',
                remaining_amount: details.remaining_amount ? details.remaining_amount.toString() : '0',
                receivers: details.receivers.map(r => ({
                    ...r,
                    amount: r.amount ? r.amount.toString() : '0'
                })),
                my_claim: details.my_claim ? { ...details.my_claim, amount: details.my_claim.amount.toString() } : null
            };

            res.status(200).json({
                message: 'Lấy thông tin lì xì thành công',
                data: formatData
            });
        } catch (error) {
            console.error('Lỗi lấy thông tin lì xì:', error);
            res.status(400).json({ error: error.message || 'Lỗi hệ thống khi lấy thông tin lì xì' });
        }
    }
};

module.exports = redPacketController;
