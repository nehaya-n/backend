const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- إعداد الاتصال بقاعدة البيانات ---
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.error("Database connection failed:", err);
        return;
    }
    console.log("Connected to MySQL database!");
});

// --- Routes ---

// ✅ مسار تجريبي للتأكد أن السيرفر شغال
app.get("/", (req, res) => {
    res.send("✅ Outlay backend is running!");
});

// تسجيل مستخدم جديد
app.post('/register', (req, res) => {
    const { full_name, email, password, phone_number } = req.body;

    const sql = 'INSERT INTO users (full_name, email, password, phone_number) VALUES (?, ?, ?, ?)';
    db.query(sql, [full_name, email, password, phone_number], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Registration failed', error: err });
        }
        res.json({ message: 'User registered successfully' });
    });
});

// تسجيل دخول مستخدم
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';
    db.query(sql, [email, password], (err, results) => {
        if (err) return res.status(500).json({ message: 'Login failed', error: err });

        if (results.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

        res.json({ message: 'Login successful', user: results[0] });
    });
});

// ✅ عرض كل المستخدمين (اختياري للفحص)
app.get('/users', (req, res) => {
    const sql = 'SELECT id, full_name, email, phone_number FROM users';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Failed to fetch users', error: err });
        res.json(results);
    });
});

// --- بدء السيرفر ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
