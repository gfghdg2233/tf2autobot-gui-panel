export interface InventorySnapshot {
	tradable: Record<string, string[]>;
	nonTradable?: Record<string, string[]>;
	updatedAt?: number;
}

export interface UnlistedItem {
	sku: string;
	name: string;
	count: number;
	style: {
		quality_color?: string;
		border_color?: string;
		craftable?: boolean;
		image_small?: string;
		image_large?: string;
		effect?: string;
		killstreak?: string;
	};
	statslink?: string;
	recent: boolean;
	bptfPrice?: {
		buy?: { keys?: number; metal?: number; string?: string };
		sell?: { keys?: number; metal?: number; string?: string };
		status?: string;
	};
}
