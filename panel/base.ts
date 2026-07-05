import './style/app.scss';
import 'bootstrap';
import { initThemeSelector } from './theme';

function highlightActiveNav(): void {
    const path = window.location.pathname.replace(/\/$/, '') || '/';

    document.querySelectorAll<HTMLAnchorElement>('.tf2-sidebar-link[data-nav]').forEach((link) => {
        const href = (link.getAttribute('href') || '/').replace(/\/$/, '') || '/';
        const isActive = href === path || (href !== '/' && path.startsWith(href));

        link.classList.toggle('active', isActive);
    });
}

function initSidebarToggle(): void {
    const toggle = document.getElementById('tf2-sidebar-toggle');
    const sidebar = document.getElementById('tf2-sidebar');
    const shell = document.querySelector('.tf2-shell');

    if (!toggle || !sidebar || !shell) {
        return;
    }

    const mobileQuery = window.matchMedia('(max-width: 991px)');

    const closeSidebar = (): void => {
        shell.classList.remove('sidebar-open');
        toggle.setAttribute('aria-expanded', 'false');
    };

    const openSidebar = (): void => {
        shell.classList.add('sidebar-open');
        toggle.setAttribute('aria-expanded', 'true');
    };

    toggle.addEventListener('click', (event) => {
        event.stopPropagation();

        if (shell.classList.contains('sidebar-open')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    document.addEventListener('click', (event) => {
        if (!mobileQuery.matches || !shell.classList.contains('sidebar-open')) {
            return;
        }

        const target = event.target as Node;
        if (sidebar.contains(target) || toggle.contains(target)) {
            return;
        }

        closeSidebar();
    });

    sidebar.querySelectorAll('.tf2-sidebar-link').forEach((link) => {
        link.addEventListener('click', () => {
            if (mobileQuery.matches) {
                closeSidebar();
            }
        });
    });

    mobileQuery.addEventListener('change', () => {
        if (!mobileQuery.matches) {
            closeSidebar();
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        highlightActiveNav();
        initThemeSelector();
        initSidebarToggle();
    });
} else {
    highlightActiveNav();
    initThemeSelector();
    initSidebarToggle();
}
