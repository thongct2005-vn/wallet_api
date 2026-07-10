const pool = require('../../config/db');
const { v7: uuidv7 } = require('uuid');

const notificationRepository = {
    /**
     * Get all active FCM tokens for a user
     * @param {string} userId - User UUID
     * @returns {Promise<Array<string>>} List of FCM tokens
     */
    getActiveTokensByUserId: async (userId) => {
        const query = `
            SELECT fcm_token 
            FROM user_devices 
            WHERE user_id = $1
        `;
        const result = await pool.query(query, [userId]);
        return result.rows.map(row => row.fcm_token);
    },

    /**
     * Upsert user's device token
     * @param {string} userId - User UUID
     * @param {string} fcmToken - Firebase registration token
     * @param {string} deviceName - Name of device
     * @param {string} deviceType - ANDROID, IOS, or WEB
     */
    upsertDeviceToken: async (userId, fcmToken, deviceName, deviceType) => {
        // Xóa token cũ của user này, đồng thời xóa luôn token này nếu nó đang được gắn với user khác (do 1 thiết bị đăng nhập 2 tài khoản)
        await pool.query('DELETE FROM user_devices WHERE user_id = $1 OR fcm_token = $2', [userId, fcmToken]);

        const newId = uuidv7();
        const query = `
            INSERT INTO user_devices (id, user_id, fcm_token, device_name, device_type, updated_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        const result = await pool.query(query, [newId, userId, fcmToken, deviceName, deviceType]);
        return result.rows[0];
    },

    /**
     * Delete invalid or expired token
     * @param {string} fcmToken - Token to delete
     */
    deleteDeviceToken: async (fcmToken) => {
        const query = `
            DELETE FROM user_devices 
            WHERE fcm_token = $1
        `;
        const result = await pool.query(query, [fcmToken]);
        return result.rowCount;
    },

    /**
     * Create an in-app notification record
     */
    createNotification: async (userId, title, content, notificationType, referenceId = null) => {
        const newId = uuidv7();
        const query = `
            INSERT INTO notifications (id, user_id, title, content, notification_type, reference_id, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, 'UNREAD', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        const result = await pool.query(query, [
            newId,
            userId, 
            title, 
            content, 
            notificationType, 
            referenceId
        ]);
        return result.rows[0];
    },

    /**
     * Lấy danh sách thông báo của người dùng
     */
    getNotificationsByUserId: async (userId, limit = 50, offset = 0) => {
        const query = `
            SELECT id, user_id, title, content, notification_type, reference_id, status, created_at
            FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;
        const result = await pool.query(query, [userId, limit, offset]);
        return result.rows;
    },

    /**
     * Lấy số lượng thông báo chưa đọc
     */
    getUnreadCount: async (userId) => {
        const query = `
            SELECT COUNT(*) 
            FROM notifications
            WHERE user_id = $1 AND status = 'UNREAD'
        `;
        const result = await pool.query(query, [userId]);
        return parseInt(result.rows[0].count, 10);
    },

    /**
     * Đánh dấu 1 hoặc nhiều thông báo đã đọc
     */
    markAsRead: async (userId, notificationIds) => {
        const query = `
            UPDATE notifications
            SET status = 'READ', updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND id = ANY($2::uuid[])
        `;
        const result = await pool.query(query, [userId, notificationIds]);
        return result.rowCount;
    },

    /**
     * Đánh dấu tất cả thông báo đã đọc
     */
    markAllAsRead: async (userId) => {
        const query = `
            UPDATE notifications
            SET status = 'READ', updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND status = 'UNREAD'
        `;
        const result = await pool.query(query, [userId]);
        return result.rowCount;
    }
};

module.exports = notificationRepository;
