import * as data from '../data';
import SKU from '@tf2autobot/tf2-sku';
import { Item } from '../types/TeamFortress2';
import SchemaManager from "@tf2autobot/tf2-schema";

function encodeSegment(value: string | number): string {
    return encodeURIComponent(String(value));
}

/**
 *
 * @param {(string|Object)} item - SKU or item object
 * @param schema
 * @return {string} - Full bptf stats link
 */
export default function getStatsLink(item: Item | string, schema: SchemaManager.Schema): string {
    if (typeof item === 'string') {
        item = SKU.fromString(item);
    }

    const schemaItem = schema.getItemByDefindex(item.defindex);
    if (!schemaItem) {
        return null;
    }

    let namePart = '';

    if (item.festive) {
        namePart += 'Festivized ';
    }

    if (item.killstreak > 0) {
        namePart += `${data.killstreak[item.killstreak]} `;
    }

    if (item.paintkit) {
        namePart += `${data.skin[item.paintkit]} `;
    }

    if (item.australium) {
        namePart += 'Australium ';
    }

    namePart += schemaItem.item_name;

    if (item.wear) {
        namePart += ` (${data.wear[item.wear]})`;
    }

    const segments = [
        data.quality[item.quality],
        namePart.trim(),
        item.tradable === false ? 'Non-Tradable' : 'Tradable',
        item.craftable ? 'Craftable' : 'Non-Craftable'
    ];

    if (item.effect) {
        segments.push(String(item.effect));
    } else if (item.target && item.killstreak) {
        segments.push(`${item.killstreak}-${item.target}`);
    }

    return `https://backpack.tf/stats/${segments.map(encodeSegment).join('/')}`;
}
