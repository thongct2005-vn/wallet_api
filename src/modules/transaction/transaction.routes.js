const express = require('express');
const router = express.Router();
const transactionController = require('./transaction.controller');
const verifyToken = require('../../middlewares/auth.middleware');
const multer = require('multer');
const path = require('path');

// Configure Multer to store uploaded temp files in uploads/ keeping the file extension
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const withIdempotency = require('../../middlewares/idempotency.middleware');

router.use(verifyToken);

router.post('/deposit', upload.single('face_image'), withIdempotency, transactionController.deposit);

router.post('/withdraw', upload.single('face_image'), withIdempotency, transactionController.withdraw);

router.post('/bank-transfer', upload.single('face_image'), withIdempotency, transactionController.bankTransfer);

router.post('/transfer', upload.single('face_image'), withIdempotency, transactionController.transfer);

router.get('/history', transactionController.getHistory);

router.get('/stats', transactionController.getStats);

router.get('/month', transactionController.getByMonth);

router.get('/chat-list', transactionController.getChatList);

router.get('/chat/:phone', transactionController.getChatHistory);

router.put('/:id/category', transactionController.updateCategory);

router.post('/export', transactionController.exportData);

module.exports = router;