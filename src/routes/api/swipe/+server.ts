import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { recordSwipe } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { fromUserId, toUserId, action } = body;

		if (!fromUserId || !toUserId || !action) {
			return json({ error: 'Missing required parameters' }, { status: 400 });
		}

		const result = recordSwipe(fromUserId, toUserId, action);
		return json(result);
	} catch (err: any) {
		return json({ error: err.message || 'Swipe failed' }, { status: 500 });
	}
};
