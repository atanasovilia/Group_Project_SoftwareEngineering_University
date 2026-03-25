USE group_project;

CREATE TABLE IF NOT EXISTS doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  specialty VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  room_number VARCHAR(30),
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctor_availability_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  day_of_week TINYINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_capacity INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_doctor_availability_slots_doctor
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT chk_doctor_availability_day CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT chk_doctor_availability_capacity CHECK (slot_capacity >= 0),
  CONSTRAINT chk_doctor_availability_time CHECK (start_time < end_time),
  CONSTRAINT uq_doctor_day_time UNIQUE (doctor_id, day_of_week, start_time, end_time)
);

INSERT INTO doctors (full_name, specialty, email, room_number, status)
VALUES
  ('Dr Amelia Grant', 'Cardiology', 'amelia.grant@hospify.local', 'A-201', 'active'),
  ('Dr Lucas Bennett', 'General Practice', 'lucas.bennett@hospify.local', 'B-104', 'active'),
  ('Dr Sofia Rahman', 'Dermatology', 'sofia.rahman@hospify.local', 'C-310', 'active'),
  ('Dr Ethan Cole', 'Orthopaedics', 'ethan.cole@hospify.local', 'D-122', 'active')
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  specialty = VALUES(specialty),
  room_number = VALUES(room_number),
  status = VALUES(status);

INSERT INTO doctor_availability_slots (doctor_id, day_of_week, start_time, end_time, slot_capacity, is_active)
SELECT d.id, slots.day_of_week, slots.start_time, slots.end_time, slots.slot_capacity, TRUE
FROM doctors d
JOIN (
  SELECT 'amelia.grant@hospify.local' AS email, 1 AS day_of_week, TIME('09:00:00') AS start_time, TIME('12:00:00') AS end_time, 6 AS slot_capacity
  UNION ALL SELECT 'amelia.grant@hospify.local', 3, TIME('13:00:00'), TIME('17:00:00'), 8
  UNION ALL SELECT 'amelia.grant@hospify.local', 5, TIME('09:30:00'), TIME('15:30:00'), 7

  UNION ALL SELECT 'lucas.bennett@hospify.local', 1, TIME('08:30:00'), TIME('12:30:00'), 10
  UNION ALL SELECT 'lucas.bennett@hospify.local', 2, TIME('10:00:00'), TIME('16:00:00'), 12
  UNION ALL SELECT 'lucas.bennett@hospify.local', 4, TIME('09:00:00'), TIME('14:00:00'), 9

  UNION ALL SELECT 'sofia.rahman@hospify.local', 2, TIME('09:00:00'), TIME('12:00:00'), 5
  UNION ALL SELECT 'sofia.rahman@hospify.local', 4, TIME('13:00:00'), TIME('17:00:00'), 6
  UNION ALL SELECT 'sofia.rahman@hospify.local', 5, TIME('10:00:00'), TIME('13:00:00'), 4

  UNION ALL SELECT 'ethan.cole@hospify.local', 1, TIME('14:00:00'), TIME('18:00:00'), 5
  UNION ALL SELECT 'ethan.cole@hospify.local', 3, TIME('08:00:00'), TIME('12:00:00'), 6
  UNION ALL SELECT 'ethan.cole@hospify.local', 4, TIME('11:00:00'), TIME('16:00:00'), 7
) AS slots
  ON slots.email = d.email
ON DUPLICATE KEY UPDATE
  slot_capacity = VALUES(slot_capacity),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;
