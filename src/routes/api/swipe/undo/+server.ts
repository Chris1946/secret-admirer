import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { undoLastSwipe } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const userId = body?.userId;

		if (!userId) {
			return json({ error: 'User ID is required' }, { status: 400 });
		}

		const result = undoLastSwipe(userId);
		return json(result);
	} catch (err: any) {
		return json({ error: err.message || 'Failed to undo swipe' }, { status: 500 });
	}
};
