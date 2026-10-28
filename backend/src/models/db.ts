import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { CONFIG } from '../config';

const dbDirectory = path.dirname(CONFIG.DATABASE_PATH);
if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

export const db = new Database(CONFIG.DATABASE_PATH);

// Enable WAL mode for high concurrent read/write performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema tables
export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      subdomain TEXT UNIQUE NOT NULL,
      server_type TEXT NOT NULL DEFAULT 'PAPER',
      mc_version TEXT NOT NULL DEFAULT 'LATEST',
      ram_mb INTEGER NOT NULL DEFAULT 3072,
      max_players INTEGER NOT NULL DEFAULT 20,
      gamemode TEXT NOT NULL DEFAULT 'survival',
      seed TEXT DEFAULT '',
      enable_whitelist INTEGER DEFAULT 0,
      rcon_password TEXT NOT NULL,
      container_id TEXT,
      internal_port INTEGER NOT NULL,
      status TEXT DEFAULT 'stopped',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS backups (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL,
      storage_type TEXT DEFAULT 'local',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
