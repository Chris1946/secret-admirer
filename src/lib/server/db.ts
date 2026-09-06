import fs from 'node:fs';
import path from 'node:path';

export interface UserRecord {
	id: string;
	name: string;
	email: string;
	year: string;
	department: string;
	bio?: string;
	photo: string | null;
	photoGradient: string;
	photoInitial: string;
	prompts: { question: string; answer: string }[];
	instagram?: string;
	approved: boolean;
	createdAt: string;
}

export interface SwipeRecord {
	fromUserId: string;
	toUserId: string;
	action: 'accept' | 'skip';
	timestamp: string;
}

export interface MatchRecord {
	id: string;
	user1Id: string;
	user2Id: string;
	status?: 'pending' | 'accepted' | 'declined';
	requestedBy?: string;
	createdAt: string;
	acceptedAt?: string;
}

export interface MessageRecord {
	id: string;
	fromUserId: string;
	toUserId: string;
	text: string;
	timestamp: string;
}

export interface BlockRecord {
	blockerId: string;
	blockedId: string;
}

export interface EventSettingsRecord {
	signupsPaused: boolean;
	matchesPaused: boolean;
	announcement: string;
	autoApprovePhotos: boolean;
}

export interface AccessLogRecord {
	id: string;
	userId?: string;
	name: string;
	email: string;
	role: 'admin' | 'user';
	action: 'login' | 'register' | 'admin_login' | 'admin_action' | 'profile_update';
	details?: string;
	ip?: string;
	device?: string;
	userAgent?: string;
	timestamp: string;
}

export interface ReportRecord {
	id: string;
	reporterId: string;
	reporterName: string;
	reportedUserId: string;
	reportedUserName: string;
	reportedUserEmail: string;
	reason: string;
	timestamp: string;
	status: 'pending' | 'resolved' | 'dismissed';
	adminNotes?: string;
}

export interface CommunityPost {
	id: string;
	userId: string;
	department: string;
	initial: string;
	photoGradient: string;
	text: string;
	mood: string;
	vibeCount: number;
	vibers: string[];
	createdAt: string;
}

interface DatabaseSchema {
	users: Record<string, UserRecord>;
	swipes: SwipeRecord[];
	matches: MatchRecord[];
	messages: MessageRecord[];
	blocks: BlockRecord[];
	settings: EventSettingsRecord;
	logs: AccessLogRecord[];
	reports: ReportRecord[];
	communityPosts: CommunityPost[];
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'event_db.json');

const GRADIENTS = [
	'linear-gradient(135deg, #ff3d7f, #c850c0)',
	'linear-gradient(135deg, #7c3aed, #4f46e5)',
	'linear-gradient(135deg, #00e5a0, #00b4d8)',
	'linear-gradient(135deg, #ffa502, #ff6348)',
	'linear-gradient(135deg, #c850c0, #4f46e5)',
	'linear-gradient(135deg, #ff6b6b, #ee5a24)'
];

function getRandomGradient(): string {
	return GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
}

export function parseDevice(userAgent?: string): string {
	if (!userAgent) return 'Web Client';
	const ua = userAgent.toLowerCase();
	let device = 'Desktop';
	if (ua.includes('iphone')) device = 'iPhone';
	else if (ua.includes('ipad')) device = 'iPad';
	else if (ua.includes('android')) device = 'Android Phone';
	else if (ua.includes('mobile')) device = 'Mobile Browser';
	else if (ua.includes('macintosh') || ua.includes('mac os')) device = 'Mac';
	else if (ua.includes('windows')) device = 'Windows PC';
	else if (ua.includes('linux')) device = 'Linux PC';

	let browser = '';
	if (ua.includes('edg')) browser = 'Edge';
	else if (ua.includes('chrome')) browser = 'Chrome';
	else if (ua.includes('safari')) browser = 'Safari';
	else if (ua.includes('firefox')) browser = 'Firefox';

	return browser ? `${device} • ${browser}` : device;
}

