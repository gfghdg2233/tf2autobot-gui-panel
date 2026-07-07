export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

function resolveMinLevel(): LogLevel {
    const raw = (process.env.LOG_LEVEL || '').toLowerCase();

    if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') {
        return raw;
    }

    return process.env.NODE_ENV === 'production' ? 'info' : 'info';
}

const minLevel = resolveMinLevel();

function shouldLog(level: LogLevel): boolean {
    return LEVEL_RANK[level] >= LEVEL_RANK[minLevel];
}

export interface Logger {
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
}

export function createLogger(scope: string): Logger {
    const prefix = `[${scope}]`;

    return {
        debug: (...args: unknown[]) => {
            if (shouldLog('debug')) {
                console.debug(prefix, ...args);
            }
        },
        info: (...args: unknown[]) => {
            if (shouldLog('info')) {
                console.log(prefix, ...args);
            }
        },
        warn: (...args: unknown[]) => {
            if (shouldLog('warn')) {
                console.warn(prefix, ...args);
            }
        },
        error: (...args: unknown[]) => {
            if (shouldLog('error')) {
                console.error(prefix, ...args);
            }
        }
    };
}
