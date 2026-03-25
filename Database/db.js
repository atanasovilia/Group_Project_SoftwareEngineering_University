// Import MySQL client that supports async/await via promises.
const mysql = require('mysql2/promise');
// Path is used to build an absolute path to the local .env file.
const path = require('path');

// Load environment variables from the project root first.
require('dotenv').config();
// Only fall back to Database/.env if root config did not provide DB settings.
if (
  !process.env.DATABASE_URL &&
  !process.env.DB_HOST &&
  !process.env.DB_USER &&
  !process.env.DB_PASSWORD &&
  !process.env.DB_NAME
) {
  require('dotenv').config({ path: path.resolve(__dirname, '.env') });
}

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

function resolvePoolConfig() {
  if (process.env.DATABASE_URL) {
    return {
      uri: process.env.DATABASE_URL,
      ssl: getSslConfig(),
      ...poolBaseConfig,
    };
  }

  const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missingVars = requiredVars.filter((key) => !process.env[key]);

  if (missingVars.length > 0) {
    const error = new Error(
      `Missing required environment variables: ${missingVars.join(', ')}. ` +
        'Set DATABASE_URL or the DB_HOST/DB_USER/DB_PASSWORD/DB_NAME variables.'
    );
    error.code = 'DB_CONFIG_ERROR';
    throw error;
  }

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: getSslConfig(),
    ...poolBaseConfig,
  };
}

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(resolvePoolConfig());
  }
  return pool;
}

async function query(sql, values) {
  return getPool().query(sql, values);
}

module.exports = { query };
