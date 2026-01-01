const express = require('express');
const router = express.Router();
const db = require('../db');


router.get('/:id', (req, res) => {
  const { id } = req.params;

  db.query(
    "SELECT id, full_name, email, phone_number, image FROM users WHERE id = ?",
    [id],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'DB error', err });
      if (result.length === 0) return res.status(404).json({ message: 'User not found' });

      res.json(result[0]);
    }
  );
});




router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { full_name, email, phone_number, image } = req.body;

  db.query(
    `UPDATE users 
     SET full_name = ?, email = ?, phone_number = ?, image = ?
     WHERE id = ?`,
    [full_name, email, phone_number, image || null, id],
    (err) => {
      if (err)
        return res.status(500).json({ message: 'DB error', err });

      res.json({ message: 'Profile updated successfully ✅' });
    }
  );
});



router.put('/:id/password', (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;

  db.query(
    "SELECT password FROM users WHERE id = ?",
    [id],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'DB error' });

      if (result[0].password !== currentPassword)
        return res.status(400).json({ message: 'Current password incorrect' });

      db.query(
        "UPDATE users SET password = ? WHERE id = ?",
        [newPassword, id],
        () => res.json({ message: 'Password updated 🔐' })
      );
    }
  );
});


router.put('/currency/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const { currency } = req.body;

  if (!currency) {
    return res.status(400).json({ message: 'Currency is required' });
  }

  const sql = 'UPDATE users SET currency = ? WHERE id = ?';
  db.query(sql, [currency, userId], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.json({ message: 'Currency updated successfully' });
  });
});

router.put('/language/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const { language } = req.body;

  if (!language) {
    return res.status(400).json({ message: 'Language is required' });
  }

  const sql = 'UPDATE users SET language = ? WHERE id = ?';
  db.query(sql, [language, userId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    res.json({ message: 'Language updated successfully' });
  });
});


module.exports = router;


