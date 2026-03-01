# 📅 Professional Office Calendar — Enterprise Admin Suite

A premium, high-performance calendar and scheduling system built for enterprise office management. Features a dual-interface architecture for regular employees and administrators, with advanced real-time synchronization.

---

## �️ Tech Stack

| Layer | Technology |
|---|---|
| **Core** | HTML5, JavaScript (ES6 Modules) |
| **Styling** | Vanilla CSS3 (Custom Design System) |
| **Persistence** | Browser LocalStorage API |
| **Icons** | Font Awesome 6 (Pro Icons) |
| **Fonts** | Google Fonts (Inter) |
| **Synchronization** | Cross-Tab Storage Event Listener |

---

## 📂 Project Structure

```text
calendar-project/
├── index.html              # Main User Calendar Interface
├── admin.html              # Secure Admin Management Portal
├── README.md               # Overview & Setup Guide (this file)
├── WORKFLOW.md             # Technical Architecture & Logic
├── .env                    # Local Credentials (gitignored)
├── .env.example            # Environment variables template
├── .gitignore              # Version Control exclusions
│
├── css/
│   ├── style.css           # Custom CSS for User Interface
│   └── admin.css           # Premium CSS for Admin Dashboard
│
└── js/
    ├── app.js              # User Calendar Controller
    ├── admin.js            # Admin Dashboard logic
    ├── calendar.js         # Multi-view rendering engine
    ├── events.js           # Multi-source Event Manager
    ├── holidays.js         # Official Holiday processing
    ├── storage.js          # LocalStorage data persistence
    └── theme.js            # Smart Light/Dark theme manager
```

---

## � Getting Started

### 1. Project Setup

Since this is a clean, static web application, no complex installation is required.

1. Download or clone the repository.
2. Ensure you have the following files in your root:
   ```bash
   cp .env.example .env
   ```
3. Edit the `.env` file to set your local admin credentials.

### 2. Run Locally

For the best experience (and to allow ES6 Modules to function), use a local server:

- **VS Code**: Install "Live Server" extension and click **Go Live**.
- **Python**: Run `python -m http.server 8000` in the root.
- **Node.js**: Run `npx serve .`

Open [http://localhost:5500](http://localhost:5500) (if using Live Server).

---

## 📄 Pages & Routes

| Route | Page | Description |
|---|---|---|
| `/index.html` | **Main Calendar** | Month, Week, Day, and Year views with personal event support. |
| `/admin.html` | **Admin Portal** | Full CRUD for Company Meetings, Holidays, and Enterprise Events. |

---

## 🔄 Admin Synchronization Workflow

The suite implements a sophisticated **Cross-Tab Synchronization** mechanism:

1. **Update**: Admin saves a new meeting/holiday in the `admin.html` tab.
2. **Signal**: The system sets a `calendar_sync_trigger` in `localStorage`.
3. **Notify**: Every other open tab (like `index.html`) detects the change instantly.
4. **Refresh**: The User Calendar re-renders automatically with the new data—**No page refresh required.**

---

## � Requirements

- **Browser**: Modern browser (Chrome 80+, Firefox 75+, Edge, Safari).
- **Storage**: Browser must have `localStorage` enabled.
- **Local Server**: Required for JavaScript Module (`type="module"`) support.

---

## � Credentials (Default)

- **Username**: `admin`
- **Password**: `Admin@123`
- *(Change these values in your `.env` file before production use)*

---

*Built with high-performance Vanilla JS and Modern CSS Architecture.*
