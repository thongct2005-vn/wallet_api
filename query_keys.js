const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ewallet_core_db',
  password: '123456',
  port: 5432,
});

async function getKeys() {
  try {
    const res = await pool.query('SELECT api_key, environment, status FROM merchant_api_keys WHERE status = $1', ['ACTIVE']);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

getKeys();
