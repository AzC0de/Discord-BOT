const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./supportChannel.db');

// Crear la tabla si no existe
db.run(`CREATE TABLE IF NOT EXISTS user_timestamps (
    user_id TEXT PRIMARY KEY,
    join_timestamp INTEGER
)`);

module.exports = db;
