USE group_project;

CREATE TABLE IF NOT EXISTS medical_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender ENUM('male', 'female', 'other', 'prefer_not_to_say') DEFAULT 'prefer_not_to_say',
  phone VARCHAR(25),
  address VARCHAR(255),
  blood_type ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
  allergies TEXT,
  diagnosis TEXT,
  medications TEXT,
  emergency_contact_name VARCHAR(120),
  emergency_contact_phone VARCHAR(25),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_medical_records_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT uq_medical_records_user UNIQUE (user_id)
);

INSERT INTO users (name, email, password_hash, role)
VALUES
  ('Emma Carter', 'emma.carter@example.com', '$2b$10$ja9c1XlBCm.DK8NzQ8wz1eCJyw7X8KDisyMl8UQmQ5vBe4jc3nrGW', 'user'),
  ('Noah Bennett', 'noah.bennett@example.com', '$2b$10$ja9c1XlBCm.DK8NzQ8wz1eCJyw7X8KDisyMl8UQmQ5vBe4jc3nrGW', 'user'),
  ('Olivia Hughes', 'olivia.hughes@example.com', '$2b$10$ja9c1XlBCm.DK8NzQ8wz1eCJyw7X8KDisyMl8UQmQ5vBe4jc3nrGW', 'user')
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

INSERT INTO medical_records (
  user_id,
  date_of_birth,
  gender,
  phone,
  address,
  blood_type,
  allergies,
  diagnosis,
  medications,
  emergency_contact_name,
  emergency_contact_phone
)
SELECT
  u.id,
  v.date_of_birth,
  v.gender,
  v.phone,
  v.address,
  v.blood_type,
  v.allergies,
  v.diagnosis,
  v.medications,
  v.emergency_contact_name,
  v.emergency_contact_phone
FROM (
  SELECT
    'emma.carter@example.com' AS email,
    DATE('1996-04-12') AS date_of_birth,
    'female' AS gender,
    '07111 222333' AS phone,
    '14 Willow Street, Manchester' AS address,
    'O+' AS blood_type,
    'Penicillin' AS allergies,
    'Seasonal asthma' AS diagnosis,
    'Salbutamol inhaler' AS medications,
    'James Carter' AS emergency_contact_name,
    '07900 111222' AS emergency_contact_phone
  UNION ALL
  SELECT
    'noah.bennett@example.com',
    DATE('1989-09-03'),
    'male',
    '07222 333444',
    '28 Brook Lane, Leeds',
    'A-',
    'None',
    'Hypertension',
    'Amlodipine 5mg',
    'Mia Bennett',
    '07888 444555'
  UNION ALL
  SELECT
    'olivia.hughes@example.com',
    DATE('2001-01-27'),
    'female',
    '07333 444555',
    '7 Cedar Close, Bristol',
    'B+',
    'Peanuts',
    'Type 1 diabetes',
    'Insulin glargine',
    'Ethan Hughes',
    '07777 555666'
) AS v
JOIN users u ON u.email = v.email
ON DUPLICATE KEY UPDATE
  phone = VALUES(phone),
  address = VALUES(address),
  blood_type = VALUES(blood_type),
  allergies = VALUES(allergies),
  diagnosis = VALUES(diagnosis),
  medications = VALUES(medications),
  emergency_contact_name = VALUES(emergency_contact_name),
  emergency_contact_phone = VALUES(emergency_contact_phone),
  updated_at = CURRENT_TIMESTAMP;
