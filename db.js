// db.js
const mysql = require('mysql2');
require('dotenv').config();

// إنشاء اتصال واحد مشترك
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'outlay-backend'
});

db.connect(err => {
  if (err) {
    console.error("❌ Database connection failed:", err);
    return;
  }
  console.log("✅ Connected to MySQL database (from db.js)");
});

module.exports = db;
