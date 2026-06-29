const express = require('express');
const router = express.Router();

const authRoutes = require('../modules/auth/auth.routes');
const transactionRoutes = require('../modules/transaction/transaction.routes');
const paymentRoutes = require('../modules/payment/payment.routes'); 
const kycRoutes = require('../modules/kyc/kyc.routes');
const apiLogger = require('../middlewares/logger.middleware');
const auditLogger = require('../middlewares/audit.middleware');
const walletRoutes = require('../modules/wallet/wallet.routes');
const userRoutes = require('../modules/user/user.routes');
const notificationRoutes = require('../modules/notification/notification.routes');
const splitBillRoutes = require('../modules/split_bill/split_bill.routes');
const aiRoutes = require('../modules/ai/ai.routes');
const redPacketRoutes = require('../modules/red_packet/red_packet.routes');
const adminRoutes = require('../modules/admin');
const loyaltyRoutes = require('../modules/loyalty/loyalty.routes');

router.use(apiLogger);
router.use(auditLogger);
router.use('/auth', authRoutes);
router.use('/transaction', transactionRoutes);
router.use('/payment', paymentRoutes); 
router.use('/kyc', kycRoutes);
router.use('/wallet', walletRoutes);
router.use('/users', userRoutes);
router.use('/notifications', notificationRoutes);
router.use('/split-bill', splitBillRoutes);
router.use('/ai', aiRoutes);
router.use('/red-packet', redPacketRoutes);
router.use('/admin', adminRoutes);
router.use('/loyalty', loyaltyRoutes);

const merchantRoutes = require('../modules/merchant/merchant.routes');
router.use('/merchant', merchantRoutes);

module.exports = router;