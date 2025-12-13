const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/monthly', (req, res) => {
  const { user_id, year, month } = req.query;

  if (!user_id || !year || !month) {
    return res.status(400).json({ message: 'Missing parameters' });
  }

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

  db.query(expensesSql, [user_id, year, month], (e1, exp) => {
    const expenses = exp[0].total || 0;

    db.query(incomeSql, [user_id, year, month], (e2, inc) => {
      const income = inc[0].total || 1;

      db.query(balanceSql, [user_id], (e3, bal) => {
        const balance = bal[0].total || 0;

        db.query(debtSql, [user_id, year, month], (e4, debt) => {
          const debtPayments = debt[0].total || 0;

          // 🔢 Calculations
          const spendingRatio = expenses / income;
          const emergencyMonths = expenses > 0 ? balance / expenses : 6;
          const debtRatio = debtPayments / income;

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

          res.json({
            riskValue: Math.round(riskValue),
            lastMonthValue: null, // نضيفه لاحقًا
            factors: {
              spendingVsIncome: spendingScore < 30 ? "Good" : spendingScore < 60 ? "Medium" : "High",
              emergencyFund: emergencyScore < 30 ? "Good" : emergencyScore < 60 ? "Medium" : "High",
              debtRatio: debtScore < 30 ? "Good" : debtScore < 60 ? "Medium" : "High",
            }
          });
        });
      });
    });
  });
});

module.exports = router;
