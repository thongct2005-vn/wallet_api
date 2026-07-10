const express = require('express');
const router = express.Router();
const walletController = require('./wallet.controller');
const verifyToken = require('../../middlewares/auth.middleware');

router.use(verifyToken);

router.get('/balance', walletController.getBalance);

router.get('/limits', walletController.getLimits);

router.post('/set-code', walletController.setWalletCode);

router.get('/qr', walletController.getPersonalQR);

router.get('/linked-banks', walletController.getLinkedBanks);

router.post('/link-bank', walletController.linkBank);

router.post('/verify-pin', walletController.verifyPin);

router.get('/linked-services', walletController.getLinkedServices);

router.patch('/linked-services/:id/limits', walletController.updateLinkedServiceLimits);

router.delete('/linked-services/:id', walletController.unlinkService);

router.get('/linked-services/:id/transactions', walletController.getLinkedServiceTransactions);

module.exports = router;