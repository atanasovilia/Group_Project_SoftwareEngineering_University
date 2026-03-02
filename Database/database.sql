CREATE DATABASE IF NOT EXISTS group_project;
USE group_project;

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
