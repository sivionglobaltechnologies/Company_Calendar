// app.js
// Main Application Controller

import { themeManager } from './theme.js';
import { eventsManager } from './events.js';
import { calendar } from './calendar.js';

document.addEventListener('DOMContentLoaded', () => {

    // 1. Initialize Theme
    themeManager.init();
    document.getElementById('theme-toggle')?.addEventListener('click', themeManager.toggle);

    // 2. Initialize Events Data
    eventsManager.init(new Date().getFullYear());

    // 3. Initialize Calendar
    const onDateSelect = (dateStr) => {
        openDayPanel(dateStr);
    };
    calendar.init(onDateSelect);

    // 4. Wire up Calendar Navigation bindings
    document.getElementById('main-prev')?.addEventListener('click', () => calendar.navigate(-1));
    document.getElementById('main-next')?.addEventListener('click', () => calendar.navigate(1));
    document.getElementById('mini-prev')?.addEventListener('click', () => calendar.changeMonth(-1));
    document.getElementById('mini-next')?.addEventListener('click', () => calendar.changeMonth(1));
    document.getElementById('today-btn')?.addEventListener('click', () => calendar.goToToday());

    // 5. Day Panel actions
    const dayPanel = document.getElementById('day-panel');
    document.getElementById('close-panel')?.addEventListener('click', () => {
        dayPanel.classList.remove('open');
    });

    // 6. Mobile Sidebar Toggle
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay?.classList.add('visible');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay?.classList.remove('visible');
    }

    function toggleSidebar() {
        sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    }

    document.getElementById('mobile-menu-btn')?.addEventListener('click', toggleSidebar);

    // Close when overlay (backdrop) is tapped
    sidebarOverlay?.addEventListener('click', closeSidebar);

    // Close when tapping the main workspace area on mobile
    document.querySelector('.main-workspace')?.addEventListener('click', () => {
        if (window.innerWidth <= 1024 && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });

    // Close sidebar on mini-day click if mobile
    document.getElementById('mini-calendar-grid')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('mini-day') && window.innerWidth <= 1024) {
            closeSidebar();
        }
    });

    // 8. View Toggle (Dropdown)
    const viewSelect = document.getElementById('view-select');
    if (viewSelect) {
        viewSelect.addEventListener('change', (e) => {
            const viewMode = e.target.value;
            calendar.changeViewMode(viewMode);
            // Close sidebar on mobile after view change
            if (window.innerWidth <= 1024) {
                sidebar.classList.remove('open');
            }
        });
    }

    // 8.5 Mini Events Dropdown Toggle
    const miniEventsBtn = document.getElementById('mini-events-dropdown-btn');
    const miniEventsContent = document.getElementById('mini-events-dropdown-content');
    const miniEventsChevron = document.getElementById('mini-events-chevron');
    if (miniEventsBtn && miniEventsContent) {
        miniEventsBtn.addEventListener('click', () => {
            miniEventsContent.classList.toggle('hidden');
            if (miniEventsContent.classList.contains('hidden')) {
                miniEventsChevron.classList.remove('fa-chevron-up');
                miniEventsChevron.classList.add('fa-chevron-down');
            } else {
                miniEventsChevron.classList.remove('fa-chevron-down');
                miniEventsChevron.classList.add('fa-chevron-up');
            }
        });
    }

    // 9. Modal forms & actions
    setupEventModal();

    // 10. Live Sync for Admin Updates
    window.addEventListener('storage', (e) => {
        if (e.key === 'calendar_sync_trigger') {
            eventsManager.refresh();
            calendar.render();
        }
    });

    // 11. Mobile Bottom Navigation Bar
    const mobileNav = document.getElementById('mobile-bottom-nav');
    if (mobileNav) {
        // Menu — open sidebar
        document.getElementById('mobile-nav-menu')?.addEventListener('click', toggleSidebar);

        // Today — same as desktop today button
        document.getElementById('mobile-nav-today')?.addEventListener('click', () => {
            calendar.goToToday();
        });

        // Add Event — open the add event modal
        document.getElementById('mobile-nav-add')?.addEventListener('click', () => {
            const selDate = calendar.formatDate(calendar.selectedDate);
            document.getElementById('event-date').value = selDate;
            openEventModal();
        });

        // Theme — toggle and sync both icons (desktop + mobile)
        const mobileThemeIcon = document.getElementById('mobile-theme-icon');
        document.getElementById('mobile-nav-theme')?.addEventListener('click', () => {
            themeManager.toggle();
            // sync mobile icon to match current theme
            const isDark = document.body.classList.contains('dark-mode');
            if (mobileThemeIcon) {
                mobileThemeIcon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
            }
            // sync desktop icon too
            const desktopIcon = document.querySelector('#theme-toggle i');
            if (desktopIcon) {
                desktopIcon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
            }
        });

        // View — cycle day → week → month → year → day …
        const viewCycle = ['day', 'week', 'month', 'year'];
        document.getElementById('mobile-nav-view')?.addEventListener('click', () => {
            const current = calendar.viewMode;
            const idx = viewCycle.indexOf(current);
            const next = viewCycle[(idx + 1) % viewCycle.length];
            calendar.changeViewMode(next);
            const viewSelect = document.getElementById('view-select');
            if (viewSelect) viewSelect.value = next;
        });
    }

});

