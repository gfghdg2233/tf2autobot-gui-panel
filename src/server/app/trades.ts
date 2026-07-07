import getName from '../utils/getName';
import * as data from '../data';
import dayjs from 'dayjs';
import SKU from '@tf2autobot/tf2-sku';
import * as getImage from '../utils/getImage';
import * as profit from './profit';
import SchemaManager from "@tf2autobot/tf2-schema";
import Currency from '@tf2autobot/tf2-currencies';
import { getSteamProfiles } from '../utils/steamProfiles';

interface TradeOfferData {
	id?: string;
	dict?: { our?: Record<string, number>; their?: Record<string, number> };
	prices?: Record<string, { buy?: { keys?: number; metal?: number }; sell?: { keys?: number; metal?: number } }>;
	partner?: string;
	accepted?: boolean;
	handledByUs?: boolean;
	isAccepted?: boolean;
	finishTimestamp?: number;
	value?: { our?: { keys?: number; metal?: number }; their?: { keys?: number; metal?: number } };
}

function formatTradePrice(
	prices: TradeOfferData['prices'],
	sku: string,
	side: 'our' | 'their'
): string {
	if (!prices?.[sku]) {
		return '—';
	}

	const priceSide = side === 'our' ? prices[sku].sell : prices[sku].buy;
	if (!priceSide) {
		return '—';
	}

	return new Currency({
		keys: Number(priceSide.keys || 0),
		metal: Number(priceSide.metal || 0)
	}).toString();
}

/**
 *
 * @param {Number} first index of first trade to be included in results
 * @param {Number} count how many trades to include in results, set to -1 to return all
 * @param {Boolean} descending sort
 * @param {String} search string to search listings for
 * @param {Boolean} acceptedOnly
 * @param schema
 * @param polldata
 */
export async function get(first: number, count: number, descending: boolean, search: string, acceptedOnly: boolean, schema: SchemaManager.Schema, polldata: any) {
    search = search.trim().toLowerCase();
    const profitData = (await profit.get(undefined, undefined, undefined, polldata, true)).tradeProfits;
    let tradeList = Object.keys(polldata?.offerData || {}).map((key) => {
        const ret = polldata.offerData[key] as TradeOfferData;
        ret.id = key;
        return ret;
    });
    tradeList = tradeList.sort((a, b) => {
        let aTime = a.finishTimestamp;
        let bTime = b.finishTimestamp;

        // check for undefined time, sort those at the end
        if ( (!aTime || isNaN(aTime)) && !(!bTime || isNaN(bTime))) {return 1;}
        if ( !(!aTime || isNaN(aTime)) && (!bTime || isNaN(bTime))) {return -1;}
        if ( (!aTime || isNaN(aTime)) && (!bTime || isNaN(bTime))) {return 0;}

        if (descending) {
            bTime = [aTime, aTime = bTime][0];
        }

        return aTime - bTime;
    });
    tradeList = tradeList.filter((offer) => {
        if(!search) {return (offer.isAccepted || !acceptedOnly);}
        let offerSearchResults = false;
        if (Object.prototype.hasOwnProperty.call(offer, 'dict')) {
            offerSearchResults = [].concat(Object.keys(offer.dict.our), Object.keys(offer.dict.their)).some(item => {
                return getName(SKU.fromString(item), schema).toLowerCase().indexOf(search) > -1;
            });
        }
        return (offer.partner?.indexOf(search) > -1 || offerSearchResults) && (offer.isAccepted || !acceptedOnly);
    });
    const tradeCount = tradeList.length;
    tradeList = tradeList.slice(first, count >= 0 ? first + count : undefined);
    const items = {};
    const trades = tradeList.map((offer) => {
        const ret = {
            id: offer.id,
            items: {
                our: [],
                their: []
            },
            profit: Object.prototype.hasOwnProperty.call(profitData, offer.id)?profitData[offer.id]: '',
            partner: offer.partner,
            partnerName: offer.partner,
            partnerProfileUrl: offer.partner ? `https://steamcommunity.com/profiles/${offer.partner}` : '',
            partnerTradeHistoryUrl: offer.partner ? `https://steamcommunity.com/profiles/${offer.partner}/tradehistory/` : '',
            accepted: offer.accepted || ( offer.handledByUs === true && offer.isAccepted === true),
            time: offer.finishTimestamp,
            datetime: dayjs.unix(Math.floor(offer.finishTimestamp/1000)).format('ddd D-M-YYYY HH:mm'),
            value: offer.value
        };

        if (typeof polldata.sent[offer.id] != 'undefined') {
            ret['lastState'] = data.ETradeOfferState[polldata.sent[offer.id]];
        } else if (typeof polldata.received[offer.id] != 'undefined') {
            ret['lastState'] = data.ETradeOfferState[polldata.received[offer.id]];
        }

        if (Object.prototype.hasOwnProperty.call(offer, 'dict') && offer.dict) {
            if (Object.keys(offer.dict.our || {}).length > 0) {
                tradeSide('our');
            }
            if (Object.keys(offer.dict.their || {}).length > 0) {
                tradeSide('their');
            }
        }

        return ret;

        /**
		 * Get items from one side of a trade
		 * @param {'our'|'their'} side
		 */
        function tradeSide(side) {
            Object.keys(offer.dict[side]).forEach((k) => {
                if (!Object.prototype.hasOwnProperty.call(items, k)) {
                    items[k] = createTradeItem(k, schema);
                }
                ret.items[side].push({
                    sku: k,
                    amount: offer.dict[side][k],
                    price: formatTradePrice(offer.prices, k, side)
                });
            });
        }
    });

    const partnerIds = trades.map((trade) => trade.partner).filter(Boolean) as string[];
    const profiles = await getSteamProfiles(partnerIds);

    for (const trade of trades) {
        const profile = profiles[trade.partner];
        if (profile) {
            trade.partnerName = profile.name;
            trade.partnerProfileUrl = profile.profileUrl;
            trade.partnerTradeHistoryUrl = profile.tradeHistoryUrl;
        }
    }

    return {
        trades,
        items,
        tradeCount
    };
};

/**
 * Creates item object
 * @param {String} sku
 * @param schema
 * @return {Object} item object created
 */
function createTradeItem(sku, schema: SchemaManager.Schema) {
    return {
        name: getName(sku, schema),
        style: getImage.getImageStyle(sku, schema)
    };
}
