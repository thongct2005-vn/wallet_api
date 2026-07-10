const mongoose = require('mongoose');

const connectMongoDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.warn('[MongoDB] MONGODB_URI is not defined in .env');
            return;
        }

        const dbName = process.env.MONGODB_LOG_DB;
        const options = {};
        if (dbName) {
            options.dbName = dbName;
        }

        await mongoose.connect(uri, options);
        console.log('[MongoDB] Connected to MongoDB successfully.');
        
        try {
            await mongoose.connection.collection('webhook_attempt_logs').dropIndex('old_pg_callback_id_1_attempt_no_1');
            console.log('[MongoDB] Đã xoá index cũ (old_pg_callback_id_1_attempt_no_1) thành công.');
        } catch (idxErr) {
            // Ignored if index does not exist
        }

    } catch (error) {
        console.error('[MongoDB] Connection failed:', error);
        // Có thể không cần exit process nếu log chỉ là phụ
        // process.exit(1); 
    }
};

module.exports = connectMongoDB;
