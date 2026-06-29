const usersService = require('./users.service');
const { getRequestMeta, success, handleAdminError } = require('../_shared');

const usersController = {
    listUsers: async (req, res) => {
        try {
            const result = await usersService.listUsers(req.query);
            return success(res, result, 'Lay danh sach user thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin list users:');
        }
    },

    createCustomer: async (req, res) => {
        try {
            const result = await usersService.createCustomer({
                actor: req.user,
                payload: req.body,
                ...getRequestMeta(req)
            });
            return success(res, result, 'Tao khach hang thanh cong', 201);
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin create customer:');
        }
    },

    createStaff: async (req, res) => {
        try {
            const result = await usersService.createStaff({
                actor: req.user,
                payload: req.body,
                ...getRequestMeta(req)
            });
            return success(res, result, 'Tao nhan vien thanh cong', 201);
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin create staff:');
        }
    },

    getUserDetail: async (req, res) => {
        try {
            const result = await usersService.getUserDetail(req.params.id);
            return success(res, result, 'Lay chi tiet user thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin get user detail:');
        }
    },

    updateUser: async (req, res) => {
        try {
            const result = await usersService.updateUser({
                actor: req.user,
                userId: req.params.id,
                payload: req.body,
                ...getRequestMeta(req)
            });
            return success(res, result, 'Cap nhat user thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin update user:');
        }
    },

    getUserWallet: async (req, res) => {
        try {
            const result = await usersService.getUserWallet(req.params.id);
            return success(res, result, 'Lay vi cua user thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin get user wallet:');
        }
    },

    lockUser: async (req, res) => {
        try {
            const result = await usersService.lockUser({
                actor: req.user,
                userId: req.params.id,
                reason: req.body.reason,
                ...getRequestMeta(req)
            });
            return success(res, result, 'Khoa user thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin lock user:');
        }
    },

    unlockUser: async (req, res) => {
        try {
            const result = await usersService.unlockUser({
                actor: req.user,
                userId: req.params.id,
                reason: req.body.reason,
                ...getRequestMeta(req)
            });
            return success(res, result, 'Mo khoa user thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin unlock user:');
        }
    },

    resetUserPassword: async (req, res) => {
        try {
            const result = await usersService.resetUserPassword({
                actor: req.user,
                userId: req.params.id,
                newPassword: req.body.new_password,
                confirmNewPassword: req.body.confirm_new_password,
                reason: req.body.reason,
                ...getRequestMeta(req)
            });
            return success(res, result, 'Reset mat khau user thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin reset user password:');
        }
    },

    getUserAuditLogs: async (req, res) => {
        try {
            const result = await usersService.getUserAuditLogs({
                userId: req.params.id,
                query: req.query
            });
            return success(res, result, 'Lay audit log cua user thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin get user audit logs:');
        }
    }
};

module.exports = usersController;
