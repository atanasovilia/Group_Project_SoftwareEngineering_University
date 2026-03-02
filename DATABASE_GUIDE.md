# MySQL Setup Guide (Simple Version)

This guide explains the **minimum practical way** to add MySQL to your app and let other people use your app safely.

---

## 1) First idea to remember

- People should use your **app/API**.
- People should **not** connect directly to your MySQL database.
- Your backend server connects to MySQL using secret credentials.

So the flow is:

**User -> Your app/API -> MySQL**

---

## 2) What you already have

You already created this schema in `Database/database.sql`:

- Database: `group_project`
- Table: `users`

That is a good start for testing.

---

## 3) Better minimum schema (recommended)

Your current table works, but for shared use, this is safer:

```sql
CREATE DATABASE IF NOT EXISTS group_project;
USE group_project;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Why this matters:
- `NOT NULL`: required fields cannot be empty.
- `UNIQUE` email: no duplicate accounts.
- `password_hash`: store hashed passwords only.

---

## 4) Local development setup

### Step A: Install MySQL locally (or use Docker)
Choose one:
- MySQL Community Server
- Docker image (`mysql:8`)

### Step B: Create DB + table
Run your SQL script:

```bash
mysql -u root -p < Database/database.sql
```

(Or run it in MySQL Workbench.)

### Step C: Add Node package
From project root:

```bash
npm install mysql2 dotenv
```

### Step D: Add `.env` file in project root

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=app_user
DB_PASSWORD=your_strong_password
DB_NAME=group_project
```

Also add `.env` to `.gitignore`.

---

## 5) Connect backend to MySQL (Node)

Use `mysql2/promise` in your backend (`Database/server.js` or `Database/db.js`).

Example:

```js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
```

Then in API route example:

```js
const [rows] = await pool.query('SELECT id, name, email, created_at FROM users');
res.json(rows);
```

---

## 6) How to let others access it

### Correct way
- Deploy your backend API (Render, Railway, Fly.io, Azure, AWS, etc.).
- Deploy MySQL as managed service (Railway MySQL, PlanetScale, Aiven, AWS RDS, Azure MySQL).
- Put DB credentials in host secrets/env settings.
- Users call your API endpoints; backend talks to DB.

### Avoid
- Do not expose MySQL port `3306` to public internet.
- Do not share DB root password.
- Do not commit `.env` to GitHub.

---

## 7) Team workflow (important)

For teammates:
- Share `.env.example` (no real passwords).
- Keep real `.env` private.
- Use migration scripts when schema changes.

Example `.env.example`:

```env
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=group_project
```

---

## 8) Minimum security checklist

Before production, verify:

- [ ] DB user is not root
- [ ] Strong password is used
- [ ] `.env` is ignored in Git
- [ ] Passwords are hashed (`bcrypt`)
- [ ] DB backups are enabled
- [ ] API validates input
- [ ] HTTPS is enabled on deployed backend

---

## 9) Quick roadmap for your project

1. Keep your SQL file for initial schema.
2. Add `password_hash`, `UNIQUE(email)`, and `NOT NULL` fields.
3. Connect Node backend with `mysql2` + `.env`.
4. Test locally with one `GET /users` and one `POST /register` endpoint.
5. Move to hosted MySQL + deployed backend.
6. Share app URL with others (not DB credentials).

---

## 10) If you want the fastest MVP

- Use Railway (backend + MySQL in one place).
- Add env variables in Railway dashboard.
- Deploy backend.
- Run schema once.
- Share backend/frontend URL with your team.

That gives you simple setup and multi-user access quickly.
