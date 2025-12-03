const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

router.post("/analyze", async (req, res) => {
  const { text } = req.body;

  if (!text || text.trim() === "") {
    return res.status(400).json({ error: "Receipt text is required." });
  }

  try {
    const response = await fetch("https://openrouter.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-oss-20b:free", // تأكد من اسم الموديل مع النسخة المجانية
        messages: [
          {
            role: "system",
            content: "You are a receipt parser. Extract purchased products ONLY as a JSON array. Return [{\"name\":\"\",\"price\":0,\"category\":\"\",\"date\":\"\"}]."
          },
          {
            role: "user",
            content: `Receipt:\n${text}`
          }
        ],
        temperature: 0
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API response error:", errText);
      return res.status(response.status).json({ error: "AI API error", details: errText });
    }

    const data = await response.json();

    // تحقق من وجود content قبل الوصول إليه
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: "No content returned from AI" });
    }

    // تنظيف أي ```json أو ```
    const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();

    let products = [];
    try {
      products = JSON.parse(cleaned);
      if (!Array.isArray(products)) {
        throw new Error("Parsed data is not an array");
      }
    } catch (jsonErr) {
      console.error("Error parsing AI JSON:", jsonErr, "Raw content:", cleaned);
      return res.status(500).json({ error: "Failed to parse AI JSON", details: jsonErr.message });
    }

    res.json(products);

  } catch (err) {
    console.error("AI API Error:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

module.exports = router;
