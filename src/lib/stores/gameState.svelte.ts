/**
 * Global game state using Svelte 5 runes.
 * Connects directly to persistent backend (/api/*) for authentic multi-device testing.
 * Zero simulation bots, zero fake matches.
 */
import type { Profile } from '$lib/data/mockProfiles';

// ---- Types ----
export interface UserProfile {
	id: string;
	name: string;
	email: string;
	year: string;
	department: string;
	bio?: string;
	photo: string | null;
	photoGradient?: string;
	photoInitial?: string;
	prompts: { question: string; answer: string }[];
	instagram?: string;
	approved?: boolean;
	createdAt?: string;
}

export interface ChatRequest {
	matchId: string;
	user: UserProfile;
	createdAt: string;
	requestedBy?: string;
}

export type GameType = 'reflex' | 'pattern' | 'oddOneOut' | 'riddle' | 'emoji';

export interface GameResult {
	profileId: string;
	game: GameType;
	won: boolean;
	score?: number;
}

export interface ChatMessage {
	id: string;
	matchId: string;
	sender: 'user' | 'match';
	text: string;
	timestamp: string;
}

export interface PendingProfile {
	id: string;
	name: string;
	year: string;
	department: string;
	email: string;
	photo: string | null;
	photoGradient?: string;
	photoInitial?: string;
	submittedAt?: string;
}

export interface SafetyReport {
	id: string;
	reporterId: string;
	reporterName: string;
	reportedUserId: string;
	reportedUserName: string;
	reportedUserEmail: string;
	reason: string;
	timestamp: string;
	status: 'pending' | 'resolved' | 'dismissed';
}

export interface EventSettings {
	signupsPaused: boolean;
	matchesPaused: boolean;
	announcement: string;
	totalSignups: number;
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

export interface RegisteredUserSummary {
	id: string;
	name: string;
	email: string;
	year: string;
	department: string;
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
	bio?: string;
}

function generateUUID(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		try {
			return crypto.randomUUID();
		} catch {
			// fallback
		}
	}
	return 'id_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
}

// ---- State ----

let _authenticated = $state(false);
let _profileComplete = $state(false);
let _currentUser = $state<UserProfile | null>(null);

let _adminToken = $state<string | null>(null);
let _adminName = $state<string | null>(null);

let _feedProfiles = $state<UserProfile[]>([]);
let _currentFeedIndex = $state(0);
let _skipsCount = $state(0);

let _matchedProfiles = $state<UserProfile[]>([]);
let _matchedIds = $state<Set<string>>(new Set());
let _acceptedIds = $state<Set<string>>(new Set());
let _blockedIds = $state<Set<string>>(new Set());
let _incomingRequests = $state<ChatRequest[]>([]);
let _outgoingRequests = $state<ChatRequest[]>([]);

export function getIncomingRequests(): ChatRequest[] {
	return _incomingRequests;
}

export function getOutgoingRequests(): ChatRequest[] {
	return _outgoingRequests;
}

let _gameResults = $state<GameResult[]>([]);
let _acceptingProfile = $state<UserProfile | null>(null);

let _toasts = $state<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

let _chatMessages = $state<Record<string, ChatMessage[]>>({});

let _eventSettings = $state<EventSettings>({
	signupsPaused: false,
	matchesPaused: false,
	announcement: 'Welcome to TKMCE Orientation 2026! 🎓 1st Years Only',
	totalSignups: 0
});

let _pendingProfiles = $state<PendingProfile[]>([]);
let _safetyReports = $state<SafetyReport[]>([]);
let _registeredUsers = $state<RegisteredUserSummary[]>([]);

export function getRegisteredUsers() {
	return _registeredUsers;
}

// ---- Client Session Initialization ----

const STORAGE_USER_ID_KEY = 'secret_admirer_user_id';
const STORAGE_USER_KEY = 'secret_admirer_user';
const STORAGE_ADMIN_TOKEN_KEY = 'secret_admirer_admin_token';
const STORAGE_ADMIN_NAME_KEY = 'secret_admirer_admin_name';
const STORAGE_THEME_KEY = 'secret_admirer_theme';

