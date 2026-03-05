const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

function getSslConfig() {
  const sslEnabled = String(process.env.DB_SSL || '').toLowerCase() === 'true';
  if (!sslEnabled) return undefined;

  return {
    rejectUnauthorized:
      String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'true').toLowerCase() !== 'false',
  };
}

const poolBaseConfig = {
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
};

let poolConfig;

if (process.env.DATABASE_URL) {
  poolConfig = {
    uri: process.env.DATABASE_URL,
    ssl: getSslConfig(),
    ...poolBaseConfig,
  };
} else {
  const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missingVars = requiredVars.filter((key) => !process.env[key]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}. ` +
        'Set DATABASE_URL or the DB_HOST/DB_USER/DB_PASSWORD/DB_NAME variables.'
    );
  }

  poolConfig = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: getSslConfig(),
    ...poolBaseConfig,
  };
}

const pool = mysql.createPool(poolConfig);

module.exports = pool;
