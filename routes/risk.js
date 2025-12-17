const express = require('express');
const router = express.Router();
const db = require('../db');

// ===============================
// GET /api/risk/monthly
// ===============================
router.get('/monthly', (req, res) => {
  const { user_id, year, month } = req.query;

  // -------- Validation --------
  if (!user_id || !year || !month) {
    return res.status(400).json({
      message: 'Missing parameters (user_id, year, month)'
    });
  }

  // -------- SQL Queries --------

  // 1️⃣ Monthly expenses
  const expensesSql = `
    SELECT SUM(amount) AS total
    FROM expenses
    WHERE user_id = ?
      AND YEAR(date) = ?
      AND MONTH(date) = ?
  `;

  // 2️⃣ Monthly income
  const incomeSql = `
    SELECT SUM(amount) AS total
    FROM transactions t
    JOIN wallets w ON t.wallet_id = w.id
    WHERE w.user_id = ?
      AND t.is_income = 1
      AND YEAR(t.date) = ?
      AND MONTH(t.date) = ?
  `;

  // 3️⃣ Wallet balance
  const balanceSql = `
    SELECT SUM(balance) AS total
    FROM wallets
    WHERE user_id = ?
  `;

  // 4️⃣ Debt payments
  const debtSql = `
    SELECT SUM(amount) AS total
    FROM transactions t
    JOIN wallets w ON t.wallet_id = w.id
    WHERE w.user_id = ?
      AND t.is_income = 0
      AND LOWER(description) LIKE '%debt%'
      AND YEAR(t.date) = ?
      AND MONTH(t.date) = ?
  `;

  // -------- Execute Queries --------

  db.query(expensesSql, [user_id, year, month], (err1, exp) => {
    if (err1) return res.status(500).json({ error: err1.message });

    const expenses = Number(exp[0]?.total) || 0;

    db.query(incomeSql, [user_id, year, month], (err2, inc) => {
      if (err2) return res.status(500).json({ error: err2.message });

      const income = Number(inc[0]?.total) || 0;

      db.query(balanceSql, [user_id], (err3, bal) => {
        if (err3) return res.status(500).json({ error: err3.message });

        const balance = Number(bal[0]?.total) || 0;

        db.query(debtSql, [user_id, year, month], (err4, debt) => {
          if (err4) return res.status(500).json({ error: err4.message });

          const debtPayments = Number(debt[0]?.total) || 0;

          // ================= SAFE CALCULATIONS =================

          const spendingRatio =
            income > 0 ? expenses / income : 0;

          const emergencyMonths =
            expenses > 0 ? balance / expenses : 6;

          const debtRatio =
            income > 0 ? debtPayments / income : 0;

          // ================= SCORING LOGIC =================

          const spendingScore =
            spendingRatio < 0.5 ? 15 :
            spendingRatio < 0.8 ? 45 : 85;

          const emergencyScore =
            emergencyMonths >= 6 ? 15 :
            emergencyMonths >= 3 ? 45 : 85;

          const debtScore =
            debtRatio < 0.3 ? 15 :
            debtRatio < 0.6 ? 45 : 85;

          const riskValue =
            spendingScore * 0.4 +
            emergencyScore * 0.35 +
            debtScore * 0.25;

          // ================= RESPONSE =================

          return res.json({
            riskValue: Math.round(riskValue),
            factors: {
              spendingVsIncome:
                spendingScore < 30 ? 'Good' :
                spendingScore < 60 ? 'Medium' : 'High',

              emergencyFund:
                emergencyScore < 30 ? 'Good' :
                emergencyScore < 60 ? 'Medium' : 'High',

              debtRatio:
                debtScore < 30 ? 'Good' :
                debtScore < 60 ? 'Medium' : 'High',
            }
          });
        });
      });
    });
  });
});

module.exports = router;
