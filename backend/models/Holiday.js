const mongoose = require('mongoose');

const HolidaySchema = new mongoose.Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    date: { type: String, required: true },
    type: { type: String, default: 'gov' },
    description: { type: String, default: null },
    optional: { type: Boolean, default: false }
}, { timestamps: true });

// We map this schema to the "holidays" collection
module.exports = mongoose.model('Holiday', HolidaySchema, 'holidays');
