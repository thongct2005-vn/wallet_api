const notificationRepository = require('./notification.repository');

const notificationController = {
    /**
     * Register or update a device token for the authenticated user
     */
    registerDeviceToken: async (req, res) => {
        try {
            const userId = req.user.userId || req.user.id; // From verifyToken middleware
            const { fcmToken, deviceName, deviceType } = req.body;

            if (!fcmToken) {
                return res.status(400).json({ error: 'FCM Token là bắt buộc' });
            }

            const device = await notificationRepository.upsertDeviceToken(
                userId,
                fcmToken,
                deviceName || null,
                deviceType || 'ANDROID'
            );

            return res.status(200).json({
                message: 'Đăng ký thiết bị nhận thông báo thành công',
                data: device
            });
        } catch (error) {
            console.error('Lỗi khi đăng ký thiết bị nhận thông báo:', error);
            return res.status(500).json({ error: 'Lỗi máy chủ nội bộ khi đăng ký thiết bị' });
        }
    },

    getNotifications: async (req, res) => {
        try {
            const userId = req.user.userId || req.user.id;
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;

            const notifications = await notificationRepository.getNotificationsByUserId(userId, limit, offset);
            
            return res.status(200).json({
                success: true,
                data: notifications
            });
        } catch (error) {
            console.error('Lỗi khi lấy thông báo:', error);
            return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
        }
    },

    getUnreadCount: async (req, res) => {
        try {
            const userId = req.user.userId || req.user.id;
            const count = await notificationRepository.getUnreadCount(userId);
            
            return res.status(200).json({
                success: true,
                unreadCount: count
            });
        } catch (error) {
            console.error('Lỗi lấy số lượng thông báo:', error);
            return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
        }
    },

    markAsRead: async (req, res) => {
        try {
            const userId = req.user.userId || req.user.id;
            const { notificationIds } = req.body;

            if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
                return res.status(400).json({ error: 'Cần cung cấp danh sách notificationIds' });
            }

            const updatedCount = await notificationRepository.markAsRead(userId, notificationIds);
            
            return res.status(200).json({
                success: true,
                message: `Đã đánh dấu ${updatedCount} thông báo là đã đọc`
            });
        } catch (error) {
            console.error('Lỗi đánh dấu đã đọc:', error);
            return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
        }
    },

    markAllAsRead: async (req, res) => {
        try {
            const userId = req.user.userId || req.user.id;
            const updatedCount = await notificationRepository.markAllAsRead(userId);
            
            return res.status(200).json({
                success: true,
                message: `Đã đánh dấu tất cả (${updatedCount}) thông báo là đã đọc`
            });
        } catch (error) {
            console.error('Lỗi đánh dấu tất cả đã đọc:', error);
            return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
        }
    }
};

module.exports = notificationController;
