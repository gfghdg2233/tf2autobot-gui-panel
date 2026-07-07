import { apiRequest } from './apiRequest';

interface SteamPlayerSummary {
	steamid: string;
	personaname?: string;
	profileurl?: string;
}

interface SteamPlayerResponse {
	response?: {
		players?: SteamPlayerSummary[];
	};
}

export interface SteamProfile {
	name: string;
	profileUrl: string;
	tradeHistoryUrl: string;
}

export async function getSteamProfiles(steamIds: string[]): Promise<Record<string, SteamProfile>> {
	const apiKey = process.env.API_KEY;
	const uniqueIds = Array.from(new Set(steamIds.filter(Boolean)));

	if (!apiKey || uniqueIds.length === 0) {
		return {};
	}

	const profiles: Record<string, SteamProfile> = {};

	for (let index = 0; index < uniqueIds.length; index += 100) {
		const chunk = uniqueIds.slice(index, index + 100);

		try {
			const data = await apiRequest<SteamPlayerResponse>(
				'GET',
				'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/',
				{
					key: apiKey,
					steamids: chunk.join(',')
				}
			);

			for (const player of data.response?.players ?? []) {
				if (!player.steamid) {
					continue;
				}

				const profileUrl = player.profileurl || `https://steamcommunity.com/profiles/${player.steamid}`;
				profiles[player.steamid] = {
					name: player.personaname || player.steamid,
					profileUrl,
					tradeHistoryUrl: `${profileUrl.replace(/\/$/, '')}/tradehistory/`
				};
			}
		} catch (err) {
			console.error('Failed to fetch Steam profile names:', err);
		}
	}

	return profiles;
}
