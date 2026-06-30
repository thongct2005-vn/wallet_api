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

module.exports = router;