import './style/app.scss';
import 'bootstrap';
import { initThemeSelector } from './theme';

function highlightActiveNav(): void {
    const path = window.location.pathname.replace(/\/$/, '') || '/';

    document.querySelectorAll<HTMLAnchorElement>('.tf2-sidebar-link[data-nav], .sb-sidebar-link[data-nav]').forEach((link) => {
        const href = (link.getAttribute('href') || '/').replace(/\/$/, '') || '/';
        const isActive = href === path || (href !== '/' && path.startsWith(href));

        link.classList.toggle('active', isActive);
    });
}

function initNavToggle(): void {
    const toggle = document.getElementById('tf2-sidebar-toggle');
    const shell = document.getElementById('tf2-shell');
    const sidebar = document.getElementById('tf2-sidebar');

    if (!toggle || !shell || !sidebar) {
        return;
    }

    const mobileQuery = window.matchMedia('(max-width: 991px)');

    const closeNav = (): void => {
        shell.classList.remove('sidebar-open');
        toggle.setAttribute('aria-expanded', 'false');
    };

    const openNav = (): void => {
        shell.classList.add('sidebar-open');
        toggle.setAttribute('aria-expanded', 'true');
    };

    toggle.addEventListener('click', (event) => {
        event.stopPropagation();

        if (shell.classList.contains('sidebar-open')) {
            closeNav();
        } else {
            openNav();
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

        closeNav();
    });

    sidebar.querySelectorAll('.tf2-sidebar-link').forEach((link) => {
        link.addEventListener('click', () => {
            if (mobileQuery.matches) {
                closeNav();
            }
        });
    });

    mobileQuery.addEventListener('change', () => {
        if (!mobileQuery.matches) {
            closeNav();
        }
    });
}

function initUpdateBadges(): void {
    const panelBadge = document.getElementById('tf2-sidebar-version');
    const botBadge = document.getElementById('tf2-sidebar-bot-version');

    const applyPanel = (updateAvailable: boolean, currentVersion?: string): void => {
        if (!panelBadge) {
            return;
        }

        if (currentVersion) {
            panelBadge.textContent = `Panel v${currentVersion}`;
        }

        panelBadge.classList.toggle('update-available', updateAvailable);
        panelBadge.setAttribute('title', updateAvailable ? 'Panel update available' : 'Panel version');
    };

    const applyBot = (updateAvailable: boolean, currentVersion?: string | null): void => {
        if (!botBadge) {
            return;
        }

        if (currentVersion) {
            botBadge.textContent = `Bot v${currentVersion}`;
        } else if (!botBadge.textContent || botBadge.textContent === 'Bot …') {
            botBadge.textContent = 'Bot —';
        }

        botBadge.classList.toggle('update-available', updateAvailable);
        botBadge.setAttribute('title', updateAvailable ? 'Bot update available' : 'Bot version');
    };

    document.addEventListener('panel-update-status', (event) => {
        const detail = (event as CustomEvent<{ updateAvailable?: boolean; currentVersion?: string }>).detail;
        applyPanel(Boolean(detail?.updateAvailable), detail?.currentVersion);
    });

    document.addEventListener('bot-update-status', (event) => {
        const detail = (event as CustomEvent<{ updateAvailable?: boolean; currentVersion?: string | null }>).detail;
        applyBot(Boolean(detail?.updateAvailable), detail?.currentVersion);
    });

    void fetch('/updates/combined/status')
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { panel?: { updateAvailable?: boolean; currentVersion?: string }; bot?: { updateAvailable?: boolean; currentVersion?: string | null } } | null) => {
            if (!data) {
                return;
            }

            applyPanel(Boolean(data.panel?.updateAvailable), data.panel?.currentVersion);
            applyBot(Boolean(data.bot?.updateAvailable), data.bot?.currentVersion);
        })
        .catch(() => {
            // ignore
        });
}

function initBotStatus(): void {
    const badge = document.getElementById('sb-bot-status');
    if (!badge) {
        return;
    }

    const refresh = (): void => {
        void fetch('/health/bot')
            .then((res) => (res.ok ? res.json() : null))
            .then((data: { bots?: Array<{ name: string }> } | null) => {
                const count = data?.bots?.length ?? 0;
                if (count === 0) {
                    badge.textContent = 'IPC: offline';
                    badge.classList.add('offline');
                    badge.setAttribute('title', 'No bot connected. Start tf2autobot with IPC=true.');
                    return;
                }

                const names = data!.bots!.map((bot) => bot.name).join(', ');
                badge.textContent = count === 1 ? `IPC: ${names}` : `IPC: ${count} bots`;
                badge.classList.remove('offline');
                badge.setAttribute('title', `Connected: ${names}`);
            })
            .catch(() => {
                badge.textContent = 'IPC: unknown';
                badge.classList.add('offline');
            });
    };

    refresh();
    window.setInterval(refresh, 15000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        highlightActiveNav();
        initThemeSelector();
        initNavToggle();
        initUpdateBadges();
        initBotStatus();
    });
} else {
    highlightActiveNav();
    initThemeSelector();
    initNavToggle();
    initUpdateBadges();
    initBotStatus();
}
