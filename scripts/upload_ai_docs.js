require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const { createClient } = require('@supabase/supabase-js');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');

// Khởi tạo kết nối Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("LỖI: Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_KEY trong file .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Khởi tạo Gemini API (dùng @google/genai mới)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Hàm lấy vector embedding từ Gemini API
async function getEmbedding(text) {
  const result = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
    config: { outputDimensionality: 768 },
  });
  return result.embeddings[0].values;
}

async function main() {
  const docsDir = path.join(__dirname, '../data/help_docs');
  if (!fs.existsSync(docsDir)) {
    console.error(`Không tìm thấy thư mục: ${docsDir}`);
    return;
  }

  const files = fs.readdirSync(docsDir).filter(file => file.endsWith('.txt'));
  
  // Bộ chia nhỏ văn bản (nếu văn bản quá dài, AI sẽ khó hiểu)
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  let allChunks = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(docsDir, file), 'utf-8');
    if (content.trim().length === 0) continue;

    // Chia file text thành các đoạn nhỏ
    const chunks = await textSplitter.createDocuments(
      [content],
      [{ source: file }] // Metadata để biết đoạn này lấy từ file nào
    );
    allChunks.push(...chunks);
  }

  console.log(`Đã tìm thấy ${files.length} file. Đã chia thành ${allChunks.length} đoạn nhỏ (chunks).`);

  // Xóa dữ liệu cũ trước khi upload mới để tránh trùng lặp
  console.log('Đang xóa dữ liệu cũ trước khi upload...');
  const { error: deleteError } = await supabase.from('help_documents').delete().neq('id', 0);
  if (deleteError) {
    console.error("Lỗi xóa dữ liệu cũ:", deleteError);
  } else {
    console.log('✅ Đã xóa dữ liệu cũ thành công.');
  }

  // Đẩy từng đoạn lên Supabase
  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    console.log(`Đang xử lý và đẩy đoạn ${i + 1}/${allChunks.length}...`);
    
    try {
      // 1. Dùng Gemini biến đoạn text thành Vector
      const vector = await getEmbedding(chunk.pageContent);

      // 2. Lưu Text + Vector lên bảng help_documents của Supabase
      const { error } = await supabase.from('help_documents').insert({
        content: chunk.pageContent,
        metadata: chunk.metadata,
        embedding: vector,
      });

      if (error) {
        console.error(`Lỗi khi đẩy đoạn ${i + 1}:`, error.message);
      } else {
        console.log(`✅ Đã lưu thành công đoạn ${i + 1}.`);
      }
    } catch (err) {
      console.error(`Lỗi API Embedding ở đoạn ${i + 1}:`, err.message);
    }
  }

  console.log("🎉 Hoàn tất việc đồng bộ dữ liệu AI lên Supabase!");
}

main().catch(console.error);
