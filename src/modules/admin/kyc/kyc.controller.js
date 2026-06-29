const kycService = require('./kyc.service');

const kycController = {
    getList: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const status = req.query.status || null; // PENDING, VERIFIED, REJECTED

            const result = await kycService.getKycRequests(page, limit, status);
            res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
        } catch (error) {
            console.error('Lỗi lấy danh sách KYC:', error);
            res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
        }
    },

    getDetails: async (req, res) => {
        try {
            const id = req.params.id;
            const data = await kycService.getKycDetails(id);
            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('Lỗi lấy chi tiết KYC:', error);
            res.status(404).json({ error: error.message || 'Lỗi máy chủ nội bộ' });
        }
    },

    approve: async (req, res) => {
        try {
            const id = req.params.id;
            const adminId = req.user.userId || req.user.id;
            
            const result = await kycService.approveKyc(id, adminId);
            res.status(200).json(result);
        } catch (error) {
            console.error('Lỗi duyệt KYC:', error);
            res.status(400).json({ error: error.message || 'Lỗi duyệt KYC' });
        }
    },

    reject: async (req, res) => {
        try {
            const id = req.params.id;
            const adminId = req.user.userId || req.user.id;
            
            const result = await kycService.rejectKyc(id, adminId);
            res.status(200).json(result);
        } catch (error) {
            console.error('Lỗi từ chối KYC:', error);
            res.status(400).json({ error: error.message || 'Lỗi từ chối KYC' });
        }
    }
};

module.exports = kycController;
