import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuditLogs, addAuditLog, clearAuditLogs, parseDevice, getRegisteredUsersList } from '$lib/server/db';
import { extractAdminToken, verifyAdminSession } from '$lib/server/adminAuth';

export const GET: RequestHandler = async ({ request }) => {
	const token = extractAdminToken(request);
	const session = verifyAdminSession(token);
	if (!session) {
		return json({ error: 'Unauthorized: Admin authentication token required' }, { status: 401 });
	}

	const logs = getAuditLogs();
	const registeredUsers = getRegisteredUsersList();
	return json({ logs, registeredUsers });
};

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const token = extractAdminToken(request);
	const session = verifyAdminSession(token);
	if (!session) {
		return json({ error: 'Unauthorized: Admin authentication token required' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { action, details } = body;

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

		if (action === 'admin_action') {
			const record = addAuditLog({
				name: session.name,
				email: session.email,
				role: 'admin',
				action: 'admin_action',
				details: details || `Performed action from ${parseDevice(userAgent)}`,
				ip,
				userAgent
			});
			return json({ success: true, log: record });
		}

		if (action === 'clear') {
			clearAuditLogs();
			addAuditLog({
				name: session.name,
				email: session.email,
				role: 'admin',
				action: 'admin_action',
				details: `Cleared all audit log entries`,
				ip,
				userAgent
			});
			return json({ success: true });
		}

		return json({ error: 'Unknown action' }, { status: 400 });
	} catch (err: any) {
		return json({ error: err.message || 'Log action failed' }, { status: 500 });
	}
};
