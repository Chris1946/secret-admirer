import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminMetrics } from '$lib/server/db';

export const GET: RequestHandler = async () => {
	const metrics = getAdminMetrics();

	// Completely stripped of all personal identifying information (PII)
	// Safe to display on public auditorium projector / large screens
	return json({
		totalSignups: metrics.totalSignups,
		totalMatches: metrics.totalMatches,
		totalMessages: metrics.totalMessages,
		deptStats: metrics.deptStats,
		announcement: metrics.settings.announcement,
		signupsPaused: metrics.settings.signupsPaused,
		timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
	});
};
