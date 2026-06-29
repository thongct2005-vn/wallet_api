const express = require('express');
const router = express.Router();
const loyaltyController = require('./loyalty.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.get('/summary', authMiddleware, loyaltyController.getSummary);
router.get('/history', authMiddleware, loyaltyController.getHistory);
router.get('/checkin-status', authMiddleware, loyaltyController.getCheckinStatus);
router.post('/checkin', authMiddleware, loyaltyController.checkin);

module.exports = router;