function getDefaultState(): DatabaseSchema {
	return {
		users: {},
		swipes: [],
		matches: [],
		messages: [],
		blocks: [],
		settings: {
			signupsPaused: false,
			matchesPaused: false,
			announcement: 'Welcome to TKMCE Orientation 2026! 🎓 1st Years Only',
			autoApprovePhotos: true
		},
		logs: [],
		reports: [],
		communityPosts: []
	};
}

let memoryDb: DatabaseSchema = getDefaultState();

function loadDb() {
	try {
		if (fs.existsSync(DB_FILE)) {
			const content = fs.readFileSync(DB_FILE, 'utf-8');
			memoryDb = JSON.parse(content);
			if (!memoryDb.logs) memoryDb.logs = [];
			if (!memoryDb.reports) memoryDb.reports = [];
			if (!memoryDb.communityPosts) memoryDb.communityPosts = [];
		} else {
			saveDb();
		}
	} catch {
		memoryDb = getDefaultState();
	}
}

function saveDb() {
	try {
		if (!fs.existsSync(DB_DIR)) {
			fs.mkdirSync(DB_DIR, { recursive: true });
		}
		fs.writeFileSync(DB_FILE, JSON.stringify(memoryDb, null, 2), 'utf-8');
	} catch (err) {
		console.error('Failed to save DB:', err);
	}
}

// Initial load
loadDb();

export function addAuditLog(entry: {
	userId?: string;
	name: string;
	email: string;
	role: 'admin' | 'user';
	action: 'login' | 'register' | 'admin_login' | 'admin_action' | 'profile_update';
	details?: string;
	ip?: string;
	userAgent?: string;
	device?: string;
}): AccessLogRecord {
	loadDb();
	const record: AccessLogRecord = {
		id: 'log_' + Math.random().toString(36).substring(2, 9),
		userId: entry.userId,
		name: entry.name,
		email: entry.email,
		role: entry.role,
		action: entry.action,
		details: entry.details,
		ip: entry.ip || '127.0.0.1',
		userAgent: entry.userAgent,
		device: entry.device || parseDevice(entry.userAgent),
		timestamp: new Date().toISOString()
	};

	if (!memoryDb.logs) memoryDb.logs = [];
	memoryDb.logs.unshift(record);
	if (memoryDb.logs.length > 500) {
		memoryDb.logs = memoryDb.logs.slice(0, 500);
	}
	saveDb();
	return record;
}

export function getAuditLogs(): AccessLogRecord[] {
	loadDb();
	return memoryDb.logs || [];
}

export function clearAuditLogs() {
	loadDb();
	memoryDb.logs = [];
	saveDb();
}

export function getUserByEmail(email: string): UserRecord | null {
	loadDb();
	const cleanEmail = email.trim().toLowerCase();
	return Object.values(memoryDb.users).find((u) => u.email.toLowerCase() === cleanEmail) || null;
}

export function registerOrGetUser(params: {
	name: string;
	email: string;
	year: string;
	passcode?: string;
	ip?: string;
	userAgent?: string;
}): UserRecord {
	loadDb();
	const cleanEmail = params.email.trim().toLowerCase();

	// Check if user already exists with this email (Returning User)
	const existing = Object.values(memoryDb.users).find((u) => u.email === cleanEmail);
	if (existing) {
		if (params.name && params.name.trim().length > 0) {
			existing.name = params.name.trim();
		}
		if (params.year) {
			existing.year = params.year;
		}
		saveDb();

		addAuditLog({
			userId: existing.id,
			name: existing.name,
			email: existing.email,
			role: 'user',
			action: 'login',
			details: `Returning student resumed session from ${parseDevice(params.userAgent)} (${existing.department || 'Profile in progress'})`,
			ip: params.ip,
			userAgent: params.userAgent
		});

		return existing;
	}

	// For brand new registration: check kill-switch
	if (memoryDb.settings.signupsPaused) {
		throw new Error('New signups are currently paused by event coordinators');
	}

	const id = 'usr_' + Math.random().toString(36).substring(2, 9);
	const name = params.name.trim();
	const initial = name.charAt(0).toUpperCase() || 'U';

	const user: UserRecord = {
		id,
		name,
		email: cleanEmail,
		year: params.year,
		department: '',
		bio: '',
		photo: null,
		photoGradient: getRandomGradient(),
		photoInitial: initial,
		prompts: [],
		approved: memoryDb.settings.autoApprovePhotos,
		createdAt: new Date().toISOString()
	};

	memoryDb.users[id] = user;
	saveDb();

	addAuditLog({
		userId: user.id,
		name: user.name,
		email: user.email,
		role: 'user',
		action: 'register',
		details: `Registered 1st-year student from ${parseDevice(params.userAgent)}`,
		ip: params.ip,
		userAgent: params.userAgent
	});

	return user;
}

