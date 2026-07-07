export const THEME_STORAGE_KEY = 'tf2gui-theme';
export const DEFAULT_THEME = 'sourcebans';

export interface ThemeOption {
    id: string;
    label: string;
}

export const THEMES: ThemeOption[] = [
    { id: 'sourcebans', label: 'Console (Default)' },
    { id: 'mann-co', label: 'Mann Co.' },
    { id: 'blu-base', label: 'BLU Base' },
    { id: 'red-fortress', label: 'RED Fortress' },
    { id: 'australium', label: 'Australium Gold' },
    { id: 'neon-grid', label: 'Neon Grid' },
    { id: 'forest-camo', label: 'Forest Camo' },
    { id: 'royal-purple', label: 'Royal Purple' },
    { id: 'ocean-depth', label: 'Ocean Depth' },
    { id: 'crimson-night', label: 'Crimson Night' },
    { id: 'arctic-steel', label: 'Arctic Steel' },
    { id: 'sunset-harvest', label: 'Sunset Harvest' }
];

export function getStoredTheme(): string {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored && THEMES.some((theme) => theme.id === stored)) {
            return stored;
        }
    } catch {
        // localStorage unavailable
    }

    return DEFAULT_THEME;
}

export function applyTheme(themeId: string): void {
    const valid = THEMES.some((theme) => theme.id === themeId) ? themeId : DEFAULT_THEME;
    document.documentElement.setAttribute('data-theme', valid);

    try {
        localStorage.setItem(THEME_STORAGE_KEY, valid);
    } catch {
        // ignore
    }
}

export function initThemeSelector(): void {
    const select = document.getElementById('tf2-theme-select') as HTMLSelectElement | null;
    if (!select) {
        return;
    }

    const current = getStoredTheme();
    applyTheme(current);
    select.value = current;

    select.addEventListener('change', () => {
        applyTheme(select.value);
    });
}

// Apply immediately when imported (base bundle loads on every page)
applyTheme(getStoredTheme());
