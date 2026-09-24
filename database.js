const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'nimora.db'));

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  balance REAL DEFAULT 0,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  price_per_1000 REAL NOT NULL,
  min_qty INTEGER DEFAULT 100,
  max_qty INTEGER DEFAULT 100000,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  link TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  cost REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

// Default admin
const bcrypt = require('bcryptjs');
const adminExists = db.prepare("SELECT * FROM users WHERE role='admin'").get();
if (!adminExists) {
  const hash = bcrypt.hashSync('nimora123', 10);
  db.prepare("INSERT INTO users (username,email,password,role) VALUES (?,?,?,?)")
    .run('nimora', 'admin@nimora.com', hash, 'admin');
  console.log('✅ Admin created → username: nimora | password: nimora123');
}

// Default services
const svcCount = db.prepare("SELECT COUNT(*) as c FROM services").get().c;
if (svcCount === 0) {
  const insert = db.prepare("INSERT INTO services (category,name,price_per_1000,min_qty,max_qty) VALUES (?,?,?,?,?)");
  const services = [
    ['TikTok', 'TikTok Views', 5, 100, 1000000],
    ['TikTok', 'TikTok Likes', 15, 50, 50000],
    ['TikTok', 'TikTok Followers', 80, 100, 20000],
    ['TikTok', 'TikTok Comments', 200, 10, 5000],
    ['WhatsApp', 'WhatsApp Channel Followers', 120, 100, 10000],
    ['WhatsApp', 'WhatsApp Channel Reactions', 60, 50, 20000],
    ['Instagram', 'Instagram Followers', 90, 100, 20000],
    ['Instagram', 'Instagram Likes', 20, 50, 50000],
    ['YouTube', 'YouTube Views', 150, 500, 100000],
    ['YouTube', 'YouTube Subscribers', 400, 50, 10000],
  ];
  services.forEach(s => insert.run(...s));
  console.log('✅ Default services added');
}

// Default settings
db.prepare("INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)").run('site_name', 'NIMORA BOOST');
db.prepare("INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)").run('contact_whatsapp', '0784280074');
db.prepare("INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)").run('usd_rate', '300');

module.exports = db;
