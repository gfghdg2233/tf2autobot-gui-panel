export interface DiscordTradePreviewField {
	name: string;
	value: string;
	inline?: boolean;
}

export interface DiscordTradePreview {
	username: string;
	authorName: string;
	authorIcon?: string;
	description: string;
	fields: DiscordTradePreviewField[];
	footer: string;
	accent: 'trade' | 'update';
}

/** Sample layout matching tf2autobot-pricedb trade-summary Discord webhooks */
export const DISCORD_TRADE_PREVIEW_SAMPLE: DiscordTradePreview = {
	username: 'uwu',
	authorName: 'Heisenburger',
	description:
		'**Summary** (offer - countered)\n' +
		'**Asked:** 2.22 ref ([Pro KS Persian Persuader Kit Fabricator](https://backpack.tf))\n' +
		'**Offered:** 2.22 ref ([Refined Metal](https://backpack.tf) x2, [Scrap Metal](https://backpack.tf) x2)\n' +
		'----------\n' +
		'⏱ **Time taken:**\n' +
		'To process offer: 1.5 seconds\n' +
		'To counter: 677 milliseconds\n' +
		'To complete: 15.1 seconds\n\n' +
		'🔍 **Heisenburger\'s info:** [Steam Profile](https://steamcommunity.com) | [backpack.tf](https://backpack.tf) | [rep.tf](https://rep.tf)',
	fields: [
		{
			name: '__Item list__',
			value: '📜 **Item prices**\n• *Pro KS Persian Persuader Kit Fabricator* - 1.77 ref / 2.22 ref (autopriced)'
		},
		{
			name: '__Status__',
			value:
				'🔑 Key rate: 56.55/57.55 ref (PriceDB.IO) | Autokeys: ✅ (buying)\n' +
				'💰 Pure stock: 10 keys, 85.77 refs (79 ref, 15 rec, 16 scrap)\n' +
				'🎒 Total items: 289/500\n' +
				'[View my backpack](https://backpack.tf) | [See my store](https://pricedb.io)'
		}
	],
	footer: '#9210222192 • 76561199106232908 • July 5th 2026, 03:18:26 +0100 • v5.16.6',
	accent: 'trade'
};
