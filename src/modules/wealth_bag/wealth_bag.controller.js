const wealthBagRepository = require('./wealth_bag.repository');

const wealthBagController = {
    getStatus: async (req, res) => {
        try {
            const userId = req.user.userId;
            const status = await wealthBagRepository.getWealthBagStatus(userId);
            
            if (!status) {
                return res.status(200).json({ 
                    success: true, 
                    data: { is_active: false, balance: '0', total_profit: '0' } 
                });
            }
            const cleanStatus = {
                ...status,
                balance: (status.balance || '0').toString(),
                total_profit: (status.total_profit || '0').toString()
            };
            
            return res.status(200).json({ success: true, data: cleanStatus });
        } catch (error) {
            console.error('Error getting wealth bag status:', error);
            res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
        }
    },

    activate: async (req, res) => {
        try {
            const userId = req.user.userId;
            // Xác thực PIN / Biometric đã được client xử lý thông qua API /verify-pin trước đó.
            // Ở đây chỉ đơn thuần kích hoạt Túi Thần Tài.
            
            const newWealthBag = await wealthBagRepository.activateWealthBag(userId);
            
            return res.status(200).json({ 
                success: true, 
                message: 'Kích hoạt Túi Thần Tài thành công',
                data: newWealthBag 
            });
        } catch (error) {
            console.error('Error activating wealth bag:', error);
            res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
        }
    },

    deposit: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { amount, source, bankNumber } = req.body; 

            if (!amount || isNaN(amount) || amount < 1000) {
                return res.status(400).json({ success: false, message: 'Số tiền không hợp lệ' });
            }

            // Mô phỏng gọi API kết nối ngân hàng để trừ tiền
            if (source === 'linked_bank' && bankNumber && bankNumber.endsWith('999')) {
                throw new Error('Insufficient_Bank_Balance');
            }

            const updatedBag = await wealthBagRepository.depositToWealthBag(userId, amount, source);

            return res.status(200).json({ 
                success: true, 
                message: 'Nạp tiền thành công',
                data: updatedBag
            });
        } catch (error) {
            console.error('Error depositing to wealth bag:', error);
            if (error.message === 'Insufficient_Balance') {
                return res.status(400).json({ success: false, message: 'Số dư ví không đủ' });
            }
            if (error.message === 'Insufficient_Bank_Balance') {
                return res.status(400).json({ success: false, message: 'Số dư ngân hàng không đủ' });
            }
            if (error.message === 'Wealth_Bag_Not_Active') {
                return res.status(400).json({ success: false, message: 'Vui lòng kích hoạt Túi Thần Tài trước' });
            }
            res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
        }
    },

    generateQr: async (req, res) => {
        try {
            const { amount } = req.body;
            if (!amount || isNaN(amount) || amount < 1000) {
                return res.status(400).json({ success: false, message: 'Số tiền không hợp lệ' });
            }

            // Gọi API vietqr.io để tạo mã QR chuẩn
            const payload = {
                accountNo: "01MMTTT0076501864",
                accountName: "MOMO - TKTH PHAN VAN THONG",
                acqId: 970432, // BIN của VPBank
                amount: parseInt(amount),
                addInfo: "Nap Tui Than Tai",
                format: "text",
                template: "compact2"
            };

            const response = await fetch('https://api.vietqr.io/v2/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (data.code === '00' && data.data) {
                return res.status(200).json({ 
                    success: true, 
                    data: {
                        qrCode: data.data.qrCode, // String dạng chuỗi VietQR
                        qrDataURL: data.data.qrDataURL // Ảnh QR dạng base64
                    }
                });
            } else {
                return res.status(400).json({ success: false, message: 'Không thể tạo mã QR lúc này' });
            }
        } catch (error) {
            console.error('Error generating QR:', error);
            res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
        }
    },

    withdraw: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { amount, destination } = req.body; 

            if (!amount || isNaN(amount) || amount < 1000) {
                return res.status(400).json({ success: false, message: 'Số tiền không hợp lệ' });
            }

            const updatedBag = await wealthBagRepository.withdrawFromWealthBag(userId, amount, destination);

            return res.status(200).json({ 
                success: true, 
                message: 'Rút tiền thành công',
                data: updatedBag
            });
        } catch (error) {
            console.error('Error withdrawing from wealth bag:', error);
            if (error.message === 'Insufficient_Wealth_Bag_Balance') {
                return res.status(400).json({ success: false, message: 'Số dư Túi Thần Tài không đủ' });
            }
            if (error.message === 'Wealth_Bag_Not_Active') {
                return res.status(400).json({ success: false, message: 'Túi Thần Tài chưa được kích hoạt' });
            }
            res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
        }
    },

    getHistory: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { type } = req.query; // 'ALL', 'DEPOSIT', 'WITHDRAW', 'PROFIT'

            const history = await wealthBagRepository.getWealthBagHistory(userId, { type });

            return res.status(200).json({
                success: true,
                data: history
            });
        } catch (error) {
            console.error('Error fetching wealth bag history:', error);
            res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
        }
    }
};

module.exports = wealthBagController;
