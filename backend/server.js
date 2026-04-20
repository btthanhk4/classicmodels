require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const sequelize = require('./config/database');
require('./models/index'); // load associations

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API Routes
app.use('/api/customers', require('./routes/customers'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/products', require('./routes/products'));
app.use('/api/stats', require('./routes/statistics'));
app.use('/api/chatbot', require('./routes/chatbot'));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'OK', database: 'Connected' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', database: err.message });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;

const server = require('http').createServer(app);
const { execSync } = require('child_process');

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} bị chiếm — đang tự kill...`);
    try {
      execSync(`taskkill /F /IM node.exe`, { stdio: 'ignore' });
    } catch (_) {}
    process.exit(1);
  }
});

sequelize.authenticate()
  .then(() => {
    console.log('Database connected: classicmodels');
    server.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Cannot connect to database:', err.message);
    process.exit(1);
  });
