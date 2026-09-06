import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateUserProfile, getUser } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
	const userId = url.searchParams.get('userId');
	if (!userId) {
		return json({ error: 'Missing userId' }, { status: 400 });
	}

	const user = getUser(userId);
	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	return json({ user });
};

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	try {
		const body = await request.json();
		const { userId, department, bio, photo, prompts, instagram } = body;

		if (!userId || !department) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		let ip = '127.0.0.1';
		try {
			ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
				request.headers.get('x-real-ip') ||
				getClientAddress() ||
				'127.0.0.1';
		} catch {
			// fallback
		}

		const userAgent = request.headers.get('user-agent') || undefined;

		const updated = updateUserProfile(userId, {
			department,
			bio,
			photo,
			prompts: prompts || [],
			instagram,
			ip,
			userAgent
		});

		if (!updated) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		return json({ user: updated });
	} catch (err: any) {
		return json({ error: err.message || 'Profile update failed' }, { status: 500 });
	}
};


