// Import MySQL client that supports async/await via promises.
const mysql = require('mysql2/promise');
// Path is used to build an absolute path to the local .env file.
const path = require('path');

// Load environment variables from the project root if available.
require('dotenv').config();
// Also load environment variables from Database/.env (useful for this folder-based setup).
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Required variables for creating a DB connection.
const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
// Find any missing required env variables.
const missingVars = requiredVars.filter((key) => !process.env[key]);

// Stop startup early with a clear error if env config is incomplete.
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Create a reusable connection pool for efficient DB access.
const pool = mysql.createPool({
  // Database host (e.g., localhost or hosted DB endpoint).
  host: process.env.DB_HOST,
  // Parse DB port from env and default to 3306 when not set.
  port: Number(process.env.DB_PORT || 3306),
  // Database username.
  user: process.env.DB_USER,
  // Database password.
  password: process.env.DB_PASSWORD,
  // Target database/schema name.
  database: process.env.DB_NAME,
  // Queue connection requests when pool is busy.
  waitForConnections: true,
  // Maximum simultaneous DB connections.
  connectionLimit: 10,
});

// Export the pool so routes can run queries.
module.exports = pool;