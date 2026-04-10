/**
 * admin.js
 * Admin Panel — Authentication + Full CRUD for Meetings, Holidays & Events
 * All data is persisted in localStorage under unique admin keys.
 */

'use strict';

import { buildApiUrl } from './config.js';

// ─── ADMIN CREDENTIALS (change as needed) ───────────────────────────────────
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'Admin@123'
};

// ─── STORAGE KEYS ────────────────────────────────────────────────────────────
const KEYS = {
    session: 'admin_session',
    meetings: 'admin_meetings',
    holidays: 'admin_holidays',
    events: 'admin_events'
};

// ─── STATE ───────────────────────────────────────────────────────────────────
let state = {
    section: 'dashboard',   // current sidebar section
    meetings: [],
    holidays: [],
    events: [],
    editTarget: null,        // { type, id } when editing
    confirmCallback: null    // function to run after confirm
};

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Apply saved theme before anything renders (avoids flash)
    initAdminTheme();

    await loadAllData();

    const isLoggedIn = sessionStorage.getItem(KEYS.session) === 'true';
    if (isLoggedIn) {
        showAdminShell();
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('admin-shell').style.display = 'none';
    }

    bindLoginForm();
    bindSidebar();
    bindAddButtons();
    bindModalCloseButtons();
    bindSearchFilters();
    bindConfirmDialog();
    bindThemeToggle();
    bindMobileMenu();
    bindAdminToday();
    bindAdminBottomNav();
    refreshDashboard();

    // EXPOSE TO GLOBALS (for HTML onclick handlers in module mode)
    window.openMeetingModal = openMeetingModal;
    window.openHolidayModal = openHolidayModal;
    window.openEventModal = openEventModal;
    window.confirmDelete = confirmDelete;
});

// ─── THEME ────────────────────────────────────────────────────────────────────
const THEME_KEY = 'admin_theme'; // 'dark' (default) | 'light'

function initAdminTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'dark';
    applyAdminTheme(saved);
}

function applyAdminTheme(theme) {
    document.body.classList.toggle('admin-light', theme === 'light');
    localStorage.setItem(THEME_KEY, theme);
}

function bindThemeToggle() {
    document.getElementById('admin-theme-toggle')?.addEventListener('click', () => {
        const isLight = document.body.classList.contains('admin-light');
        applyAdminTheme(isLight ? 'dark' : 'light');
        showToast(isLight ? 'Switched to Dark Mode' : 'Switched to Light Mode', 'info');
    });
}


// ─── AUTH ─────────────────────────────────────────────────────────────────────
function bindLoginForm() {
    const form = document.getElementById('login-form');
    form.addEventListener('submit', e => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');

        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            sessionStorage.setItem(KEYS.session, 'true');
            errorEl.textContent = '';
            showAdminShell();
            showToast('Welcome back, Administrator!', 'success');
        } else {
            errorEl.textContent = 'Invalid username or password.';
            document.getElementById('login-password').value = '';
        }
    });
}

function showAdminShell() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-shell').style.display = 'flex';
    navigateTo(state.section);
}

function logout() {
    sessionStorage.removeItem(KEYS.session);
    document.getElementById('admin-shell').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    showToast('Logged out successfully.', 'info');
}

function bindMobileMenu() {
    const mobileBtn = document.getElementById('admin-mobile-menu');
    const sidebar = document.querySelector('.admin-sidebar');
    const overlay = document.getElementById('admin-sidebar-overlay');

    mobileBtn?.addEventListener('click', () => {
        sidebar?.classList.toggle('open');
    });

    overlay?.addEventListener('click', () => {
        sidebar?.classList.remove('open');
    });

    document.getElementById('admin-sidebar-close')?.addEventListener('click', () => {
        sidebar?.classList.remove('open');
    });
}

