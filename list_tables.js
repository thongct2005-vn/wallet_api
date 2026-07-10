const pool = require('./src/config/db');
pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
    .then(res => {
        console.log('Count:', res.rows.length);
        console.log(res.rows.map(r => r.table_name).sort().join('\n'));
        process.exit(0);
    });
