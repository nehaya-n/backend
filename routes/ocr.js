const express = require('express');
const router = express.Router();
const Tesseract = require('tesseract.js');

// 🔹 POST /api/ocr
router.post('/', async (req, res) => {
  try {
    const { base64Image } = req.body;

    if (!base64Image) {
      return res.status(400).json({ error: "No image provided" });
    }

    // تحويل Base64 إلى Buffer
    const buffer = Buffer.from(base64Image, 'base64');

    // استخدام Tesseract OCR لتحليل الصورة
    const { data: { text } } = await Tesseract.recognize(buffer, 'eng');

    // إعادة النص المستخرج
    res.json({ text });
  } catch (error) {
    console.error("OCR Error:", error);
    res.status(500).json({ error: "OCR processing failed." });
  }
});

module.exports = router;
