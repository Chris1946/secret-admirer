import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { blockUser } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { blockerId, blockedId } = body;

		if (!blockerId || !blockedId) {
			return json({ error: 'Missing parameters' }, { status: 400 });
		}

		blockUser(blockerId, blockedId);
		return json({ success: true });
	} catch (err: any) {
		return json({ error: err.message || 'Action failed' }, { status: 500 });
	}
};
