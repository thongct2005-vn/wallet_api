const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');

// Fix for Node 20 (Supabase requires WebSocket)
global.WebSocket = require('ws');

// Khởi tạo Supabase & Gemini (dùng @google/genai mới)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// API xử lý Chatbot
const askQuestion = async (req, res) => {
  try {
    const { question, isFirstRequest } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Thiếu câu hỏi (question)" });
    }

    // 1. Biến câu hỏi thành Vector (Embedding) bằng @google/genai
    const embedResult = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: question,
      config: { outputDimensionality: 768 },
    });
    const queryVector = embedResult.embeddings[0].values;

    // 2. Tìm kiếm các tài liệu liên quan trong Supabase
    const { data: documents, error: searchError } = await supabase.rpc('match_documents', {
      query_embedding: queryVector,
      match_threshold: 0.5,
      match_count: 3
    });

    if (searchError) {
      console.error("Lỗi tìm kiếm Supabase:", searchError);
      return res.status(500).json({ error: "Lỗi khi tìm kiếm dữ liệu" });
    }

    // Nếu không tìm thấy tài liệu nào phù hợp
    if (!documents || documents.length === 0) {
      return res.json({ 
        answer: "Xin lỗi, hiện tại mình chưa có thông tin về vấn đề này. Bạn vui lòng liên hệ tổng đài CSKH nhé." 
      });
    }

    // 3. Gộp các tài liệu tìm được thành một chuỗi Context
    const contextText = documents.map(doc => doc.content).join('\n\n---\n\n');

    // 4. Xây dựng prompt có điều kiện chào hỏi
    const greetingRule = isFirstRequest
      ? 'Hãy bắt đầu câu trả lời bằng một lời chào thân thiện ngắn gọn (ví dụ: "Chào bạn!").'
      : 'TUYỆT ĐỐI KHÔNG chào hỏi người dùng. Hãy đi thẳng vào vấn đề cần giải đáp.';

    const prompt = `
Bạn là Trợ thủ AI thông minh của ứng dụng ví điện tử Mio247.
Nhiệm vụ của bạn là giải đáp thắc mắc của người dùng một cách chi tiết, đầy đủ và thân thiện.
Nếu câu trả lời liên quan đến hướng dẫn các bước, TUYỆT ĐỐI KHÔNG được tóm tắt, bỏ sót hay gộp các bước. Phải liệt kê ĐẦY ĐỦ tất cả các bước y hệt như trong DỮ LIỆU CUNG CẤP.
TUYỆT ĐỐI KHÔNG sử dụng định dạng markdown (như dấu *, **, in đậm, in nghiêng, gạch đầu dòng -) trong câu trả lời. Chỉ trả về văn bản thuần túy, dùng số thứ tự (1. 2. 3.) nếu cần liệt kê.
${greetingRule}
Bạn CHỈ ĐƯỢC PHÉP sử dụng thông tin trong phần DỮ LIỆU CUNG CẤP dưới đây để trả lời.
Nếu thông tin trong DỮ LIỆU CUNG CẤP không đủ để trả lời, hãy nói: "Xin lỗi, hiện tại mình chưa có thông tin về vấn đề này. Bạn vui lòng liên hệ tổng đài CSKH nhé." - TUYỆT ĐỐI KHÔNG được tự bịa ra thông tin.

=== DỮ LIỆU CUNG CẤP ===
${contextText}
=========================

Câu hỏi của người dùng: "${question}"
Câu trả lời của bạn:
    `;

    // 5. Gửi Prompt cho Gemini để sinh câu trả lời
    const chatResult = await ai.models.generateContent({
      model: 'gemini-pro-latest',
      contents: prompt,
    });
    const answer = chatResult.text;

    // 6. Trả kết quả về cho App
    return res.json({ 
      answer: answer,
      sources: documents.map(d => d.metadata?.source)
    });

  } catch (error) {
    console.error("Lỗi xử lý AI Chatbot:", error);
    res.status(500).json({ error: "Đã có lỗi xảy ra trong quá trình xử lý" });
  }
};

module.exports = {
  askQuestion
};
