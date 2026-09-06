import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { acceptChatRequest, declineChatRequest } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { action, matchId, userId } = body;

		if (!action || !matchId || !userId) {
			return json({ error: 'Missing required parameters (action, matchId, userId)' }, { status: 400 });
		}

		if (action === 'accept') {
			const result = acceptChatRequest(userId, matchId);
			if (!result.success) {
				return json({ error: result.error || 'Failed to accept chat request' }, { status: 400 });
			}
			return json({ success: true, match: result.match, matchedUser: result.matchedUser });
		} else if (action === 'decline') {
			const result = declineChatRequest(userId, matchId);
			if (!result.success) {
				return json({ error: result.error || 'Failed to decline chat request' }, { status: 400 });
			}
			return json({ success: true });
		}

		return json({ error: 'Invalid action' }, { status: 400 });
	} catch (err: any) {
		return json({ error: err.message || 'Server error' }, { status: 500 });
	}
};
