import fs from 'fs/promises';
import path from 'path';
import { ListingQueueItem } from '../../common/types/queue';

const QUEUE_DIR = path.join(process.cwd(), 'data', 'listing-queue');

function queuePath(botId: string): string {
	const safeId = botId.replace(/[^a-zA-Z0-9._-]/g, '_');
	return path.join(QUEUE_DIR, `${safeId}.json`);
}

async function ensureQueueDir(): Promise<void> {
	await fs.mkdir(QUEUE_DIR, { recursive: true });
}

export async function getListingQueue(botId: string): Promise<ListingQueueItem[]> {
	await ensureQueueDir();

	try {
		const raw = await fs.readFile(queuePath(botId), 'utf8');
		const parsed = JSON.parse(raw);

		return Array.isArray(parsed) ? parsed : [];
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
			return [];
		}

		throw err;
	}
}

export async function addListingQueueItem(botId: string, item: ListingQueueItem): Promise<ListingQueueItem[]> {
	await ensureQueueDir();

	const queue = await getListingQueue(botId);
	const existingIndex = queue.findIndex((entry) => entry.sku === item.sku);

	if (existingIndex >= 0) {
		queue[existingIndex] = {
			...queue[existingIndex],
			...item,
			addedAt: item.addedAt || Date.now()
		};
	} else {
		queue.push({
			...item,
			addedAt: item.addedAt || Date.now()
		});
	}

	queue.sort((a, b) => a.name.localeCompare(b.name));
	await fs.writeFile(queuePath(botId), JSON.stringify(queue, null, 2));
	return queue;
}

export async function removeListingQueueItem(botId: string, sku: string): Promise<ListingQueueItem[]> {
	await ensureQueueDir();

	const queue = (await getListingQueue(botId)).filter((entry) => entry.sku !== sku);
	await fs.writeFile(queuePath(botId), JSON.stringify(queue, null, 2));
	return queue;
}
