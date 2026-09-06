import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCommunityPosts, addCommunityPost, toggleVibe, getUser } from '$lib/server/db';

// GET all community posts
export const GET: RequestHandler = async () => {
	const posts = getCommunityPosts();
	return json({ posts });
};

// POST a new community post
export const POST: RequestHandler = async ({ request }) => {
	let body: { userId?: string; text?: string; mood?: string };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	const { userId, text, mood } = body;
	if (!userId || !text || text.trim().length === 0) {
		throw error(400, 'userId and text are required');
	}

	const user = getUser(userId);
	if (!user) {
		throw error(404, 'User not found');
	}

	if (text.trim().length > 300) {
		throw error(400, 'Post text too long (max 300 chars)');
	}

	const post = addCommunityPost({ userId, text, mood: mood || '✨' });
	return json({ post }, { status: 201 });
};

// PATCH: toggle vibe/upvote on a post
export const PATCH: RequestHandler = async ({ request }) => {
	let body: { postId?: string; userId?: string };
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	const { postId, userId } = body;
	if (!postId || !userId) {
		throw error(400, 'postId and userId are required');
	}

	const post = toggleVibe(postId, userId);
	if (!post) {
		throw error(404, 'Post not found');
	}

	return json({ post });
};
