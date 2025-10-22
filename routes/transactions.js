const express = require('express');
const router = express.Router();
const db = require('../db'); // استدعاء ملف الاتصال بقاعدة البيانات

// --- إضافة معاملة جديدة ---
router.post('/', (req, res) => {
  const { wallet_id, description, amount, is_income } = req.body;

  if (!wallet_id || !description || amount === undefined || is_income === undefined) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const sql = `
    INSERT INTO transactions (wallet_id, description, amount, is_income, date)
    VALUES (?, ?, ?, ?, NOW())
  `;
  db.query(sql, [wallet_id, description, amount, is_income], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    res.status(201).json({ message: 'Transaction added', id: result.insertId });
  });
});

// --- جلب كل المعاملات لمحفظة معينة ---
router.get('/', (req, res) => {
  const walletId = req.query.wallet_id;
  if (!walletId) return res.status(400).json({ error: 'wallet_id is required' });

  db.query('SELECT * FROM transactions WHERE wallet_id = ?', [walletId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err.message });
    res.set('Cache-Control', 'no-store');
    res.json(results);
  });
});

module.exports = router;