export type ThemeMode = 'dark' | 'light';
let _theme = $state<ThemeMode>('dark');

export function getTheme(): ThemeMode {
	return _theme;
}

export function setTheme(mode: ThemeMode) {
	_theme = mode;
	if (typeof window !== 'undefined') {
		localStorage.setItem(STORAGE_THEME_KEY, mode);
		document.documentElement.setAttribute('data-theme', mode);
	}
}

export function toggleTheme(): ThemeMode {
	const next = _theme === 'dark' ? 'light' : 'dark';
	setTheme(next);
	return next;
}

export function initClientSession() {
	if (typeof window === 'undefined') return;

	try {
		// Restore theme
		const savedTheme = localStorage.getItem(STORAGE_THEME_KEY) as ThemeMode;
		if (savedTheme === 'light' || savedTheme === 'dark') {
			_theme = savedTheme;
			document.documentElement.setAttribute('data-theme', savedTheme);
		} else {
			_theme = 'dark';
			document.documentElement.setAttribute('data-theme', 'dark');
		}

		// Restore admin session if present
		const savedAdminToken = localStorage.getItem(STORAGE_ADMIN_TOKEN_KEY);
		const savedAdminName = localStorage.getItem(STORAGE_ADMIN_NAME_KEY);
		if (savedAdminToken) {
			_adminToken = savedAdminToken;
			_adminName = savedAdminName || 'Organizer';
		}

		// Restore student user session
		const savedUserId = localStorage.getItem(STORAGE_USER_ID_KEY);
		const savedUserJson = localStorage.getItem(STORAGE_USER_KEY);
		if (savedUserJson && savedUserId) {
			const user = JSON.parse(savedUserJson) as UserProfile;
			_currentUser = user;
			_authenticated = true;
			_profileComplete = Boolean(user.department && user.department.length > 0);

			// Refresh latest user status from server
			fetch(`/api/auth/session?userId=${user.id}`)
				.then((res) => (res.ok ? res.json() : null))
				.then((data) => {
					if (data?.user) {
						_currentUser = data.user;
						localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));
						_profileComplete = Boolean(data.user.department && data.user.department.length > 0);
					}
				})
				.catch(() => {});
		}
	} catch (err) {
		console.error('Failed to restore session from localStorage:', err);
	}
}

// Auto-run init if in browser
if (typeof window !== 'undefined') {
	initClientSession();
}

// ---- Exported reactive getters & setters ----

export function getAuthenticated() {
	return _authenticated;
}

export function setAuthenticated(val: boolean) {
	_authenticated = val;
}

export function getProfileComplete() {
	return _profileComplete;
}

export function setProfileComplete(val: boolean) {
	_profileComplete = val;
}

export function getCurrentUser() {
	return _currentUser;
}

export function setCurrentUser(user: UserProfile | null) {
	_currentUser = user;
	if (typeof window !== 'undefined') {
		if (user) {
			localStorage.setItem(STORAGE_USER_ID_KEY, user.id);
			localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
		} else {
			localStorage.removeItem(STORAGE_USER_ID_KEY);
			localStorage.removeItem(STORAGE_USER_KEY);
		}
	}
}

export function logoutUser() {
	_currentUser = null;
	_authenticated = false;
	_profileComplete = false;
	_feedProfiles = [];
	_skipsCount = 0;
	_matchedProfiles = [];
	_incomingRequests = [];
	_outgoingRequests = [];
	_chatMessages = {};
	if (typeof window !== 'undefined') {
		localStorage.removeItem(STORAGE_USER_ID_KEY);
		localStorage.removeItem(STORAGE_USER_KEY);
	}
}

// Admin Session State
export function getAdminToken(): string | null {
	if (_adminToken) return _adminToken;
	if (typeof window !== 'undefined') {
		return localStorage.getItem(STORAGE_ADMIN_TOKEN_KEY);
	}
	return null;
}

