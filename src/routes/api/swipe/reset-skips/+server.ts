import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resetSkipsForUser } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const userId = body?.userId;

		if (!userId) {
			return json({ error: 'User ID is required' }, { status: 400 });
		}

		const count = resetSkipsForUser(userId);
		return json({ success: true, restoredCount: count });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to reset skips' }, { status: 500 });
	}
};
