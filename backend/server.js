const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const tradeRoutes = require('./routes/trades');
const dashboardRoutes = require('./routes/dashboard');
const calendarRoutes = require('./routes/calendar');
const reportRoutes = require('./routes/reports');
const marketRoutes = require('./routes/market');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/market', marketRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Trade Diary backend running on http://localhost:${PORT}`);
});
