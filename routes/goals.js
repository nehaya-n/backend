const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');


// 🟢 إضافة هدف جديد
router.post('/', (req, res) => {
  let {
    user_id,
    name,
    target_amount,
    current_amount,
    color,
    icon
  } = req.body;

  // ✅ تأمين القيم الافتراضية
  if (!color || color.trim() === '') color = '#4CAF50';
  if (!icon || icon.trim() === '') icon = 'star';
  if (!current_amount) current_amount = 0;

  if (!user_id || !name || !target_amount) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  // ✅ توليد UUID للإدخال الجديد
  const id = uuidv4();

  const sql = `
    INSERT INTO goals (id, user_id, name, target_amount, current_amount, is_achieved, color, icon)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?)
  `;

  db.query(sql, [id, user_id, name, target_amount, current_amount, color, icon], (err) => {
    if (err) {
      console.error('❌ Error inserting goal:', err);
      return res.status(500).json({ message: 'Database error', error: err });
    }
    res.status(201).json({ message: 'Goal created successfully', id });
  });
});




// 🟡 جلب جميع أهداف المستخدم
router.get('/:user_id', (req, res) => {
  const { user_id } = req.params;
  const sql = 'SELECT * FROM goals WHERE user_id = ?';
  db.query(sql, [user_id], (err, results) => {
    if (err) {
      console.error('❌ Fetch goals failed:', err);
      return res.status(500).json({ message: 'Fetch goals failed', error: err });
    }
    res.json(results);
  });
});

router.get('/goal/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM goals WHERE id = ?';
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('❌ Fetch goal failed:', err);
      return res.status(500).json({ message: 'Fetch goal failed', error: err });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    res.json(results[0]);
  });
});
// 🟠 تحديث المبلغ الحالي لهدف
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;

  const sql = `
    UPDATE goals 
    SET current_amount = current_amount + ?, 
        is_achieved = (current_amount + ?) >= target_amount
    WHERE id = ?
  `;
  db.query(sql, [amount, amount, id], (err) => {
    if (err) {
      console.error('❌ Update failed:', err);
      return res.status(500).json({ message: 'Update failed', error: err });
    }
    res.json({ message: 'Goal updated successfully' });
  });
});

module.exports = router;
