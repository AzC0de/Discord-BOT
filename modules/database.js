const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./supportChannel.db');

// Crear la tabla si no existe
db.run(`CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    ticket_type TEXT,
    staff_id TEXT,
    channel_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

module.exports = db;