export function updateUserProfile(
	userId: string,
	data: {
		department: string;
		bio?: string;
		photo: string | null;
		prompts: { question: string; answer: string }[];
		instagram?: string;
		ip?: string;
		userAgent?: string;
	}
): UserRecord | null {
	loadDb();
	const user = memoryDb.users[userId];
	if (!user) return null;

	user.department = data.department;
	if (data.bio !== undefined) {
		user.bio = data.bio;
	}
	user.photo = data.photo;
	user.prompts = data.prompts;
	user.instagram = data.instagram;
	user.approved = memoryDb.settings.autoApprovePhotos;

	saveDb();

	addAuditLog({
		userId: user.id,
		name: user.name,
		email: user.email,
		role: 'user',
		action: 'profile_update',
		details: `Completed profile: Dept: ${data.department}${data.instagram ? `, IG: ${data.instagram}` : ''}`,
		ip: data.ip,
		userAgent: data.userAgent
	});

	return user;
}

export function getUser(userId: string): UserRecord | null {
	loadDb();
	return memoryDb.users[userId] || null;
}

export function getFeedForUser(userId: string): UserRecord[] {
	loadDb();
	// All users swiped by userId
	const swipedTargetIds = new Set(
		memoryDb.swipes.filter((s) => s.fromUserId === userId).map((s) => s.toUserId)
	);

	// Blocked pairs
	const blockedIds = new Set([
		...memoryDb.blocks.filter((b) => b.blockerId === userId).map((b) => b.blockedId),
		...memoryDb.blocks.filter((b) => b.blockedId === userId).map((b) => b.blockerId)
	]);

	// Filter other approved users with completed profile (has department)
	return Object.values(memoryDb.users).filter(
		(u) =>
			u.id !== userId &&
			u.approved &&
			u.department.length > 0 &&
			!swipedTargetIds.has(u.id) &&
			!blockedIds.has(u.id)
	);
}

export function getFeedStatsForUser(userId: string): { feedCount: number; skipsCount: number; matchesCount: number } {
	loadDb();
	const skipsCount = memoryDb.swipes.filter((s) => s.fromUserId === userId && s.action === 'skip').length;
	const matchesCount = memoryDb.matches.filter((m) => m.user1Id === userId || m.user2Id === userId).length;
	const feedCount = getFeedForUser(userId).length;
	return { feedCount, skipsCount, matchesCount };
}

