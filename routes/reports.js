const express = require('express');
const router = express.Router();
const db = require('../db'); 



router.get('/daily', (req, res) => {
  const { user_id } = req.query;

  const sql = `
    SELECT category_name, SUM(amount) AS total
    FROM expenses
    WHERE user_id = ?
      AND DATE(date) = CURDATE()
    GROUP BY category_name
  `;

  db.query(sql, [user_id], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Server error daily', error: err });

    res.json({
      day: new Date().toISOString().slice(0, 10),
      categories: rows.reduce((acc, row) => {
        acc[row.category_name.toLowerCase()] = row.total;
        return acc;
      }, {})
    });
  });
});



router.get('/monthly', (req, res) => {
  const { user_id } = req.query;

  const sql = `
    SELECT category_name, SUM(amount) AS total
    FROM expenses
    WHERE user_id = ?
      AND MONTH(date) = MONTH(CURDATE())
      AND YEAR(date) = YEAR(CURDATE())
    GROUP BY category_name
  `;

  db.query(sql, [user_id], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Server error monthly', error: err });

    res.json({
      month: `${new Date().getFullYear()}-${new Date().getMonth() + 1}`,
      categories: rows.reduce((acc, row) => {
        acc[row.category_name.toLowerCase()] = row.total;
        return acc;
      }, {})
    });
  });
});



// GET /api/reports/yearly?user_id=1
router.get('/yearly', (req, res) => {
  const { user_id } = req.query;

  const sql = `
    SELECT category_name, SUM(amount) AS total
    FROM expenses
    WHERE user_id = ?
      AND YEAR(date) = YEAR(CURDATE())
    GROUP BY category_name
  `;

  db.query(sql, [user_id], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Server error yearly', error: err });

    res.json({
      year: new Date().getFullYear(),
      categories: rows.reduce((acc, row) => {
        acc[row.category_name.toLowerCase()] = row.total;
        return acc;
      }, {})
    });
  });
});

module.exports = router;