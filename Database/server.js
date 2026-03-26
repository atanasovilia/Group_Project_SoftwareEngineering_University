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
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const NAME_PATTERN = /^[A-Za-z][A-Za-z' -]{1,118}[A-Za-z]$/;
const PHONE_PATTERN = /^\+?[0-9() -]{7,25}$/;
const ADDRESS_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s,.'#\/-]{4,254}$/;
const MEDICAL_TEXT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s,.'()\/+-]{1,998}[A-Za-z0-9.)]$/;

function toMonday(dateInput) {
  const base = dateInput ? new Date(`${dateInput}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) {
    return null;
  }

  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setDate(base.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function formatWeekdayDate(date) {
  return {
    iso_date: formatDateOnly(date),
    label: WEEKDAY_LABELS[(date.getDay() + 6) % 7],
    day_of_week: date.getDay() === 0 ? 7 : date.getDay(),
  };
}

function parseDateInput(dateInput) {
  if (!dateInput) {
    return null;
  }

  const parsed = new Date(`${dateInput}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.toISOString().slice(0, 10) === value;
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

app.get('/', (req, res) => {
  res.json({
    message: 'API is running',
    endpoints: {
      health_db: 'GET /health/db',
      doctors: 'GET /doctors',
      calendar_month: 'GET /calendar/month?doctorId=1&month=YYYY-MM-01',
      calendar_day: 'GET /calendar/day?doctorId=1&date=YYYY-MM-DD',
      calendar_weekly: 'GET /calendar/weekly?weekStart=YYYY-MM-DD',
      users: 'GET /users',
      register: 'POST /register',
      login: 'POST /login',
    },
  });
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

    const slotMap = new Map();
    for (const row of slotRows) {
      const existing = slotMap.get(row.day_of_week) || [];
      existing.push(row);
      slotMap.set(row.day_of_week, existing);
    }

    const days = [];
    for (
      let cursor = new Date(calendarStart);
      cursor <= calendarEnd;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const currentDate = new Date(cursor);
      const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
      const ranges = slotMap.get(dayOfWeek) || [];
      const totalSlots = ranges.reduce((sum, range) => sum + range.slot_capacity, 0);

      days.push({
        iso_date: formatDateOnly(currentDate),
        day_number: currentDate.getDate(),
        day_of_week: dayOfWeek,
        is_current_month: currentDate.getMonth() === monthDate.getMonth(),
        total_slots: totalSlots,
        status: totalSlots > 0 ? 'available' : 'none',
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

    const bookedTimes = new Set(bookedSlots.map(row => row.appointment_time));
    const slots = buildTimeSlots(slotRows).filter(slot => !bookedTimes.has(slot.start_time));

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

app.get('/calendar/weekly', async (req, res) => {
  try {
    const weekStart = toMonday(req.query.weekStart);
    if (!weekStart) {
      return res.status(400).json({ error: 'weekStart must be a valid date in YYYY-MM-DD format' });
    }

    let selectedDoctorId = null;
    if (req.query.doctorId != null && req.query.doctorId !== '') {
      selectedDoctorId = Number(req.query.doctorId);
      if (!Number.isInteger(selectedDoctorId) || selectedDoctorId <= 0) {
        return res.status(400).json({ error: 'doctorId must be a positive integer' });
      }
    }

    const weekDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return formatWeekdayDate(date);
    });

    const doctorParams = [];
    let doctorWhereClause = `WHERE status = 'active'`;
    if (selectedDoctorId) {
      doctorWhereClause += ' AND id = ?';
      doctorParams.push(selectedDoctorId);
    }

    const [doctorRows] = await pool.query(
      `SELECT id, full_name, specialty, room_number
       FROM doctors
       ${doctorWhereClause}
       ORDER BY full_name ASC`,
      doctorParams
    );

    if (selectedDoctorId && doctorRows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const slotParams = [];
    let slotDoctorFilter = '';
    if (selectedDoctorId) {
      slotDoctorFilter = ' AND s.doctor_id = ?';
      slotParams.push(selectedDoctorId);
    }

    const [slotRows] = await pool.query(
      `SELECT
         s.doctor_id,
         s.day_of_week,
         TIME_FORMAT(s.start_time, '%H:%i') AS start_time,
         TIME_FORMAT(s.end_time, '%H:%i') AS end_time,
         s.slot_capacity
       FROM doctor_availability_slots s
       JOIN doctors d ON d.id = s.doctor_id
       WHERE d.status = 'active'
         AND s.is_active = TRUE
         ${slotDoctorFilter}
       ORDER BY s.doctor_id, s.day_of_week, s.start_time`
      ,
      slotParams
    );

    const slotsByDoctorDay = new Map();
    for (const slot of slotRows) {
      const key = `${slot.doctor_id}-${slot.day_of_week}`;
      const existing = slotsByDoctorDay.get(key) || [];
      existing.push({
        start_time: slot.start_time,
        end_time: slot.end_time,
        slot_capacity: slot.slot_capacity,
      });
      slotsByDoctorDay.set(key, existing);
    }

    // Get booked appointments for the week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const bookedParams = [];
    let bookedDoctorFilter = '';
    if (selectedDoctorId) {
      bookedDoctorFilter = ' AND doctor_id = ?';
      bookedParams.push(selectedDoctorId);
    }

    const [bookedAppointments] = await pool.query(
      `SELECT doctor_id, appointment_date, appointment_time
       FROM appointments
       WHERE appointment_date >= ?
         AND appointment_date <= ?
         AND status = 'confirmed'
         ${bookedDoctorFilter}`,
      [formatDateOnly(weekStart), formatDateOnly(weekEnd), ...bookedParams]
    );

    // Build a set of booked slot keys
    const bookedSlotKeys = new Set();
    for (const appointment of bookedAppointments) {
      bookedSlotKeys.add(`${appointment.doctor_id}-${appointment.appointment_date}-${appointment.appointment_time}`);
    }

    const doctors = doctorRows.map((doctor) => {
      const availability = weekDays.map((day) => {
        const slots = slotsByDoctorDay.get(`${doctor.id}-${day.day_of_week}`) || [];
        const totalSlots = slots.reduce((sum, slot) => sum + slot.slot_capacity, 0);

        return {
          ...day,
          total_slots: totalSlots,
          slots,
        };
      });

      return {
        ...doctor,
        availability,
      };
    });

    return res.json({
      week_start: formatDateOnly(weekStart),
      week_end: weekDays[6].iso_date,
      selected_doctor_id: selectedDoctorId,
      days: weekDays,
      doctors,
    });
  } catch (error) {
    console.error('GET /calendar/weekly failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch weekly calendar' });
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
      if (dob == null) {
        return res.status(400).json({ error: 'date_of_birth cannot be empty' });
      }

      if (!isValidIsoDate(dob)) {
        return res.status(400).json({
          error: 'date_of_birth must be a real date in YYYY-MM-DD format',
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const parsedDob = new Date(`${dob}T00:00:00`);
      if (parsedDob > today) {
        return res.status(400).json({ error: 'date_of_birth cannot be in the future' });
      }
    }

    const phoneError = validatePatternField(
      normalizedInput.phone,
      PHONE_PATTERN,
      'phone',
      'phone can only contain numbers, spaces, parentheses, hyphens, and an optional leading +'
    );
    if (phoneError) {
      return res.status(400).json({ error: phoneError });
    }

    const emergencyPhoneError = validatePatternField(
      normalizedInput.emergency_contact_phone,
      PHONE_PATTERN,
      'emergency_contact_phone',
      'emergency_contact_phone can only contain numbers, spaces, parentheses, hyphens, and an optional leading +'
    );
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

    // Validation
    if (!user_id || !doctor_id || !appointment_date || !appointment_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = Number(user_id);
    const doctorId = Number(doctor_id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'user_id must be a positive integer' });
    }

    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({ error: 'doctor_id must be a positive integer' });
    }

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(appointment_date))) {
      return res.status(400).json({ error: 'appointment_date must be YYYY-MM-DD' });
    }

    // Validate time format HH:MM
    if (!/^\d{2}:\d{2}$/.test(String(appointment_time))) {
      return res.status(400).json({ error: 'appointment_time must be HH:MM' });
    }

    // Check if user exists
    const [userRows] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if doctor exists and is active
    const [doctorRows] = await pool.query(
      'SELECT id FROM doctors WHERE id = ? AND status = "active" LIMIT 1',
      [doctorId]
    );
    if (doctorRows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found or is inactive' });
    }

    // Check if appointment already booked
    const [existingAppointment] = await pool.query(
      `SELECT id FROM appointments
       WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status = 'confirmed'
       LIMIT 1`,
      [doctorId, appointment_date, appointment_time]
    );
    if (existingAppointment.length > 0) {
      return res.status(409).json({ error: 'This appointment slot is already booked' });
    }

    // Create appointment
    const [result] = await pool.query(
      `INSERT INTO appointments (user_id, doctor_id, appointment_date, appointment_time, status)
       VALUES (?, ?, ?, ?, 'confirmed')`,
      [userId, doctorId, appointment_date, appointment_time]
    );

    return res.status(201).json({
      id: result.insertId,
      user_id: userId,
      doctor_id: doctorId,
      appointment_date,
      appointment_time,
      status: 'confirmed',
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('POST /appointments failed:', error.message);
    return res.status(500).json({ error: 'Failed to create appointment' });
  }
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  });
}

module.exports = app;
