const express = require('express');
const router = express.Router();
const transactionController = require('./transaction.controller');
const verifyToken = require('../../middlewares/auth.middleware');

// Sử dụng cấu hình Multer tập trung (có fileFilter + limits bảo mật)
const upload = require('../../config/multer');

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