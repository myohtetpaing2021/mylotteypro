DROP TABLE IF EXISTS clients;
CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    bot_token TEXT UNIQUE NOT NULL,
    commission_rate INTEGER DEFAULT 13,
    credits INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS authorized_users;
CREATE TABLE authorized_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    telegram_user_id INTEGER,
    username TEXT,
    is_locked BOOLEAN DEFAULT 1, -- First user lock
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

DROP TABLE IF EXISTS usage_logs;
CREATE TABLE usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    telegram_user_id INTEGER,
    command_type TEXT,
    cost INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
