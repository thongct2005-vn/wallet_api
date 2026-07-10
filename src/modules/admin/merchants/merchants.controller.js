const merchantsService = require('./merchants.service');
const { getRequestMeta, success, handleAdminError } = require('../_shared');

const merchantsController = {
    createMerchant: async (req, res) => {
        try {
            const actor = { ...req.user, ...getRequestMeta(req) };
            const result = await merchantsService.createMerchant(req.body, actor);
            return success(res, result, 'Tao merchant moi thanh cong', 201);
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin create merchant:');
        }
    },

    updateMerchant: async (req, res) => {
        try {
            const actor = { ...req.user, ...getRequestMeta(req) };
            const result = await merchantsService.updateMerchant(req.params.id, req.body, actor);
            return success(res, result, 'Cap nhat thong tin merchant thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin update merchant:');
        }
    },

    listMerchants: async (req, res) => {
        try {
            const { page, limit, search } = req.query;
            const result = await merchantsService.listMerchants(page, limit, search);
            return success(res, result, 'Lay danh sach merchant thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin list merchants:');
        }
    },

    getMerchantDetail: async (req, res) => {
        try {
            const result = await merchantsService.getMerchantDetail(req.params.id);
            return success(res, result, 'Lay chi tiet merchant thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin get merchant detail:');
        }
    },

    approveMerchant: async (req, res) => {
        try {
            const actor = { ...req.user, ...getRequestMeta(req) };
            const result = await merchantsService.approveMerchant(req.params.id, (req.body || {}).reason, actor);
            return success(res, result, 'Duyet merchant thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin approve merchant:');
        }
    },

    rejectMerchant: async (req, res) => {
        try {
            const actor = { ...req.user, ...getRequestMeta(req) };
            const result = await merchantsService.rejectMerchant(req.params.id, (req.body || {}).reason, actor);
            return success(res, result, 'Tu choi merchant thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin reject merchant:');
        }
    },

    suspendMerchant: async (req, res) => {
        try {
            const actor = { ...req.user, ...getRequestMeta(req) };
            const result = await merchantsService.suspendMerchant(req.params.id, (req.body || {}).reason, actor);
            return success(res, result, 'Dinh chi merchant thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin suspend merchant:');
        }
    },

    activateMerchant: async (req, res) => {
        try {
            const actor = { ...req.user, ...getRequestMeta(req) };
            const result = await merchantsService.activateMerchant(req.params.id, (req.body || {}).reason, actor);
            return success(res, result, 'Kich hoat lai merchant thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin activate merchant:');
        }
    },

    getMerchantApiKeys: async (req, res) => {
        try {
            const result = await merchantsService.getMerchantApiKeys(req.params.id);
            return success(res, result, 'Lay danh sach API keys cua merchant thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin get merchant API keys:');
        }
    },

    createApiKey: async (req, res) => {
        try {
            const actor = { ...req.user, ...getRequestMeta(req) };
            const result = await merchantsService.createApiKey(req.params.id, req.body, actor);
            return success(res, result, 'Tao API key moi thanh cong', 201);
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin create merchant API key:');
        }
    },

    rotateApiKey: async (req, res) => {
        try {
            const actor = { ...req.user, ...getRequestMeta(req) };
            const result = await merchantsService.rotateApiKey(req.params.id, req.params.keyId, actor);
            return success(res, result, 'Rotate API key thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin rotate merchant API key:');
        }
    },

    revokeApiKey: async (req, res) => {
        try {
            const actor = { ...req.user, ...getRequestMeta(req) };
            const result = await merchantsService.revokeApiKey(req.params.id, req.params.keyId, (req.body || {}).reason, actor);
            return success(res, result, 'Thu hoi API key thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin revoke merchant API key:');
        }
    }
};

module.exports = merchantsController;
