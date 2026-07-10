const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    // [SECURITY FIX] SSL config: Dùng CA cert nếu có, fallback rejectUnauthorized cho staging
    // Production nên set DB_CA_CERT=path/to/ca-certificate.crt
    ssl: process.env.DB_HOST !== 'localhost' 
        ? {
            rejectUnauthorized: process.env.NODE_ENV === 'production',
            ca: process.env.DB_CA_CERT ? fs.readFileSync(process.env.DB_CA_CERT, 'utf8') : undefined
        } 
        : false,
});

module.exports = pool;