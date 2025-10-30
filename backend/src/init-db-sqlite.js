const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// SQLite database file
const dbPath = path.join(__dirname, 'sonicboost.db');

const initDatabase = async () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ SQLite connection error:', err);
        reject(err);
        return;
      }
      
      console.log('✅ SQLite database connected');
      
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
        `, (err) => {
          if (err) {
            console.error('❌ Users table error:', err);
          } else {
            console.log('✅ Users table created');
          }
        });

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
        `, (err) => {
          if (err) {
            console.error('❌ Subscriptions table error:', err);
          } else {
            console.log('✅ Subscriptions table created');
          }
        });

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
        `, (err) => {
          if (err) {
            console.error('❌ Audio files table error:', err);
          } else {
            console.log('✅ Audio files table created');
          }
        });

        // Create indexes
        db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_audio_files_user_id ON audio_files(user_id)`);
        
        console.log('✅ Indexes created');
        console.log('🎉 SQLite database initialization complete!');
        
        db.close((err) => {
          if (err) {
            console.error('❌ Error closing database:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  });
};

// Run if called directly
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = initDatabase;
