const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Holiday = require('../models/Holiday');
const Meeting = require('../models/Meeting');

// GET /api/calendar-data/all
// Groups all item types for initial sync
router.get('/all', async (req, res) => {
    try {
        const events = await Event.find({});
        const holidays = await Holiday.find({});
        const meetings = await Meeting.find({});
        
        // Map back to frontend expected keys
        const grouped = {
            calendar_events: events.filter(e => !e.isAdminEvent), // users events
            admin_events: events.filter(e => e.isAdminEvent),   // admin events
            admin_holidays: holidays,
            admin_meetings: meetings
        };
        
        res.json({ success: true, data: grouped });
    } catch (err) {
        console.error('Error fetching all calendar data:', err);
        res.status(500).json({ error: 'Failed to fetch' });
    }
});

// GET /api/calendar-data
// Returns all calendar items filtered by sourceType
router.get('/', async (req, res) => {
    try {
        const { sourceType } = req.query;
        let items = [];
        
        if (sourceType === 'calendar_events') {
            items = await Event.find({ isAdminEvent: false });
        } else if (sourceType === 'admin_events') {
            items = await Event.find({ isAdminEvent: true });
        } else if (sourceType === 'admin_holidays') {
            items = await Holiday.find({});
        } else if (sourceType === 'admin_meetings') {
            items = await Meeting.find({});
        } else {
            return res.status(400).json({ error: 'Invalid sourceType' });
        }
        
        res.json({ success: true, count: items.length, data: items });
    } catch (err) {
        console.error('Error fetching calendar data:', err);
        res.status(500).json({ error: 'Failed to fetch calendar data' });
    }
});

// POST /api/calendar-data/bulk
router.post('/bulk', async (req, res) => {
    try {
        const { sourceType, items } = req.body; 
        
        if (!sourceType || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Invalid payload' });
        }

        if (sourceType === 'calendar_events' || sourceType === 'admin_events') {
            const isAdmin = sourceType === 'admin_events';
            // drop existing
            await Event.deleteMany({ isAdminEvent: isAdmin });
            if (items.length > 0) {
                const bulkOps = items.map(data => ({
                    ...data,
                    isAdminEvent: isAdmin
                }));
                await Event.insertMany(bulkOps);
            }
        } else if (sourceType === 'admin_holidays') {
            await Holiday.deleteMany({});
            if (items.length > 0) {
                await Holiday.insertMany(items);
            }
        } else if (sourceType === 'admin_meetings') {
            await Meeting.deleteMany({});
            if (items.length > 0) {
                await Meeting.insertMany(items);
            }
        } else {
            return res.status(400).json({ error: 'Invalid sourceType' });
        }

        res.json({ success: true, count: items.length });
    } catch (err) {
        console.error('Error in bulk operation:', err);
        res.status(500).json({ error: 'Failed to perform bulk save' });
    }
});

// DELETE /api/calendar-data/:id
router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        
        // Try deleting from all 3 to find it (since frontend sends just ID without type)
        let result = await Event.findOneAndDelete({ id: id });
        if (!result) result = await Holiday.findOneAndDelete({ id: id });
        if (!result) result = await Meeting.findOneAndDelete({ id: id });
        
        if (!result) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting data:', err);
        res.status(500).json({ error: 'Failed to delete' });
    }
});

module.exports = router;
