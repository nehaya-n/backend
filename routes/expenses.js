const express = require('express');
const router = express.Router();
const db = require('../db'); 

// ------------------------------------------------------
// POST /api/expenses → إضافة مصروف جديد وتحديث المحفظة
// ------------------------------------------------------
router.post('/', (req, res) => {
  const { user_id, wallet_id, category_name, item_name, icon, amount, date } = req.body;

  if (!user_id || !wallet_id || !category_name || !amount || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // food يجب أن تحتوي اسم
  if (category_name.toLowerCase() === 'food' && (!item_name || item_name.trim() === '')) {
    return res.status(400).json({ message: 'Food expenses must include item_name' });
  }

  console.log('Item name received:', item_name);

  // تجهيز الاسم
 // تحديد اسم العنصر
let finalItemName;

// إذا Food → لازم يحمل الاسم كما هو
if (category_name.toLowerCase() === 'food') {
  finalItemName = item_name.trim();
} 
// إذا غير Food → خلي اسم العنصر = اسم التصنيف
else {
  finalItemName = category_name;
}


  // ❌ منع تخزين اسم يتكون من أرقام فقط مثل "57946"
  if (/^\d+$/.test(finalItemName)) {
    return res.status(400).json({ message: 'Invalid item_name: cannot be only numbers' });
  }

  console.log('Final item name to save:', finalItemName);

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

    // تحديث رصيد المحفظة
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

     res.status(201).json({
        message: 'Expense saved and wallet updated successfully',
        id: result.insertId,
        item_name: finalItemName,
        category_name,
        amount,
        date
      });
    });

  }); // ← إغلاق db.query الأول

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
// ------------------------------------------------------
// DELETE /api/expenses/:id → حذف مصروف
// ------------------------------------------------------
router.delete('/:id', (req, res) => {
  const expenseId = req.params.id;

  const sql = `DELETE FROM expenses WHERE id = ?`;

  db.query(sql, [expenseId], (err, result) => {
    if (err) {
      console.error('Error deleting expense:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.json({ message: 'Expense deleted successfully' });
  });
});
// ------------------------------------------------------
// PUT /api/expenses/:id → تحديث مبلغ مصروف
// ------------------------------------------------------
router.put('/:id', (req, res) => {
  const expenseId = req.params.id;
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Invalid amount' });
  }

  const sql = `UPDATE expenses SET amount = ? WHERE id = ?`;

  db.query(sql, [amount, expenseId], (err, result) => {
    if (err) {
      console.error('Error updating expense:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.json({ message: 'Expense updated successfully', amount });
  });
});


module.exports = router;