export function getAdminName(): string {
	if (_adminName) return _adminName;
	if (typeof window !== 'undefined') {
		return localStorage.getItem(STORAGE_ADMIN_NAME_KEY) || 'Organizer';
	}
	return 'Organizer';
}

export function setAdminSession(token: string, name: string) {
	_adminToken = token;
	_adminName = name;
	if (typeof window !== 'undefined') {
		localStorage.setItem(STORAGE_ADMIN_TOKEN_KEY, token);
		localStorage.setItem(STORAGE_ADMIN_NAME_KEY, name);
	}
}

export function clearAdminSession() {
	_adminToken = null;
	_adminName = null;
	if (typeof window !== 'undefined') {
		localStorage.removeItem(STORAGE_ADMIN_TOKEN_KEY);
		localStorage.removeItem(STORAGE_ADMIN_NAME_KEY);
	}
}

export function getAdminAuthHeaders(): Record<string, string> {
	const token = getAdminToken();
	return {
		'Content-Type': 'application/json',
		...(token ? { Authorization: `Bearer ${token}` } : {})
	};
}

export function getFeedProfiles() {
	return _feedProfiles as unknown as Profile[];
}

export function getCurrentFeedIndex(): number {
	return _currentFeedIndex;
}

export function getSkipsCount(): number {
	return _skipsCount;
}

export function getCurrentFeedProfile(): UserProfile | null {
	if (_currentFeedIndex >= _feedProfiles.length) return null;
	return _feedProfiles[_currentFeedIndex];
}

export function getAcceptingProfile() {
	return _acceptingProfile as unknown as Profile | null;
}

export function setAcceptingProfile(profile: any) {
	_acceptingProfile = profile;
}

export function getToasts() {
	return _toasts;
}

export function getMatchedIds() {
	return _matchedIds;
}

export function getAcceptedIds() {
	return _acceptedIds;
}

export function getBlockedIds() {
	return _blockedIds;
}

export function getMatchedProfiles(): Profile[] {
	return _matchedProfiles as unknown as Profile[];
}

export function getProfileById(id: string): Profile | undefined {
	const found =
		_matchedProfiles.find((p) => p.id === id) ||
		_feedProfiles.find((p) => p.id === id) ||
		_incomingRequests.find((r) => r.user.id === id)?.user ||
		_outgoingRequests.find((r) => r.user.id === id)?.user ||
		(_acceptingProfile?.id === id ? _acceptingProfile : undefined);
	return found as unknown as Profile | undefined;
}

// ---- Auth Actions ----

/**
 * Check entered email for Admin vs Returning User vs New User
 */
export async function checkEmailDecision(email: string): Promise<{
	role: 'admin' | 'returning' | 'new';
	user?: UserProfile;
	signupsPaused?: boolean;
	error?: string;
}> {
	try {
		const res = await fetch('/api/auth/check', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: email.trim().toLowerCase() })
		});
		const data = await res.json();
		if (!res.ok) {
			return { role: 'new', error: data.error || 'Authentication check failed' };
		}
		return data;
	} catch (err: any) {
		return { role: 'new', error: err.message || 'Network error checking credentials' };
	}
}

/**
 * Log in as Admin organizer with key and organizer name
 */
export async function adminLogin(
	key: string,
	organizerName: string
): Promise<{ success: boolean; token?: string; adminName?: string; error?: string }> {
	try {
		const res = await fetch('/api/auth/admin-login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				key: key.trim().toLowerCase(),
				name: organizerName.trim()
			})
		});
		const data = await res.json();
		if (!res.ok) {
			return { success: false, error: data.error || 'Admin verification failed' };
		}

		setAdminSession(data.token, data.adminName);
		return { success: true, token: data.token, adminName: data.adminName };
	} catch (err: any) {
		return { success: false, error: err.message || 'Network error during admin login' };
	}
}

// ---- API Actions ----

/**
 * Register user via server API
 */
