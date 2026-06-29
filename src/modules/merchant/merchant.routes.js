const express = require('express');
const router = express.Router();
const merchantController = require('./merchant.controller');
const verifyToken = require('../../middlewares/auth.middleware');

router.get('/me', verifyToken, merchantController.getMe);

router.post('/register', verifyToken, merchantController.register);

router.put('/webhook', verifyToken, merchantController.updateWebhook);

module.exports = router;
