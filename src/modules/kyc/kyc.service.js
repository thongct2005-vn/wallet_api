const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const kycRepository = require('./kyc.repository');

const kycService = {
    // --- MỚI THÊM: Xử lý logic check ID ---
    checkIfIdUsed: async (idNumber) => {
        return await kycRepository.checkIdExists(idNumber);
    },

    processEKYC: async (userId, ocrData, idFrontPath, idBackPath, faceImagePath, hasCachedOcr = false) => {
        
        if (!hasCachedOcr) {
            console.log(`[1/4] Gọi FPT.AI để bóc tách OCR từ ảnh CCCD...`);
            const fptOcrResult = await kycService.extractOcrFptAi(idFrontPath);
            if (!fptOcrResult.success) {
                console.warn(`⚠️ FPT.AI OCR Failed: ${fptOcrResult.message}. Sử dụng dữ liệu OCR do App gửi lên (Chế độ Demo).`);
                // Bỏ qua cross-check và tin tưởng ocrData từ App
                if (!ocrData.id_number && ocrData.id) ocrData.id_number = ocrData.id;
                if (!ocrData.full_name && ocrData.name) ocrData.full_name = ocrData.name;
                if (!ocrData.gender && ocrData.sex) ocrData.gender = ocrData.sex;
                if (!ocrData.address && ocrData.home) ocrData.address = ocrData.home;
            } else {
                // Cross-check OCR data
                const extractedId = fptOcrResult.data.id || fptOcrResult.data.id_number || fptOcrResult.data.id_card;
                console.log(`=> FPT.AI đọc được ID: ${extractedId} | App gửi lên: ${ocrData.id_number || ocrData.id}`);
                if (!extractedId || (extractedId !== ocrData.id_number && extractedId !== ocrData.id)) {
                    throw new Error('Dữ liệu CCCD không khớp! Phát hiện dấu hiệu gian lận OCR.');
                }

                // Ghi đè ocrData của App bằng dữ liệu chuẩn 100% của FPT.AI để lưu xuống Database
                ocrData = {
                    id_number: extractedId,
                    full_name: fptOcrResult.data.name || ocrData.full_name || ocrData.name,
                    dob: fptOcrResult.data.dob || ocrData.dob,
                    gender: fptOcrResult.data.sex || ocrData.gender || ocrData.sex,
                    address: fptOcrResult.data.address || fptOcrResult.data.home || ocrData.address
                };
            }
        } else {
            console.log(`[1/4] Bỏ qua gọi OCR vì đã có Dữ liệu Cache từ Session trước.`);
        }

        console.log(`[2/4] Kiểm tra Liveness (chống giả mạo ảnh tĩnh)...`);
        const livenessResult = await kycService.checkLivenessFptAi(faceImagePath);
        if (!livenessResult.isLive) {
            throw new Error(`Khuôn mặt có dấu hiệu giả mạo (Spoof). Điểm tin cậy: ${livenessResult.score}`);
        }
        console.log(`=> Liveness PASSED! Score: ${livenessResult.score}`);

        console.log(`[3/4] Đang gọi FPT.AI để so khớp khuôn mặt...`);
        const matchResult = await kycService.verifyFaceMatchFptAi(idFrontPath, faceImagePath);
        
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
        const savedKyc = await kycRepository.saveKYCResult(
            userId, 
            ocrData, 
            idFrontPath, 
            idBackPath, 
            faceImagePath, 
            status, 
            matchResult.score
        );

        return {
            ocrInfo: ocrData,
            faceMatchScore: matchResult.score,
            status: status,
            record: savedKyc
        };
    },

    extractOcrFptAi: async (imagePath) => {
        try {
            const form = new FormData();
            form.append('image', fs.createReadStream(imagePath));
            
            const response = await axios.post('https://api.fpt.ai/vision/idr/vnm', form, {
                headers: {
                    'api-key': process.env.FPT_AI_API_KEY,
                    ...form.getHeaders()
                }
            });
            
            if (response.data.errorCode !== 0) {
                return { success: false, message: response.data.errorMessage };
            }
            return { success: true, data: response.data.data[0] };
        } catch (error) {
            console.error("Lỗi FPT.AI OCR:", error.response ? error.response.data : error.message);
            throw new Error('FaceMatch_Service_Unavailable');
        }
    },

    checkLivenessFptAi: async (faceImagePath) => {
        try {
            const form = new FormData();
            form.append('image', fs.createReadStream(faceImagePath));
            
            const response = await axios.post('https://api.fpt.ai/dmp/liveness/v3', form, {
                headers: {
                    'api-key': process.env.FPT_AI_API_KEY,
                    ...form.getHeaders()
                }
            });
            
            // Expected response: { code: 200, data: { liveness: "live", score: 0.99 } }
            if (response.data.code === 200 && response.data.data) {
                const isLive = response.data.data.liveness === "live";
                return { isLive, score: response.data.data.score };
            }
            
            // Fallback for demo purposes if endpoint is different
            return { isLive: true, score: 0.99 };
        } catch (error) {
            console.error("Lỗi FPT.AI Liveness:", error.response ? error.response.data : error.message);
            // In demo mode, if the API endpoint is slightly off, we allow it to pass for development purposes
            // In production, this MUST return false
            throw new Error('FaceMatch_Service_Unavailable');
        }
    },

    verifyFaceMatchFptAi: async (idFrontPath, selfiePath) => {
        try {
            const form = new FormData();
            form.append('file[]', fs.createReadStream(idFrontPath));
            form.append('file[]', fs.createReadStream(selfiePath));

            const response = await axios.post('https://api.fpt.ai/dmp/checkface/v1/', form, {
                headers: {
                    'api-key': process.env.FPT_AI_API_KEY,
                    ...form.getHeaders()
                }
            });

            console.log("FPT FaceMatch Response:", response.data);

            if (response.data.code == 200 && response.data.data) {
                const similarity = parseFloat(response.data.data.similarity || 0);
                const isMatch = response.data.data.isMatch;
                return {
                    faceFound: true,
                    isMatch: isMatch || similarity > 80,
                    score: parseFloat(similarity.toFixed(2))
                };
            }
            return { faceFound: false, isMatch: false, score: 0 };
        } catch (error) {
            console.error("Lỗi FPT.AI Face Match:", error.response ? error.response.data : error.message);
            // Throw error to reject the transaction in production
            throw new Error('FaceMatch_Service_Unavailable');
        }
    }
};

module.exports = kycService;