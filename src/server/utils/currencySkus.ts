const CURRENCY_SKUS = new Set([
	'5021;6',
	'5002;6',
	'5000;6',
	'5001;6'
]);

export function isCurrencySku(sku: string): boolean {
	if (CURRENCY_SKUS.has(sku)) {
		return true;
	}

	const defindex = Number(sku.split(';')[0]);
	return defindex >= 5000 && defindex <= 5021;
}
