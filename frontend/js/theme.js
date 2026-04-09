// theme.js
// Handles Light / Dark Mode Toggle

const THEME_KEY = 'calendar_theme';

export const themeManager = {
    init: () => {
        const savedTheme = localStorage.getItem(THEME_KEY);
        const toggleBtn = document.getElementById('theme-toggle');

        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
            if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
            if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    },

    toggle: () => {
        const isDark = document.body.classList.contains('dark-mode');
        const toggleBtn = document.getElementById('theme-toggle');

        if (isDark) {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
            localStorage.setItem(THEME_KEY, 'light');
            if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        } else {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
            localStorage.setItem(THEME_KEY, 'dark');
            if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        }
    }
};
