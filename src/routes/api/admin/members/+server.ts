import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRegisteredUsersList, removeUser } from '$lib/server/db';
import { extractAdminToken, verifyAdminSession } from '$lib/server/adminAuth';

// GET all registered members (admin only)
export const GET: RequestHandler = async ({ request }) => {
	const token = extractAdminToken(request);
	const session = verifyAdminSession(token);
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	const members = getRegisteredUsersList();
	return json({ members });
};

// DELETE a user (admin only)
export const DELETE: RequestHandler = async ({ request }) => {
	const token = extractAdminToken(request);
	const session = verifyAdminSession(token);
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	let body: { userId?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const { userId } = body;
	if (!userId) {
		return json({ error: 'userId is required' }, { status: 400 });
	}

	const success = removeUser(userId, session.name);
	if (!success) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	return json({ success: true, message: `User ${userId} removed successfully` });
};
