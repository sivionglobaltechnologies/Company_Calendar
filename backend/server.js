const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── MongoDB Connection ──────────────────────────────────────────────────────
const mongoURI = process.env.mongodb_url;

if (!mongoURI) {
    console.error('❌ mongodb_url is not set in .env');
    process.exit(1);
}

mongoose.connect(mongoURI, {
    dbName: 'company_calendar'
})
    .then(() => console.log('✅ Connected to MongoDB — company_calendar'))
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });

// ─── Routes ──────────────────────────────────────────────────────────────────
const notificationRoutes = require('./routes/notificationRoutes');
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
