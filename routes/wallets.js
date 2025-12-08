const express = require('express');
const router = express.Router();
const db = require('../db');


router.get('/', (req, res) => {
  const sql = "SELECT * FROM wallets ORDER BY id";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    res.json(results);
  });
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
