// app.js
// Main Application Controller

import { themeManager } from './theme.js';
import { eventsManager } from './events.js';
import { calendar } from './calendar.js';
import { buildApiUrl } from './config.js';

document.addEventListener('DOMContentLoaded', async () => {

    // 1. Initialize Theme
    themeManager.init();
    document.getElementById('theme-toggle')?.addEventListener('click', themeManager.toggle);

    // 2. Initialize Events Data
    await eventsManager.init(new Date().getFullYear());

    // 3. Initialize Calendar
    const onDateSelect = (dateStr) => {
        openDayPanel(dateStr);
    };
    await calendar.init(onDateSelect);

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

    // 9.5 Notifications Badge
    let lastNotificationFetchTime = null;

    async function updateNotificationBadge() {
        const cacheBuster = Date.now();
        console.log(`[Badge] Fetching unread notifications... (cb: ${cacheBuster})`);
        try {
            const res = await fetch(buildApiUrl(`/api/notifications?unreadOnly=true&_=${cacheBuster}`));
            if (res.ok) {
                const data = await res.json();
                const unreadCount = data.notifications ? data.notifications.length : 0;
                console.log(`[Badge] Sync Result: ${unreadCount} unread items found.`);
                
                const badge = document.getElementById('notification-badge');
                if (badge) {
                    if (unreadCount > 0) {
                        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                        badge.style.display = 'block';
                        badge.style.opacity = '1'; // Reset opacity if previously dimmed
                        
                        // Show toast for newly popped notifications
                        if (data.notifications.length > 0) {
                            const latest = data.notifications[0]; // assuming latest is first
                            if (!lastNotificationFetchTime || new Date(latest.createdAt) > lastNotificationFetchTime) {
                                if (typeof showToast === 'function') {
                                    showToast(latest.message || 'Calendar updated!', 'success');
                                }
                                lastNotificationFetchTime = new Date();
                            }
                        }
                    } else {
                        badge.style.display = 'none';
                    }
                }
            }
        } catch (err) {
            console.error('Failed to fetch notifications from DB:', err);
        }
    }
    
    updateNotificationBadge();
    // Poll for new notifications from DB every 5 seconds
    setInterval(updateNotificationBadge, 5000);

    // Immediate sync on tab focus or storage event
    window.addEventListener('focus', updateNotificationBadge);
    window.addEventListener('storage', (e) => {
        if (e.key === 'calendar_sync_trigger') {
            updateNotificationBadge();
        }
    });

    document.getElementById('notification-btn')?.addEventListener('click', openNotificationPanel);

    async function markAllNotificationsRead() {
        try {
            await fetch(buildApiUrl('/api/notifications/mark-all-read'), {
                method: 'PATCH'
            });
            updateNotificationBadge();
            // Re-render the panel if it's open to show read status
            if (document.getElementById('day-panel').classList.contains('open') && 
                document.getElementById('panel-date-display').textContent === 'Notifications') {
                openNotificationPanel();
            }
            if (typeof showToast === 'function') {
                showToast('All notifications cleared', 'info');
            }
        } catch (err) {
            console.error('Failed to clear notifications:', err);
        }
    }

    async function openNotificationPanel() {
        console.log('[Panel] Opening notification center...');
        const dayPanel = document.getElementById('day-panel');
        const panelTitle = document.getElementById('panel-date-display');
        const listContainer = document.getElementById('event-list');
        const addBtn = document.getElementById('add-event-panel-btn');

        panelTitle.textContent = 'Notifications';
        if (addBtn) addBtn.style.display = 'none';

        try {
            const res = await fetch(buildApiUrl('/api/notifications?unreadOnly=true'));
            console.log(`[Panel] Fetch status: ${res.status}`);
            const data = await res.json();
            const notifications = data.notifications || [];
            console.log(`[Panel] Total notifications loaded: ${notifications.length}`);

            let html = `
                <button class="btn btn-outline mark-all-read-btn" id="mark-all-read-btn-panel">
                    <i class="fa-solid fa-check-double"></i> Mark all as read
                </button>
            `;

            if (notifications.length === 0) {
                html += `<div class="empty-state">No notifications yet.</div>`;
            } else {
                html += notifications.map(n => {
                    // Format the TARGET Event Date (e.g., "Apr 10")
                    let eventDateDisplay = '';
                    try {
                        if (n.date && n.date.includes('-') && !n.date.includes('T')) {
                            // Handle YYYY-MM-DD
                            const [y, m, d] = n.date.split('-').map(Number);
                            eventDateDisplay = new Date(y, m - 1, d).toLocaleDateString(undefined, {
                                month: 'short', day: 'numeric'
                            });
                        } else if (n.date || n.createdAt) {
                            // Fallback for ISO strings or createdAt
                            const fallbackDate = new Date(n.date || n.createdAt);
                            if (!isNaN(fallbackDate)) {
                                eventDateDisplay = fallbackDate.toLocaleDateString(undefined, {
                                    month: 'short', day: 'numeric'
                                });
                            }
                        }
                    } catch (e) {
                        eventDateDisplay = 'Update';
                    }
                    
                    if (!eventDateDisplay || eventDateDisplay.includes('Invalid') || eventDateDisplay === 'undefined') {
                        eventDateDisplay = 'Recent';
                    }
                    
                    const rawEventTime = (n.eventTime || '').trim();
                    const eventTimeDisplay = rawEventTime && !eventDateDisplay.includes(rawEventTime)
                        ? `, ${rawEventTime}`
                        : '';
                    const displayDateTime = eventDateDisplay
                        ? `${eventDateDisplay}${eventTimeDisplay}`
                        : rawEventTime || 'Recent';

                    const iconClass = n.message.toLowerCase().includes('delete') ? 'delete' : 'update';
                    const icon = iconClass === 'delete' ? 'fa-trash-can' : 'fa-clock-rotate-left';
                    
                    return `
                        <div class="notification-card ${n.read ? '' : 'unread'}" 
                             data-date="${n.date}" 
                             style="cursor: pointer;"
                             title="Click to view this date">
                            <div class="notification-icon-wrap ${iconClass}">
                                <i class="fa-solid ${icon}"></i>
                            </div>
                            <div class="notification-info">
                                <h4>${n.title || 'System Update'}</h4>
                                <p>${n.message}</p>
                                <div class="notification-meta">
                                    <span>${displayDateTime}</span>
                                    ${n.read ? '<span><i class="fa-solid fa-circle-check"></i> Seen</span>' : '<span style="color:#ef4444; font-weight: 600;">View <i class="fa-solid fa-chevron-right" style="font-size: 0.7em;"></i></span>'}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            listContainer.innerHTML = html;
            
            // Re-bind click for "Mark all read" in panel
            document.getElementById('mark-all-read-btn-panel')?.addEventListener('click', markAllNotificationsRead);

            // Add click listeners to cards to jump to date
            listContainer.querySelectorAll('.notification-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    // Don't jump if they clicked a button inside (though there aren't any currently)
                    const dateStr = card.getAttribute('data-date');
                    if (dateStr && dateStr !== '') {
                        calendar.setSelectDate(dateStr);
                        openDayPanel(dateStr);
                    }
                });
            });

            dayPanel.classList.add('open');
        } catch (err) {
            console.error('Failed to load notifications:', err);
            listContainer.innerHTML = `<div class="empty-state">Error loading notifications.</div>`;
        }
    }

    // 10. Live Sync for Admin Updates
    window.addEventListener('storage', async (e) => {
        if (e.key === 'calendar_sync_trigger') {
            await eventsManager.refresh();
            await calendar.render();
        }

        if (e.key === 'admin_notifications' && e.newValue) {
            try {
                const notifications = JSON.parse(e.newValue);
                if (notifications.length > 0) {
                    const latest = notifications[notifications.length - 1];
                    showToast(latest.message, 'success');
                }
            } catch (err) {
                console.error("Error parsing admin notifications", err);
            }
        }
    });

    /** Show a premium toast notification */
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-info';
        toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
        
        container.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 400);
        }, 5000);
    }

    // 11. Mobile Bottom Navigation Bar
    const mobileNav = document.getElementById('mobile-bottom-nav');
    if (mobileNav) {
        // Menu — open sidebar
        document.getElementById('mobile-nav-menu')?.addEventListener('click', toggleSidebar);

        // Today — same as desktop today button
        document.getElementById('mobile-nav-today')?.addEventListener('click', () => {
            calendar.goToToday();
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

        // Notifications — open the notification panel from mobile nav
        document.getElementById('mobile-nav-notifications')?.addEventListener('click', () => {
            openNotificationPanel();
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

async function openDayPanel(dateStr) {
    const dayPanel = document.getElementById('day-panel');
    const panelTitle = document.getElementById('panel-date-display');
    const listContainer = document.getElementById('event-list');
    const addBtn = document.getElementById('add-event-panel-btn');

    if (addBtn) addBtn.style.display = 'flex';

    // Format date nicely: "Thu, Oct 12, 2026"
    let displayDate = '';
    if (dateStr.includes('-') && !dateStr.includes('T')) {
        const [y, m, d] = dateStr.split('-').map(Number);
        displayDate = new Date(y, m - 1, d).toLocaleDateString(undefined, {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    } else {
        displayDate = new Date(dateStr).toLocaleDateString(undefined, {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    panelTitle.textContent = displayDate;

    // Store selected date globally for Add Event
    document.getElementById('event-date').value = dateStr;

    // Refresh all data (including admin meetings/holidays/events) before listing
    await eventsManager.refresh();

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
                <h4>${e.title} ${e.hasReminder ? '<i class="fa-solid fa-bell" style="color: #f59e0b; margin-left: 0.5rem; font-size: 0.9em;" title="Reminder Set"></i>' : ''}</h4>
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

    // Close Modal
    document.getElementById('close-modal')?.addEventListener('click', closeEventModal);
    document.getElementById('cancel-modal')?.addEventListener('click', closeEventModal);

    // On form submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveEventFromForm();
    });

    // On delete
    document.getElementById('delete-event-btn')?.addEventListener('click', async () => {
        if (currentEditingEventId) {
            if (confirm('Are you sure you want to delete this event?')) {
                await eventsManager.deleteEvent(currentEditingEventId);
                closeEventModal();
                await calendar.render();
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
            document.getElementById('event-reminder').checked = !!ev.hasReminder;

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
        document.getElementById('event-reminder').checked = false;
        deleteBtn.classList.add('hidden');
    }

    modal.classList.remove('hidden');
}

function closeEventModal() {
    const modal = document.getElementById('event-modal');
    modal.classList.add('hidden');
    currentEditingEventId = null;
}

async function saveEventFromForm() {
    const id = document.getElementById('event-id').value;
    const date = document.getElementById('event-date').value;

    const eventData = {
        title: document.getElementById('event-title').value,
        date: date,
        type: document.getElementById('event-type').value,
        startTime: document.getElementById('event-start').value || null,
        endTime: document.getElementById('event-end').value || null,
        description: document.getElementById('event-desc').value,
        hasReminder: document.getElementById('event-reminder').checked
    };

    if (id) {
        // Update
        await eventsManager.updateEvent(id, eventData);
    } else {
        // Add new
        await eventsManager.addEvent(eventData);
    }

    closeEventModal();
    await calendar.render();
    // Refresh Panel
    openDayPanel(date);
}
