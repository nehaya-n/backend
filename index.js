const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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

const walletsRoute = require('./routes/wallets');
app.use('/api/wallets', walletsRoute);
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/ocr', require('./routes/ocr'));
const receiptRoutes = require('./routes/receipt');
app.use("/api/receipt", receiptRoutes);
const reportsRoutes = require('./routes/reports');
app.use('/api/reports', reportsRoutes);


app.get("/", (req, res) => {
    res.send("✅ Outlay backend is running!");
});

// --- REGISTER ---
app.post("/register", (req, res) => {
    const { full_name, email, password, phone_number } = req.body;

    if (!full_name || !email || !password || !phone_number) {
        return res.status(400).json({ message: "All fields are required." });
    }

    db.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
        if (err) return res.status(500).json({ message: "Database error", error: err });

        if (result.length > 0) {
            return res.status(400).json({ message: "Email already exists." });
        }

        db.query(
            "INSERT INTO users (full_name, email, password, phone_number) VALUES (?, ?, ?, ?)",
            [full_name, email, password, phone_number],
            (err) => {
                if (err) return res.status(500).json({ message: "Database error", error: err });
                res.json({ message: "Registration successful 🎉" });
            }
        );
    });
});


// --- LOGIN ---
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({ message: "Email and password are required." });

    db.query(
        "SELECT * FROM users WHERE email = ? AND password = ?",
        [email, password],
        (err, results) => {
            if (err) return res.status(500).json({ message: "Database error", error: err });

            if (results.length === 0)
                return res.status(401).json({ message: "Invalid email or password." });

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
        }
    );
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = db;