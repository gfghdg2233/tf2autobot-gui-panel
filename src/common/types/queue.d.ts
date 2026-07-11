export interface ListingQueueItem {
	sku: string;
	name: string;
	count?: number;
	reason: string;
	addedAt: number;
	style?: Record<string, unknown>;
	statslink?: string;
	skuDetails?: {
		killstreak: string | null;
		sheen: string | null;
		killstreaker: string | null;
	};
}
