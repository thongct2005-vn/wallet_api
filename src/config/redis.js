const Redis = require('ioredis');
require('dotenv').config();

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
});

redisConnection.on('error', (err) => {
    console.error('Redis connection error:', err);
});

module.exports = redisConnection;
