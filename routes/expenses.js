const express = require('express');
const router = express.Router();
const db = require('../db'); 


router.post('/', (req, res) => {
  const { user_id, wallet_id, category_name, item_name, icon, amount, date } = req.body;

  if (!user_id || !wallet_id || !category_name || !amount || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (category_name.toLowerCase() === 'food' && (!item_name || item_name.trim() === '')) {
    return res.status(400).json({ message: 'Food expenses must include item_name' });
  }

  console.log('Item name received:', item_name);

  // تجهيز الاسم
  let finalItemName = item_name && item_name.trim() !== '' ? item_name.trim() : 'Unnamed Food';

  if (/^\d+$/.test(finalItemName)) {
    return res.status(400).json({ message: 'Invalid item_name: cannot be only numbers' });
  }

  console.log('Final item name to save:', finalItemName);

  const sql = `
    INSERT INTO expenses (user_id, wallet_id, category_name, item_name, amount, date)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [user_id, wallet_id, category_name, finalItemName, amount, date], (err, result) => {
    if (err) {
      console.error('Error saving expense:', err);
      return res.status(500).json({ message: 'Server error' });
    }

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



router.get('/debug/user-expenses', (req, res) => {
  const { user_id } = req.query;
  
  const sql = `
    SELECT 
      id,
      category_name,
      LOWER(TRIM(category_name)) as normalized_category,
      item_name,
      amount,
      DATE(date) as expense_date,
      user_id,
      wallet_id
    FROM expenses
    WHERE user_id = ?
    ORDER BY date DESC
    LIMIT 20
  `;
  
  db.query(sql, [user_id], (err, rows) => {
    if (err) {
      console.error('Error fetching user expenses:', err);
      return res.status(500).json({ message: 'Server error', error: err });
    }
    
    
    const categories = {};
    let total = 0;
    
    rows.forEach(row => {
      total += parseFloat(row.amount);
      const cat = row.normalized_category;
      categories[cat] = (categories[cat] || 0) + parseFloat(row.amount);
    });
    
    res.json({
      totalExpenses: rows.length,
      totalAmount: total,
      categories: categories,
      recentExpenses: rows
    });
  });
});



router.get('/report/day', (req, res) => {
  const { user_id, date } = req.query;

  const sql = `
    SELECT 
      LOWER(TRIM(category_name)) AS category_name, 
      SUM(amount) AS total
    FROM expenses
    WHERE user_id = ? AND DATE(date) = ?
    GROUP BY LOWER(TRIM(category_name))
    ORDER BY LOWER(TRIM(category_name))
  `;

  db.query(sql, [user_id, date], (err, rows) => {
    if (err) {
      console.error('Error in day report:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    let total = 0;
    const categories = {};

    rows.forEach(r => {
      total += parseFloat(r.total);
      categories[r.category_name] = parseFloat(r.total);
    });

    res.json({ 
      total: total.toFixed(2), 
      categories 
    });
  });
});

// report/month
router.get('/report/month', (req, res) => {
  const { user_id, year, month } = req.query;

  const sql = `
    SELECT 
      LOWER(TRIM(category_name)) AS category_name, 
      SUM(amount) AS total
    FROM expenses
    WHERE user_id = ? 
      AND YEAR(date) = ?
      AND MONTH(date) = ?
    GROUP BY LOWER(TRIM(category_name))
    ORDER BY LOWER(TRIM(category_name))
  `;

  db.query(sql, [user_id, year, month], (err, rows) => {
    if (err) {
      console.error('Error in month report:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    let total = 0;
    const categories = {};

    rows.forEach(r => {
      total += parseFloat(r.total);
      categories[r.category_name] = parseFloat(r.total);
    });

    res.json({ 
      total: total.toFixed(2), 
      categories 
    });
  });
});

// report/year
router.get('/report/year', (req, res) => {
  const { user_id, year } = req.query;

  const sql = `
    SELECT 
      LOWER(TRIM(category_name)) AS category_name, 
      SUM(amount) AS total
    FROM expenses
    WHERE user_id = ?
      AND YEAR(date) = ?
    GROUP BY LOWER(TRIM(category_name))
    ORDER BY LOWER(TRIM(category_name))
  `;

  db.query(sql, [user_id, year], (err, rows) => {
    if (err) {
      console.error('Error in year report:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    let total = 0;
    const categories = {};

    rows.forEach(r => {
      total += parseFloat(r.total);
      categories[r.category_name] = parseFloat(r.total);
    });

    res.json({ 
      total: total.toFixed(2), 
      categories 
    });
  });
});
module.exports = router;
