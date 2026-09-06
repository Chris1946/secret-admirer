/**
 * Profile types for real attendees in Secret Admirer
 */

export interface Profile {
	id: string;
	name: string;
	year?: string;
	department: string;
	photo?: string | null;
	photoGradient: string;
	photoInitial: string;
	prompts: { question: string; answer: string }[];
	bio?: string;
	instagram?: string;
	approved: boolean;
	createdAt?: string;
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
