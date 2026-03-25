CREATE DATABASE IF NOT EXISTS group_project;
USE group_project;

CREATE USER IF NOT EXISTS 'app_user'@'localhost' IDENTIFIED BY 'YourStrongPassword123!';
GRANT ALL PRIVILEGES ON group_project.* TO 'app_user'@'localhost';
FLUSH PRIVILEGES;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SET @password_hash_exists := (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'group_project'
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'password_hash'
);

SET @sql := IF(
  @password_hash_exists = 0,
  'ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT ''''',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO users (name, email, password_hash, role)
SELECT 'Admin', 'admin@hospify.local', '$2b$10$pOnWNjuVu/4yrPFm8xSYOuzvMgiAXir4zI3rqTAq9Z..eB39t/ATe', 'admin'
WHERE NOT EXISTS (
  SELECT 1
  FROM users
  WHERE email = 'admin@hospify.local'
);

SET @role_exists := (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'group_project'
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'role'
);

SET @sql := IF(
  @role_exists = 0,
  'ALTER TABLE users ADD COLUMN role ENUM(''user'', ''admin'') DEFAULT ''user''',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE users
  MODIFY name VARCHAR(100) NOT NULL,
  MODIFY email VARCHAR(100) NOT NULL;

SET @idx_exists := (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = 'group_project'
    AND TABLE_NAME = 'users'
    AND INDEX_NAME = 'users_email_unique'
);

SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email)',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  doctor_id INT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status ENUM('confirmed', 'cancelled') DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_appointments_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_appointments_doctor
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT uq_appointments_slot
    UNIQUE (doctor_id, appointment_date, appointment_time)
);
