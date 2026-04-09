// calendar.js
// Handles DOM rendering of the calendars

import { eventsManager } from './events.js';

export const calendar = {
    // State
    currentDate: new Date(),
    selectedDate: new Date(),
    viewMode: 'month', // 'day', 'month', 'year'

    // UI Elements
    mainGrid: document.getElementById('main-calendar-grid'),
    miniGrid: document.getElementById('mini-calendar-grid'),
    mainMonthYear: document.getElementById('main-month-year'),
    miniMonthYear: document.getElementById('mini-month-year'),

    // Callbacks
    onDateSelect: null,

    init: (onDateSelectCb) => {
        calendar.onDateSelect = onDateSelectCb;
        calendar.render();
    },

    changeViewMode: (mode) => {
        calendar.viewMode = mode;
        calendar.render();
    },

    changeMonth: (offset) => {
        const oldYear = calendar.currentDate.getFullYear();

        const newDate = new Date(calendar.currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        calendar.currentDate = newDate;

        const newYear = calendar.currentDate.getFullYear();

        // If the year changed, we need to re-initialize events to pull the correct
        // government holidays for the new year mapping
        if (oldYear !== newYear) {
            eventsManager.init(newYear);
        }

        calendar.render();
    },

    navigate: (offset) => {
        const oldYear = calendar.currentDate.getFullYear();
        const newDate = new Date(calendar.currentDate);

        if (calendar.viewMode === 'year') {
            newDate.setFullYear(newDate.getFullYear() + offset);
        } else if (calendar.viewMode === 'week') {
            // Change by 7 days
            newDate.setDate(newDate.getDate() + (offset * 7));
        } else if (calendar.viewMode === 'day') {
            // For day view, we advance the selected date and synchronize current date
            const selDate = new Date(calendar.selectedDate);
            selDate.setDate(selDate.getDate() + offset);
            calendar.selectedDate = selDate;
            newDate.setTime(selDate.getTime());
        } else {
            // Default to month
            newDate.setMonth(newDate.getMonth() + offset);
        }

        calendar.currentDate = newDate;

        const newYear = calendar.currentDate.getFullYear();
        if (oldYear !== newYear) {
            eventsManager.init(newYear);
        }

        calendar.render();

        if (calendar.viewMode === 'day' && calendar.onDateSelect) {
            calendar.onDateSelect(calendar.formatDate(calendar.selectedDate));
        }
    },

    goToToday: () => {
        const oldYear = calendar.currentDate.getFullYear();
        calendar.currentDate = new Date();
        calendar.selectedDate = new Date();

        const newYear = calendar.currentDate.getFullYear();
        if (oldYear !== newYear) {
            eventsManager.init(newYear);
        }

        // Force switch to month view to show the particular month
        calendar.viewMode = 'month';
        const viewSelect = document.getElementById('view-select');
        if (viewSelect) {
            viewSelect.value = 'month';
        }

        calendar.render();
        if (calendar.onDateSelect) {
            calendar.onDateSelect(calendar.formatDate(calendar.selectedDate));
        }
    },

    setSelectDate: (dateString) => {
        calendar.selectedDate = new Date(dateString);
        // If the date is in a different month, switch calendar to that month
        if (calendar.selectedDate.getMonth() !== calendar.currentDate.getMonth() ||
            calendar.selectedDate.getFullYear() !== calendar.currentDate.getFullYear()) {
            calendar.currentDate = new Date(calendar.selectedDate);
            calendar.render();
        } else {
            // Just update UI selections
            calendar.updateSelectionUI();
        }
    },

    formatDate: (dateObj) => {
        // returns yyyy-mm-dd local ensuring timezone doesn't shift the day
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    render: () => {
        // ALWAYS refresh from storage before rendering to pick up any admin changes
        eventsManager.refresh();

        const year = calendar.currentDate.getFullYear();
        const month = calendar.currentDate.getMonth();
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];


        // Always render mini grid the same (it's always a month view)
        calendar.renderMiniCalendarData(year, month);

        if (calendar.viewMode === 'day') {
            const dayDate = calendar.selectedDate;
            const mainHeader = `${monthNames[dayDate.getMonth()]} ${dayDate.getDate()}, ${dayDate.getFullYear()}`;
            if (calendar.mainMonthYear) calendar.mainMonthYear.textContent = mainHeader;
            calendar.renderDayView(dayDate);
        } else if (calendar.viewMode === 'week') {
            // Week view handles its own header logic internally to show ranges
            calendar.renderWeekView(calendar.currentDate);
        } else if (calendar.viewMode === 'year') {
            const mainHeader = `${year}`;
            if (calendar.mainMonthYear) calendar.mainMonthYear.textContent = mainHeader;
            calendar.renderYearView(year);
        } else {
            // Default: Month View
            const mainHeader = `${monthNames[month]} ${year}`;
            if (calendar.mainMonthYear) calendar.mainMonthYear.textContent = mainHeader;
            calendar.renderMonthView(year, month);
        }
    },

    renderMiniCalendarData: (year, month) => {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const miniHeader = `${monthNames[month].substring(0, 3)} ${year}`;
        if (calendar.miniMonthYear) calendar.miniMonthYear.textContent = miniHeader;

        const cells = calendar.generateMonthCells(year, month);
        calendar.renderMiniGrid(cells);
        calendar.renderMiniDropdown(year, month);
    },

    renderMiniDropdown: (year, month) => {
        const dropdownContent = document.getElementById('mini-events-dropdown-content');
        if (!dropdownContent) return;

        // Find events in this month
        const allEvents = eventsManager.getAll();
        const monthEvents = allEvents.filter(e => {
            if (!e.date) return false;
            // Need to parse local date so we split it by dash if it's formatted like YYYY-MM-DD
            const [y, m, d] = e.date.split('-');
            const eYear = parseInt(y, 10);
            const eMonth = parseInt(m, 10) - 1;
            return eYear === year && eMonth === month;
        });

        // Sort by date
        monthEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

        if (monthEvents.length === 0) {
            dropdownContent.innerHTML = `<div class="empty-state" style="padding: 1rem 0; font-size: 0.8rem;">No events this month</div>`;
            return;
        }

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        dropdownContent.innerHTML = monthEvents.map(e => {
            const [y, m, d] = e.date.split('-');
            const eDate = parseInt(d, 10);
            const eMonth = parseInt(m, 10) - 1;
            const dateStr = `${eDate} ${monthNames[eMonth]}`;

            return `
                <div class="event-chip type-${e.type}" style="margin-bottom: 0.25rem; white-space: normal; padding: 0.4rem; display: flex; flex-direction: column; align-items: flex-start; text-align: left;">
                    <strong style="font-size: 0.75rem; opacity: 0.8; margin-bottom: 2px;">${dateStr}${e.startTime ? ` · ${e.startTime}` : ''}</strong>
                    <span>${e.title}</span>
                </div>
            `;
        }).join('');
    },

    generateMonthCells: (year, month) => {
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0(Sun) - 6(Sat)
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        let cells = [];

        // Prev month filler days
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            const d = daysInPrevMonth - i;
            const pastDate = new Date(year, month - 1, d);
            cells.push({
                date: pastDate,
                dateStr: calendar.formatDate(pastDate),
                isCurrentMonth: false
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const current = new Date(year, month, i);
            cells.push({
                date: current,
                dateStr: calendar.formatDate(current),
                isCurrentMonth: true
            });
        }

        // Next month filler days (to complete the grid)
        const remainingCells = 42 - cells.length; // 6 rows * 7 columns = 42
        for (let i = 1; i <= remainingCells; i++) {
            const future = new Date(year, month + 1, i);
            cells.push({
                date: future,
                dateStr: calendar.formatDate(future),
                isCurrentMonth: false
            });
        }

        return cells;
    },

    renderMonthView: (year, month) => {
        if (!calendar.mainGrid) return;

        // Ensure grid classes are set for month view
        calendar.mainGrid.className = 'main-grid';
        const gridHeader = document.querySelector('.grid-header');
        if (gridHeader) gridHeader.style.display = 'grid';

        const cells = calendar.generateMonthCells(year, month);
        calendar.renderMainGrid(cells);
    },

    renderDayView: (dateObj) => {
        if (!calendar.mainGrid) return;

        // Hide standard grid header
        const gridHeader = document.querySelector('.grid-header');
        if (gridHeader) gridHeader.style.display = 'none';

        // Change grid class to day layout
        calendar.mainGrid.className = 'day-view-container';
        calendar.mainGrid.innerHTML = '';

        const dateStr = calendar.formatDate(dateObj);
        const dayEvents = eventsManager.getEventsForDate(dateStr);

        const el = document.createElement('div');
        el.className = 'day-view-content';
        el.innerHTML = `
            <div class="day-view-header">
                <h3>Schedule for ${dateObj.toLocaleDateString(undefined, { weekday: 'long' })}</h3>
            </div>
            <div class="day-view-events">
                ${dayEvents.length === 0 ? '<div class="empty-state">No events scheduled.</div>' : ''}
                ${dayEvents.map(e => `
                    <div class="event-card type-${e.type}" data-id="${e.id}" style="margin-bottom: 1rem;">
                        ${e.startTime ? `
                            <div class="event-time" style="margin-bottom: 0.5rem;">
                                <strong>${e.startTime}</strong> ${e.endTime ? `- ${e.endTime}` : ''}
                            </div>
                        ` : ''}
                        <h4>${e.title}</h4>
                        ${e.description ? `<p>${e.description}</p>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
        calendar.mainGrid.appendChild(el);
    },

    renderWeekView: (dateObj) => {
        if (!calendar.mainGrid) return;

        // Ensure grid classes are set for month/week standard grid view
        calendar.mainGrid.className = 'main-grid week-view-grid';
        const gridHeader = document.querySelector('.grid-header');
        if (gridHeader) gridHeader.style.display = 'grid';

        const year = dateObj.getFullYear();
        const month = dateObj.getMonth();

        // Find the Sunday of this week
        const currentDayOfWeek = dateObj.getDay();
        const sundayDate = new Date(year, month, dateObj.getDate() - currentDayOfWeek);

        // Build array of exactly 7 days
        let cells = [];
        for (let i = 0; i < 7; i++) {
            const thisDate = new Date(sundayDate.getFullYear(), sundayDate.getMonth(), sundayDate.getDate() + i);
            cells.push({
                date: thisDate,
                dateStr: calendar.formatDate(thisDate),
                isCurrentMonth: true // In week view, we always show all 7 days without fading
            });
        }

        // Set month header correctly
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        // Use the month/year of the first day and last day to create the header
        const saturdayDate = cells[6].date;
        let mainHeader = '';
        if (sundayDate.getMonth() === saturdayDate.getMonth()) {
            mainHeader = `Week of ${monthNames[sundayDate.getMonth()]} ${sundayDate.getDate()}, ${sundayDate.getFullYear()}`;
        } else {
            mainHeader = `${monthNames[sundayDate.getMonth()]} ${sundayDate.getDate()} - ${monthNames[saturdayDate.getMonth()]} ${saturdayDate.getDate()}, ${saturdayDate.getFullYear()}`;
        }

        if (calendar.mainMonthYear) calendar.mainMonthYear.textContent = mainHeader;

        calendar.renderMainGrid(cells);
    },

    renderYearView: (year) => {
        if (!calendar.mainGrid) return;

        // Hide standard grid header
        const gridHeader = document.querySelector('.grid-header');
        if (gridHeader) gridHeader.style.display = 'none';

        calendar.mainGrid.className = 'year-view-container';
        calendar.mainGrid.innerHTML = '';

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        for (let m = 0; m < 12; m++) {
            const monthWrapper = document.createElement('div');
            monthWrapper.className = 'year-month-wrapper';

            const title = document.createElement('h4');
            title.textContent = monthNames[m];
            monthWrapper.appendChild(title);

            const miniGrid = document.createElement('div');
            miniGrid.className = 'mini-grid year-mini-grid';

            const cells = calendar.generateMonthCells(year, m);

            cells.forEach(cell => {
                const el = document.createElement('div');
                el.className = `mini-day ${cell.isCurrentMonth ? '' : 'other-month'}`;

                if (cell.isCurrentMonth) {
                    el.textContent = cell.date.getDate();
                    if (eventsManager.getEventsForDate(cell.dateStr).length > 0) {
                        el.classList.add('has-event');
                    }
                    el.addEventListener('click', () => {
                        calendar.setSelectDate(cell.dateStr);
                        calendar.changeViewMode('day');

                        // Update toggle buttons UI visually
                        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                        document.querySelector('.view-btn[data-view="day"]').classList.add('active');

                        if (calendar.onDateSelect) {
                            calendar.onDateSelect(cell.dateStr);
                        }
                    });
                }
                miniGrid.appendChild(el);
            });

            monthWrapper.appendChild(miniGrid);
            calendar.mainGrid.appendChild(monthWrapper);
        }
    },

    renderMainGrid: (cells) => {
        if (!calendar.mainGrid) return;
        calendar.mainGrid.innerHTML = '';

        const todayStr = calendar.formatDate(new Date());

        cells.forEach(cell => {
            const el = document.createElement('div');
            el.className = `calendar-cell ${cell.isCurrentMonth ? '' : 'other-month'}`;

            if (!cell.isCurrentMonth) {
                // Return early, don't add content or click listeners
                calendar.mainGrid.appendChild(el);
                return;
            }

            if (cell.dateStr === todayStr) {
                el.classList.add('today');
            }

            // Events
            const dayEvents = eventsManager.getEventsForDate(cell.dateStr);

            el.innerHTML = `
                <div class="cell-header">
                    <span class="cell-date">${cell.date.getDate()}</span>
                </div>
                <div class="cell-events">
                    ${dayEvents.slice(0, 3).map(e => `
                        <div class="event-chip type-${e.type}">
                            ${e.startTime ? `<b>${e.startTime}</b> ` : ''}${e.title}
                        </div>
                    `).join('')}
                    ${dayEvents.length > 3 ? `<div class="event-chip text-muted">+${dayEvents.length - 3} more</div>` : ''}
                </div>
            `;

            // Interaction
            el.addEventListener('click', () => {
                calendar.setSelectDate(cell.dateStr);
                if (calendar.onDateSelect) {
                    calendar.onDateSelect(cell.dateStr);
                }
            });

            calendar.mainGrid.appendChild(el);
        });
    },

    renderMiniGrid: (cells) => {
        if (!calendar.miniGrid) return;
        calendar.miniGrid.innerHTML = '';

        const todayStr = calendar.formatDate(new Date());
        const selectedStr = calendar.formatDate(calendar.selectedDate);

        cells.forEach(cell => {
            const el = document.createElement('div');
            el.className = `mini-day ${cell.isCurrentMonth ? '' : 'other-month'}`;

            if (!cell.isCurrentMonth) {
                // Empty slot, no numbering or interaction
                calendar.miniGrid.appendChild(el);
                return;
            }

            el.textContent = cell.date.getDate();

            // Add attributes/classes
            el.dataset.date = cell.dateStr;

            if (cell.dateStr === todayStr) {
                el.classList.add('today');
            }
            if (cell.dateStr === selectedStr) {
                el.classList.add('selected');
            }

            // check if has event
            if (eventsManager.getEventsForDate(cell.dateStr).length > 0) {
                el.classList.add('has-event');
            }

            el.addEventListener('click', () => {
                calendar.setSelectDate(cell.dateStr);
                if (calendar.onDateSelect) {
                    calendar.onDateSelect(cell.dateStr);
                }
            });

            calendar.miniGrid.appendChild(el);
        });
    },

    updateSelectionUI: () => {
        // Just updates 'selected' class on mini grid without re-rendering everything
        const selectedStr = calendar.formatDate(calendar.selectedDate);
        if (calendar.miniGrid) {
            const days = calendar.miniGrid.querySelectorAll('.mini-day');
            days.forEach(day => {
                if (day.dataset.date === selectedStr) {
                    day.classList.add('selected');
                } else {
                    day.classList.remove('selected');
                }
            });
        }
    }
};
