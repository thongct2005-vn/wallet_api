const pool = require('./src/config/db');
async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS loyalty_point_batches (
        id UUID PRIMARY KEY,
        wallet_id UUID NOT NULL REFERENCES wallets(id),
        initial_amount INTEGER NOT NULL,
        remaining_amount INTEGER NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        ledger_transaction_id UUID REFERENCES ledger_transactions(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table loyalty_point_batches created.');
    
    const res = await pool.query('SELECT wallet_id, loyalty_points FROM wallet_balances WHERE loyalty_points > 0');
    for (let row of res.rows) {
      const check = await pool.query('SELECT 1 FROM loyalty_point_batches WHERE wallet_id = $1 LIMIT 1', [row.wallet_id]);
      if (check.rows.length === 0) {
        const { v7: uuidv7 } = require('uuid');
        const id = uuidv7();
        const date = new Date();
        date.setMonth(date.getMonth() + 6);
        date.setDate(0); // end of that month
        date.setHours(23, 59, 59, 999);
        const pointsInt = Math.floor(Number(row.loyalty_points));
        await pool.query(
          'INSERT INTO loyalty_point_batches (id, wallet_id, initial_amount, remaining_amount, expires_at) VALUES ($1, $2, $3, $4, $5)', 
          [id, row.wallet_id, pointsInt, pointsInt, date]
        );
      }
    }
    console.log('Migration done.');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
