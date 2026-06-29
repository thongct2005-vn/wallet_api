const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');
const verifyToken = require('../../middlewares/auth.middleware');

router.post('/register-device', verifyToken, notificationController.registerDeviceToken);

router.get('/', verifyToken, notificationController.getNotifications);

router.get('/unread-count', verifyToken, notificationController.getUnreadCount);

router.put('/read', verifyToken, notificationController.markAsRead);

router.put('/read-all', verifyToken, notificationController.markAllAsRead);

module.exports = router;