export function recordSwipe(
	fromUserId: string,
	toUserId: string,
	action: 'accept' | 'skip'
): { isMatch: boolean; isRequestSent: boolean; matchedUser: UserRecord | null } {
	loadDb();
	// Record swipe
	memoryDb.swipes.push({
		fromUserId,
		toUserId,
		action,
		timestamp: new Date().toISOString()
	});

	if (action === 'accept' && !memoryDb.settings.matchesPaused) {
		// Check if toUserId has already accepted fromUserId
		const mutualSwipe = memoryDb.swipes.find(
			(s) => s.fromUserId === toUserId && s.toUserId === fromUserId && s.action === 'accept'
		);

		let existingMatch = memoryDb.matches.find(
			(m) =>
				(m.user1Id === fromUserId && m.user2Id === toUserId) ||
				(m.user1Id === toUserId && m.user2Id === fromUserId)
		);

		if (existingMatch) {
			// If request already existed from the other user, or mutual swipe, confirm acceptance!
			if (existingMatch.requestedBy !== fromUserId || mutualSwipe) {
				existingMatch.status = 'accepted';
				existingMatch.acceptedAt = new Date().toISOString();
				saveDb();
				return { isMatch: true, isRequestSent: true, matchedUser: memoryDb.users[toUserId] || null };
			}
			return { isMatch: existingMatch.status === 'accepted', isRequestSent: true, matchedUser: memoryDb.users[toUserId] || null };
		}

		if (mutualSwipe) {
			// Mutual match immediately accepted
			const matchId = 'match_' + Math.random().toString(36).substring(2, 9);
			memoryDb.matches.push({
				id: matchId,
				user1Id: fromUserId,
				user2Id: toUserId,
				status: 'accepted',
				requestedBy: fromUserId,
				createdAt: new Date().toISOString(),
				acceptedAt: new Date().toISOString()
			});
			saveDb();
			return { isMatch: true, isRequestSent: true, matchedUser: memoryDb.users[toUserId] || null };
		} else {
			// Create a pending Chat Request from fromUserId to toUserId
			const matchId = 'match_' + Math.random().toString(36).substring(2, 9);
			memoryDb.matches.push({
				id: matchId,
				user1Id: fromUserId,
				user2Id: toUserId,
				status: 'pending',
				requestedBy: fromUserId,
				createdAt: new Date().toISOString()
			});
			saveDb();
			return { isMatch: false, isRequestSent: true, matchedUser: memoryDb.users[toUserId] || null };
		}
	}

	saveDb();
	return { isMatch: false, isRequestSent: false, matchedUser: null };
}

export function acceptChatRequest(
	userId: string,
	matchId: string
): { success: boolean; match?: MatchRecord; matchedUser?: UserRecord; error?: string } {
	loadDb();
	const match = memoryDb.matches.find((m) => m.id === matchId);
	if (!match) return { success: false, error: 'Chat request not found' };

	if (match.user1Id !== userId && match.user2Id !== userId) {
		return { success: false, error: 'Unauthorized' };
	}

	match.status = 'accepted';
	match.acceptedAt = new Date().toISOString();

	const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
	const otherUser = memoryDb.users[otherUserId];

	// Ensure mutual swipe exists so feed doesn't re-show the user
	const hasSwiped = memoryDb.swipes.some((s) => s.fromUserId === userId && s.toUserId === otherUserId);
	if (!hasSwiped) {
		memoryDb.swipes.push({
			fromUserId: userId,
			toUserId: otherUserId,
			action: 'accept',
			timestamp: new Date().toISOString()
		});
	}

	saveDb();

	addAuditLog({
		userId,
		name: memoryDb.users[userId]?.name || 'Attendee',
		email: memoryDb.users[userId]?.email || '',
		role: 'user',
		action: 'admin_action',
		details: `Accepted chat request with ${otherUser?.name || otherUserId}`
	});

	return { success: true, match, matchedUser: otherUser };
}

export function declineChatRequest(
	userId: string,
	matchId: string
): { success: boolean; error?: string } {
	loadDb();
	const matchIndex = memoryDb.matches.findIndex((m) => m.id === matchId);
	if (matchIndex === -1) return { success: false, error: 'Chat request not found' };

	const match = memoryDb.matches[matchIndex];
	if (match.user1Id !== userId && match.user2Id !== userId) {
		return { success: false, error: 'Unauthorized' };
	}

	const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
	memoryDb.swipes.push({
		fromUserId: userId,
		toUserId: otherUserId,
		action: 'skip',
		timestamp: new Date().toISOString()
	});

	memoryDb.matches.splice(matchIndex, 1);
	saveDb();
	return { success: true };
}

