import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MASTER_ADMIN_KEY, createAdminSession } from '$lib/server/adminAuth';
import { addAuditLog, parseDevice } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	try {
		const body = await request.json();
		const rawKey = (body?.key || '').trim().toLowerCase();
		const organizerName = (body?.name || '').trim();

		if (rawKey !== MASTER_ADMIN_KEY) {
			return json({ error: 'Invalid admin authorization key' }, { status: 401 });
		}

		if (!organizerName) {
			return json({ error: 'Organizer name is required for audit trail' }, { status: 400 });
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

		// Create server session with token
		const session = createAdminSession(organizerName, ip, userAgent);

		// Record in audit log
		addAuditLog({
			name: session.name,
			email: MASTER_ADMIN_KEY,
			role: 'admin',
			action: 'admin_login',
			details: `Organizer "${session.name}" logged into Admin Dashboard from ${parseDevice(userAgent)}`,
			ip,
			userAgent
		});

		return json({
			success: true,
			token: session.token,
			adminName: session.name
		});
	} catch (err: any) {
		return json({ error: err.message || 'Admin login failed' }, { status: 500 });
	}
};
