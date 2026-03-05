const pool = require('../Database/db');

async function main() {
  try {
    const [rows] = await pool.query('SELECT NOW() AS now_utc, DATABASE() AS current_db');
    console.log('Database connection successful.');
    console.log(rows[0]);
  } catch (error) {
    console.error('Database connection failed.');
    console.error(error.message || error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
