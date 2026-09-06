import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getAdminMetrics,
	updateEventSettings,
	approveUserPhoto,
	rejectUserPhoto,
	approveAllPhotos,
	resetAllData,
	addAuditLog
} from '$lib/server/db';
import { extractAdminToken, verifyAdminSession } from '$lib/server/adminAuth';

export const GET: RequestHandler = async ({ request }) => {
	const token = extractAdminToken(request);
	const session = verifyAdminSession(token);
	if (!session) {
		return json({ error: 'Unauthorized: Admin authentication token required' }, { status: 401 });
	}

	const metrics = getAdminMetrics();
	return json({ ...metrics, currentAdmin: session.name });
};

export const POST: RequestHandler = async ({ request }) => {
	const token = extractAdminToken(request);
	const session = verifyAdminSession(token);
	if (!session) {
		return json({ error: 'Unauthorized: Admin authentication token required' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { action, userId, settings } = body;

		if (action === 'approvePhoto' && userId) {
			approveUserPhoto(userId, session.name);
			return json({ success: true });
		}

		if (action === 'rejectPhoto' && userId) {
			rejectUserPhoto(userId, session.name);
			return json({ success: true });
		}

		if (action === 'approveAllPhotos') {
			const count = approveAllPhotos(session.name);
			return json({ success: true, count });
		}

		if (action === 'updateSettings' && settings) {
			const updated = updateEventSettings(settings);
			addAuditLog({
				name: session.name,
				email: session.email,
				role: 'admin',
				action: 'admin_action',
				details: `Updated event settings: signupsPaused=${updated.signupsPaused}, matchesPaused=${updated.matchesPaused}`
			});
			return json({ settings: updated });
		}

		if (action === 'resetAll') {
			resetAllData();
			addAuditLog({
				name: session.name,
				email: session.email,
				role: 'admin',
				action: 'admin_action',
				details: `Reset entire event database`
			});
			return json({ success: true });
		}

		return json({ error: 'Invalid action' }, { status: 400 });
	} catch (err: any) {
		return json({ error: err.message || 'Admin action failed' }, { status: 500 });
	}
};
