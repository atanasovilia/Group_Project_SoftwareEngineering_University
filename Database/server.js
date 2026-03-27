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

app.use(express.static(path.join(__dirname, '../application')));

// API listening port (defaults to 3000 for local development).
const PORT = Number(process.env.PORT || 3000);
// Cost factor for bcrypt hashing (higher = slower + stronger).
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
const VALID_GENDERS = new Set(['male', 'female', 'other', 'prefer_not_to_say']);
const VALID_BLOOD_TYPES = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_PATTERN = /^[A-Za-z][A-Za-z' -]{1,118}[A-Za-z]$/;
const PHONE_PATTERN = /^\+?[0-9() -]{7,25}$/;
const ADDRESS_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s,.'#\/-]{4,254}$/;
const MEDICAL_TEXT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s,.'()\/+-]{1,998}[A-Za-z0-9.)]$/;

function formatDateOnly(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function toSqlTimeValue(timeValue) {
  return /^\d{2}:\d{2}$/.test(String(timeValue)) ? `${timeValue}:00` : String(timeValue);
}

function parseDateInput(dateInput) {
  if (!dateInput) {
    return null;
  }

  const match = String(dateInput).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, yearString, monthString, dayString] = match;
  const parsed = new Date(Number(yearString), Number(monthString) - 1, Number(dayString));
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== Number(yearString) ||
    parsed.getMonth() !== Number(monthString) - 1 ||
    parsed.getDate() !== Number(dayString)
  ) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function isValidIsoDate(value) {
  return parseDateInput(value) !== null;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeOptionalString(value) {
  if (value == null) {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function validatePatternField(value, pattern, fieldName, errorMessage) {
  if (value == null) {
    return null;
  }

  if (!isNonEmptyString(value)) {
    return `${fieldName} must be a non-empty string`;
  }

  if (!pattern.test(value)) {
    return errorMessage;
  }

  return null;
}

function countDigits(value) {
  return String(value || '').replace(/\D/g, '').length;
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function deriveNameFromEmail(email) {
  const localPart = String(email || '').split('@')[0] || 'user';
  const words = localPart
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  return (words.join(' ') || 'User').slice(0, 100);
}

function validateEmailAddress(email) {
  if (!isNonEmptyString(email)) {
    return 'Email address is required.';
  }

  if (String(email).trim().length > 100) {
    return 'Email address must be 100 characters or fewer.';
  }

  if (!EMAIL_PATTERN.test(String(email).trim())) {
    return 'Please enter a valid email address.';
  }

  return null;
}

function validatePasswordForRegistration(password) {
  if (typeof password !== 'string' || password.length === 0) {
    return 'Password is required.';
  }

  if (/\s/.test(password)) {
    return 'Password cannot contain spaces.';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter.';
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter.';
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must include at least one number.';
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must include at least one special character.';
  }

  return null;
}

function validatePhoneNumber(phone, { required = false, fieldLabel = 'Phone number' } = {}) {
  if (phone == null || phone === '') {
    return required ? `${fieldLabel} is required.` : null;
  }

  if (!isNonEmptyString(phone)) {
    return `${fieldLabel} is required.`;
  }

  if (!PHONE_PATTERN.test(phone)) {
    return `${fieldLabel} can only contain numbers, spaces, parentheses, hyphens, and an optional leading +.`;
  }

  const digitCount = countDigits(phone);
  if (digitCount < 7 || digitCount > 15) {
    return `${fieldLabel} must contain between 7 and 15 digits.`;
  }

  return null;
}

function validateDateOfBirth(value, { required = false, fieldLabel = 'Date of birth' } = {}) {
  if (value == null || value === '') {
    return required ? `${fieldLabel} is required.` : null;
  }

  if (!isNonEmptyString(value)) {
    return `${fieldLabel} is required.`;
  }

  if (!isValidIsoDate(value)) {
    return `${fieldLabel} must be a real date in YYYY-MM-DD format.`;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parsedDate = new Date(`${value}T00:00:00`);
  if (parsedDate > today) {
    return `${fieldLabel} cannot be in the future.`;
  }

  return null;
}

function formatMonthLabel(date) {
  return date.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

function getCalendarStart(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getCalendarEnd(date) {
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const day = end.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  end.setDate(end.getDate() + diff);
  end.setHours(0, 0, 0, 0);
  return end;
}

function timeToMinutes(timeValue) {
  const [hours, minutes] = String(timeValue).split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function toDisplayTime(timeValue) {
  const [hoursString, minutesString] = String(timeValue).split(':');
  const hours = Number(hoursString);
  const minutes = Number(minutesString);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const twelveHour = hours % 12 || 12;
  return `${twelveHour}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function buildTimeSlots(slotRanges) {
  const slots = [];
  for (const range of slotRanges) {
    const startMinutes = timeToMinutes(range.start_time);
    const endMinutes = timeToMinutes(range.end_time);

    for (let current = startMinutes; current < endMinutes; current += 30) {
      const slotEnd = Math.min(current + 30, endMinutes);
      slots.push({
        start_time: minutesToTime(current),
        end_time: minutesToTime(slotEnd),
        label: toDisplayTime(minutesToTime(current)),
        available: true,
      });
    }
  }

  return slots;
}

function getRequestUserId(req) {
  const headerValue = req.get('x-user-id');
  const userId = Number(headerValue);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function ensureSelfAccess(req, res, expectedUserId) {
  const requestUserId = getRequestUserId(req);
  if (!requestUserId) {
    res.status(401).json({ error: 'Authentication header required' });
    return false;
  }

  if (requestUserId !== expectedUserId) {
    res.status(403).json({ error: 'You can only access your own data' });
    return false;
  }

  return true;
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../application/index.html'));
});

app.get('/health/db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DATABASE() AS current_db, NOW() AS server_time');
    res.json({
      ok: true,
      database: rows[0]?.current_db || null,
      server_time: rows[0]?.server_time || null,
    });
  } catch (error) {
    console.error('GET /health/db failed:', error.message);
    res.status(500).json({
      ok: false,
      error: error.message || 'Database connection failed',
    });
  }
});

app.get('/doctors', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, specialty, email, room_number, status
       FROM doctors
       WHERE status = 'active'
       ORDER BY full_name ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('GET /doctors failed:', error.message);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

app.get('/calendar/month', async (req, res) => {
  try {
    const doctorId = Number(req.query.doctorId);
    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({ error: 'doctorId must be a positive integer' });
    }

    const monthDate = parseDateInput(req.query.month) || new Date();
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const calendarStart = getCalendarStart(monthDate);
    const calendarEnd = getCalendarEnd(monthDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    const todayIso = formatDateOnly(today);

    const [doctorRows] = await pool.query(
      `SELECT id, full_name, specialty, room_number
       FROM doctors
       WHERE id = ? AND status = 'active'
       LIMIT 1`,
      [doctorId]
    );

    if (doctorRows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const [slotRows] = await pool.query(
      `SELECT
         day_of_week,
         TIME_FORMAT(start_time, '%H:%i') AS start_time,
         TIME_FORMAT(end_time, '%H:%i') AS end_time,
         slot_capacity
       FROM doctor_availability_slots
       WHERE doctor_id = ?
         AND is_active = TRUE
       ORDER BY day_of_week, start_time`,
      [doctorId]
    );

    const [bookedRows] = await pool.query(
      `SELECT
         DATE_FORMAT(appointment_date, '%Y-%m-%d') AS appointment_date,
         TIME_FORMAT(appointment_time, '%H:%i') AS appointment_time
       FROM appointments
       WHERE doctor_id = ?
         AND appointment_date BETWEEN ? AND ?
         AND status = 'confirmed'`,
      [doctorId, formatDateOnly(calendarStart), formatDateOnly(calendarEnd)]
    );

    const slotMap = new Map();
    for (const row of slotRows) {
      const existing = slotMap.get(row.day_of_week) || [];
      existing.push(row);
      slotMap.set(row.day_of_week, existing);
    }

    const bookedSlotsByDate = new Map();
    for (const row of bookedRows) {
      const dateKey = row.appointment_date;
      const existing = bookedSlotsByDate.get(dateKey) || new Set();
      existing.add(row.appointment_time);
      bookedSlotsByDate.set(dateKey, existing);
    }

    const days = [];
    for (
      let cursor = new Date(calendarStart);
      cursor <= calendarEnd;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const currentDate = new Date(cursor);
      currentDate.setHours(0, 0, 0, 0);
      const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
      const ranges = slotMap.get(dayOfWeek) || [];
      const isoDate = formatDateOnly(currentDate);
      const isPastDate = currentDate < today;
      const bookedTimes = bookedSlotsByDate.get(isoDate) || new Set();
      let availableSlots = [];

      if (!isPastDate) {
        availableSlots = buildTimeSlots(ranges).filter((slot) => !bookedTimes.has(slot.start_time));

        if (isoDate === todayIso) {
          availableSlots = availableSlots.filter((slot) => timeToMinutes(slot.start_time) > nowMinutes);
        }
      }

      days.push({
        iso_date: isoDate,
        day_number: currentDate.getDate(),
        day_of_week: dayOfWeek,
        is_current_month: currentDate.getMonth() === monthDate.getMonth(),
        total_slots: availableSlots.length,
        is_past: isPastDate,
        status: availableSlots.length > 0 ? 'available' : 'unavailable',
      });
    }

    return res.json({
      doctor: doctorRows[0],
      month_start: formatDateOnly(monthStart),
      month_end: formatDateOnly(monthEnd),
      month_label: formatMonthLabel(monthDate),
      days,
    });
  } catch (error) {
    console.error('GET /calendar/month failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch monthly calendar' });
  }
});

app.get('/calendar/day', async (req, res) => {
  try {
    const doctorId = Number(req.query.doctorId);
    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({ error: 'doctorId must be a positive integer' });
    }

    const selectedDate = parseDateInput(req.query.date);
    if (!selectedDate) {
      return res.status(400).json({ error: 'date must be a valid date in YYYY-MM-DD format' });
    }

    const [doctorRows] = await pool.query(
      `SELECT id, full_name, specialty, room_number
       FROM doctors
       WHERE id = ? AND status = 'active'
       LIMIT 1`,
      [doctorId]
    );

    if (doctorRows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPastDate = selectedDate < today;
    const dayOfWeek = selectedDate.getDay() === 0 ? 7 : selectedDate.getDay();
    const [slotRows] = await pool.query(
      `SELECT
         TIME_FORMAT(start_time, '%H:%i') AS start_time,
         TIME_FORMAT(end_time, '%H:%i') AS end_time,
         slot_capacity
       FROM doctor_availability_slots
       WHERE doctor_id = ?
         AND day_of_week = ?
         AND is_active = TRUE
       ORDER BY start_time`,
      [doctorId, dayOfWeek]
    );

    // Get booked appointments for this doctor on this date
    const [bookedSlots] = await pool.query(
      `SELECT TIME_FORMAT(appointment_time, '%H:%i') as appointment_time
       FROM appointments
       WHERE doctor_id = ?
         AND appointment_date = ?
         AND status = 'confirmed'`,
      [doctorId, formatDateOnly(selectedDate)]
    );

    const bookedTimes = new Set(bookedSlots.map((row) => row.appointment_time));
    let slots = isPastDate
      ? []
      : buildTimeSlots(slotRows).filter((slot) => !bookedTimes.has(slot.start_time));

    if (formatDateOnly(selectedDate) === formatDateOnly(today)) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      slots = slots.filter((slot) => timeToMinutes(slot.start_time) > nowMinutes);
    }

    return res.json({
      doctor: doctorRows[0],
      date: formatDateOnly(selectedDate),
      day_of_week: dayOfWeek,
      ranges: slotRows,
      slots: slots,
    });
  } catch (error) {
    console.error('GET /calendar/day failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch daily slots' });
  }
});

// POST /register
// Creates a new user with hashed password.
app.post('/register', async (req, res) => {
  let connection;

  try {
    const rawEmail = req.body?.email;
    const rawPassword = req.body?.password;
    const rawDateOfBirth = req.body?.date_of_birth ?? req.body?.dateOfBirth;
    const rawPhone = req.body?.phone ?? req.body?.phoneNumber;
    const normalizedEmail = normalizeEmail(rawEmail);
    const normalizedDateOfBirth = typeof rawDateOfBirth === 'string' ? rawDateOfBirth.trim() : '';
    const normalizedPhone = typeof rawPhone === 'string' ? rawPhone.trim() : '';
    const emailError = validateEmailAddress(normalizedEmail);
    if (emailError) {
      return res.status(400).json({ error: emailError, code: 'INVALID_EMAIL', field: 'email' });
    }

    const passwordError = validatePasswordForRegistration(rawPassword);
    if (passwordError) {
      return res.status(400).json({ error: passwordError, code: 'INVALID_PASSWORD', field: 'password' });
    }

    const dateOfBirthError = validateDateOfBirth(normalizedDateOfBirth, { required: true });
    if (dateOfBirthError) {
      return res.status(400).json({
        error: dateOfBirthError,
        code: 'INVALID_DATE_OF_BIRTH',
        field: 'date_of_birth',
      });
    }

    const phoneError = validatePhoneNumber(normalizedPhone, { required: true });
    if (phoneError) {
      return res.status(400).json({ error: phoneError, code: 'INVALID_PHONE', field: 'phone' });
    }

    const resolvedName = normalizeOptionalString(req.body?.name) || deriveNameFromEmail(normalizedEmail);
    const hashedPassword = await bcrypt.hash(rawPassword, SALT_ROUNDS);
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [insertResult] = await connection.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [resolvedName, normalizedEmail, hashedPassword]
    );

    await connection.query(
      `INSERT INTO medical_records (user_id, date_of_birth, phone)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         date_of_birth = VALUES(date_of_birth),
         phone = VALUES(phone),
         updated_at = CURRENT_TIMESTAMP`,
      [insertResult.insertId, normalizedDateOfBirth, normalizedPhone]
    );

    await connection.commit();

    // Successful creation response.
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    // Handle duplicate email (unique constraint).
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'An account with this email address already exists.',
        code: 'EMAIL_ALREADY_REGISTERED',
        field: 'email',
      });
    }

    console.error('POST /register failed:', error);
    res.status(500).json({ error: 'Failed to register user' });
  } finally {
    connection?.release();
  }
});

app.post('/login', async (req, res) => {
  try {
    // Extract credentials from request body.
    const { email, password } = req.body;

    const normalizedEmail = normalizeEmail(email);
    const emailError = validateEmailAddress(normalizedEmail);
    if (emailError) {
      return res.status(400).json({ error: emailError, code: 'INVALID_EMAIL', field: 'email' });
    }

    if (typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({
        error: 'Password is required.',
        code: 'PASSWORD_REQUIRED',
        field: 'password',
      });
    }

    // Retrieve matching user (including hashed password for verification).
    const [rows] = await pool.query(
      'SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    // If user does not exist, return auth failure.
    if (rows.length === 0) {
      return res.status(401).json({
        error: 'No account was found for that email address.',
        code: 'EMAIL_NOT_FOUND',
        field: 'email',
      });
    }

    // Use first matched user row.
    const user = rows[0];
    // Compare plain password with stored hash.
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    // Invalid password -> auth failure.
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Incorrect password.',
        code: 'INCORRECT_PASSWORD',
        field: 'password',
      });
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

app.get('/medical-records/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'userId must be a positive integer' });
    }
    if (!ensureSelfAccess(req, res, userId)) {
      return;
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
    if (!ensureSelfAccess(req, res, userId)) {
      return;
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

    const normalizedInput = { ...input };
    for (const field of providedFields) {
      normalizedInput[field] = normalizeOptionalString(input[field]);
    }

    if (
      Object.hasOwn(normalizedInput, 'gender') &&
      normalizedInput.gender != null &&
      !VALID_GENDERS.has(normalizedInput.gender)
    ) {
      return res.status(400).json({ error: 'Invalid gender value' });
    }

    if (
      Object.hasOwn(normalizedInput, 'blood_type') &&
      normalizedInput.blood_type != null &&
      !VALID_BLOOD_TYPES.has(normalizedInput.blood_type)
    ) {
      return res.status(400).json({ error: 'Invalid blood_type value' });
    }

    if (Object.hasOwn(normalizedInput, 'date_of_birth')) {
      const dob = normalizedInput.date_of_birth;
      const dobError = validateDateOfBirth(dob, {
        required: true,
        fieldLabel: 'date_of_birth',
      });
      if (dobError) {
        if (dob == null) {
          return res.status(400).json({ error: 'date_of_birth cannot be empty' });
        }

        return res.status(400).json({ error: dobError });
      }
    }

    const phoneError = validatePhoneNumber(normalizedInput.phone, {
      fieldLabel: 'phone',
    });
    if (phoneError) {
      return res.status(400).json({ error: phoneError });
    }

    const emergencyPhoneError = validatePhoneNumber(normalizedInput.emergency_contact_phone, {
      fieldLabel: 'emergency_contact_phone',
    });
    if (emergencyPhoneError) {
      return res.status(400).json({ error: emergencyPhoneError });
    }

    const emergencyNameError = validatePatternField(
      normalizedInput.emergency_contact_name,
      NAME_PATTERN,
      'emergency_contact_name',
      'emergency_contact_name must contain letters only, with spaces, hyphens, or apostrophes allowed'
    );
    if (emergencyNameError) {
      return res.status(400).json({ error: emergencyNameError });
    }

    const addressError = validatePatternField(
      normalizedInput.address,
      ADDRESS_PATTERN,
      'address',
      'address contains invalid characters'
    );
    if (addressError) {
      return res.status(400).json({ error: addressError });
    }

    for (const field of ['allergies', 'diagnosis', 'medications']) {
      const fieldError = validatePatternField(
        normalizedInput[field],
        MEDICAL_TEXT_PATTERN,
        field,
        `${field} contains invalid characters`
      );
      if (fieldError) {
        return res.status(400).json({ error: fieldError });
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
      const values = providedFields.map((field) => normalizedInput[field]);

      await pool.query(
        `UPDATE medical_records
         SET ${setClause}, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [...values, userId]
      );
    } else {
      const insertFields = ['user_id', ...providedFields];
      const placeholders = insertFields.map(() => '?').join(', ');
      const values = [userId, ...providedFields.map((field) => normalizedInput[field])];

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

app.post('/appointments', async (req, res) => {
  try {
    const { user_id, doctor_id, appointment_date, appointment_time } = req.body;

    // Validation: Check for required fields
    if (!user_id || !doctor_id || !appointment_date || !appointment_time) {
      const missing = [];
      if (!user_id) missing.push('user_id');
      if (!doctor_id) missing.push('doctor_id');
      if (!appointment_date) missing.push('appointment_date');
      if (!appointment_time) missing.push('appointment_time');
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    const userId = Number(user_id);
    const doctorId = Number(doctor_id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'user_id must be a positive integer' });
    }
    if (!ensureSelfAccess(req, res, userId)) {
      return;
    }

    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({ error: 'doctor_id must be a positive integer' });
    }

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(appointment_date))) {
      return res.status(400).json({ error: 'appointment_date must be YYYY-MM-DD format' });
    }

    // Validate time format HH:MM
    if (!/^\d{2}:\d{2}$/.test(String(appointment_time))) {
      return res.status(400).json({ error: 'appointment_time must be HH:MM format' });
    }

    // Check if date is valid
    const dateObj = new Date(`${appointment_date}T${appointment_time}:00`);
    if (Number.isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid appointment date or time' });
    }

    // Check if appointment is in the future
    if (dateObj < new Date()) {
      return res.status(400).json({ error: 'Cannot book appointments in the past' });
    }

    const sqlAppointmentTime = toSqlTimeValue(appointment_time);

    // Check if user exists
    const [userRows] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: `User with ID ${userId} not found` });
    }

    // Check if doctor exists and is active
    const [doctorRows] = await pool.query(
      'SELECT id, full_name FROM doctors WHERE id = ? AND status = "active" LIMIT 1',
      [doctorId]
    );
    if (doctorRows.length === 0) {
      return res.status(404).json({ error: `Doctor with ID ${doctorId} not found or is inactive` });
    }

    // Reuse cancelled rows because the unique slot constraint reserves doctor/date/time.
    const [existingAppointment] = await pool.query(
      `SELECT id, user_id, status, created_at
       FROM appointments
       WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ?
       LIMIT 1`,
      [doctorId, appointment_date, sqlAppointmentTime]
    );
    if (existingAppointment.length > 0) {
      const slotRecord = existingAppointment[0];
      if (slotRecord.status === 'confirmed') {
        return res.status(409).json({
          error: 'This appointment slot is no longer available. Please select another time.'
        });
      }

      const [updateResult] = await pool.query(
        `UPDATE appointments
         SET user_id = ?, status = 'confirmed'
         WHERE id = ?`,
        [userId, slotRecord.id]
      );

      if (!updateResult || updateResult.affectedRows === 0) {
        throw new Error('Failed to restore cancelled appointment slot');
      }

      return res.status(200).json({
        id: slotRecord.id,
        user_id: userId,
        doctor_id: doctorId,
        appointment_date,
        appointment_time,
        status: 'confirmed',
        created_at: slotRecord.created_at,
        message: 'Appointment successfully booked',
      });
    }

    // Create appointment with explicit status
    const [result] = await pool.query(
      `INSERT INTO appointments (user_id, doctor_id, appointment_date, appointment_time, status)
       VALUES (?, ?, ?, ?, 'confirmed')`,
      [userId, doctorId, appointment_date, sqlAppointmentTime]
    );

    if (!result || !result.insertId) {
      throw new Error('Failed to retrieve appointment ID after insertion');
    }

    return res.status(201).json({
      id: result.insertId,
      user_id: userId,
      doctor_id: doctorId,
      appointment_date,
      appointment_time,
      status: 'confirmed',
      created_at: new Date().toISOString(),
      message: 'Appointment successfully booked',
    });
  } catch (error) {
    // Log detailed error for debugging
    console.error('POST /appointments failed with error:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
    });

    // Return appropriate error based on error type
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'This appointment slot is already booked' });
    }

    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(404).json({ error: 'User or doctor not found' });
    }

    return res.status(500).json({ 
      error: 'Failed to create appointment. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// GET /user/:userId/appointments
// Fetch all appointments for a user (confirmed + cancelled)
app.get('/user/:userId/appointments', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'userId must be a positive integer' });
    }
    if (!ensureSelfAccess(req, res, userId)) {
      return;
    }

    const [appointments] = await pool.query(
      `SELECT
         a.id,
         a.user_id,
         a.doctor_id,
         a.appointment_date,
         a.appointment_time,
         a.status,
         a.created_at,
         d.full_name AS doctor_name,
         d.specialty AS doctor_specialty,
         d.room_number
       FROM appointments a
       JOIN doctors d ON d.id = a.doctor_id
       WHERE a.user_id = ?
       ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
      [userId]
    );

    return res.json({
      user_id: userId,
      appointments: appointments,
    });
  } catch (error) {
    console.error('GET /user/:userId/appointments failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// PATCH /appointments/:appointmentId/cancel
// Cancel an appointment and free up the slot
app.patch('/appointments/:appointmentId/cancel', async (req, res) => {
  try {
    const appointmentId = Number(req.params.appointmentId);
    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({ error: 'appointmentId must be a positive integer' });
    }

    const requestUserId = getRequestUserId(req);
    if (!requestUserId) {
      return res.status(401).json({ error: 'Authentication header required' });
    }

    // Fetch appointment to verify it exists and get details
    const [appointmentRows] = await pool.query(
      `SELECT id, user_id, doctor_id, appointment_date, appointment_time, status
       FROM appointments
       WHERE id = ?
       LIMIT 1`,
      [appointmentId]
    );

    if (appointmentRows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointment = appointmentRows[0];
    if (appointment.user_id !== requestUserId) {
      return res.status(403).json({ error: 'You can only cancel your own appointments' });
    }

    // Prevent cancelling already cancelled appointments
    if (appointment.status === 'cancelled') {
      return res.status(400).json({ error: 'Appointment is already cancelled' });
    }

    // Update appointment status to cancelled
    const [updateResult] = await pool.query(
      `UPDATE appointments
       SET status = 'cancelled'
       WHERE id = ?`,
      [appointmentId]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(500).json({ error: 'Failed to cancel appointment' });
    }

    // Return updated appointment
    return res.json({
      id: appointment.id,
      user_id: appointment.user_id,
      doctor_id: appointment.doctor_id,
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      status: 'cancelled',
    });
  } catch (error) {
    console.error('PATCH /appointments/:appointmentId/cancel failed:', error.message);
    return res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  });
}

module.exports = app;
