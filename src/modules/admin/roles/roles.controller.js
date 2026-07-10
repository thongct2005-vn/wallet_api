const rolesService = require('./roles.service');
const { getRequestMeta, success, handleAdminError } = require('../_shared');

const rolesController = {
    listRoles: async (req, res) => {
        try {
            const result = await rolesService.listRoles();
            return success(res, result, 'Lay danh sach roles thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin list roles:');
        }
    },

    getRoleDetail: async (req, res) => {
        try {
            const result = await rolesService.getRoleDetail(req.params.id);
            return success(res, result, 'Lay chi tiet role thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin get role detail:');
        }
    },

    createRole: async (req, res) => {
        try {
            const actor = { ...req.user, ...getRequestMeta(req) };
            const result = await rolesService.createRole({
                ...req.body,
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }, actor);
            return success(res, result, 'Tao role thanh cong');
        } catch (err) {
            console.error('[rolesController.createRole] Error:', err);
            return handleAdminError(res, err, 'Loi admin create role:');
        }
    },

    updateRole: async (req, res) => {
        try {
            const actor = { ...req.user, ...getRequestMeta(req) };
            const result = await rolesService.updateRole(req.params.id, {
                ...req.body,
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }, actor);
            return success(res, result, 'Cap nhat role thanh cong');
        } catch (err) {
            console.error('[rolesController.updateRole] Error:', err);
            return handleAdminError(res, err, 'Loi admin update role:');
        }
    },

    listPermissions: async (req, res) => {
        try {
            const result = await rolesService.listPermissions();
            return success(res, result, 'Lay danh sach permissions thanh cong');
        } catch (err) {
            return handleAdminError(res, err, 'Loi admin list permissions:');
        }
    }
};

module.exports = rolesController;
