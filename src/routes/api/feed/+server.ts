import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFeedForUser, getFeedStatsForUser } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
	const userId = url.searchParams.get('userId');
	if (!userId) {
		return json({ profiles: [], skipsCount: 0 });
	}

	const profiles = getFeedForUser(userId);
	const stats = getFeedStatsForUser(userId);
	return json({ profiles, skipsCount: stats.skipsCount });
};
