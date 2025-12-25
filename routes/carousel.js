const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

module.exports = function(db) {

    router.post('/upload-carousel', upload.array('images', 5), (req, res) => {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        db.query("DELETE FROM carousel_images", (err) => {
            if (err) return res.status(500).json({ error: err });

            const values = req.files.map(file => [`uploads/${file.filename}`]);
            
            db.query("INSERT INTO carousel_images (image_path) VALUES ?", [values], (err) => {
                if (err) return res.status(500).json({ error: err });
                res.status(200).json({ message: 'Images saved', count: req.files.length });
            });
        });
    });

    router.get('/carousel-images', (req, res) => {
        db.query("SELECT image_path FROM carousel_images ORDER BY id ASC", (err, results) => {
            if (err) return res.status(500).json({ error: err });
            const images = results.map(row => row.image_path);
            res.json({ images: images });
        });
    });

    return router;
};