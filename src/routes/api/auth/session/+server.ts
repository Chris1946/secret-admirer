import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUser } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
	const userId = url.searchParams.get('userId');
	if (!userId) {
		return json({ error: 'User ID missing' }, { status: 400 });
	}

	const user = getUser(userId);
	if (!user) {
		return json({ error: 'User session expired or user not found' }, { status: 404 });
	}

	return json({ user });
};
