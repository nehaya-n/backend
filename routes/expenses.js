const express = require('express');
const router = express.Router();
const db = require('../db'); // ملف الاتصال بقاعدة البيانات

// ------------------------------------------------------
// POST /api/expenses → إضافة مصروف جديد وتحديث المحفظة
// ------------------------------------------------------
router.post('/', (req, res) => {
  const { user_id, wallet_id, category_name, item_name, icon, amount, date } = req.body;

  if (!user_id || !wallet_id || !category_name || !amount || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (category_name === 'Food' && (!item_name || item_name.trim() === '')) {
    return res.status(400).json({ message: 'Food expenses must include item_name' });
  }

  // استخدام item_name للفئة Food، و icon لباقي الفئات
  const finalItemName = category_name === 'Food' ? item_name : icon || null;

  // إدخال المصروف
  const sql = `
    INSERT INTO expenses (user_id, wallet_id, category_name, item_name, amount, date)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [user_id, wallet_id, category_name, finalItemName, amount, date], (err, result) => {
    if (err) {
      console.error('Error saving expense:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    // تحديث رصيد المحفظة بعد إدخال المصروف
    const updateWalletSql = `
      UPDATE wallets
      SET balance = balance - ?
      WHERE id = ?
    `;

    db.query(updateWalletSql, [amount, wallet_id], (err2, result2) => {
      if (err2) {
        console.error('Error updating wallet balance:', err2);
        return res.status(500).json({ message: 'Server error updating wallet' });
      }

      res.status(201).json({ message: 'Expense saved and wallet updated successfully' });
    });
  });
});

// ------------------------------------------------------
// GET /api/expenses → عرض جميع المصاريف
// ------------------------------------------------------
router.get('/', (req, res) => {
  const sql = `
    SELECT e.*, u.full_name AS user_name, w.name AS wallet_name
    FROM expenses e
    JOIN users u ON e.user_id = u.id
    JOIN wallets w ON e.wallet_id = w.id
    ORDER BY e.date DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error('Error fetching expenses:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    res.json(rows);
  });
});

module.exports = router;
