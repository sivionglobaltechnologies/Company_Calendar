const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// POST /api/notifications — Create a new notification
router.post('/', async (req, res) => {
    try {
        const { type, action, title, date, message } = req.body;

        if (!type || !action || !title || !message) {
            return res.status(400).json({ error: 'type, action, title, and message are required.' });
        }

        const notification = new Notification({
            type,
            action,
            title,
            date: date || '',
            message
        });

        await notification.save();
        res.status(201).json({ success: true, notification });
    } catch (err) {
        console.error('Error creating notification:', err);
        res.status(500).json({ error: 'Failed to create notification.' });
    }
});

// GET /api/notifications — Get notifications (optionally filter by read status)
// Query params: ?unreadOnly=true  — returns only unread
//               ?since=<ISO date> — returns notifications created after this date
router.get('/', async (req, res) => {
    try {
        const filter = {};

        if (req.query.unreadOnly === 'true') {
            filter.read = false;
        }

        if (req.query.since) {
            filter.createdAt = { $gt: new Date(req.query.since) };
        }

        const notifications = await Notification.find(filter)
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({ success: true, notifications });
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
});

// PATCH /api/notifications/:id/read — Mark a single notification as read
router.patch('/:id/read', async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found.' });
        }

        res.json({ success: true, notification });
    } catch (err) {
        console.error('Error marking notification as read:', err);
        res.status(500).json({ error: 'Failed to update notification.' });
    }
});

// PATCH /api/notifications/mark-all-read — Mark all notifications as read
router.patch('/mark-all-read', async (req, res) => {
    try {
        await Notification.updateMany({ read: false }, { read: true });
        res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (err) {
        console.error('Error marking all as read:', err);
        res.status(500).json({ error: 'Failed to mark all as read.' });
    }
});

module.exports = router;
