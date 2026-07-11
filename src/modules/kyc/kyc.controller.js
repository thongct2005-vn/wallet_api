const kycService = require('./kyc.service');
const redis = require('../../config/redis');
const { v4: uuidv4 } = require('uuid');

const kycController = {
    // --- MỚI THÊM: Controller xử lý API check ID ---
    checkId: async (req, res) => {
        try {
            const idNumber = req.query.id;
            if (!idNumber) {
                return res.status(400).json({ error: 'Thiếu tham số Số CCCD (id)' });
            }

            const isUsed = await kycService.checkIfIdUsed(idNumber);
            res.status(200).json({ is_used: isUsed });
        } catch (error) {
            console.error("Lỗi Controller Check ID:", error);
            res.status(500).json({ error: 'Lỗi hệ thống khi kiểm tra CCCD' });
        }
    },

    ocrFront: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Vui lòng cung cấp ảnh mặt trước CCCD' });
            }

            const idFrontPath = req.file.path;
            const ocrResult = await kycService.extractOcrViettelAI(idFrontPath);

            let extractedData;
            
            if (!ocrResult.success) {
                console.warn(`Viettel AI OCR Failed in ocrFront: ${ocrResult.message}. Using mock data.`);
                extractedData = {
                    id_number: '079099999999',
                    full_name: 'NGUYEN VAN DEMO',
                    dob: '01/01/1999',
                    gender: 'NAM',
                    address: 'Số 1, Phường Demo, Quận Test, TP.HCM'
                };
            } else {
                // Map fields từ Viettel AI (hỗ trợ nhiều format tên field)
                extractedData = {
                    id_number: ocrResult.data.id || ocrResult.data.id_number || ocrResult.data.id_card,
                    full_name: ocrResult.data.name || ocrResult.data.full_name,
                    dob: ocrResult.data.dob || ocrResult.data.birthday,
                    gender: ocrResult.data.gender || ocrResult.data.sex,
                    address: ocrResult.data.address || ocrResult.data.home
                };
            }

            const sessionId = uuidv4();
            // Lưu cache 15 phút (900s)
            await redis.setex(`kyc_session:${sessionId}`, 900, JSON.stringify(extractedData));

            res.status(200).json({ 
                session_id: sessionId,
                ocr_data: extractedData
            });
        } catch (error) {
            console.error("Lỗi Controller OCR Front:", error);
            res.status(500).json({ error: 'Lỗi hệ thống khi đọc CCCD' });
        }
    },

    verifyKYC: async (req, res) => {
        try {
            if (!req.files || !req.files['id_front'] || !req.files['id_back'] || !req.files['face_image']) {
                return res.status(400).json({ error: 'Vui lòng cung cấp đủ 3 ảnh' });
            }
            
            const userId = req.body.user_id; 
            const sessionId = req.body.session_id;
            const ocrDataString = req.body.ocr_data; // Fallback
            
            if (!userId) {
                return res.status(400).json({ error: 'Thiếu thông tin user_id.' });
            }

            let ocrData;
            let hasCachedOcr = false;

            if (sessionId) {
                const cached = await redis.get(`kyc_session:${sessionId}`);
                if (cached) {
                    ocrData = JSON.parse(cached);
                    hasCachedOcr = true;
                } else {
                    return res.status(400).json({ error: 'Session KYC hết hạn. Vui lòng chụp lại.' });
                }
            } else if (ocrDataString) {
                ocrData = JSON.parse(ocrDataString);
            } else {
                return res.status(400).json({ error: 'Thiếu thông tin session_id hoặc dữ liệu OCR.' });
            }

            const idFrontPath = req.files['id_front'][0].path;
            const idBackPath = req.files['id_back'][0].path;
            const faceImagePath = req.files['face_image'][0].path;

            const result = await kycService.processEKYC(userId, ocrData, idFrontPath, idBackPath, faceImagePath, hasCachedOcr);

            res.status(200).json({ message: 'Xác thực eKYC thành công', data: result });

        } catch (error) {
            console.error("Lỗi Controller Verify KYC:", error);
            // Phân loại lỗi để trả về mã HTTP chuẩn
            if (error.message.includes('Dữ liệu CCCD không khớp') || 
                error.message.includes('Khuôn mặt có dấu hiệu giả mạo') ||
                error.message.includes('Khuôn mặt không khớp')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: error.message || 'Lỗi hệ thống' });
        }
    }
};

module.exports = kycController;