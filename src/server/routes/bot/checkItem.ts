import {PricelistItem} from "../../../common/types/pricelist";
import {Response} from "express";
import { prepareItemForSave } from '../../utils/botItemResponse';

export function checkItem(item: PricelistItem, res: Response | undefined) {
	prepareItemForSave(item);

	if (!item.autoprice) {
		if (item.sell.keys < item.buy.keys && item.intent != 0) {
			res?.json('The sell price must be higher than the buy price');
			return true;
		}

		if (item.sell.keys === item.buy.keys && item.sell.metal <= item.buy.metal && item.intent != 0) {
			res?.json('The sell price must be higher than the buy price');
			return true;
		}
	}

	return false;
}
