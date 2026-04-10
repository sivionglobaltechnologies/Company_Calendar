const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    date: { type: String, required: true },
    type: { type: String, default: 'internal' },
    startTime: { type: String, default: null },
    endTime: { type: String, default: null },
    location: { type: String, default: null },
    description: { type: String, default: null },
    hasReminder: { type: Boolean, default: false },
    isAdminEvent: { type: Boolean, default: false },
    isReadOnly: { type: Boolean, default: false }
}, { timestamps: true });

// We map this schema to the "events" collection
module.exports = mongoose.model('Event', EventSchema, 'events');