// --- UI Actions ---

let currentEditingEventId = null;

function openDayPanel(dateStr) {
    const dayPanel = document.getElementById('day-panel');
    const panelTitle = document.getElementById('panel-date-display');
    const listContainer = document.getElementById('event-list');

    // Format date nicely: "Thu, Oct 12, 2026"
    const displayDate = new Date(dateStr).toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    panelTitle.textContent = displayDate;

    // Store selected date globally for Add Event
    document.getElementById('event-date').value = dateStr;

    // Refresh all data (including admin meetings/holidays/events) before listing
    eventsManager.refresh();

    // Load Events
    const dayEvents = eventsManager.getEventsForDate(dateStr);

    if (dayEvents.length === 0) {
        listContainer.innerHTML = `<div class="empty-state">No events for this day. Enjoy your free time!</div>`;
    } else {
        listContainer.innerHTML = dayEvents.map(e => `
            <div class="event-card type-${e.type}" data-id="${e.id}" data-readonly="${e.isReadOnly ? '1' : '0'}">
                ${e.startTime ? `
                    <div class="event-time">
                        <i class="fa-regular fa-clock"></i> 
                        ${e.startTime} ${e.endTime ? `- ${e.endTime}` : ''}
                    </div>
                ` : ''}
                <h4>${e.title}</h4>
                ${e.description ? `<p>${e.description}</p>` : ''}
                ${e.isAdminMeeting ? `<p class="event-time" style="margin-top:4px"><i class="fa-solid fa-users-line" style="font-size:0.75rem"></i> Company Meeting</p>` : ''}
                ${e.isAdminHoliday ? `<p class="event-time" style="margin-top:4px"><i class="fa-solid fa-umbrella-beach" style="font-size:0.75rem"></i> Company Holiday</p>` : ''}
                ${e.isAdminEvent ? `<p class="event-time" style="margin-top:4px"><i class="fa-solid fa-star" style="font-size:0.75rem"></i> Company Event</p>` : ''}
                ${e.isReadOnly && !e.isAdminMeeting && !e.isAdminHoliday && !e.isAdminEvent ? `<p class="event-time" style="margin-top:4px"><i class="fa-solid fa-lock" style="font-size:0.75rem"></i> Official Holiday</p>` : ''}
            </div>
        `).join('');

        // Attach click binding to edit events (skip read-only items)
        const cards = listContainer.querySelectorAll('.event-card');
        cards.forEach(card => {
            if (card.dataset.readonly === '1') return;
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-id');
                openEventModal(id);
            });
        });
    }

    // Slide in
    dayPanel.classList.add('open');
}