function bindAdminToday() {
    const todayBtn = document.getElementById('admin-today-btn');
    if (!todayBtn) return;

    todayBtn.addEventListener('click', () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const searchMap = {
            dashboard: null,
            meetings: 'meetings-search',
            holidays: 'holidays-search',
            events: 'events-search'
        };

        const inputId = searchMap[state.section];
        if (inputId) {
            const input = document.getElementById(inputId);
            if (input) {
                input.value = todayStr;
                if (state.section === 'meetings') renderMeetingsTable(todayStr);
                if (state.section === 'holidays') renderHolidaysTable(todayStr);
                if (state.section === 'events') renderEventsTable(todayStr);
            }
        } else if (state.section === 'dashboard') {
            refreshDashboard(todayStr);
        }
        showToast('Viewing schedule for Today', 'success');
    });
}

// ─── MOBILE BOTTOM NAV ────────────────────────────────────────────────────────
function bindAdminBottomNav() {
    const nav = document.getElementById('admin-bottom-nav');
    if (!nav) return;

    const sidebar = document.querySelector('.admin-sidebar');

    // Menu — open sidebar
    document.getElementById('anav-menu')?.addEventListener('click', () => {
        sidebar?.classList.toggle('open');
    });

    // Dashboard — navigate to dashboard
    document.getElementById('anav-dashboard')?.addEventListener('click', () => {
        navigateTo('dashboard');
        updateAnavActive('dashboard');
    });

    // FAB Add — open the relevant "Add" modal for the current section
    document.getElementById('anav-add')?.addEventListener('click', () => {
        if (state.section === 'meetings') openMeetingModal();
        else if (state.section === 'holidays') openHolidayModal();
        else if (state.section === 'events') openEventModal();
        else openMeetingModal(); // default if on dashboard
    });

    // Theme — toggle and sync icon
    const anavThemeIcon = document.getElementById('anav-theme-icon');
    document.getElementById('anav-theme-mobile')?.addEventListener('click', () => {
        const isLight = document.body.classList.contains('admin-light');
        applyAdminTheme(isLight ? 'dark' : 'light');
        showToast(isLight ? 'Switched to Dark Mode' : 'Switched to Light Mode', 'info');
        // Update mobile icon
        if (anavThemeIcon) {
            anavThemeIcon.className = isLight ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
        }
    });

    // Sync active state whenever navigateTo is called
    const origNavigateTo = navigateTo;
    window._adminNavHook = (section) => updateAnavActive(section);
}

function updateAnavActive(section) {
    // Highlight the matching section button in the bottom nav
    const map = { dashboard: 'anav-dashboard' };
    document.querySelectorAll('#admin-bottom-nav .anav-item').forEach(el => el.classList.remove('active'));
    const activeId = map[section];
    if (activeId) document.getElementById(activeId)?.classList.add('active');
}


// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function bindSidebar() {
    document.querySelectorAll('.sidebar-nav-item[data-section]').forEach(item => {
        item.addEventListener('click', () => {
            navigateTo(item.dataset.section);
            // Close sidebar on mobile
            if (window.innerWidth <= 1024) {
                document.querySelector('.admin-sidebar').classList.remove('open');
            }
        });
    });

    document.getElementById('logout-btn').addEventListener('click', logout);
}

function navigateTo(section) {
    state.section = section;

    // Update active state in sidebar
    document.querySelectorAll('.sidebar-nav-item[data-section]').forEach(el => {
        el.classList.toggle('active', el.dataset.section === section);
    });

    // Show correct panel
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(`panel-${section}`);
    if (panel) panel.classList.add('active');

    // Update topbar
    const titles = {
        dashboard: ['Dashboard', 'Overview of all managed data'],
        meetings: ['Daily Meetings', 'Create, edit and manage scheduled meetings'],
        holidays: ['Company Holidays', 'Manage government and company holiday calendar'],
        events: ['Company Events', 'Internal events, client meetings and custom entries']
    };
    document.getElementById('topbar-title').textContent = titles[section]?.[0] || '';
    document.getElementById('topbar-subtitle').textContent = titles[section]?.[1] || '';

    // Re-render tables
    if (section === 'dashboard') refreshDashboard();
    if (section === 'meetings') renderMeetingsTable();
    if (section === 'holidays') renderHolidaysTable();
    if (section === 'events') renderEventsTable();
}

