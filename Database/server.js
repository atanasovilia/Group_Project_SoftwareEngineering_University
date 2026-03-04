const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 3000);
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

app.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, created_at FROM users ORDER BY id DESC'
    );
    res.json(rows);
  } catch (error) {
    console.error('GET /users failed:', error.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    await pool.query('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [
      String(name).trim(),
      normalizedEmail,
      hashedPassword,
    ]);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }

    console.error('POST /register failed:', error.message);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const [rows] = await pool.query(
      'SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

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
    console.error('POST /login failed:', error.message);
    res.status(500).json({ error: 'Failed to login' });
  }
});