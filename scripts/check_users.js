const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').resolve(__dirname, '../Database/.env') });

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
    const [rows] = await conn.query('SELECT User, Host FROM mysql.user');
    console.log(rows);
    await conn.end();
  } catch (e) {
    console.error('failed', e.message);
  }
})();