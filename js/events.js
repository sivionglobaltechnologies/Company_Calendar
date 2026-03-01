// events.js
// Handles core event logic (Add, Edit, Delete, Get)
// Admin-added meetings, holidays and events are also picked up here via localStorage.

import { storage } from './storage.js';
import { getGovernmentHolidays } from './holidays.js';

let allEvents = [];
let _currentYear = new Date().getFullYear();

// ── ADMIN STORAGE KEYS (must match admin.js) ────────────────────────────────
const ADMIN_MEETINGS_KEY = 'admin_meetings';
const ADMIN_HOLIDAYS_KEY = 'admin_holidays';
const ADMIN_EVENTS_KEY = 'admin_events';

/** Read raw JSON safely from localStorage */
function readLS(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * Convert an admin meeting into a calendar-compatible event object.
 * Meetings are shown as "internal" type chips on the calendar.
 */
function meetingToCalEvent(m) {
    return {
        id: `meeting-${m.id}`,
        title: m.title,
        date: m.date,
        type: 'internal',
        startTime: m.time || null,
        endTime: null,
        description: [m.attendees && `Attendees: ${m.attendees}`, m.location && `Location: ${m.location}`, m.notes].filter(Boolean).join(' · ') || null,
        isReadOnly: true,         // meetings managed only from admin panel
        isAdminMeeting: true
    };
}

/**
 * Convert an admin holiday into a calendar-compatible event object.
 */
function holidayToCalEvent(h) {
    return {
        id: `admin-hol-${h.id}`,
        title: h.title,
        date: h.date,
        type: h.type === 'gov' ? 'gov' : 'custom',
        description: h.description || null,
        isReadOnly: true,
        isAdminHoliday: true
    };
}

/**
 * Convert an admin event into a calendar-compatible event object.
 */
function adminEventToCalEvent(ev) {
    return {
        id: `admin-ev-${ev.id}`,
        title: ev.title,
        date: ev.date,
        type: ev.type,
        startTime: ev.startTime || null,
        endTime: ev.endTime || null,
        description: ev.description || null,
        location: ev.location || null,
        isReadOnly: false,       // admin events can still be viewed/edited from main calendar
        isAdminEvent: true
    };
}

export const eventsManager = {

    /**
     * init — called once at startup.
     * Stores the year and then delegates to refresh() for actual data loading.
     */
    init: (year) => {
        _currentYear = year;
        eventsManager.refresh();
    },

    /**
     * refresh — re-reads ALL data sources from localStorage every time it's called.
     * Called before every calendar render so admin changes appear immediately.
     */
    refresh: () => {
        // 1. Built-in government holidays (JS module, year-range)
        const govEvents = [
            ...getGovernmentHolidays(_currentYear - 1),
            ...getGovernmentHolidays(_currentYear),
            ...getGovernmentHolidays(_currentYear + 1)
        ];

        // 2. User-created events (stored in calendar_events, excluding admin-synced ones
        //    so we don't double-count — admin pipeline handles those separately below)
        const userEvents = storage.getEvents().filter(
            e => !e.isAdminMeeting && !e.isAdminHoliday && !e.isAdminEvent
        );

        // 3. Admin-managed meetings  ← new source
        const adminMeetings = readLS(ADMIN_MEETINGS_KEY).map(meetingToCalEvent);

        // 4. Admin-managed holidays  ← read directly (not via calendar_events sync)
        const adminHolidays = readLS(ADMIN_HOLIDAYS_KEY).map(holidayToCalEvent);

        // 5. Admin-managed company events  ← read directly
        const adminEvents = readLS(ADMIN_EVENTS_KEY).map(adminEventToCalEvent);

        // Combine: gov built-in → admin holidays (override/extend) → admin events → admin meetings → user events
        allEvents = [
            ...govEvents,
            ...adminHolidays,
            ...adminEvents,
            ...adminMeetings,
            ...userEvents
        ];
    },

    getAll: () => allEvents,

    getEventsForDate: (dateString) => {
        return allEvents
            .filter(e => e.date === dateString)
            .sort((a, b) => {
                if (!a.startTime) return 1;
                if (!b.startTime) return -1;
                return a.startTime.localeCompare(b.startTime);
            });
    },

    getEventById: (id) => {
        return allEvents.find(e => e.id === id);
    },

    addEvent: (eventData) => {
        eventData.id = `evt-${Date.now()}`;
        eventData.isReadOnly = false;
        allEvents.push(eventData);
        eventsManager.saveToStorage();
    },

    updateEvent: (id, eventData) => {
        const index = allEvents.findIndex(e => e.id === id);
        if (index > -1 && !allEvents[index].isReadOnly) {
            allEvents[index] = { ...allEvents[index], ...eventData, id };
            eventsManager.saveToStorage();
        }
    },

    deleteEvent: (id) => {
        const index = allEvents.findIndex(e => e.id === id);
        if (index > -1 && !allEvents[index].isReadOnly) {
            allEvents.splice(index, 1);
            eventsManager.saveToStorage();
        }
    },

    saveToStorage: () => {
        // Only persist user-created events (not admin-sourced ones — those live in their own keys)
        const userEvents = allEvents.filter(
            e => !e.isReadOnly && !e.isAdminMeeting && !e.isAdminHoliday && !e.isAdminEvent
        );
        storage.saveEvents(userEvents);
    }
};
