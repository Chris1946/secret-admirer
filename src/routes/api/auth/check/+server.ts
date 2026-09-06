import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserByEmail, getEventSettings, addAuditLog, parseDevice } from '$lib/server/db';
import { MASTER_ADMIN_KEY } from '$lib/server/adminAuth';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	try {
		const body = await request.json();
		const rawEmail = (body?.email || '').trim().toLowerCase();

		if (!rawEmail) {
			return json({ error: 'Email is required' }, { status: 400 });
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

		// 1. Check if email matches the master admin key
		if (rawEmail === MASTER_ADMIN_KEY) {
			return json({
				role: 'admin',
				message: 'Master Admin Key recognized. Please enter organizer name.'
			});
		}

		// 2. Check if student already exists in DB (Returning User)
		const existingUser = getUserByEmail(rawEmail);
		if (existingUser) {
			// Log returning user session
			addAuditLog({
				userId: existingUser.id,
				name: existingUser.name,
				email: existingUser.email,
				role: 'user',
				action: 'login',
				details: `Returning student resumed session from ${parseDevice(userAgent)}`,
				ip,
				userAgent
			});

			return json({
				role: 'returning',
				user: existingUser
			});
		}

		// 3. New User Registration check
		const settings = getEventSettings();
		return json({
			role: 'new',
			email: rawEmail,
			signupsPaused: settings.signupsPaused
		});
	} catch (err: any) {
		return json({ error: err.message || 'Auth check failed' }, { status: 500 });
	}
};