// ─── DATA PERSISTENCE ─────────────────────────────────────────────────────────
async function loadAllData() {
    state.meetings = await loadFromDB(KEYS.meetings, getDefaultMeetings());
    state.holidays = await loadFromDB(KEYS.holidays, getDefaultHolidays());
    state.events = await loadFromDB(KEYS.events, getDefaultEvents());

    // Auto-remove any meetings whose date is in the past
    await cleanupPastMeetings();
}

async function loadFromDB(key, defaults) {
    try {
        const res = await fetch(buildApiUrl(`/api/calendar-data?sourceType=${key}`));
        if (!res.ok) return defaults;
        const json = await res.json();
        return json.data || defaults;
    } catch { return defaults; }
}

async function saveToDB(key, data) {
    try {
        await fetch(buildApiUrl('/api/calendar-data/bulk'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceType: key, items: data })
        });
    } catch (e) {
        console.error('Error saving to DB', e);
    }
}

/**
 * cleanupPastMeetings — automatically purges any meeting whose date is
 * strictly before today. Called on every page load and after every save,
 * so the calendar never shows stale finished meetings.
 */
async function cleanupPastMeetings() {
    const today = fmtDate(new Date());
    const before = state.meetings.length;
    // Only cleanup non-recurring meetings that are in the past
    state.meetings = state.meetings.filter(m => {
        if (m.recurrence && m.recurrence !== 'none') return true;
        return m.date >= today;
    });
    if (state.meetings.length !== before) {
        await saveToDB(KEYS.meetings, state.meetings);
        console.info(`[Admin] Auto-removed ${before - state.meetings.length} past one-time meeting(s).`);
    }
}

// ─── DEFAULT SEED DATA ────────────────────────────────────────────────────────
function getDefaultMeetings() {
    return [];
}

function getDefaultHolidays() {
    return [];
}