export function resetSkipsForUser(userId: string): number {
	loadDb();
	const beforeCount = memoryDb.swipes.length;
	memoryDb.swipes = memoryDb.swipes.filter(
		(s) => !(s.fromUserId === userId && s.action === 'skip')
	);
	saveDb();
	return beforeCount - memoryDb.swipes.length;
}

export function undoLastSwipe(userId: string): { undone: boolean; targetUserId?: string } {
	loadDb();
	for (let i = memoryDb.swipes.length - 1; i >= 0; i--) {
		if (memoryDb.swipes[i].fromUserId === userId) {
			const lastSwipe = memoryDb.swipes[i];
			// If it was an accept that formed a match or request, revoke that match
			if (lastSwipe.action === 'accept') {
				memoryDb.matches = memoryDb.matches.filter(
					(m) =>
						!(
							(m.user1Id === userId && m.user2Id === lastSwipe.toUserId) ||
							(m.user1Id === lastSwipe.toUserId && m.user2Id === userId)
						)
				);
			}
			memoryDb.swipes.splice(i, 1);
			saveDb();
			return { undone: true, targetUserId: lastSwipe.toUserId };
		}
	}
	return { undone: false };
}

export interface UserMatchSummary {
	matchId: string;
	user: UserRecord;
	lastMessage: MessageRecord | null;
	createdAt: string;
	status: 'pending' | 'accepted' | 'declined';
	requestedBy: string;
}

export interface UserChatRequestSummary {
	matchId: string;
	user: UserRecord;
	createdAt: string;
	requestedBy: string;
}

export function getMatchesForUser(userId: string): {
	matches: UserMatchSummary[];
	incomingRequests: UserChatRequestSummary[];
	outgoingRequests: UserChatRequestSummary[];
} {
	loadDb();
	const userMatches = memoryDb.matches.filter(
		(m) => m.user1Id === userId || m.user2Id === userId
	);

	const blockedIds = new Set([
		...memoryDb.blocks.filter((b) => b.blockerId === userId).map((b) => b.blockedId),
		...memoryDb.blocks.filter((b) => b.blockedId === userId).map((b) => b.blockerId)
	]);

	const matches: UserMatchSummary[] = [];
	const incomingRequests: UserChatRequestSummary[] = [];
	const outgoingRequests: UserChatRequestSummary[] = [];

	for (const m of userMatches) {
		const otherUserId = m.user1Id === userId ? m.user2Id : m.user1Id;
		if (blockedIds.has(otherUserId)) continue;

		const otherUser = memoryDb.users[otherUserId];
		if (!otherUser) continue;

		const status = m.status || 'accepted';

		if (status === 'accepted') {
			const msgs = memoryDb.messages.filter(
				(msg) =>
					(msg.fromUserId === userId && msg.toUserId === otherUserId) ||
					(msg.fromUserId === otherUserId && msg.toUserId === userId)
			);
			const lastMessage = msgs.length > 0 ? msgs[msgs.length - 1] : null;

			matches.push({
				matchId: m.id,
				user: otherUser,
				lastMessage,
				createdAt: m.createdAt,
				status: 'accepted',
				requestedBy: m.requestedBy || m.user1Id
			});
		} else if (status === 'pending') {
			if (m.requestedBy === userId) {
				outgoingRequests.push({
					matchId: m.id,
					user: otherUser,
					createdAt: m.createdAt,
					requestedBy: m.requestedBy
				});
			} else {
				incomingRequests.push({
					matchId: m.id,
					user: otherUser,
					createdAt: m.createdAt,
					requestedBy: m.requestedBy || otherUserId
				});
			}
		}
	}

	return { matches, incomingRequests, outgoingRequests };
}

export function getMessagesBetween(userId: string, otherUserId: string): MessageRecord[] {
	loadDb();
	return memoryDb.messages.filter(
		(m) =>
			(m.fromUserId === userId && m.toUserId === otherUserId) ||
			(m.fromUserId === otherUserId && m.toUserId === userId)
	);
}

