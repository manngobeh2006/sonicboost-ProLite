const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// SQLite database file
const dbPath = path.join(__dirname, 'sonicboost.db');

// Create SQLite connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ SQLite connection error:', err);
  } else {
    console.log('✅ SQLite database connected');
  }
});

// Create tables if they don't exist
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      stripe_customer_id TEXT,
      subscription_status TEXT DEFAULT 'trial',
      subscription_tier TEXT DEFAULT 'trial',
      masters_this_month INTEGER DEFAULT 0,
      masters_total INTEGER DEFAULT 0,
      last_reset_date TEXT DEFAULT CURRENT_DATE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Subscriptions table
  db.run(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      stripe_subscription_id TEXT UNIQUE,
      stripe_price_id TEXT,
      status TEXT,
      current_period_start TEXT,
      current_period_end TEXT,
      cancel_at_period_end INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Audio files table
  db.run(`
    CREATE TABLE IF NOT EXISTS audio_files (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      original_filename TEXT,
      genre TEXT,
      tempo INTEGER,
      duration REAL,
      file_size INTEGER,
      status TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);
});

// Wrapper to make SQLite work like PostgreSQL
const pool = {
  query: (text, params = []) => {
    return new Promise((resolve, reject) => {
      if (text.includes('$1') || text.includes('$2')) {
        // Convert PostgreSQL style queries to SQLite
        let sqliteQuery = text;
        params.forEach((param, index) => {
          sqliteQuery = sqliteQuery.replace(`$${index + 1}`, `?`);
        });
        
        db.all(sqliteQuery, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve({ rows });
          }
        });
      } else {
        db.all(text, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve({ rows });
          }
        });
      }
    });
  },
  
  connect: () => {
    return Promise.resolve({
      query: pool.query,
      release: () => {}
    });
  }
};

module.exports = pool;
