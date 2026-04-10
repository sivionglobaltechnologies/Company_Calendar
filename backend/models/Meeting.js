const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, default: null },
    duration: { type: String, default: null },
    attendees: { type: String, default: null },
    location: { type: String, default: null },
    recurrence: { type: String, default: 'none' },
    notes: { type: String, default: null }
}, { timestamps: true });

// We map this schema to the "meetings" collection
module.exports = mongoose.model('Meeting', MeetingSchema, 'meetings');
