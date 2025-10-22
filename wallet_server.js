const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const walletsRouter = require('./routes/wallets');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// نقطة بداية للمحافظ
app.use('/api/wallets', walletsRouter);

// اختبار الخادم
app.get('/', (req, res) => {
  res.send('🟢 Wallet backend is running!');
});

const PORT = 4000; // منفذ مختلف عن 3000 حتى لا يتعارض مع index.js
app.listen(PORT, () => console.log(`💰 Wallet server running on port ${PORT}`));
