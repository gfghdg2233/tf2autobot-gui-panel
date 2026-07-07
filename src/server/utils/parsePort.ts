export function parsePort(raw: string | undefined, fallback: number, name: string): number {
	if (raw === undefined || raw.trim() === '') {
		return fallback;
	}

	const port = Number(raw);
	if (!Number.isInteger(port) || port < 0 || port > 65535) {
		console.warn(`Invalid ${name}="${raw}", using ${fallback}`);
		return fallback;
	}

	return port;
}
