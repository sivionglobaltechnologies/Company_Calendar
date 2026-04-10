// events.js
// Handles core event logic (Add, Edit, Delete, Get)
// Admin-added meetings, holidays and events are also picked up here via localStorage.

import { storage } from './storage.js';
import { getGovernmentHolidays } from './holidays.js';
import { buildApiUrl } from './config.js';

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
        isAdminMeeting: true,
        recurrence: m.recurrence || 'none'
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
    init: async (year) => {
        _currentYear = year;
        await eventsManager.refresh();
    },

    refresh: async () => {
        // 1. Built-in government holidays
        const govEvents = [
            ...getGovernmentHolidays(_currentYear - 1),
            ...getGovernmentHolidays(_currentYear),
            ...getGovernmentHolidays(_currentYear + 1)
        ];

        let dbData = { calendar_events: [], admin_meetings: [], admin_holidays: [], admin_events: [] };
        
        try {
            const res = await fetch(buildApiUrl('/api/calendar-data/all'));
            if (res.ok) {
                const json = await res.json();
                dbData = json.data;
            }
        } catch (e) {
            console.error("Fetch API events failed:", e);
        }

        const userEvents = (dbData.calendar_events || []).filter(
            e => !e.isAdminMeeting && !e.isAdminHoliday && !e.isAdminEvent
        );

        const adminMeetings = (dbData.admin_meetings || []).map(meetingToCalEvent);
        const adminHolidays = (dbData.admin_holidays || []).map(holidayToCalEvent);
        const adminEvents = (dbData.admin_events || []).map(adminEventToCalEvent);

        allEvents = [
            ...govEvents,
            ...adminHolidays,
            ...adminEvents,
            ...adminMeetings,
            ...userEvents
        ];
        
        console.log(`[Events] Refreshed: ${allEvents.length} items total (${adminEvents.length} company events).`);
    },

    getAll: () => allEvents,

    getEventsForDate: (dateString) => {
        return allEvents
            .filter(e => {
                // Exact match
                if (e.date === dateString) return true;

                // Recurrence check
                if (e.recurrence && e.recurrence !== 'none') {
                    const eventDate = new Date(e.date);
                    const targetDate = new Date(dateString);

                    // Daily: Happens every weekday only, starting from eventDate
                    if (e.recurrence === 'daily') {
                        const weekday = targetDate.getDay();
                        return targetDate >= eventDate && weekday !== 0 && weekday !== 6;
                    }

                    // Weekly: Happens every week on the same day starting from eventDate
                    if (e.recurrence === 'weekly') {
                        return targetDate >= eventDate && targetDate.getDay() === eventDate.getDay();
                    }

                    // Bi-weekly: Happens every 2 weeks starting from eventDate
                    if (e.recurrence === 'biweekly') {
                        if (targetDate < eventDate) return false;
                        const diffTime = Math.abs(targetDate - eventDate);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays % 14 === 0;
                    }

                    // Monthly: Happens every month on the same day of the month starting from eventDate
                    if (e.recurrence === 'monthly') {
                        return targetDate >= eventDate && targetDate.getDate() === eventDate.getDate();
                    }
                }

                return false;
            })
            .sort((a, b) => {
                if (!a.startTime) return 1;
                if (!b.startTime) return -1;
                return a.startTime.localeCompare(b.startTime);
            });
    },

    getEventById: (id) => {
        return allEvents.find(e => e.id === id);
    },

    addEvent: async (eventData) => {
        eventData.id = `evt-${Date.now()}`;
        eventData.isReadOnly = false;
        allEvents.push(eventData);
        await eventsManager.saveToStorage();
    },

    updateEvent: async (id, eventData) => {
        const index = allEvents.findIndex(e => e.id === id);
        if (index > -1 && !allEvents[index].isReadOnly) {
            allEvents[index] = { ...allEvents[index], ...eventData, id };
            await eventsManager.saveToStorage();
        }
    },

    deleteEvent: async (id) => {
        const index = allEvents.findIndex(e => e.id === id);
        if (index > -1 && !allEvents[index].isReadOnly) {
            allEvents.splice(index, 1);
            await eventsManager.saveToStorage();
        }
    },

    saveToStorage: async () => {
        // Only persist user-created events (not admin-sourced ones — those live in their own keys)
        const userEvents = allEvents.filter(
            e => !e.isReadOnly && !e.isAdminMeeting && !e.isAdminHoliday && !e.isAdminEvent
        );
        await storage.saveEvents(userEvents);
    }
};