function getDefaultEvents() {
    return [];
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
async function refreshDashboard() {
    // Always run cleanup first so stat counts are accurate
    await cleanupPastMeetings();

    setEl('stat-meetings', state.meetings.length);
    setEl('stat-holidays', state.holidays.length);
    setEl('stat-events', state.events.length);
    setEl('stat-clients', state.events.filter(e => e.type === 'client').length);

    // Build upcoming list — today and future, sorted by date, capped at 10
    const today = fmtDate(new Date());
    const upcoming = [
        ...state.meetings.map(m => ({ ...m, _kind: 'meeting' })),
        ...state.events.map(e => ({ ...e, _kind: 'event' })),
        ...state.holidays.map(h => ({ ...h, _kind: 'holiday' }))
    ].filter(i => i.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date) || (a.time || a.startTime || '').localeCompare(b.time || b.startTime || ''))
        .slice(0, 10);

    const tbody = document.getElementById('upcoming-tbody');

    if (!upcoming.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-table"><i class="fa-solid fa-calendar-xmark"></i>No upcoming items</td></tr>`;
        return;
    }

    tbody.innerHTML = upcoming.map(item => {
        // Determine the edit action based on kind
        const editFn = item._kind === 'meeting' ? `openMeetingModal('${item.id}')`
            : item._kind === 'holiday' ? `openHolidayModal('${item.id}')`
                : `openEventModal('${item.id}')`;

        const deleteFn = item._kind === 'meeting' ? `confirmDelete('meetings','${item.id}','${esc(item.title)}')`
            : item._kind === 'holiday' ? `confirmDelete('holidays','${item.id}','${esc(item.title)}')`
                : `confirmDelete('events','${item.id}','${esc(item.title)}')`;

        const badge = typeBadge(item._kind === 'meeting' ? 'meeting' : (item.type || item._kind));
        const time = item.time || item.startTime || '—';

        return `
        <tr>
            <td data-label="Title"><strong>${esc(item.title)}</strong></td>
            <td data-label="Date" class="secondary">${formatDisplayDate(item.date)}</td>
            <td data-label="Time" class="secondary">${time}</td>
            <td data-label="Type">${badge}</td>
            <td data-label="Actions">
                <div class="td-actions">
                    <button class="action-btn action-btn-edit"
                            onclick="${editFn}" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="action-btn action-btn-delete"
                            onclick="${deleteFn}" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ─── MEETINGS CRUD ────────────────────────────────────────────────────────────
function renderMeetingsTable(filter = '') {
    const data = filter
        ? state.meetings.filter(m => m.title.toLowerCase().includes(filter) || m.attendees?.toLowerCase().includes(filter))
        : state.meetings;

    const tbody = document.getElementById('meetings-tbody');
    tbody.innerHTML = data.length ? data.map(m => `
        <tr>
            <td data-label="Meeting Title"><strong>${esc(m.title)}</strong></td>
            <td data-label="Date" class="secondary">${formatDisplayDate(m.date)}</td>
            <td data-label="Time" class="secondary">${m.time || '—'}</td>
            <td data-label="Duration" class="secondary">${m.duration || '—'}</td>
            <td data-label="Attendees" class="secondary">${esc(m.attendees || '—')}</td>
            <td data-label="Recurrence" class="secondary">${esc(m.recurrence || '—')}</td>
            <td data-label="Actions">
                <div class="td-actions">
                    <button class="action-btn action-btn-edit" onclick="openMeetingModal('${m.id}')" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="action-btn action-btn-delete" onclick="confirmDelete('meetings','${m.id}','${esc(m.title)}')" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('') : `<tr><td colspan="7" class="empty-table"><i class="fa-solid fa-calendar-check"></i>No meetings found. Click "+ Add Meeting" to create one.</td></tr>`;
}

function openMeetingModal(id = null) {
    state.editTarget = id ? { type: 'meetings', id } : null;
    const meeting = id ? state.meetings.find(m => m.id === id) : null;
    const modal = document.getElementById('meeting-modal');
    const title = document.getElementById('meeting-modal-title');

    title.innerHTML = `<i class="fa-solid fa-calendar-plus"></i> ${id ? 'Edit Meeting' : 'New Meeting'}`;
    resetForm('meeting-form');

    if (meeting) {
        setVal('m-title', meeting.title);
        setVal('m-date', meeting.date);
        setVal('m-time', meeting.time);
        setVal('m-duration', meeting.duration);
        setVal('m-attendees', meeting.attendees);
        setVal('m-location', meeting.location);
        setVal('m-recurrence', meeting.recurrence);
        setVal('m-notes', meeting.notes);
    } else {
        setVal('m-date', fmtDate(new Date()));
    }

    modal.classList.remove('hidden');
}

async function saveMeeting() {
    const title = getVal('m-title').trim();
    const date = getVal('m-date');
    if (!title || !date) { showToast('Title and Date are required.', 'error'); return; }

    const data = {
        id: state.editTarget?.id || uid(),
        title,
        date,
        time: getVal('m-time'),
        duration: getVal('m-duration'),
        attendees: getVal('m-attendees'),
        location: getVal('m-location'),
        recurrence: getVal('m-recurrence'),
        notes: getVal('m-notes')
    };

    if (state.editTarget) {
        const idx = state.meetings.findIndex(m => m.id === data.id);
        if (idx > -1) state.meetings[idx] = data;
        showToast('Meeting updated successfully.', 'success');
    } else {
        state.meetings.push(data);
        showToast('Meeting added successfully.', 'success');
    }

    await saveToDB(KEYS.meetings, state.meetings);
    notifyCalendarUpdate(`Admin added/updated meeting: ${data.title}`, 'meeting', state.editTarget ? 'updated' : 'added', data.date, data.time);
    document.getElementById('meeting-modal').classList.add('hidden');
    renderMeetingsTable();
    await refreshDashboard();
}

// ─── HOLIDAYS CRUD ────────────────────────────────────────────────────────────
function renderHolidaysTable(filter = '') {
    const data = filter
        ? state.holidays.filter(h => h.title.toLowerCase().includes(filter) || h.type?.includes(filter))
        : state.holidays;

    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    const tbody = document.getElementById('holidays-tbody');

    tbody.innerHTML = sorted.length ? sorted.map(h => `
        <tr>
            <td data-label="Holiday Name"><strong>${esc(h.title)}</strong></td>
            <td data-label="Date" class="secondary">${formatDisplayDate(h.date)}</td>
            <td data-label="Type">${typeBadge(h.type === 'gov' ? 'gov' : 'custom')}</td>
            <td data-label="Description" class="secondary">${esc(h.description || '—')}</td>
            <td data-label="Status" class="secondary">${h.optional ? '<span style="color:var(--admin-yellow)">Optional</span>' : '<span style="color:var(--admin-green)">Mandatory</span>'}</td>
            <td data-label="Actions">
                <div class="td-actions">
                    <button class="action-btn action-btn-edit" onclick="openHolidayModal('${h.id}')" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="action-btn action-btn-delete" onclick="confirmDelete('holidays','${h.id}','${esc(h.title)}')" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('') : `<tr><td colspan="6" class="empty-table"><i class="fa-solid fa-umbrella-beach"></i>No holidays found.</td></tr>`;
}

function openHolidayModal(id = null) {
    state.editTarget = id ? { type: 'holidays', id } : null;
    const holiday = id ? state.holidays.find(h => h.id === id) : null;
    const modal = document.getElementById('holiday-modal');
    const title = document.getElementById('holiday-modal-title');

    title.innerHTML = `<i class="fa-solid fa-umbrella-beach"></i> ${id ? 'Edit Holiday' : 'New Holiday'}`;
    resetForm('holiday-form');

    if (holiday) {
        setVal('h-title', holiday.title);
        setVal('h-date', holiday.date);
        setVal('h-type', holiday.type);
        setVal('h-description', holiday.description);
        document.getElementById('h-optional').checked = holiday.optional || false;
    }

    modal.classList.remove('hidden');
}

async function saveHoliday() {
    const title = getVal('h-title').trim();
    const date = getVal('h-date');
    if (!title || !date) { showToast('Title and Date are required.', 'error'); return; }

    const data = {
        id: state.editTarget?.id || uid(),
        title,
        date,
        type: getVal('h-type') || 'gov',
        description: getVal('h-description'),
        optional: document.getElementById('h-optional').checked
    };

    if (state.editTarget) {
        const idx = state.holidays.findIndex(h => h.id === data.id);
        if (idx > -1) state.holidays[idx] = data;
        showToast('Holiday updated successfully.', 'success');
    } else {
        state.holidays.push(data);
        showToast('Holiday added successfully.', 'success');
    }

    await saveToDB(KEYS.holidays, state.holidays);
    notifyCalendarUpdate(`Admin added/updated holiday: ${data.title}`, 'holiday', state.editTarget ? 'updated' : 'added', data.date);
    // events.js reads admin_holidays directly on each calendar render — no extra sync needed
    document.getElementById('holiday-modal').classList.add('hidden');
    renderHolidaysTable();
    await refreshDashboard();
}

/**
 * NOTE: Admin data is stored in dedicated localStorage keys (admin_meetings,
 * admin_holidays, admin_events). The main calendar's events.js reads directly
 * from those keys on every render — no intermediate sync to calendar_events needed.
 */


// ─── COMPANY EVENTS CRUD ──────────────────────────────────────────────────────
function renderEventsTable(filter = '', typeFilter = '') {
    let data = [...state.events];
    if (filter) data = data.filter(e => e.title.toLowerCase().includes(filter) || e.description?.toLowerCase().includes(filter));
    if (typeFilter) data = data.filter(e => e.type === typeFilter);

    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    const tbody = document.getElementById('events-tbody');

    tbody.innerHTML = sorted.length ? sorted.map(ev => `
        <tr>
            <td data-label="Event Title"><strong>${esc(ev.title)}</strong></td>
            <td data-label="Date" class="secondary">${formatDisplayDate(ev.date)}</td>
            <td data-label="Time" class="secondary">${ev.startTime || '—'}${ev.endTime ? ' – ' + ev.endTime : ''}</td>
            <td data-label="Type">${typeBadge(ev.type)}</td>
            <td data-label="Location" class="secondary">${esc(ev.location || '—')}</td>
            <td data-label="Description" class="secondary" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(ev.description || '—')}</td>
            <td data-label="Actions">
                <div class="td-actions">
                    <button class="action-btn action-btn-edit" onclick="openEventModal('${ev.id}')" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="action-btn action-btn-delete" onclick="confirmDelete('events','${ev.id}','${esc(ev.title)}')" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('') : `<tr><td colspan="7" class="empty-table"><i class="fa-solid fa-star"></i>No events found.</td></tr>`;
}

function openEventModal(id = null) {
    state.editTarget = id ? { type: 'events', id } : null;
    const ev = id ? state.events.find(e => e.id === id) : null;
    const modal = document.getElementById('event-modal-admin');
    const title = document.getElementById('event-modal-title');

    title.innerHTML = `<i class="fa-solid fa-star"></i> ${id ? 'Edit Event' : 'New Event'}`;
    resetForm('event-form-admin');

    if (ev) {
        setVal('ev-title', ev.title);
        setVal('ev-date', ev.date);
        setVal('ev-type', ev.type);
        setVal('ev-start', ev.startTime);
        setVal('ev-end', ev.endTime);
        setVal('ev-location', ev.location);
        setVal('ev-description', ev.description);
    } else {
        setVal('ev-date', fmtDate(new Date()));
    }

    modal.classList.remove('hidden');
}

async function saveEvent() {
    const title = getVal('ev-title').trim();
    const date = getVal('ev-date');
    if (!title || !date) { showToast('Title and Date are required.', 'error'); return; }

    const data = {
        id: state.editTarget?.id || uid(),
        title,
        date,
        type: getVal('ev-type') || 'internal',
        startTime: getVal('ev-start') || null,
        endTime: getVal('ev-end') || null,
        location: getVal('ev-location'),
        description: getVal('ev-description'),
        isAdminEvent: true
    };

    if (state.editTarget) {
        const idx = state.events.findIndex(e => e.id === data.id);
        if (idx > -1) state.events[idx] = data;
        showToast('Event updated successfully.', 'success');
    } else {
        state.events.push(data);
        showToast('Event added successfully.', 'success');
    }

    await saveToDB(KEYS.events, state.events);
    notifyCalendarUpdate(`Admin added/updated event: ${data.title}`, 'event', state.editTarget ? 'updated' : 'added', data.date, data.startTime);
    // events.js reads admin_events directly on each calendar render — no extra sync needed
    document.getElementById('event-modal-admin').classList.add('hidden');
    renderEventsTable();
    await refreshDashboard();
}



// ─── DELETE WITH CONFIRM ──────────────────────────────────────────────────────
function confirmDelete(type, id, name) {
    document.getElementById('confirm-item-name').textContent = `"${name}"`;
    document.getElementById('confirm-dialog-overlay').classList.remove('hidden');
    state.confirmCallback = async () => {
        const item = state[type].find(i => i.id === id);
        const itemDate = item?.date || item?.startTime?.split('T')[0] || new Date().toISOString().split('T')[0];
        
        state[type] = state[type].filter(item => item.id !== id);
        await saveToDB(KEYS[type], state[type]);
        const schemaType = type === 'meetings' ? 'meeting' : (type === 'holidays' ? 'holiday' : 'event');
        const itemTime = item?.time || item?.startTime || '';
        notifyCalendarUpdate(`Admin deleted ${type.slice(0, -1)}: ${name}`, schemaType, 'deleted', itemDate, itemTime);
        // events.js reads from admin keys directly — calendar auto-refreshes on next render
        showToast('Item deleted successfully.', 'success');
        if (type === 'meetings') renderMeetingsTable();
        if (type === 'holidays') renderHolidaysTable();
        if (type === 'events') renderEventsTable();
        await refreshDashboard();
    };
}

function bindConfirmDialog() {
    document.getElementById('confirm-yes-btn').addEventListener('click', async () => {
        if (state.confirmCallback) {
            await state.confirmCallback();
        }
        state.confirmCallback = null;
        document.getElementById('confirm-dialog-overlay').classList.add('hidden');
    });
    document.getElementById('confirm-no-btn').addEventListener('click', () => {
        state.confirmCallback = null;
        document.getElementById('confirm-dialog-overlay').classList.add('hidden');
    });
}

// ─── ADD BUTTON BINDINGS ──────────────────────────────────────────────────────
function bindAddButtons() {
    document.getElementById('add-meeting-btn')?.addEventListener('click', () => openMeetingModal());
    document.getElementById('add-holiday-btn')?.addEventListener('click', () => openHolidayModal());
    document.getElementById('add-event-admin-btn')?.addEventListener('click', () => openEventModal());

    document.getElementById('save-meeting-btn')?.addEventListener('click', saveMeeting);
    document.getElementById('save-holiday-btn')?.addEventListener('click', saveHoliday);
    document.getElementById('save-event-btn')?.addEventListener('click', saveEvent);
}

// ─── MODAL CLOSE ──────────────────────────────────────────────────────────────
function bindModalCloseButtons() {
    document.querySelectorAll('.admin-modal-close, [data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.admin-modal-overlay')?.classList.add('hidden');
        });
    });
}

