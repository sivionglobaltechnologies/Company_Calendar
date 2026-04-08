const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['meeting', 'holiday', 'event'],
        required: true
    },
    action: {
        type: String,
        enum: ['added', 'updated', 'deleted'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    date: {
        type: String,
        default: ''
    },
    message: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Auto-delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', notificationSchema);