export async function registerUser(params: {
	name: string;
	email: string;
	year: string;
	passcode?: string;
}): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
	try {
		const res = await fetch('/api/users/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(params)
		});

		const data = await res.json();
		if (!res.ok) {
			return { success: false, error: data.error || 'Registration failed' };
		}

		setCurrentUser(data.user);
		setAuthenticated(true);
		_profileComplete = Boolean(data.user.department && data.user.department.length > 0);
		return { success: true, user: data.user };
	} catch (err: any) {
		return { success: false, error: err.message || 'Network error during registration' };
	}
}

/**
 * Save user profile (department, photo, prompts, instagram)
 */
export async function saveUserProfile(data: {
	department: string;
	bio?: string;
	photo: string | null;
	prompts: { question: string; answer: string }[];
	instagram?: string;
}): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
	if (!_currentUser) {
		return { success: false, error: 'Not authenticated' };
	}

	try {
		const res = await fetch('/api/users/profile', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				userId: _currentUser.id,
				...data
			})
		});

		const result = await res.json();
		if (!res.ok) {
			return { success: false, error: result.error || 'Profile update failed' };
		}

		setCurrentUser(result.user);
		setProfileComplete(true);
		return { success: true, user: result.user };
	} catch (err: any) {
		return { success: false, error: err.message || 'Network error updating profile' };
	}
}

/**
 * Fetch discovery feed for current user from shared database
 */
export async function initializeFeed() {
	if (!_currentUser) return;

	try {
		const res = await fetch(`/api/feed?userId=${_currentUser.id}`);
		if (res.ok) {
			const data = await res.json();
			_feedProfiles = data.profiles || [];
			_skipsCount = data.skipsCount || 0;
			_currentFeedIndex = 0;
		}
	} catch (err) {
		console.error('Failed to load feed:', err);
	}
}

/**
 * Record a swipe (skip or accept) with real mutual match detection
 */
export async function swipeProfile(
	targetUserId: string,
	action: 'accept' | 'skip'
): Promise<{ isMatch: boolean; matchedUser: UserProfile | null }> {
	if (!_currentUser) {
		return { isMatch: false, matchedUser: null };
	}

	try {
		const res = await fetch('/api/swipe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				fromUserId: _currentUser.id,
				toUserId: targetUserId,
				action
			})
		});

		const data = await res.json();
		if (action === 'accept') {
			_acceptedIds.add(targetUserId);
		} else if (action === 'skip') {
			_skipsCount++;
		}

		if (data.isMatch && data.matchedUser) {
			_matchedIds.add(targetUserId);
			if (!_matchedProfiles.some((m) => m.id === data.matchedUser.id)) {
				_matchedProfiles = [..._matchedProfiles, data.matchedUser];
			}
		}

		_currentFeedIndex++;
		return data;
	} catch (err) {
		console.error('Failed to record swipe:', err);
		_currentFeedIndex++;
		return { isMatch: false, matchedUser: null };
	}
}

export function skipProfile() {
	const profile = getCurrentFeedProfile();
	if (profile) {
		swipeProfile(profile.id, 'skip');
	} else {
		_currentFeedIndex++;
	}
}

export async function acceptProfile(profileId: string): Promise<boolean> {
	const result = await swipeProfile(profileId, 'accept');
	return result.isMatch;
}

/**
 * Clear skips so user can review previously passed profiles again
 */
export async function reviewSkippedProfiles(): Promise<number> {
	if (!_currentUser) return 0;
	try {
		const res = await fetch('/api/swipe/reset-skips', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ userId: _currentUser.id })
		});
		if (res.ok) {
			const data = await res.json();
			_skipsCount = 0;
			await initializeFeed();
			if (data.restoredCount > 0) {
				addToast(`Restored ${data.restoredCount} skipped profile${data.restoredCount > 1 ? 's' : ''} to review! ✨`, 'success');
			} else {
				addToast('No skipped profiles to restore', 'info');
			}
			return data.restoredCount || 0;
		}
	} catch (err) {
		console.error('Failed to reset skips:', err);
	}
	return 0;
}

/**
 * Rewind / undo the most recent swipe
 */
