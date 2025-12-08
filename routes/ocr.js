const express = require('express');
const router = express.Router();
const Tesseract = require('tesseract.js');
const { createWorker } = require('tesseract.js');




router.post('/', async (req, res) => {
  try {
    const { base64Image } = req.body;

    if (!base64Image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const buffer = Buffer.from(base64Image, 'base64');

    const { data: { text } } = await Tesseract.recognize(
      buffer,
      'eng+ara', 
      {
        logger: m => console.log(m), 
      }
    );

    res.json({ text });
  } catch (error) {
    console.error("OCR Error:", error);
    res.status(500).json({ error: "OCR processing failed." });
  }
});

module.exports = router;
