const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:123@localhost:5432/db' });

async function run() {
    const res = await pool.query(`SELECT column_default FROM information_schema.columns WHERE table_name = 'ledger_transactions' AND column_name = 'transaction_no'`);
    console.log("Default:", res.rows);
    
    // Also let's check triggers on ledger_transactions
    const triggerRes = await pool.query(`
        SELECT trigger_name, action_statement
        FROM information_schema.triggers
        WHERE event_object_table = 'ledger_transactions'
    `);
    console.log("Triggers:", triggerRes.rows);

    const funcRes = await pool.query(`
        SELECT routine_name, routine_definition
        FROM information_schema.routines
        WHERE routine_type = 'FUNCTION' AND routine_definition LIKE '%TRX%'
    `);
    console.log("Functions:", funcRes.rows);

    pool.end();
}

run();
