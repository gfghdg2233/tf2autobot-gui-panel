import path from 'path';
import dotenv from 'dotenv';
import { notifyDiscordVersionUpdate } from './utils/discordWebhook';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const pkg = require(path.join(process.cwd(), 'package.json'));
const force = process.argv.includes('--force');

notifyDiscordVersionUpdate(pkg.version, { force })
	.then((sent) => {
		if (!sent && !process.env.DISCORD_WEBHOOK_URL?.trim()) {
			console.error('DISCORD_WEBHOOK_URL is not set in .env');
			process.exit(1);
		}

		if (!sent) {
			console.log(`Discord webhook was not sent for v${pkg.version} (already notified or disabled).`);
		}

		process.exit(0);
	})
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
