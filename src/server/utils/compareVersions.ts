/** Compare semver-like strings (e.g. 3.5.2 vs v3.5.3). Returns 1 if a>b, -1 if a<b, 0 if equal. */
export function compareVersions(a: string, b: string): number {
    const parse = (value: string): number[] =>
        value.replace(/^v/i, '').split('.').map(part => {
            const num = parseInt(part, 10);
            return Number.isNaN(num) ? 0 : num;
        });

    const left = parse(a);
    const right = parse(b);
    const length = Math.max(left.length, right.length);

    for (let i = 0; i < length; i++) {
        const diff = (left[i] || 0) - (right[i] || 0);
        if (diff !== 0) {
            return diff > 0 ? 1 : -1;
        }
    }

    return 0;
}
