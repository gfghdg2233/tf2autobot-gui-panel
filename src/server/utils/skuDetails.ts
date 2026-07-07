import SKU from '@tf2autobot/tf2-sku';

const SHEEN_NAMES: Record<number, string> = {
	1: 'Team Shine',
	2: 'Deadly Daffodil',
	3: 'Manndarin',
	4: 'Mean Green',
	5: 'Agonizing Emerald',
	6: 'Villainous Violet',
	7: 'Hot Rod'
};

const KILLSTREAKER_NAMES: Record<number, string> = {
	2002: 'Fire Horns',
	2003: 'Cerebral Discharge',
	2004: 'Tornado',
	2005: 'Flames',
	2006: 'Singularity',
	2007: 'Incinerator',
	2008: 'Hypno-Beam'
};

const KILLSTREAK_TIER_LABELS = ['', 'KS', 'Spec KS', 'Pro KS'];

export interface SkuDetails {
	killstreak: string | null;
	sheen: string | null;
	killstreaker: string | null;
}

export function getSkuDetails(sku: string): SkuDetails {
	const parsed = SKU.fromString(sku);
	const sheenMatch = sku.match(/;ks-(\d+)/i);
	const killstreakerMatch = sku.match(/;ke-(\d+)/i);
	const tier = parsed.killstreak || 0;

	return {
		killstreak: tier > 0 ? KILLSTREAK_TIER_LABELS[tier] || `KS ${tier}` : null,
		sheen: sheenMatch ? SHEEN_NAMES[Number(sheenMatch[1])] || `Sheen ${sheenMatch[1]}` : null,
		killstreaker: killstreakerMatch
			? KILLSTREAKER_NAMES[Number(killstreakerMatch[1])] || `Effect ${killstreakerMatch[1]}`
			: null
	};
}
