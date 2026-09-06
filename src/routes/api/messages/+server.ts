import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getMessagesBetween, saveMessage } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
	const userId = url.searchParams.get('userId');
	const otherUserId = url.searchParams.get('otherUserId');

	if (!userId || !otherUserId) {
		return json({ messages: [] });
	}

	const messages = getMessagesBetween(userId, otherUserId);
	return json({ messages });
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { fromUserId, toUserId, text } = body;

		if (!fromUserId || !toUserId || !text || !text.trim()) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		const msg = saveMessage(fromUserId, toUserId, text.trim());
		return json({ message: msg });
	} catch (err: any) {
		return json({ error: err.message || 'Send message failed' }, { status: 500 });
	}
};
