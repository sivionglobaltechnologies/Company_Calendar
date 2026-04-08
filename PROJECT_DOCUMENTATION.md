# Calendar Web Application – Project Documentation

## 1. Project Overview
This project is a Frontend-Focused Calendar Web Application developed for enhancing skills in UI/UX design, modular JavaScript logic, and responsive layouts. 

## 2. Features Implemented

### Core Features:
- **Monthly Calendar View**: Dynamic grid generation using the JavaScript `Date` API.
- **Date Selection**: Fully interactive dates with an accessible side panel for viewing schedule details.
- **Add / Edit / Delete Event**: A comprehensive modal form capturing event Title, Date, Type, Time, and Notes. Allows CRUD operations against local state.
- **Highlight Today’s Date**: Visual styling applied globally to immediately draw the user's attention to the current date.
- **Responsive Design**: Custom bottom navigation bar for mobile viewers, and a sidebar for desktop interactions.

### Optional Features Implemented:
- **Color Coding**: Events are logically grouped by "Type", applying unique visual tags (Internal, Client, Admin).
- **Reminder Icon**: Ability to toggle a reminder context that displays an alert bell.
- **Notes Section**: Re-designed Description area explicitly built for extended details.
- **Dark Mode**: Complete CSS custom variables invert via a `theme.js` toggle.

## 3. Technology Stack
- **Structure**: HTML5 semantics.
- **Style**: CSS3 (Modular Vanilla CSS without relying on heavy frameworks).
- **Logic**: Vanilla JavaScript with ES6 Modules.
- **Data Persistence**: HTML5 `localStorage` API.
- **Version Control**: Git / GitHub.

## 4. Architecture
The project adopts a modular ES6 design with separated controllers:
- `app.js` - Main controller handling DOM interactions.
- `calendar.js` - Engine for rendering month days and logic navigation.
- `events.js` - Dedicated array controller processing adds/updates/deletes.
- `theme.js` - Handles theme injection and persistence.
- `storage.js` - Helper for JSON serialization interacting with `localStorage`.

## 5. Deployment Instructions (Hostinger)
1. Compress the root directory contents (`index.html`, `admin.html`, `/css/`, `/js/`).
2. Log into the Hostinger hPanel.
3. Open File Manager for the target domain.
4. Navigate to `public_html`.
5. Upload and extract the ZIP file.
6. The app will immediately run as it relies purely on static client-side rendering.
