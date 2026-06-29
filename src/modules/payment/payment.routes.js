const express = require('express');
const router = express.Router();
const paymentController = require('../../modules/payment/payment.controller');
const verifyApiKey = require('../../middlewares/merchant.middleware');
const verifyToken = require('../../middlewares/auth.middleware');

const withIdempotency = require('../../middlewares/idempotency.middleware'); 

router.post('/create', verifyApiKey, paymentController.createOrder);

router.get('/status', verifyApiKey, paymentController.getOrderStatus);

router.get('/transaction/:id', verifyApiKey, paymentController.getPaymentTransaction);

router.get('/preview', verifyToken, paymentController.previewPayment);

router.post('/request', verifyToken, paymentController.requestMoney);

router.post('/process', verifyToken, withIdempotency, paymentController.processPayment);

router.post('/loyalty/redeem', verifyToken, paymentController.redeemLoyalty);

router.post('/topup', verifyToken, withIdempotency, paymentController.processTopup);

module.exports = router;