const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── MongoDB Connection ──────────────────────────────────────────────────────
const mongoURI = process.env.mongodb_url;

if (!mongoURI) {
    console.error('❌ mongodb_url is not set in .env');
    process.exit(1);
}

mongoose.connect(mongoURI, {
    dbName: process.env.DB_NAME || 'company_calendar'
})
    .then(() => console.log(`✅ Connected to MongoDB Atlas — ${process.env.DB_NAME || 'company_calendar'}`))
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        console.warn('⚠️ Server will continue running in "offline mode" without database support.');
    });

// ─── Routes ──────────────────────────────────────────────────────────────────
const notificationRoutes = require('./routes/notificationRoutes');
const calendarDataRoutes = require('./routes/calendarDataRoutes');
app.use('/api/notifications', notificationRoutes);
app.use('/api/calendar-data', calendarDataRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
