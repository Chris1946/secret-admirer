import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addReport, getReports, resolveReport, forceUnmatch } from '$lib/server/db';
import { extractAdminToken, verifyAdminSession } from '$lib/server/adminAuth';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { reporterId, reportedUserId, reason } = body;

		if (!reporterId || !reportedUserId || !reason) {
			return json({ error: 'Missing required report fields' }, { status: 400 });
		}

		const report = addReport({ reporterId, reportedUserId, reason });
		return json({ success: true, report });
	} catch (err: any) {
		return json({ error: err.message || 'Report submission failed' }, { status: 500 });
	}
};

export const GET: RequestHandler = async ({ request }) => {
	const token = extractAdminToken(request);
	const session = verifyAdminSession(token);
	if (!session) {
		return json({ error: 'Unauthorized: Admin privileges required' }, { status: 401 });
	}

	const reports = getReports();
	return json({ reports });
};

export const PATCH: RequestHandler = async ({ request }) => {
	const token = extractAdminToken(request);
	const session = verifyAdminSession(token);
	if (!session) {
		return json({ error: 'Unauthorized: Admin privileges required' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { reportId, action, user1Id, user2Id } = body;

		if (action === 'forceUnmatch' && user1Id && user2Id) {
			forceUnmatch(user1Id, user2Id, session.name);
			return json({ success: true });
		}

		if (reportId && (action === 'dismiss' || action === 'unmatch' || action === 'ban')) {
			const report = resolveReport(reportId, action, session.name);
			return json({ success: true, report });
		}

		return json({ error: 'Invalid report action' }, { status: 400 });
	} catch (err: any) {
		return json({ error: err.message || 'Report resolution failed' }, { status: 500 });
	}
};
