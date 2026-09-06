import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getMatchesForUser } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
	const userId = url.searchParams.get('userId');
	if (!userId) {
		return json({ matches: [], incomingRequests: [], outgoingRequests: [] });
	}

	const result = getMatchesForUser(userId);
	return json({
		matches: result.matches,
		incomingRequests: result.incomingRequests,
		outgoingRequests: result.outgoingRequests
	});
};
