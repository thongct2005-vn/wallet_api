const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const kycController = require('../../modules/kyc/kyc.controller');

// Cấu hình Multer lưu file tạm vào thư mục uploads/ và giữ lại đuôi mở rộng
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

router.get('/check-id', kycController.checkId);

router.post('/verify', upload.fields([
    { name: 'id_front', maxCount: 1 },
    { name: 'id_back', maxCount: 1 },
    { name: 'face_image', maxCount: 1 }
]), kycController.verifyKYC);

router.post('/ocr-front', upload.single('id_front'), kycController.ocrFront);

module.exports = router;