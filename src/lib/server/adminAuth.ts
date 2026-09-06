import crypto from 'node:crypto';

// The pre-generated Master Admin Key
// Configurable via env ADMIN_KEY, default is randomized prefix format to prevent collision with student IDs
export const MASTER_ADMIN_KEY = (process.env.ADMIN_KEY || 'admin-x7k2m9@tkmce.ac.in').trim().toLowerCase();

interface AdminSession {
	token: string;
	name: string;
	email: string;
	ip: string;
	userAgent?: string;
	createdAt: number;
	expiresAt: number;
}

// In-memory active admin sessions
const activeAdminSessions = new Map<string, AdminSession>();

// Sessions last 12 hours
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function createAdminSession(name: string, ip: string, userAgent?: string): AdminSession {
	const token = 'adm_' + crypto.randomBytes(24).toString('hex');
	const session: AdminSession = {
		token,
		name: name.trim() || 'Admin Organizer',
		email: MASTER_ADMIN_KEY,
		ip,
		userAgent,
		createdAt: Date.now(),
		expiresAt: Date.now() + SESSION_TTL_MS
	};

	activeAdminSessions.set(token, session);
	return session;
}

export function verifyAdminSession(token: string | null | undefined): AdminSession | null {
	if (!token) return null;
	const cleanToken = token.replace('Bearer ', '').trim();
	const session = activeAdminSessions.get(cleanToken);
	if (!session) return null;

	if (Date.now() > session.expiresAt) {
		activeAdminSessions.delete(cleanToken);
		return null;
	}

	return session;
}

export function revokeAdminSession(token: string) {
	const cleanToken = token.replace('Bearer ', '').trim();
	activeAdminSessions.delete(cleanToken);
}

export function extractAdminToken(request: Request): string | null {
	const authHeader = request.headers.get('authorization');
	if (authHeader && authHeader.startsWith('Bearer ')) {
		return authHeader.substring(7).trim();
	}
	const customHeader = request.headers.get('x-admin-token');
	if (customHeader) {
		return customHeader.trim();
	}
	return null;
}
