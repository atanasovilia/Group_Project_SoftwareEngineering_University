// api/test-db.js
import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  try {
    const conn = await mysql.createConnection({
      uri: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: true }
    });

    const [rows] = await conn.execute('SELECT COUNT(*) as count FROM users');
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}