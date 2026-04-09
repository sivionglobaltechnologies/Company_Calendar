// config.js
// Provides a small helper to build API URLs from a configurable base.

function readMeta() {
    try {
        const m = document.querySelector('meta[name="api-base"]');
        return m && m.content ? m.content.trim() : '';
    } catch (e) {
        return '';
    }
}

export function getApiBase() {
    if (typeof window !== 'undefined' && window.__API_BASE__ !== undefined) {
        return String(window.__API_BASE__ || '').trim();
    }
    return readMeta() || '';
}

export function buildApiUrl(path) {
    const base = getApiBase().replace(/\/$/, '');
    if (!path) return base;
    if (path.startsWith('/')) {
        return base ? `${base}${path}` : path;
    }
    return base ? `${base}/${path}` : path;
}

export default { getApiBase, buildApiUrl };