export async function undoLastSwipeAction(): Promise<boolean> {
	if (!_currentUser) return false;
	try {
		const res = await fetch('/api/swipe/undo', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ userId: _currentUser.id })
		});
		if (res.ok) {
			const data = await res.json();
			if (data.undone) {
				if (data.targetUserId) {
					_acceptedIds.delete(data.targetUserId);
					_matchedIds.delete(data.targetUserId);
					_matchedProfiles = _matchedProfiles.filter((p) => p.id !== data.targetUserId);
				}
				_skipsCount = Math.max(0, _skipsCount - 1);
				await initializeFeed();
				if (_currentFeedIndex > 0) {
					_currentFeedIndex--;
				}
				addToast('Previous swipe undone ↩️', 'info');
				return true;
			} else {
				addToast('No previous swipe to undo', 'info');
			}
		}
	} catch (err) {
		console.error('Failed to undo swipe:', err);
	}
	return false;
}

/**
 * Load mutual matches for current user
 */
export async function loadMatches() {
	if (!_currentUser) return;

	try {
		const res = await fetch(`/api/matches?userId=${_currentUser.id}`);
		if (res.ok) {
			const data = await res.json();
			const matches = data.matches || [];
			_matchedProfiles = matches.map((m: any) => m.user);
			_matchedIds = new Set(matches.map((m: any) => m.user.id));
			_incomingRequests = data.incomingRequests || [];
			_outgoingRequests = data.outgoingRequests || [];
		}
	} catch (err) {
		console.error('Failed to load matches:', err);
	}
}

export async function acceptChatRequest(matchId: string): Promise<boolean> {
	if (!_currentUser) return false;

	try {
		const res = await fetch('/api/matches/request', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'accept',
				matchId,
				userId: _currentUser.id
			})
		});

		if (res.ok) {
			const data = await res.json();
			if (data.matchedUser) {
				_matchedIds.add(data.matchedUser.id);
				if (!_matchedProfiles.some((m) => m.id === data.matchedUser.id)) {
					_matchedProfiles = [data.matchedUser, ..._matchedProfiles];
				}
			}
			_incomingRequests = _incomingRequests.filter((r) => r.matchId !== matchId);
			await loadMatches();
			addToast('Chat request accepted! Say hello 👋', 'success');
			return true;
		}
	} catch (err) {
		console.error('Failed to accept chat request:', err);
	}
	return false;
}

export async function declineChatRequest(matchId: string): Promise<boolean> {
	if (!_currentUser) return false;

	try {
		const res = await fetch('/api/matches/request', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'decline',
				matchId,
				userId: _currentUser.id
			})
		});

		if (res.ok) {
			_incomingRequests = _incomingRequests.filter((r) => r.matchId !== matchId);
			await loadMatches();
			addToast('Chat request declined', 'info');
			return true;
		}
	} catch (err) {
		console.error('Failed to decline chat request:', err);
	}
	return false;
}

// ---- Real-time Chat Actions ----

export function getMessages(matchId: string): ChatMessage[] {
	return _chatMessages[matchId] || [];
}

export async function loadMessages(matchId: string) {
	if (!_currentUser || !matchId) return;

	try {
		const res = await fetch(`/api/messages?userId=${_currentUser.id}&otherUserId=${matchId}`);
		if (res.ok) {
			const data = await res.json();
			const serverMsgs = data.messages || [];
			_chatMessages[matchId] = serverMsgs.map((m: any) => ({
				id: m.id,
				matchId,
				sender: m.fromUserId === _currentUser?.id ? 'user' : 'match',
				text: m.text,
				timestamp: m.timestamp
			}));
		}
	} catch (err) {
		console.error('Failed to load messages:', err);
	}
}

