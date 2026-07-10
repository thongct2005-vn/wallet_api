const { GoogleGenerativeAI } = require("@google/generative-ai");
const pool = require('../../config/db');
const transactionRepo = require('../transaction/transaction.repository');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = "gemini-3.1-flash-lite"; 

const aiService = {
    categorizeTransaction: async (ledgerTransactionId, note) => {
        if (!note || note.trim() === "") return;

        try {
            const model = genAI.getGenerativeModel({ model: MODEL_NAME });
            const prompt = `Bạn là hệ thống tự động phân loại chi tiêu. 
            Phân loại nội dung chuyển khoản sau đây vào MỘT trong các nhãn sau: 
            "Ăn uống", "Mua sắm", "Hóa đơn", "Giải trí", "Di chuyển", "Gia đình", "Sức khỏe", "Khác".
            Trả về CHỈ TÊN NHÃN, không thêm bất cứ ký tự nào khác.
            Nội dung: "${note}"`;

            const result = await model.generateContent(prompt);
            const categoryName = result.response.text().trim();

            await pool.query(
                `UPDATE ledger_transactions SET category_name = $1 WHERE id = $2`,
                [categoryName, ledgerTransactionId]
            );
            console.log(`[AI Auto Categorize] Transaction ${ledgerTransactionId} categorized as ${categoryName}`);
        } catch (error) {
            console.error("[AI Auto Categorize] Error:", error.message);
        }
    },

    scanReceipt: async (fileBuffer, mimeType) => {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        const prompt = `Bạn là một trợ lý ảo phân tích hóa đơn. Nhiệm vụ của bạn là đọc hóa đơn và trích xuất thông tin.
        Yêu cầu trả về CHỈ MỘT CHUỖI JSON hợp lệ, không có markdown codeblock (không có \`\`\`json).
        Cấu trúc JSON yêu cầu:
        {
            "totalAmount": 150000,
            "items": [
                { "name": "Tên món ăn 1", "price": 50000 },
                { "name": "Tên món ăn 2", "price": 100000 }
            ]
        }
        Lưu ý: totalAmount và price phải là kiểu số nguyên (Integer). Nếu không tìm thấy, để là 0.`;

        const imagePart = {
            inlineData: {
                data: fileBuffer.toString("base64"),
                mimeType: mimeType
            }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();
        
        const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanedText);
    },

    extractIntent: async (text) => {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const prompt = `Bạn là trợ lý ảo phân tích ngôn ngữ tự nhiên cho ứng dụng ví điện tử.
        Hãy đọc câu lệnh sau và trích xuất ý định giao dịch.
        Yêu cầu trả về CHỈ MỘT CHUỖI JSON hợp lệ, không có markdown codeblock.
        Cấu trúc JSON yêu cầu:
        {
            "action_type": "TRANSFER", // Trả về "TRANSFER" (chuyển tiền), "DEPOSIT" (nạp tiền), "WITHDRAW" (rút tiền), hoặc "BUY_CARD" (mua thẻ cào)
            "amount": 50000,
            "receiver_name": "Tên người nhận (chỉ áp dụng TRANSFER, hoặc nếu là BUY_CARD thì trả về tên nhà mạng viết hoa chữ cái đầu: 'Viettel', 'Vinaphone', 'Mobifone', 'Vietnamobile')",
            "note": "Nội dung giao dịch (nếu có, không thì để chuỗi rỗng)"
        }
        Lưu ý: amount phải là kiểu số nguyên (Integer). Ví dụ: '50k' -> 50000. 'năm mươi ngàn' -> 50000.
        Câu lệnh: "${text}"`;

        try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
            return JSON.parse(cleanedText);
        } catch (error) {
            console.error("Gemini extractIntent Error:", error);
            return { amount: null, receiver_name: "", note: "" };
        }
    },

    chatWithAssistant: async (message, walletId) => {
        let recentHistoryText = "Chưa có giao dịch gần đây.";
        let monthlySummaryText = "Chưa có dữ liệu thống kê.";

        if (walletId) {
            // Lấy 50 giao dịch gần nhất
            const history = await transactionRepo.getTransactionHistoryForAI(walletId);
            if (history && history.length > 0) {
                recentHistoryText = history.map(h => {
                    let text = `- Ngày: ${new Date(h.created_at).toLocaleString('vi-VN')}, Biến động: ${h.entry_type === 'CREDIT' ? '+' : '-'}${h.amount}, Loại: ${h.transaction_type}`;
                    if (h.sender_name) text += `, Gửi: ${h.sender_name}`;
                    if (h.receiver_name) text += `, Nhận: ${h.receiver_name}`;
                    text += `, Phân loại: ${h.category_name || 'Khác'}`;
                    return text;
                }).join('\n');
            }

            // Lấy thống kê 6 tháng gần nhất
            const summary = await transactionRepo.getMonthlySummaryForAI(walletId);
            if (summary && summary.length > 0) {
                monthlySummaryText = summary.map(s => {
                    return `- Tháng ${s.month}: ${s.entry_type === 'CREDIT' ? 'Thu' : 'Chi'} ${s.total_amount}đ cho danh mục '${s.category_name}'`;
                }).join('\n');
            }
        }

        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const prompt = `Bạn là "Mio 247" - Trợ lý Tài chính AI thân thiện của Ví điện tử.
        Hãy xưng hô là "Mio 247" và gọi người dùng là "Bạn". Trả lời ngắn gọn, súc tích và tư vấn tài chính hữu ích.
        
        BÁO CÁO THU CHI THEO THÁNG (6 tháng gần nhất):
        ${monthlySummaryText}
        
        CHI TIẾT 50 GIAO DỊCH GẦN NHẤT:
        ${recentHistoryText}
        
        Câu hỏi của người dùng: "${message}"`;

        const result = await model.generateContent(prompt);
        return result.response.text();
    }
};

module.exports = aiService;
