import './style/app.scss';
import 'bootstrap';
import { initThemeSelector } from './theme';

function highlightActiveNav(): void {
    const path = window.location.pathname.replace(/\/$/, '') || '/';

    document.querySelectorAll<HTMLAnchorElement>('.tf2-nav-link[data-nav]').forEach((link) => {
        const href = (link.getAttribute('href') || '/').replace(/\/$/, '') || '/';
        const isActive = href === path || (href !== '/' && path.startsWith(href));

        link.classList.toggle('active', isActive);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        highlightActiveNav();
        initThemeSelector();
    });
} else {
    highlightActiveNav();
    initThemeSelector();
}
