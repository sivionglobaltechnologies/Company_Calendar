// storage.js
// Handles all backend database operations for user events

import { buildApiUrl } from './config.js';

const SOURCE_TYPE = 'calendar_events';

export const storage = {
    /**
     * Get all events from the database
     * @returns {Array} List of events
     */
    getEvents: async () => {
        try {
            const res = await fetch(buildApiUrl(`/api/calendar-data?sourceType=${SOURCE_TYPE}`));
            if (!res.ok) throw new Error('Network response was not ok');
            const data = await res.json();
            return data.data || [];
        } catch (e) {
            console.error("Error reading from Database", e);
            return [];
        }
    },

    /**
     * Save events back to the database
     * @param {Array} events 
     */
    saveEvents: async (events) => {
        try {
            await fetch(buildApiUrl('/api/calendar-data/bulk'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceType: SOURCE_TYPE, items: events })
            });
        } catch (e) {
            console.error("Error saving to Database", e);
        }
    }
};
