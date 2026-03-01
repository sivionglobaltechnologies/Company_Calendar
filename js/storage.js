// storage.js
// Handles all LocalStorage operations

const STORAGE_KEY = 'calendar_events';

export const storage = {
    /**
     * Get all events from LocalStorage
     * @returns {Array} List of events
     */
    getEvents: () => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Error reading from LocalStorage", e);
            return [];
        }
    },

    /**
     * Save events back to LocalStorage
     * @param {Array} events 
     */
    saveEvents: (events) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
        } catch (e) {
            console.error("Error saving to LocalStorage", e);
        }
    }
};
