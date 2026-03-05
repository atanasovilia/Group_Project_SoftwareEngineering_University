// Express framework for HTTP API endpoints.
const express = require('express');
// Bcrypt for secure password hashing and verification.
const bcrypt = require('bcrypt');
// CORS allows frontend pages (different origin) to call this API.
const cors = require('cors');
// Shared MySQL pool from db module.
const pool = require('./db');

// Create Express application instance.
const app = express();
// Enable Cross-Origin Resource Sharing.
app.use(cors());
// Parse incoming JSON request bodies.
app.use(express.json());

// API listening port (defaults to 3000 for local development).
const PORT = Number(process.env.PORT || 3000);
// Cost factor for bcrypt hashing (higher = slower + stronger).
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

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

    // Log unexpected errors.
    console.error('POST /register failed:', error.message);
    // Generic failure response.
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Start HTTP server.
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// POST /login
// Authenticates user using email + password.
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