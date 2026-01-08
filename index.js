const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

const sliderStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'uploads/slider');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const uploadSlider = multer({ storage: sliderStorage });

app.get("/", (req, res) => {
    res.send("Outlay backend is running!");
});

app.use('/api/wallets', require('./routes/wallets'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/ocr', require('./routes/ocr'));
app.use("/api/receipt", require('./routes/receipt'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/risk', require('./routes/risk'));
app.use('/api/users', require('./routes/users'));

app.post('/api/slider/upload', uploadSlider.array('images', 3), (req, res) => {
    try {
        res.status(200).json({ message: 'Images uploaded successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to upload images' });
    }
});

app.get('/api/carousel-images', (req, res) => {
    const directoryPath = path.join(__dirname, 'uploads/slider');

    if (!fs.existsSync(directoryPath)) {
        return res.json({ images: [] });
    }

    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            return res.status(500).json({ images: [] });
        }

        const images = files
            .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
            .map(file => `uploads/slider/${file}`);

        res.json({ images });
    });
});

app.get("/api/users/:id", (req, res) => {
    const userId = req.params.id;
    db.query("SELECT id, full_name, email, phone_number, image FROM users WHERE id = ?", [userId], (err, results) => {
        if (err) return res.status(500).json({ message: "Database error", error: err });
        if (results.length === 0) return res.status(404).json({ message: "User not found" });
        res.json(results[0]);
    });
});

app.post("/register", (req, res) => {
    const { full_name, email, password, phone_number } = req.body;
    if (!full_name || !email || !password || !phone_number) {
        return res.status(400).json({ message: "All fields are required." });
    }
    db.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
        if (err) return res.status(500).json({ message: "Database error", error: err });
        if (result.length > 0) return res.status(400).json({ message: "Email already exists." });

        db.query(
            "INSERT INTO users (full_name, email, password, phone_number) VALUES (?, ?, ?, ?)",
            [full_name, email, password, phone_number],
            (err, result) => {
                if (err) return res.status(500).json({ message: "Database error", error: err });
                const userId = result.insertId;
                db.query(
                    "INSERT INTO wallets (user_id, name, balance) VALUES (?, ?, ?)",
                    [userId, "My Wallet", 0.0],
                    (err) => {
                        if (err) return res.status(500).json({ message: "Wallet creation error", error: err });
                        res.json({ message: "Registration successful" });
                    }
                );
            }
        );
    });
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

    db.query("SELECT * FROM users WHERE email = ? AND password = ?", [email, password], (err, results) => {
        if (err) return res.status(500).json({ message: "Database error", error: err });
        if (results.length === 0) return res.status(401).json({ message: "Invalid email or password." });

        const user = results[0];

        if (user.is_blocked === 1) {
            if (user.blocked_until && new Date(user.blocked_until) > new Date()) {
                return res.status(403).json({ message: `Your account is blocked until ${user.blocked_until}` });
            } else {
                db.query("UPDATE users SET is_blocked = 0, blocked_until = NULL WHERE id = ?", [user.id]);
            }
        }

        const isAdmin = user.email === "admin@gmail.com";
        return res.json({
            message: "Login successful",
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                phone_number: user.phone_number,
                isAdmin: isAdmin
            }
        });
    });
});

app.get('/api/admin/stats', (req, res) => {
    const stats = {};
    db.query("SELECT COUNT(*) AS totalUsers FROM users WHERE email != 'admin@gmail.com'", (err, usersResult) => {
        if (err) return res.status(500).json(err);
        stats.totalUsers = usersResult[0].totalUsers;

        db.query(`SELECT COUNT(*) AS totalWallets FROM wallets w JOIN users u ON w.user_id = u.id WHERE u.email != 'admin@gmail.com'`, (err, walletsResult) => {
            if (err) return res.status(500).json(err);
            stats.totalWallets = walletsResult[0].totalWallets;

            db.query(`SELECT COUNT(*) AS highRiskUsers FROM users WHERE (risk_level > 0 OR is_blocked = 1) AND email != 'admin@gmail.com'`, (err, riskResult) => {
                if (err) return res.status(500).json(err);
                stats.highRiskUsers = riskResult[0].highRiskUsers;
                return res.json(stats);
            });
        });
    });
});

app.get('/api/admin/users', (req, res) => {
    const sql = `SELECT u.id, u.full_name, u.email, u.phone_number, COUNT(w.id) AS walletsCount FROM users u LEFT JOIN wallets w ON u.id = w.user_id GROUP BY u.id ORDER BY u.id`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        res.json(results);
    });
});

app.get('/api/admin/users-overview', (req, res) => {
    const sql = `SELECT u.id, u.full_name, u.email, u.phone_number, u.is_blocked, u.created_at, IFNULL(SUM(e.amount), 0) AS totalExpenses FROM users u LEFT JOIN wallets w ON w.user_id = u.id LEFT JOIN expenses e ON e.wallet_id = w.id WHERE u.email != 'admin@gmail.com' GROUP BY u.id ORDER BY u.created_at DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.put('/api/admin/block-user/:id', (req, res) => {
    const userId = req.params.id;
    const { days } = req.body;
    let sql, params;

    if (days && days > 0) {
        sql = `UPDATE users SET is_blocked = 1, blocked_until = DATE_ADD(NOW(), INTERVAL ? DAY) WHERE id = ?`;
        params = [days, userId];
    } else {
        sql = `UPDATE users SET is_blocked = 0, blocked_until = NULL WHERE id = ?`;
        params = [userId];
    }

    db.query(sql, params, (err) => {
        if (err) return res.status(500).json({ message: 'Database error', err });
        res.json({ message: 'User status updated' });
    });
});

app.post('/google-login', (req, res) => {
  const { email, full_name } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Database error", err });

      if (results.length > 0) {
        const user = results[0];

        return res.json({
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            isAdmin: user.email === "admin@gmail.com",
          },
        });
      }

      const fakePassword = Math.random().toString(36).slice(-10);

      db.query(
        `INSERT INTO users (full_name, email, password, phone_number)
         VALUES (?, ?, ?, ?)`,
        [full_name ?? "Google User", email, fakePassword, null],
        (err, result) => {
          if (err)
            return res.status(500).json({ message: "User creation failed", err });

          const userId = result.insertId;

          db.query(
            "INSERT INTO wallets (user_id, name, balance) VALUES (?, ?, ?)",
            [userId, "My Wallet", 0.0],
            (err) => {
              if (err)
                return res
                  .status(500)
                  .json({ message: "Wallet creation failed", err });

              return res.json({
                message: "Google account created",
                user: {
                  id: userId,
                  email,
                  isAdmin: false,
                },
              });
            }
          );
        }
      );
    }
  );
});




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = db;