export function saveMessage(fromUserId: string, toUserId: string, text: string): MessageRecord {
	loadDb();
	const msg: MessageRecord = {
		id: 'msg_' + Math.random().toString(36).substring(2, 9),
		fromUserId,
		toUserId,
		text: text.trim(),
		timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
	};

	memoryDb.messages.push(msg);
	saveDb();
	return msg;
}

export function blockUser(blockerId: string, blockedId: string) {
	loadDb();
	memoryDb.blocks.push({ blockerId, blockedId });

	// Silently remove any existing match between them
	memoryDb.matches = memoryDb.matches.filter(
		(m) =>
			!(
				(m.user1Id === blockerId && m.user2Id === blockedId) ||
				(m.user1Id === blockedId && m.user2Id === blockerId)
			)
	);

	saveDb();
}

export function getEventSettings(): EventSettingsRecord {
	loadDb();
	return memoryDb.settings;
}

export function updateEventSettings(newSettings: Partial<EventSettingsRecord>) {
	loadDb();
	memoryDb.settings = { ...memoryDb.settings, ...newSettings };
	saveDb();
	return memoryDb.settings;
}

export interface RegisteredUserSummary {
	id: string;
	name: string;
	email: string;
	year: string;
	department: string;
	bio?: string;
	photo: string | null;
	photoGradient?: string;
	photoInitial?: string;
	promptsCount: number;
	instagram?: string;
	approved: boolean;
	createdAt: string;
	loginCount: number;
	matchesCount: number;
	swipesCount: number;
	lastLogin?: string;
	lastDevice?: string;
}

