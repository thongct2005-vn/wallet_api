const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const kycRepository = require('./kyc.repository');

const kycService = {
    // Xử lý logic check ID
    checkIfIdUsed: async (idNumber) => {
        return await kycRepository.checkIdExists(idNumber);
    },

    processEKYC: async (userId, ocrData, idFrontPath, idBackPath, faceImagePath, hasCachedOcr = false) => {
        
        if (!hasCachedOcr) {
            console.log(`[1/4] Gọi Viettel AI để bóc tách OCR từ ảnh CCCD...`);
            const ocrResult = await kycService.extractOcrViettelAI(idFrontPath);
            if (!ocrResult.success) {
                console.warn(`Viettel AI OCR Failed: ${ocrResult.message}. Sử dụng dữ liệu OCR do App gửi lên.`);
                if (!ocrData.id_number && ocrData.id) ocrData.id_number = ocrData.id;
                if (!ocrData.full_name && ocrData.name) ocrData.full_name = ocrData.name;
                if (!ocrData.gender && ocrData.sex) ocrData.gender = ocrData.sex;
                if (!ocrData.address && ocrData.home) ocrData.address = ocrData.home;
            } else {
                const extractedId = ocrResult.data.id || ocrResult.data.id_number || ocrResult.data.id_card;
                console.log(`=> Viettel AI đọc được ID: ${extractedId} | App gửi lên: ${ocrData.id_number || ocrData.id}`);
                if (!extractedId || (extractedId !== ocrData.id_number && extractedId !== ocrData.id)) {
                    throw new Error('Dữ liệu CCCD không khớp! Phát hiện dấu hiệu gian lận OCR.');
                }
                ocrData = {
                    id_number: extractedId,
                    full_name: ocrResult.data.name || ocrResult.data.full_name || ocrData.full_name,
                    dob: ocrResult.data.dob || ocrResult.data.birthday || ocrData.dob,
                    gender: ocrResult.data.gender || ocrResult.data.sex || ocrData.gender,
                    address: ocrResult.data.address || ocrResult.data.home || ocrData.address
                };
            }
        } else {
            console.log(`[1/4] Bỏ qua gọi OCR vì đã có Dữ liệu Cache từ Session trước.`);
        }

        console.log(`[2/4] Kiểm tra Liveness (chống giả mạo ảnh tĩnh)...`);
        const livenessResult = await kycService.checkLivenessViettelAI(faceImagePath);
        if (!livenessResult.isLive) {
            throw new Error(`Khuôn mặt có dấu hiệu giả mạo (Spoof). Điểm tin cậy: ${livenessResult.score}`);
        }
        console.log(`=> Liveness PASSED! Score: ${livenessResult.score}`);

        console.log(`[3/4] Đang gọi Viettel AI để so khớp khuôn mặt...`);
        const matchResult = await kycService.verifyFaceMatchViettelAI(idFrontPath, faceImagePath);
        
        let status = 'PENDING';
        if (matchResult.isMatch) {
            status = 'APPROVED';
            console.log(`=> KHUÔN MẶT KHỚP! Độ chính xác: ${matchResult.score}%`);
        } else {
            status = 'REJECTED'; 
            console.log(`=> KHUÔN MẶT KHÔNG KHỚP! Chỉ đạt: ${matchResult.score}%`);
            throw new Error('Khuôn mặt không khớp với ảnh trên thẻ CCCD.');
        }

        console.log(`[4/4] Đang lưu hồ sơ vào Database...`);
        const savedKyc = await kycRepository.saveKYCResult(userId, ocrData, idFrontPath, idBackPath, faceImagePath, status, matchResult.score);

        return { ocrInfo: ocrData, faceMatchScore: matchResult.score, status, record: savedKyc };
    },

    /**
     * Bóc tách thông tin từ ảnh CCCD bằng Viettel AI OCR
     * Endpoint: POST https://viettelai.vn/ekyc/id_card
     * Auth: Token trong form body
     */
    extractOcrViettelAI: async (imagePath) => {
        try {
            const form = new FormData();
            form.append('token', process.env.VIETTEL_AI_TOKEN);
            form.append('image_front', fs.createReadStream(imagePath));
            
            const response = await axios.post('https://viettelai.vn/ekyc/id_card', form, {
                headers: { ...form.getHeaders() },
                timeout: 20000
            });
            console.log('[Viettel AI OCR] Raw Response:', JSON.stringify(response.data));
            
            const d = response.data;
            if (d.code !== 1) return { success: false, message: d.message || d.vi_message || d.en_message || 'OCR failed' };
            
            // Theo tài liệu Viettel AI: thông tin nằm trong object 'information'
            let result = d.information || d.result || d.data || {};
            // Đôi khi 'information' là String JSON, cần parse nếu cần thiết
            if (typeof result === 'string') {
                try {
                    result = JSON.parse(result);
                } catch (e) {
                    console.error("Không thể parse information json string");
                }
            }
            
            return { success: true, data: result };
        } catch (error) {
            console.error('Lỗi Viettel AI OCR:', error.response ? error.response.data : error.message);
            return { success: false, message: error.message };
        }
    },

    /**
     * Kiểm tra Liveness - phát hiện ảnh giả mạo bằng Viettel AI
     * Endpoint: POST https://viettelai.vn/ekyc/face_liveness
     * Auth: Token trong form body
     */
    checkLivenessViettelAI: async (faceImagePath) => {
        try {
            const form = new FormData();
            form.append('token', process.env.VIETTEL_AI_TOKEN);
            form.append('file', fs.createReadStream(faceImagePath));
            form.append('label_pose', 'Portrait');
            
            const response = await axios.post('https://viettelai.vn/ekyc/face_liveness', form, {
                headers: { ...form.getHeaders() },
                timeout: 20000
            });
            console.log('[Viettel AI Liveness] Raw Response:', JSON.stringify(response.data));
            
            const d = response.data;
            if (d.code === 1) {
                // verify_result có thể là String 'True'/'False' hoặc boolean
                const isLive = String(d.verify_result).toLowerCase() === 'true';
                const score = parseFloat(d.score || 0);
                return { isLive, score: isLive ? Math.max(score, 0.99) : score }; // Đảm bảo score cao nếu hợp lệ
            }
            console.warn(`[Viettel AI Liveness] Bị từ chối: ${d.vi_message || d.message}`);
            return { isLive: false, score: 0 };
        } catch (error) {
            console.error('Lỗi Viettel AI Liveness:', error.response ? error.response.data : error.message);
            throw new Error('FaceMatch_Service_Unavailable');
        }
    },

    /**
     * So khớp khuôn mặt giữa CCCD và selfie bằng Viettel AI
     * Endpoint: POST https://viettelai.vn/ekyc/face_matching
     * Auth: Token trong form body
     */
    verifyFaceMatchViettelAI: async (idFrontPath, selfiePath) => {
        try {
            const form = new FormData();
            form.append('token', process.env.VIETTEL_AI_TOKEN);
            form.append('image_cmt', fs.createReadStream(idFrontPath));
            form.append('image_live', fs.createReadStream(selfiePath));
            form.append('ref_score', '0.8'); // Ngưỡng xác thực khuôn mặt (0-1)
            
            const response = await axios.post('https://viettelai.vn/ekyc/face_matching', form, {
                headers: { ...form.getHeaders() },
                timeout: 20000
            });
            console.log('[Viettel AI FaceMatch] Raw Response:', JSON.stringify(response.data));
            
            const d = response.data;
            if (d.code === 1) {
                const rawScore = parseFloat(d.score ?? 0);
                const normalizedScore = rawScore <= 1 ? rawScore * 100 : rawScore;
                const isMatch = d.verify_result === true || normalizedScore > 80;
                return { faceFound: true, isMatch, score: parseFloat(normalizedScore.toFixed(2)) };
            }
            return { faceFound: false, isMatch: false, score: 0 };
        } catch (error) {
            console.error('Lỗi Viettel AI Face Match:', error.response ? error.response.data : error.message);
            throw new Error('FaceMatch_Service_Unavailable');
        }
    }
};

module.exports = kycService;
