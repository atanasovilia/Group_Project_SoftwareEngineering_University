// Express framework for HTTP API endpoints.
const express = require('express');
// Bcrypt for secure password hashing and verification.
const bcrypt = require('bcrypt');
// CORS allows frontend pages (different origin) to call this API.
const cors = require('cors');
const path = require('path');
const pool = require('./db');

// Create Express application instance.
const app = express();
app.disable('x-powered-by');
const HOST = process.env.HOST || '0.0.0.0';
const rawCorsOrigins = process.env.CORS_ORIGINS || '*';
const allowedOrigins = rawCorsOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions =
  allowedOrigins.length === 1 && allowedOrigins[0] === '*'
    ? {}
    : {
        origin(origin, callback) {
          // Allow server-to-server or curl requests with no Origin header.
          if (!origin) return callback(null, true);
          if (allowedOrigins.includes(origin)) return callback(null, true);
          return callback(new Error('CORS origin not allowed'));
        },
      };

app.use(cors(corsOptions));
app.use(express.json());

// Defense-in-depth: never serve dotfiles, env files, or SQL dumps via HTTP.
app.use((req, res, next) => {
  const requestPath = String(req.path || '').toLowerCase();
  if (
    requestPath.startsWith('/.') ||
    requestPath.includes('.env') ||
    requestPath.endsWith('.sql')
  ) {
    return res.status(404).send('Not found');
  }
  return next();
});

app.use(express.static(path.join(__dirname, '../Prototype')));

// API listening port (defaults to 3000 for local development).
const PORT = Number(process.env.PORT || 3000);
// Cost factor for bcrypt hashing (higher = slower + stronger).
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
const VALID_GENDERS = new Set(['male', 'female', 'other', 'prefer_not_to_say']);
const VALID_BLOOD_TYPES = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);

app.get('/', (req, res) => {
  res.json({
    message: 'API is running',
    endpoints: {
      users: 'GET /users',
      register: 'POST /register',
      login: 'POST /login',
    },
  });
});

