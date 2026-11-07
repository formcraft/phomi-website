-- PHOMI website database (MySQL / MariaDB on Hostinger).
-- install.php runs this for you. Every statement is safe to run again.

CREATE TABLE IF NOT EXISTS admins (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  name VARCHAR(120) NOT NULL DEFAULT '',
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL,
  last_login DATETIME NULL,
  UNIQUE KEY admins_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS settings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  value TEXT NULL,
  UNIQUE KEY settings_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS senders (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  name VARCHAR(120) NOT NULL DEFAULT '',
  publish_direct TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  UNIQUE KEY senders_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sermons (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  preacher VARCHAR(120) NOT NULL DEFAULT '',
  preached_on DATE NULL,
  scripture VARCHAR(160) NOT NULL DEFAULT '',
  summary TEXT NULL,
  media_url VARCHAR(500) NOT NULL DEFAULT '',
  audio VARCHAR(300) NOT NULL DEFAULT '',
  video VARCHAR(300) NOT NULL DEFAULT '',
  cover VARCHAR(300) NOT NULL DEFAULT '',
  status VARCHAR(12) NOT NULL DEFAULT 'live',
  source VARCHAR(12) NOT NULL DEFAULT 'admin',
  created_at DATETIME NOT NULL,
  KEY sermons_list (status, preached_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Short videos and clips: a YouTube, TikTok or Facebook link, or an uploaded MP4
CREATE TABLE IF NOT EXISTS videos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  link VARCHAR(500) NOT NULL DEFAULT '',
  video VARCHAR(300) NOT NULL DEFAULT '',
  cover VARCHAR(300) NOT NULL DEFAULT '',
  category VARCHAR(60) NOT NULL DEFAULT 'Worship',
  posted_on DATE NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'live',
  source VARCHAR(12) NOT NULL DEFAULT 'admin',
  created_at DATETIME NOT NULL,
  KEY videos_list (status, posted_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS photos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  file VARCHAR(300) NOT NULL,
  caption VARCHAR(300) NOT NULL DEFAULT '',
  category VARCHAR(60) NOT NULL DEFAULT 'Fellowship',
  taken_on DATE NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'live',
  source VARCHAR(12) NOT NULL DEFAULT 'admin',
  created_at DATETIME NOT NULL,
  KEY photos_list (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS events (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  kind VARCHAR(60) NOT NULL DEFAULT '',
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NULL,
  venue VARCHAR(200) NOT NULL DEFAULT 'PHOMI, Burweta',
  details TEXT NULL,
  cover VARCHAR(300) NOT NULL DEFAULT '',
  status VARCHAR(12) NOT NULL DEFAULT 'live',
  source VARCHAR(12) NOT NULL DEFAULT 'admin',
  created_at DATETIME NOT NULL,
  KEY events_list (status, starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS announcements (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  body TEXT NULL,
  link VARCHAR(300) NOT NULL DEFAULT '',
  starts_on DATE NULL,
  ends_on DATE NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'live',
  source VARCHAR(12) NOT NULL DEFAULT 'admin',
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS testimonies (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL DEFAULT '',
  title VARCHAR(200) NOT NULL DEFAULT '',
  body TEXT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'review',
  source VARCHAR(12) NOT NULL DEFAULT 'admin',
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Every email the inbox reader has seen, and what it did with it
CREATE TABLE IF NOT EXISTS inbox (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  message_id VARCHAR(250) NOT NULL,
  from_email VARCHAR(190) NOT NULL DEFAULT '',
  from_name VARCHAR(190) NOT NULL DEFAULT '',
  subject VARCHAR(300) NOT NULL DEFAULT '',
  received_at DATETIME NOT NULL,
  tag VARCHAR(30) NOT NULL DEFAULT '',
  target_type VARCHAR(20) NOT NULL DEFAULT '',
  target_ids VARCHAR(200) NOT NULL DEFAULT '',
  status VARCHAR(12) NOT NULL DEFAULT 'pending',
  note TEXT NULL,
  payload TEXT NULL,
  approve_token VARCHAR(64) NOT NULL DEFAULT '',
  UNIQUE KEY inbox_msg (message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gifts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ref VARCHAR(40) NOT NULL,
  provider VARCHAR(20) NOT NULL,
  network VARCHAR(10) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  amount INT UNSIGNED NOT NULL,
  fund VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL DEFAULT '',
  email VARCHAR(190) NOT NULL DEFAULT '',
  status VARCHAR(12) NOT NULL DEFAULT 'pending',
  provider_ref VARCHAR(120) NOT NULL DEFAULT '',
  message VARCHAR(300) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY gifts_ref (ref),
  KEY gifts_list (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Prayer requests and contact messages from the website forms
CREATE TABLE IF NOT EXISTS messages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kind VARCHAR(12) NOT NULL,
  name VARCHAR(120) NOT NULL DEFAULT '',
  contact VARCHAR(190) NOT NULL DEFAULT '',
  topic VARCHAR(60) NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  private TINYINT NOT NULL DEFAULT 0,
  handled TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  KEY messages_list (kind, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Simple rate limiting for public forms and giving
CREATE TABLE IF NOT EXISTS hits (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  bucket VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL,
  KEY hits_bucket (bucket, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Every change to the site's content and settings, so an admin can see who changed what and undo it
CREATE TABLE IF NOT EXISTS changes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_at DATETIME NOT NULL,
  actor VARCHAR(190) NOT NULL DEFAULT '',
  action VARCHAR(12) NOT NULL,
  table_name VARCHAR(30) NOT NULL,
  row_id INT UNSIGNED NULL,
  summary VARCHAR(300) NOT NULL DEFAULT '',
  before_json MEDIUMTEXT NULL,
  after_json MEDIUMTEXT NULL,
  undone_at DATETIME NULL,
  undone_by VARCHAR(190) NOT NULL DEFAULT '',
  KEY changes_list (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
