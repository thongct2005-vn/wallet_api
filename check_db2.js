const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:123@localhost:5432/db' });

async function run() {
    const res = await pool.query(`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('transfers', 'ledger_transactions')`);
    console.log(res.rows);
    pool.end();
}

run();