export async function sendMessage(matchId: string, text: string): Promise<ChatMessage | null> {
	if (!_currentUser || !matchId || !text.trim()) return null;

	const cleanText = text.trim();
	const localMessage: ChatMessage = {
		id: generateUUID(),
		matchId,
		sender: 'user',
		text: cleanText,
		timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
	};

	if (!_chatMessages[matchId]) {
		_chatMessages[matchId] = [];
	}
	_chatMessages[matchId] = [..._chatMessages[matchId], localMessage];

	try {
		const res = await fetch('/api/messages', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				fromUserId: _currentUser.id,
				toUserId: matchId,
				text: cleanText
			})
		});

		if (res.ok) {
			const data = await res.json();
			if (data.message) {
				localMessage.id = data.message.id;
			}
		}
		return localMessage;
	} catch (err) {
		console.error('Failed to send message:', err);
		return localMessage;
	}
}

// ---- Safety & Moderation Actions ----

export async function blockUser(profileId: string) {
	_blockedIds.add(profileId);
	_matchedIds.delete(profileId);
	_acceptedIds.delete(profileId);
	_matchedProfiles = _matchedProfiles.filter((p) => p.id !== profileId);
	delete _chatMessages[profileId];

	if (_currentUser) {
		try {
			await fetch('/api/safety', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					blockerId: _currentUser.id,
					blockedId: profileId
				})
			});
		} catch (err) {
			console.error('Failed to block user on server:', err);
		}
	}
}

export async function submitSafetyReport(reportedUserId: string, reason: string) {
	if (_currentUser) {
		try {
			await fetch('/api/reports', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					reporterId: _currentUser.id,
					reportedUserId,
					reason
				})
			});
		} catch (err) {
			console.error('Failed to submit safety report:', err);
		}
	}
	await blockUser(reportedUserId);
	addToast('Report submitted. This match has been quietly removed.', 'info');
}

export function reportUser(profileId: string, reason: string) {
	submitSafetyReport(profileId, reason);
}

// ---- Admin / Organizer Actions ----

export function getEventSettings() {
	return _eventSettings;
}

export async function loadAdminData(): Promise<boolean> {
	try {
		const res = await fetch('/api/admin', {
			headers: getAdminAuthHeaders()
		});
		if (res.status === 401) {
			clearAdminSession();
			return false;
		}
		if (res.ok) {
			const data = await res.json();
			_eventSettings = {
				..._eventSettings,
				...data.settings,
				totalSignups: data.totalSignups
			};
			if (data.currentAdmin) {
				_adminName = data.currentAdmin;
			}
			_pendingProfiles = (data.pendingUsers || []).map((u: any) => ({
				id: u.id,
				name: u.name,
				year: u.year,
				department: u.department,
				email: u.email,
				photo: u.photo,
				photoGradient: u.photoGradient,
				photoInitial: u.photoInitial,
				submittedAt: 'Pending review'
			}));
			if (data.registeredUsers) {
				_registeredUsers = data.registeredUsers;
			}
			_safetyReports = data.reports || [];
			return true;
		}
	} catch (err) {
		console.error('Failed to load admin metrics:', err);
	}
	return false;
}

export async function updateEventSettings(settings: Partial<EventSettings>) {
	try {
		const res = await fetch('/api/admin', {
			method: 'POST',
			headers: getAdminAuthHeaders(),
			body: JSON.stringify({
				action: 'updateSettings',
				settings
			})
		});
		if (res.ok) {
			const data = await res.json();
			_eventSettings = { ..._eventSettings, ...data.settings };
			addToast('Event settings updated', 'success');
		}
	} catch (err) {
		console.error('Failed to update event settings:', err);
	}
}

export function getPendingProfiles() {
	return _pendingProfiles;
}

export async function approvePendingProfile(id: string) {
	try {
		await fetch('/api/admin', {
			method: 'POST',
			headers: getAdminAuthHeaders(),
			body: JSON.stringify({ action: 'approvePhoto', userId: id })
		});
		_pendingProfiles = _pendingProfiles.filter((p) => p.id !== id);
		addToast('Profile photo approved! ✨', 'success');
	} catch (err) {
		console.error('Failed to approve profile:', err);
	}
}

