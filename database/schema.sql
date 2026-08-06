CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS servers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS channels (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'voice',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS server_members (
  id SERIAL PRIMARY KEY,
  server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(server_id, user_id)
);
INSERT INTO servers (id, name, description)
SELECT
  1,
  'VoiceConnect Sunucusu',
  'Discord benzeri sesli iletişim platformu'
WHERE NOT EXISTS (
  SELECT 1 FROM servers WHERE id = 1
);

INSERT INTO categories (id, server_id, name)
SELECT
  1,
  1,
  'Genel'
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE id = 1
);

INSERT INTO categories (id, server_id, name)
SELECT
  2,
  1,
  'Ekip'
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE id = 2
);

INSERT INTO channels (id, category_id, name, type)
SELECT
  1,
  1,
  'Genel Ses Kanalı',
  'voice'
WHERE NOT EXISTS (
  SELECT 1 FROM channels WHERE id = 1
);

INSERT INTO channels (id, category_id, name, type)
SELECT
  2,
  1,
  'Toplantı Odası',
  'voice'
WHERE NOT EXISTS (
  SELECT 1 FROM channels WHERE id = 2
);

INSERT INTO channels (id, category_id, name, type)
SELECT
  3,
  2,
  'Frontend Ekibi',
  'voice'
WHERE NOT EXISTS (
  SELECT 1 FROM channels WHERE id = 3
);

INSERT INTO channels (id, category_id, name, type)
SELECT
  4,
  2,
  'Backend Ekibi',
  'voice'
WHERE NOT EXISTS (
  SELECT 1 FROM channels WHERE id = 4
);

SELECT setval('servers_id_seq', 1, true);
SELECT setval('categories_id_seq', 2, true);
SELECT setval('channels_id_seq', 4, true);