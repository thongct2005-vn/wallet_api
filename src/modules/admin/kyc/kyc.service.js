const kycRepository = require('./kyc.repository');

const kycService = {
    getKycRequests: async (page, limit, status) => {
        const offset = (page - 1) * limit;
        const result = await kycRepository.getKycList(limit, offset, status);
        return {
            data: result.data,
            pagination: {
                total: result.total,
                page,
                limit,
                totalPages: Math.ceil(result.total / limit)
            }
        };
    },

    getKycDetails: async (id) => {
        const kyc = await kycRepository.getKycById(id);
        if (!kyc) {
            throw new Error('Không tìm thấy hồ sơ KYC');
        }
        return kyc;
    },

    approveKyc: async (id, adminId) => {
        const kyc = await kycRepository.getKycById(id);
        if (!kyc) {
            throw new Error('Không tìm thấy hồ sơ KYC');
        }
        if (kyc.kyc_status !== 'PENDING') {
            throw new Error(`Không thể duyệt hồ sơ đang ở trạng thái ${kyc.kyc_status}`);
        }
        
        await kycRepository.approveKyc(id);
        
        // Có thể thêm Audit Log ghi nhận Admin duyệt
        // const auditLogService = require('../../system/audit_log.service');
        // auditLogService.log('APPROVE_KYC', adminId, { kycId: id, userId: kyc.user_id });
        
        return { success: true, message: 'Duyệt hồ sơ KYC thành công' };
    },

    rejectKyc: async (id, adminId) => {
        const kyc = await kycRepository.getKycById(id);
        if (!kyc) {
            throw new Error('Không tìm thấy hồ sơ KYC');
        }
        if (kyc.kyc_status !== 'PENDING') {
            throw new Error(`Không thể từ chối hồ sơ đang ở trạng thái ${kyc.kyc_status}`);
        }

        await kycRepository.rejectKyc(id);

        // Có thể thêm Audit Log ghi nhận Admin từ chối
        
        return { success: true, message: 'Từ chối hồ sơ KYC thành công' };
    }
};

module.exports = kycService;