// ─── SEARCH & FILTER ──────────────────────────────────────────────────────────
function bindSearchFilters() {
    document.getElementById('meetings-search')?.addEventListener('input', e => {
        renderMeetingsTable(e.target.value.toLowerCase());
    });
    document.getElementById('holidays-search')?.addEventListener('input', e => {
        renderHolidaysTable(e.target.value.toLowerCase());
    });
    document.getElementById('events-search')?.addEventListener('input', e => {
        renderEventsTable(e.target.value.toLowerCase(), document.getElementById('events-type-filter')?.value);
    });
    document.getElementById('events-type-filter')?.addEventListener('change', e => {
        renderEventsTable(document.getElementById('events-search')?.value.toLowerCase(), e.target.value);
    });
}

// ─── UTILITY HELPERS ──────────────────────────────────────────────────────────
function uid() {
    return 'admin-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function fmtDate(d) {
    return d.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function typeBadge(type) {
    const labels = {
        gov: 'Government',
        client: 'Client',
        internal: 'Internal',
        custom: 'Custom',
        holiday: 'Holiday',
        meeting: 'Meeting'
    };
    return `<span class="type-badge ${type}">${labels[type] || type}</span>`;
}

function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
}

function getVal(id) {
    return document.getElementById(id)?.value || '';
}