export async function rejectPendingProfile(id: string) {
	try {
		await fetch('/api/admin', {
			method: 'POST',
			headers: getAdminAuthHeaders(),
			body: JSON.stringify({ action: 'rejectPhoto', userId: id })
		});
		_pendingProfiles = _pendingProfiles.filter((p) => p.id !== id);
		addToast('Photo rejected and reset', 'info');
	} catch (err) {
		console.error('Failed to reject profile:', err);
	}
}

export async function approveAllPhotos() {
	try {
		const res = await fetch('/api/admin', {
			method: 'POST',
			headers: getAdminAuthHeaders(),
			body: JSON.stringify({ action: 'approveAllPhotos' })
		});
		if (res.ok) {
			const data = await res.json();
			_pendingProfiles = [];
			addToast(`All ${data.count || 0} pending photos approved! ✨`, 'success');
		}
	} catch (err) {
		console.error('Failed to approve all photos:', err);
	}
}

export function getSafetyReports() {
	return _safetyReports;
}

export async function loadReports() {
	try {
		const res = await fetch('/api/reports', {
			headers: getAdminAuthHeaders()
		});
		if (res.ok) {
			const data = await res.json();
			_safetyReports = data.reports || [];
		}
	} catch (err) {
		console.error('Failed to load reports:', err);
	}
}

export async function actionReport(reportId: string, action: 'dismiss' | 'unmatch' | 'ban') {
	try {
		const res = await fetch('/api/reports', {
			method: 'PATCH',
			headers: getAdminAuthHeaders(),
			body: JSON.stringify({ reportId, action })
		});
		if (res.ok) {
			_safetyReports = _safetyReports.filter((r) => r.id !== reportId);
			addToast(`Report marked as ${action.toUpperCase()}`, 'info');
		}
	} catch (err) {
		console.error('Failed to action report:', err);
	}
}

let _auditLogs = $state<AccessLogRecord[]>([]);

export function getAuditLogs() {
	return _auditLogs;
}

export async function loadAuditLogs(): Promise<AccessLogRecord[]> {
	try {
		const res = await fetch('/api/admin/logs', {
			headers: getAdminAuthHeaders()
		});
		if (res.ok) {
			const data = await res.json();
			_auditLogs = data.logs || [];
			if (data.registeredUsers) {
				_registeredUsers = data.registeredUsers;
			}
			return _auditLogs;
		}
	} catch (err) {
		console.error('Failed to load audit logs:', err);
	}
	return [];
}

export async function clearAuditLogs() {
	try {
		const res = await fetch('/api/admin/logs', {
			method: 'POST',
			headers: getAdminAuthHeaders(),
			body: JSON.stringify({ action: 'clear' })
		});
		if (res.ok) {
			_auditLogs = [];
			addToast('Audit log history cleared', 'info');
		}
	} catch (err) {
		console.error('Failed to clear logs:', err);
	}
}

export async function resetAllData() {
	try {
		await fetch('/api/admin', {
			method: 'POST',
			headers: getAdminAuthHeaders(),
			body: JSON.stringify({ action: 'resetAll' })
		});
		_feedProfiles = [];
		_matchedProfiles = [];
		_matchedIds = new Set();
		_acceptedIds = new Set();
		_incomingRequests = [];
		_outgoingRequests = [];
		_chatMessages = {};
		_auditLogs = [];
		_registeredUsers = [];
		_pendingProfiles = [];
		_safetyReports = [];
		addToast('Database reset successfully', 'info');
	} catch (err) {
		console.error('Failed to reset DB:', err);
	}
}

export function addGameResult(result: GameResult) {
	_gameResults.push(result);
}

export function addToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
	const id = generateUUID();
	_toasts = [..._toasts, { id, message, type }];
	setTimeout(() => {
		_toasts = _toasts.filter((t) => t.id !== id);
	}, 3200);
}

export function feedHasMore(): boolean {
	return _currentFeedIndex < _feedProfiles.length;
}

const GAME_TYPES: GameType[] = ['reflex', 'pattern', 'oddOneOut', 'riddle', 'emoji'];

export function getRandomGameType(): GameType {
	return GAME_TYPES[Math.floor(Math.random() * GAME_TYPES.length)];
}