export function getRegisteredUsersList(): RegisteredUserSummary[] {
	loadDb();
	const users = Object.values(memoryDb.users);
	return users.map((u) => {
		const userLogs = (memoryDb.logs || []).filter((l) => l.userId === u.id || l.email === u.email);
		const userMatches = memoryDb.matches.filter((m) => m.user1Id === u.id || m.user2Id === u.id);
		const userSwipes = memoryDb.swipes.filter((s) => s.fromUserId === u.id);
		const latestLog = userLogs.length > 0 ? userLogs[userLogs.length - 1] : null;

		return {
			id: u.id,
			name: u.name,
			email: u.email,
			year: u.year,
			department: u.department || 'Pending',
			bio: u.bio || '',
			photo: u.photo,
			photoGradient: u.photoGradient,
			photoInitial: u.photoInitial || u.name?.charAt(0)?.toUpperCase(),
			promptsCount: u.prompts ? u.prompts.filter((p) => p.answer && p.answer.trim().length > 0).length : 0,
			instagram: u.instagram,
			approved: u.approved,
			createdAt: u.createdAt || new Date().toISOString(),
			loginCount: userLogs.filter((l) => l.action === 'login' || l.action === 'register').length || 1,
			matchesCount: userMatches.length,
			swipesCount: userSwipes.length,
			lastLogin: latestLog?.timestamp || u.createdAt,
			lastDevice: latestLog?.device || 'Web Client'
		};
	}).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getAdminMetrics() {
	loadDb();
	const users = Object.values(memoryDb.users);
	const pendingPhotos = users.filter((u) => !u.approved);

	// Department statistics for Projector Mode
	const deptStats: Record<string, number> = {};
	for (const u of users) {
		const dept = u.department || 'Pending';
		deptStats[dept] = (deptStats[dept] || 0) + 1;
	}

	return {
		totalSignups: users.length,
		registeredUsers: getRegisteredUsersList(),
		totalMatches: memoryDb.matches.length,
		totalMessages: memoryDb.messages.length,
		pendingCount: pendingPhotos.length,
		pendingUsers: pendingPhotos,
		settings: memoryDb.settings,
		deptStats,
		reportsCount: (memoryDb.reports || []).filter((r) => r.status === 'pending').length,
		reports: memoryDb.reports || []
	};
}

export function approveUserPhoto(userId: string, adminName?: string) {
	loadDb();
	if (memoryDb.users[userId]) {
		memoryDb.users[userId].approved = true;
		saveDb();
		if (adminName) {
			addAuditLog({
				name: adminName,
				email: 'admin-action',
				role: 'admin',
				action: 'admin_action',
				details: `Approved photo for ${memoryDb.users[userId].name} (${memoryDb.users[userId].email})`
			});
		}
	}
}

export function rejectUserPhoto(userId: string, adminName?: string) {
	loadDb();
	if (memoryDb.users[userId]) {
		const name = memoryDb.users[userId].name;
		const email = memoryDb.users[userId].email;
		memoryDb.users[userId].photo = null;
		memoryDb.users[userId].approved = false;
		saveDb();
		if (adminName) {
			addAuditLog({
				name: adminName,
				email: 'admin-action',
				role: 'admin',
				action: 'admin_action',
				details: `Rejected photo for ${name} (${email})`
			});
		}
	}
}

export function approveAllPhotos(adminName?: string): number {
	loadDb();
	let count = 0;
	for (const user of Object.values(memoryDb.users)) {
		if (!user.approved) {
			user.approved = true;
			count++;
		}
	}
	saveDb();
	if (adminName && count > 0) {
		addAuditLog({
			name: adminName,
			email: 'admin-action',
			role: 'admin',
			action: 'admin_action',
			details: `Bulk-approved ${count} attendee photos`
		});
	}
	return count;
}

// Safety Reports & Moderation
export function addReport(params: {
	reporterId: string;
	reportedUserId: string;
	reason: string;
}): ReportRecord {
	loadDb();
	const reporter = memoryDb.users[params.reporterId];
	const reported = memoryDb.users[params.reportedUserId];

	const report: ReportRecord = {
		id: 'rep_' + Math.random().toString(36).substring(2, 9),
		reporterId: params.reporterId,
		reporterName: reporter?.name || 'Anonymous Student',
		reportedUserId: params.reportedUserId,
		reportedUserName: reported?.name || 'Student Profile',
		reportedUserEmail: reported?.email || '',
		reason: params.reason,
		timestamp: new Date().toISOString(),
		status: 'pending'
	};

	if (!memoryDb.reports) memoryDb.reports = [];
	memoryDb.reports.unshift(report);
	saveDb();

	addAuditLog({
		userId: params.reporterId,
		name: reporter?.name || 'Attendee',
		email: reporter?.email || 'student@tkmce.ac.in',
		role: 'user',
		action: 'admin_action',
		details: `⚠️ Submitted safety report against ${reported?.name || params.reportedUserId} (${params.reason})`
	});

	return report;
}

export function getReports(): ReportRecord[] {
	loadDb();
	return memoryDb.reports || [];
}

export function forceUnmatch(user1Id: string, user2Id: string, adminName?: string) {
	loadDb();
	// Remove mutual matches
	memoryDb.matches = memoryDb.matches.filter(
		(m) =>
			!(
				(m.user1Id === user1Id && m.user2Id === user2Id) ||
				(m.user1Id === user2Id && m.user2Id === user1Id)
			)
	);
	// Mutual block so they never see each other again
	memoryDb.blocks.push({ blockerId: user1Id, blockedId: user2Id });
	memoryDb.blocks.push({ blockerId: user2Id, blockedId: user1Id });
	saveDb();

	if (adminName) {
		const u1 = memoryDb.users[user1Id]?.name || user1Id;
		const u2 = memoryDb.users[user2Id]?.name || user2Id;
		addAuditLog({
			name: adminName,
			email: 'admin-action',
			role: 'admin',
			action: 'admin_action',
			details: `Force-unmatched & separated match connection between ${u1} and ${u2}`
		});
	}
}

export function resolveReport(
	reportId: string,
	action: 'dismiss' | 'unmatch' | 'ban',
	adminName?: string
): ReportRecord | null {
	loadDb();
	const report = (memoryDb.reports || []).find((r) => r.id === reportId);
	if (!report) return null;

	if (action === 'dismiss') {
		report.status = 'dismissed';
	} else if (action === 'unmatch') {
		report.status = 'resolved';
		forceUnmatch(report.reporterId, report.reportedUserId, adminName);
	} else if (action === 'ban') {
		report.status = 'resolved';
		forceUnmatch(report.reporterId, report.reportedUserId, adminName);
		if (memoryDb.users[report.reportedUserId]) {
			memoryDb.users[report.reportedUserId].approved = false;
		}
	}

	saveDb();

	if (adminName) {
		addAuditLog({
			name: adminName,
			email: 'admin-action',
			role: 'admin',
			action: 'admin_action',
			details: `Moderated report ${reportId}: ${action.toUpperCase()} action taken on ${report.reportedUserName}`
		});
	}

	return report;
}

export function resetAllData() {
	memoryDb = getDefaultState();
	saveDb();
}

// ---- Community Posts ----

function generateShortId(): string {
	return Math.random().toString(36).substr(2, 9);
}

export function addCommunityPost(params: {
	userId: string;
	text: string;
	mood: string;
}): CommunityPost {
	loadDb();
	const user = memoryDb.users[params.userId];
	const post: CommunityPost = {
		id: generateShortId(),
		userId: params.userId,
		department: user?.department || 'TKMCE',
		initial: user?.photoInitial || user?.name?.charAt(0)?.toUpperCase() || '?',
		photoGradient: user?.photoGradient || 'linear-gradient(135deg, #ff3d7f, #7c3aed)',
		text: params.text.trim(),
		mood: params.mood || '✨',
		vibeCount: 0,
		vibers: [],
		createdAt: new Date().toISOString()
	};
	memoryDb.communityPosts.unshift(post);
	// Keep max 200 posts
	if (memoryDb.communityPosts.length > 200) {
		memoryDb.communityPosts = memoryDb.communityPosts.slice(0, 200);
	}
	saveDb();
	return post;
}

export function getCommunityPosts(): CommunityPost[] {
	loadDb();
	return memoryDb.communityPosts || [];
}

export function toggleVibe(postId: string, userId: string): CommunityPost | null {
	loadDb();
	const post = memoryDb.communityPosts.find(p => p.id === postId);
	if (!post) return null;
	const alreadyVibed = post.vibers.includes(userId);
	if (alreadyVibed) {
		post.vibers = post.vibers.filter(id => id !== userId);
		post.vibeCount = Math.max(0, post.vibeCount - 1);
	} else {
		post.vibers.push(userId);
		post.vibeCount += 1;
	}
	saveDb();
	return post;
}

// ---- Remove User (Admin) ----

export function removeUser(userId: string, adminName?: string): boolean {
	loadDb();
	const user = memoryDb.users[userId];
	if (!user) return false;

	// Remove from users
	delete memoryDb.users[userId];
	// Clean up swipes involving this user
	memoryDb.swipes = memoryDb.swipes.filter(
		s => s.fromUserId !== userId && s.toUserId !== userId
	);
	// Clean up matches
	memoryDb.matches = memoryDb.matches.filter(
		m => m.user1Id !== userId && m.user2Id !== userId
	);
	// Clean up messages
	memoryDb.messages = memoryDb.messages.filter(
		m => m.fromUserId !== userId && m.toUserId !== userId
	);
	// Clean up blocks
	memoryDb.blocks = memoryDb.blocks.filter(
		b => b.blockerId !== userId && b.blockedId !== userId
	);
	// Clean up community posts
	if (memoryDb.communityPosts) {
		memoryDb.communityPosts = memoryDb.communityPosts.filter(p => p.userId !== userId);
	}
	// Audit log the removal
	memoryDb.logs.push({
		id: generateShortId(),
		userId,
		name: adminName || 'Organizer',
		email: user.email,
		role: 'admin',
		action: 'admin_action',
		details: `User removed: ${user.name} (${user.email})`,
		timestamp: new Date().toISOString()
	});
	saveDb();
	return true;
}
