const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use(cors({
  origin: '*', // يمكنك لاحقًا تحديد الأصل: ['http://localhost:52593']
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


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
    console.log("✅ Connected to MySQL database!");
});

// --- استيراد المسارات الأخرى ---
const walletsRoute = require('./routes/wallets');
app.use('/api/wallets', walletsRoute);
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/goals', require('./routes/goals'));
const expensesRoutes = require('./routes/expenses');
app.use('/api/expenses', expensesRoutes);



// --- مسار تجريبي رئيسي ---
app.get("/", (req, res) => {
    res.send("✅ Outlay backend is running!");
});


// ==============================
// 🧩 LOGIN & REGISTER ROUTES
// ==============================

// ✅ تسجيل مستخدم جديد
app.post("/register", (req, res) => {
    const { full_name, email, password, phone_number } = req.body;

    if (!full_name || !email || !password || !phone_number) {
        return res.status(400).json({ message: "All fields are required." });
    }

    // التحقق إن كان البريد موجود مسبقًا
    const checkQuery = "SELECT * FROM users WHERE email = ?";
    db.query(checkQuery, [email], (err, result) => {
        if (err) return res.status(500).json({ message: "Database error", error: err });

        if (result.length > 0) {
            return res.status(400).json({ message: "Email already exists." });
        }

        // إدخال المستخدم الجديد
        const insertQuery = "INSERT INTO users (full_name, email, password, phone_number) VALUES (?, ?, ?, ?)";
        db.query(insertQuery, [full_name, email, password, phone_number], (err, result) => {
            if (err) return res.status(500).json({ message: "Database error", error: err });
            res.json({ message: "Registration successful 🎉" });
        });
    });
});


// ✅ تسجيل الدخول
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
    }

    const query = "SELECT * FROM users WHERE email = ? AND password = ?";
    db.query(query, [email, password], (err, results) => {
        if (err) return res.status(500).json({ message: "Database error", error: err });

        if (results.length === 0) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const user = results[0];
        res.json({
            message: "Login successful ✅",
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                phone_number: user.phone_number
            }
        });
    });
});


// --- بدء السيرفر ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = db;
