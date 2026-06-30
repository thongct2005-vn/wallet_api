const express = require('express');
const router = express.Router();
const merchantController = require('./merchant.controller');
const verifyToken = require('../../middlewares/auth.middleware');

router.get('/me', verifyToken, merchantController.getMe);

router.post('/register', verifyToken, merchantController.register);

router.put('/webhook', verifyToken, merchantController.updateWebhook);

// [Thêm mới] API cấp và xác thực Auth_Code
router.post('/auth-code/generate', verifyToken, merchantController.generateAuthCode);
router.post('/auth-code/verify', merchantController.verifyAuthCode);

// [Thêm mới] API Ra lệnh trừ tiền tự động (Dùng API Key thay vì token)
router.post('/charge', merchantController.charge);

module.exports = router;