function resetForm(formId) {
    document.getElementById(formId)?.reset();
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
// (Using the premium version at bottom of file)

// ─── CROSS-TAB SYNC HELPER ────────────────────────────────────────────────
function notifyCalendarUpdate(message = null, type = 'event', action = 'added', date = null, eventTime = null) {
    // Notify main calendar in other tabs that data changed
    window.localStorage.setItem('calendar_sync_trigger', Date.now());

    if (message) {
        console.log(`[Sync] Attempting to sync notification: "${message}"`);
        
        // Use provided date or default if not specified
        const targetDate = date || new Date().toISOString().split('T')[0];

        // Post to backend database
        fetch(buildApiUrl('/api/notifications'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: type,
                action: action,
                title: 'Calendar Update',
                date: targetDate,
                eventTime: eventTime || '',
                message: message
            })
        })
        .then(async res => {
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.error(`[Sync] Server returned ${res.status}:`, errData);
                if (typeof showToast === 'function') {
                    showToast(`Notification sync failed (${res.status}). Check server logs.`, 'error');
                }
            } else {
                console.log(`[Sync] Notification successfully saved to database.`);
            }
        })
        .catch(err => {
            console.error('[Sync] Network error during notification sync:', err);
            if (typeof showToast === 'function') {
                showToast('Notification sync failed: Connection error.', 'error');
            }
        });
    }
}

/** Show a premium toast in admin panel (matches dashboard style) */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info');
    toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
    
    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 400);
    }, 5000);
}

// Keep showAdminToast as a wrapper for backward compatibility if needed
function showAdminToast(msg) {
    showToast(msg, 'info');
}
