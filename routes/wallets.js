const express = require('express');
const router = express.Router();
const db = require('../db');


router.get('/', (req, res) => {
  const userId = parseInt(req.query.user_id);

  if (isNaN(userId)) {
    return res.status(400).json({ message: 'user_id is required' });
  }

  const sql = `
    SELECT *
    FROM wallets
    WHERE user_id = ?
    ORDER BY id
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({
        message: 'Database error',
        error: err
      });
    }
    res.json(results);
  });
});



router.get('/:walletId', (req, res) => {
  const { walletId } = req.params;

  db.query(
    'SELECT * FROM wallets WHERE id = ? LIMIT 1',
    [walletId],
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', err });
      }

      if (result.length === 0) {
        return res.status(404).json({ message: 'Wallet not found' });
      }

      res.json(result[0]);
    }
  );
});



router.get('/user/:userId', (req, res) => {
  const { userId } = req.params;

  db.query(
    'SELECT * FROM wallets WHERE user_id = ? LIMIT 1',
    [userId],
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', err });
      }

      if (result.length === 0) {
        return res.status(404).json({ message: 'Wallet not found' });
      }

      res.json(result[0]);
    }
  );
});


router.put('/:id', (req, res) => {
    const walletId = parseInt(req.params.id);
    const { balance } = req.body;

    if (isNaN(walletId) || balance === undefined) {
        return res.status(400).json({ message: 'Invalid wallet ID or balance' });
    }

    db.query('UPDATE wallets SET balance = ? WHERE id = ?', [balance, walletId], (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Wallet not found' });

        db.query('SELECT * FROM wallets WHERE id = ?', [walletId], (err, rows) => {
            if (err) return res.status(500).json({ message: 'Database error', error: err });
            res.json(rows[0]);
        });
    });
});


module.exports = router;
