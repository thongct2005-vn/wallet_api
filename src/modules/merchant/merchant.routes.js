const express = require('express');
const router = express.Router();
const merchantController = require('./merchant.controller');
const { requireMerchantUser, requireActiveMerchant, verifyApiKey, verifyApiKeyWithSignature } = require('../../middlewares/merchant.middleware');

const { verifyToken } = require('../../middlewares/auth.middleware');
const withIdempotency = require('../../middlewares/idempotency.middleware');

router.post('/register', verifyToken, merchantController.register);
router.get('/me', verifyToken, merchantController.getMe);

router.get('/profile', requireMerchantUser, merchantController.getProfile);
router.patch('/profile/callback', requireMerchantUser, requireActiveMerchant, merchantController.updateCallback);
router.get('/api-keys', requireMerchantUser, merchantController.getApiKeys);
router.post('/api-keys', requireMerchantUser, requireActiveMerchant, merchantController.createApiKey);
router.post('/api-keys/:keyId/actions/rotate-secret', requireMerchantUser, requireActiveMerchant, merchantController.rotateApiKey);
router.post('/api-keys/:keyId/actions/revoke', requireMerchantUser, merchantController.revokeApiKey);
router.get('/payment-orders', requireMerchantUser, merchantController.getPaymentOrders);
router.get('/payment-orders/:id', requireMerchantUser, merchantController.getPaymentOrderById);
router.get('/transactions', requireMerchantUser, merchantController.getTransactions);
router.get('/transactions/:id', requireMerchantUser, merchantController.getTransactionById);
router.get('/webhooks', requireMerchantUser, merchantController.getWebhooks);
router.get('/webhooks/:id', requireMerchantUser, merchantController.getWebhookById);
router.post('/webhooks/:id/retry', requireMerchantUser, requireActiveMerchant, merchantController.retryWebhook);
router.get('/balance', requireMerchantUser, merchantController.getBalance);
router.get('/balance/statement', requireMerchantUser, merchantController.getStatement);
router.post('/withdraw-to-wallet', requireMerchantUser, requireActiveMerchant, withIdempotency, merchantController.withdrawToWallet);
router.post('/withdraw-to-bank', requireMerchantUser, requireActiveMerchant, withIdempotency, merchantController.withdrawToBank);
// [Thêm mới] API cấp và xác thực Auth_Code
router.post('/auth-code/generate', verifyToken, merchantController.generateAuthCode);
router.post('/auth-code/verify', merchantController.verifyAuthCode);

// API Ra lenh tru tien tu dong (Auto-Debit)
// PHAI dung HMAC signature vi day la endpoint tai chinh nhay cam
// Ben thu ba (backend) phai ky request truoc khi goi
router.post('/charge', verifyApiKeyWithSignature, merchantController.charge);

module.exports = router;
