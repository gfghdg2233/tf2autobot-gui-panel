const dev = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

function prefix(scope: string | undefined, args: unknown[]): unknown[] {
    return scope ? [`[panel:${scope}]`, ...args] : ['[panel]', ...args];
}

export function createPanelLogger(scope?: string) {
    return {
        debug: (...args: unknown[]) => {
            if (dev) {
                console.debug(...prefix(scope, args));
            }
        },
        warn: (...args: unknown[]) => {
            console.warn(...prefix(scope, args));
        },
        error: (...args: unknown[]) => {
            console.error(...prefix(scope, args));
        }
    };
}

export const log = createPanelLogger();