// GET /users
// Returns a list of users (without password hash) newest first.
app.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, created_at FROM users ORDER BY id DESC'
    );
    // Send users as JSON response.
    res.json(rows);
  } catch (error) {
    // Log server-side error details for debugging.
    console.error('GET /users failed:', error.message);
    // Return generic error to client.
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /register
// Creates a new user with hashed password.
app.post('/register', async (req, res) => {
  try {
    // Extract fields from request body.
    const { name, email, password } = req.body;

    // Basic required field validation.
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }

    // Enforce minimum password length.
    if (password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }

    // Normalize email for consistent storage and duplicate checks.
    const normalizedEmail = String(email).trim().toLowerCase();
    // Hash password before saving (never store plain text passwords).
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert new user record into database.
    await pool.query('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [
      String(name).trim(),
      normalizedEmail,
      hashedPassword,
    ]);

    // Successful creation response.
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    // Handle duplicate email (unique constraint).
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }

    console.error('POST /register failed:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

app.post('/login', async (req, res) => {
  try {
    // Extract credentials from request body.
    const { email, password } = req.body;

    // Validate required login inputs.
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    // Normalize email to match registration format.
    const normalizedEmail = String(email).trim().toLowerCase();

    // Retrieve matching user (including hashed password for verification).
    const [rows] = await pool.query(
      'SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    // If user does not exist, return auth failure.
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Use first matched user row.
    const user = rows[0];
    // Compare plain password with stored hash.
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    // Invalid password -> auth failure.
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Successful login response (excluding password hash).
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    // Log unexpected errors for troubleshooting.
    console.error('POST /login failed:', error.message);
    // Generic failure response.
    res.status(500).json({ error: 'Failed to login' });
  }
});

app.get('/medical-records', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        mr.id,
        mr.user_id,
        u.name AS user_name,
        u.email AS user_email,
        mr.date_of_birth,
        mr.gender,
        mr.phone,
        mr.address,
        mr.blood_type,
        mr.allergies,
        mr.diagnosis,
        mr.medications,
        mr.emergency_contact_name,
        mr.emergency_contact_phone,
        mr.created_at,
        mr.updated_at
      FROM medical_records mr
      JOIN users u ON u.id = mr.user_id
      ORDER BY mr.user_id ASC`
    );

    res.json(rows);
  } catch (error) {
    console.error('GET /medical-records failed:', error.message);
    res.status(500).json({ error: 'Failed to fetch medical records' });
  }
});

app.get('/medical-records/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'userId must be a positive integer' });
    }

    const [rows] = await pool.query(
      `SELECT
        mr.id,
        mr.user_id,
        u.name AS user_name,
        u.email AS user_email,
        mr.date_of_birth,
        mr.gender,
        mr.phone,
        mr.address,
        mr.blood_type,
        mr.allergies,
        mr.diagnosis,
        mr.medications,
        mr.emergency_contact_name,
        mr.emergency_contact_phone,
        mr.created_at,
        mr.updated_at
      FROM medical_records mr
      JOIN users u ON u.id = mr.user_id
      WHERE mr.user_id = ?
      LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Medical record not found for this userId' });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error('GET /medical-records/:userId failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch medical record' });
  }
});

app.put('/medical-records/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'userId must be a positive integer' });
    }

    const [userRows] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const input = req.body || {};
    const allowedFields = [
      'date_of_birth',
      'gender',
      'phone',
      'address',
      'blood_type',
      'allergies',
      'diagnosis',
      'medications',
      'emergency_contact_name',
      'emergency_contact_phone',
    ];

    const providedFields = allowedFields.filter((field) => Object.hasOwn(input, field));
    if (providedFields.length === 0) {
      return res
        .status(400)
        .json({ error: `Provide at least one field: ${allowedFields.join(', ')}` });
    }

    if (Object.hasOwn(input, 'gender') && input.gender != null && !VALID_GENDERS.has(input.gender)) {
      return res.status(400).json({ error: 'Invalid gender value' });
    }

    if (
      Object.hasOwn(input, 'blood_type') &&
      input.blood_type != null &&
      !VALID_BLOOD_TYPES.has(input.blood_type)
    ) {
      return res.status(400).json({ error: 'Invalid blood_type value' });
    }

    if (Object.hasOwn(input, 'date_of_birth') && input.date_of_birth != null) {
      const dob = String(input.date_of_birth);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        return res.status(400).json({ error: 'date_of_birth must be YYYY-MM-DD' });
      }
    }

    const [existingRows] = await pool.query(
      'SELECT id FROM medical_records WHERE user_id = ? LIMIT 1',
      [userId]
    );
    const recordExists = existingRows.length > 0;

    if (!recordExists && !Object.hasOwn(input, 'date_of_birth')) {
      return res.status(400).json({
        error: 'date_of_birth is required when creating a medical record for a user',
      });
    }

    if (recordExists) {
      const setClause = providedFields.map((field) => `${field} = ?`).join(', ');
      const values = providedFields.map((field) => input[field]);

      await pool.query(
        `UPDATE medical_records
         SET ${setClause}, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [...values, userId]
      );
    } else {
      const insertFields = ['user_id', ...providedFields];
      const placeholders = insertFields.map(() => '?').join(', ');
      const values = [userId, ...providedFields.map((field) => input[field])];

      await pool.query(
        `INSERT INTO medical_records (${insertFields.join(', ')})
         VALUES (${placeholders})`,
        values
      );
    }

    const [resultRows] = await pool.query(
      `SELECT
        mr.id,
        mr.user_id,
        u.name AS user_name,
        u.email AS user_email,
        mr.date_of_birth,
        mr.gender,
        mr.phone,
        mr.address,
        mr.blood_type,
        mr.allergies,
        mr.diagnosis,
        mr.medications,
        mr.emergency_contact_name,
        mr.emergency_contact_phone,
        mr.created_at,
        mr.updated_at
      FROM medical_records mr
      JOIN users u ON u.id = mr.user_id
      WHERE mr.user_id = ?
      LIMIT 1`,
      [userId]
    );

    return res.json({
      message: 'Medical record saved successfully',
      record: resultRows[0],
    });
  } catch (error) {
    console.error('PUT /medical-records/:userId failed:', error.message);
    return res.status(500).json({ error: 'Failed to save medical record' });
  }
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  });
}

module.exports = app;