function setupEventModal() {
    const modal = document.getElementById('event-modal');
    const form = document.getElementById('event-form');

    // Open Add from Panel
    document.getElementById('add-event-panel-btn')?.addEventListener('click', () => {
        openEventModal(); // No ID = Add new
    });

    // Open Add from Header
    document.getElementById('add-event-header-btn')?.addEventListener('click', () => {
        const selDate = calendar.formatDate(calendar.selectedDate);
        document.getElementById('event-date').value = selDate;
        openEventModal();
    });

    // Close Modal
    document.getElementById('close-modal')?.addEventListener('click', closeEventModal);
    document.getElementById('cancel-modal')?.addEventListener('click', closeEventModal);

    // On form submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveEventFromForm();
    });

    // On delete
    document.getElementById('delete-event-btn')?.addEventListener('click', () => {
        if (currentEditingEventId) {
            if (confirm('Are you sure you want to delete this event?')) {
                eventsManager.deleteEvent(currentEditingEventId);
                closeEventModal();
                calendar.render();
                // Refresh panel
                openDayPanel(calendar.formatDate(calendar.selectedDate));
            }
        }
    });
}

function openEventModal(eventId = null) {
    const modal = document.getElementById('event-modal');
    const form = document.getElementById('event-form');
    const deleteBtn = document.getElementById('delete-event-btn');
    const modalTitle = document.getElementById('modal-title');

    form.reset();
    currentEditingEventId = eventId;

    // Set default date logic
    if (!document.getElementById('event-date').value) {
        document.getElementById('event-date').value = calendar.formatDate(calendar.selectedDate);
    }

    if (eventId) {
        // Edit mode
        modalTitle.textContent = "Edit Event";
        const ev = eventsManager.getEventById(eventId);

        if (ev) {
            document.getElementById('event-id').value = ev.id;
            document.getElementById('event-title').value = ev.title;
            document.getElementById('event-date').value = ev.date;
            document.getElementById('event-type').value = ev.type;

            if (ev.startTime) document.getElementById('event-start').value = ev.startTime;
            if (ev.endTime) document.getElementById('event-end').value = ev.endTime;
            if (ev.description) document.getElementById('event-desc').value = ev.description;

            if (ev.isReadOnly) {
                // Disable everything
                form.querySelectorAll('input, select, textarea, button[type="submit"]').forEach(el => el.disabled = true);
                deleteBtn.classList.add('hidden');
                modalTitle.textContent = "View Only Event";
            } else {
                form.querySelectorAll('input, select, textarea, button[type="submit"]').forEach(el => el.disabled = false);
                deleteBtn.classList.remove('hidden');
            }
        }
    } else {
        // Add mode
        modalTitle.textContent = "Add Event";
        form.querySelectorAll('input, select, textarea, button[type="submit"]').forEach(el => el.disabled = false);
        document.getElementById('event-id').value = '';
        deleteBtn.classList.add('hidden');
    }

    modal.classList.remove('hidden');
}

function closeEventModal() {
    const modal = document.getElementById('event-modal');
    modal.classList.add('hidden');
    currentEditingEventId = null;
}

function saveEventFromForm() {
    const id = document.getElementById('event-id').value;
    const date = document.getElementById('event-date').value;

    const eventData = {
        title: document.getElementById('event-title').value,
        date: date,
        type: document.getElementById('event-type').value,
        startTime: document.getElementById('event-start').value || null,
        endTime: document.getElementById('event-end').value || null,
        description: document.getElementById('event-desc').value
    };

    if (id) {
        // Update
        eventsManager.updateEvent(id, eventData);
    } else {
        // Add new
        eventsManager.addEvent(eventData);
    }

    closeEventModal();
    calendar.render();
    // Refresh Panel
    openDayPanel(date);
}
