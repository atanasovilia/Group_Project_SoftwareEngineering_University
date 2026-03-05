const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '../Database/.env') });

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true,
    });

    const appDbUser = process.env.APP_DB_USER || 'app_user';
    const appDbPassword = process.env.APP_DB_PASSWORD;
    const appDbHost = process.env.APP_DB_HOST || 'localhost';

    if (!appDbPassword) {
      throw new Error('Missing APP_DB_PASSWORD for app DB user creation.');
    }

    const sql = `
      CREATE USER IF NOT EXISTS '${appDbUser}'@'${appDbHost}' IDENTIFIED BY '${appDbPassword}';
      GRANT ALL PRIVILEGES ON ${process.env.DB_NAME}.* TO '${appDbUser}'@'${appDbHost}';
      FLUSH PRIVILEGES;
    `;

    await conn.query(sql);
    console.log(`'${appDbUser}'@'${appDbHost}' created or updated`);
    await conn.end();
  } catch (e) {
    console.error('failed', e.message);
  }
})();
