import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { registerOrGetUser } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	try {
		const body = await request.json();
		const { name, email, year, passcode } = body;

		if (!name || !email || !year) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		if (year !== '1st Year') {
			return json({ error: 'Only first-year students are allowed to register for Orientation 2026' }, { status: 403 });
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

		const user = registerOrGetUser({
			name,
			email,
			year,
			passcode,
			ip,
			userAgent
		});
		return json({ user });
	} catch (err: any) {
		return json({ error: err.message || 'Registration failed' }, { status: 500 });
	}
};

