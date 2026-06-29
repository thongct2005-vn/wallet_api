const SystemLog = require('./models/system_log.model');

const logRepository = {
    writeSystemLog: async (serviceName, logLevel, message, metadata) => {
        try {
            await SystemLog.create({
                service_name: serviceName,
                log_level: logLevel,
                message: message,
                metadata: metadata
            });
        } catch (error) {
            console.error('[SystemLog] Lỗi ghi log vào MongoDB:', error);
        }
    }
};

module.exports = logRepository;