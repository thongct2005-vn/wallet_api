const express = require('express');
const router = express.Router();
const multer = require('multer');
const aiController = require('./ai.controller');
const verifyToken = require('../../middlewares/auth.middleware');

// Thiết lập multer để nhận file trong bộ nhớ (memory storage)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // Giới hạn 5MB
});

router.post('/scan-receipt', verifyToken, upload.single('image'), aiController.scanReceipt);

router.post('/extract-intent', verifyToken, express.json(), aiController.extractIntent);

router.post('/chat', verifyToken, express.json(), aiController.chatWithAssistant);

module.exports = router;
