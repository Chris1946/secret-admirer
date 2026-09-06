<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { getCurrentUser, addToast } from '$lib/stores/gameState.svelte';
	import { generateUserGradient, generateUserGlow, getDepartmentBadgeStyle } from '$lib/utils/colors';

	interface CommunityPost {
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

	let posts = $state<CommunityPost[]>([]);
	let postText = $state('');
	let selectedMood = $state('✨');
	let isPosting = $state(false);
	let isLoading = $state(true);
	let vibingIds = $state<Set<string>>(new Set());
	let pollInterval: ReturnType<typeof setInterval> | null = null;

	const MOODS = ['✨', '🔥', '😂', '💭', '🎵', '💀', '🎓', '❤️', '🌊', '👀'];
	const currentUser = $derived(getCurrentUser());
	const charCount = $derived(postText.length);
	const canPost = $derived(postText.trim().length >= 3 && postText.trim().length <= 300 && !isPosting);

	async function loadPosts() {
		try {
			const res = await fetch('/api/community');
			if (res.ok) {
				const data = await res.json();
				posts = data.posts || [];
			}
		} catch {
			// silent fail on poll
		} finally {
			isLoading = false;
		}
	}

	async function handlePost() {
		if (!canPost || !currentUser) return;
		isPosting = true;
		try {
			const res = await fetch('/api/community', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId: currentUser.id,
					text: postText.trim(),
					mood: selectedMood
				})
			});
			if (res.ok) {
				const data = await res.json();
				posts = [data.post, ...posts];
				postText = '';
				selectedMood = '✨';
				addToast('Idea dropped! 💡', 'success');
			} else {
				addToast('Could not post idea', 'error');
			}
		} catch {
			addToast('Connection error', 'error');
		} finally {
			isPosting = false;
		}
	}

	async function handleVibe(postId: string) {
		if (!currentUser || vibingIds.has(postId)) return;
		vibingIds = new Set([...vibingIds, postId]);

		try {
			const res = await fetch('/api/community', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ postId, userId: currentUser.id })
			});
			if (res.ok) {
				const data = await res.json();
				posts = posts.map(p => p.id === postId ? data.post : p);
			}
		} catch {
			// ignore
		} finally {
			vibingIds = new Set([...vibingIds].filter(id => id !== postId));
		}
	}

	function getRelativeTime(isoStr: string): string {
		const diff = Date.now() - new Date(isoStr).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		return `${Math.floor(hrs / 24)}d ago`;
	}

	onMount(async () => {
		if (!getCurrentUser()) {
			goto('/');
			return;
		}
		await loadPosts();
		pollInterval = setInterval(loadPosts, 5000);
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});
</script>

<svelte:head>
	<title>Community Vibe Wall — Secret Admirer</title>
</svelte:head>

<main class="community-page">
	<!-- Ambient orbs -->
	<div class="ambient-orb orb-1"></div>
	<div class="ambient-orb orb-2"></div>

	<!-- Top Navigation -->
	<header class="top-nav glass-strong">
		<div class="nav-brand">
			<span class="nav-icon">💡</span>
			<span class="nav-title">Community Wall</span>
		</div>
		<div class="header-actions">
			<ThemeToggle />
			<span class="live-badge">
				<span class="pulse-dot"></span>
				<span>{posts.length} ideas</span>
			</span>
		</div>
	</header>

	<div class="page-content container">
		<!-- Hero -->
		<div class="page-hero">
			<h1 class="hero-title">Drop Your Vibe 💡</h1>
			<p class="hero-sub">
				Anonymous-ish wall for ideas, confessions, jokes, anything. Only your dept shows.
			</p>
		</div>

		<!-- Composer Card -->
		<div class="composer-card glass-strong">
			<div class="composer-header">
				{#if currentUser}
					<div
						class="composer-avatar"
						style="background: {currentUser.photoGradient || generateUserGradient(currentUser.id)}; box-shadow: 0 0 16px {generateUserGlow(currentUser.id)};"
					>
						<span>{currentUser.photoInitial || currentUser.name?.charAt(0)?.toUpperCase()}</span>
					</div>
				{/if}
				<div class="composer-meta">
					<span class="posting-as">Posting as <strong>{currentUser?.department || 'TKMCE Student'}</strong></span>
					<span class="posting-note">Your name stays hidden ✨</span>
				</div>
			</div>

			<div class="mood-picker">
				{#each MOODS as mood}
					<button
						class="mood-btn"
						class:active={selectedMood === mood}
						onclick={() => (selectedMood = mood)}
						title={mood}
					>
						{mood}
					</button>
				{/each}
			</div>

			<textarea
				class="post-textarea glass"
				placeholder="Drop a random idea, funny thought, confession, song rec, or anything really... ✨"
				bind:value={postText}
				maxlength="300"
				rows="3"
			></textarea>

			<div class="composer-footer">
				<span class="char-counter" class:warning={charCount > 260}>{charCount}/300</span>
				<button
					class="post-btn"
					disabled={!canPost}
					onclick={handlePost}
				>
					{isPosting ? 'Posting...' : `${selectedMood} Drop Idea`}
				</button>
			</div>
		</div>

		<!-- Posts Feed -->
		{#if isLoading}
			<div class="loading-state">
				<div class="loading-spinner"></div>
				<p>Loading vibes...</p>
			</div>
		{:else if posts.length === 0}
			<div class="empty-state glass">
				<span class="empty-icon">🌊</span>
				<h3>Be the first to drop an idea!</h3>
				<p>The community vibe wall is empty. Start the conversation.</p>
			</div>
		{:else}
			<div class="posts-masonry">
				{#each posts as post (post.id)}
					<div class="post-card glass">
						<div class="post-top">
							<div
								class="poster-avatar"
								style="background: {post.photoGradient || generateUserGradient(post.userId)}; box-shadow: 0 0 12px {generateUserGlow(post.userId)};"
							>
								<span>{post.initial}</span>
							</div>
							<div class="poster-meta">
								<span
									class="poster-dept"
									style="background: {getDepartmentBadgeStyle(post.department).bg}; color: {getDepartmentBadgeStyle(post.department).text}; border: 1px solid {getDepartmentBadgeStyle(post.department).border};"
								>
									{post.department}
								</span>
								<span class="post-time">{getRelativeTime(post.createdAt)}</span>
							</div>
							<span class="post-mood-badge">{post.mood}</span>
						</div>

						<p class="post-text">{post.text}</p>

						<div class="post-footer">
							<button
								class="vibe-btn"
								class:vibed={post.vibers.includes(currentUser?.id || '')}
								class:loading={vibingIds.has(post.id)}
								onclick={() => handleVibe(post.id)}
								disabled={vibingIds.has(post.id)}
							>
								<span class="vibe-icon">🔥</span>
								<span class="vibe-count">{post.vibeCount}</span>
								<span class="vibe-label">{post.vibers.includes(currentUser?.id || '') ? 'Vibing' : 'Vibe'}</span>
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<BottomNav />
</main>

<style>
	.community-page {
		min-height: 100dvh;
		background: var(--bg-primary);
		padding-bottom: 80px;
		position: relative;
		overflow-x: hidden;
	}

	.ambient-orb {
		position: fixed;
		border-radius: 50%;
		filter: blur(100px);
		opacity: 0.12;
		pointer-events: none;
		z-index: 0;
	}

	.orb-1 {
		width: 350px;
		height: 350px;
		background: var(--accent-violet);
		top: -80px;
		left: -80px;
	}

	.orb-2 {
		width: 300px;
		height: 300px;
		background: var(--accent-pink);
		bottom: 100px;
		right: -80px;
	}

	/* Top Nav */
	.top-nav {
		position: sticky;
		top: 0;
		z-index: var(--z-sticky);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px var(--space-lg);
		border-bottom: 1px solid var(--glass-border);
		backdrop-filter: blur(20px);
	}

	.nav-brand {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.nav-icon { font-size: 22px; }

	.nav-title {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		font-weight: 600;
		font-style: italic;
		background: var(--gradient-accent);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.live-badge {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: var(--text-secondary);
		background: var(--glass-light);
		padding: 4px 12px;
		border-radius: 20px;
		border: 1px solid var(--glass-border);
	}

	.pulse-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--success);
		display: inline-block;
		animation: pulse-glow 2s infinite;
	}

	/* Page Content */
	.page-content {
		position: relative;
		z-index: 1;
		padding-top: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	/* Hero */
	.page-hero {
		text-align: center;
		padding: var(--space-sm) 0;
	}

	.hero-title {
		font-family: var(--font-display);
		font-size: clamp(2rem, 6vw, 2.8rem);
		font-weight: 700;
		font-style: italic;
		background: var(--gradient-accent);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0 0 8px;
	}

	.hero-sub {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		margin: 0;
		max-width: 360px;
		margin: 0 auto;
		line-height: 1.5;
	}

	/* Composer */
	.composer-card {
		padding: var(--space-md);
		border-radius: var(--radius-xl);
		border: 1px solid rgba(255, 61, 127, 0.2);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.composer-header {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.composer-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-weight: 700;
		font-size: 16px;
		flex-shrink: 0;
		border: 2px solid rgba(255, 255, 255, 0.15);
	}

	.composer-meta {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.posting-as {
		font-size: var(--text-sm);
		color: var(--text-primary);
	}

	.posting-as strong {
		color: var(--accent-pink);
	}

	.posting-note {
		font-size: 11px;
		color: var(--text-muted);
	}

	/* Mood Picker */
	.mood-picker {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}

	.mood-btn {
		width: 36px;
		height: 36px;
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-sm);
		background: var(--glass-light);
		font-size: 18px;
		cursor: pointer;
		transition: all var(--duration-fast);
		display: flex;
		align-items: center;
		justify-content: center;
		-webkit-tap-highlight-color: transparent;
	}

	.mood-btn:hover {
		border-color: rgba(255, 61, 127, 0.4);
		background: rgba(255, 61, 127, 0.1);
		transform: scale(1.1);
	}

	.mood-btn.active {
		border-color: rgba(255, 61, 127, 0.6);
		background: rgba(255, 61, 127, 0.2);
		box-shadow: 0 0 12px rgba(255, 61, 127, 0.3);
		transform: scale(1.15);
	}

	/* Textarea */
	.post-textarea {
		width: 100%;
		padding: 12px 16px;
		border-radius: var(--radius-md);
		border: 1px solid var(--glass-border);
		background: rgba(255, 255, 255, 0.04);
		color: var(--text-primary);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		line-height: 1.5;
		resize: none;
		outline: none;
		transition: border-color var(--duration-fast);
	}

	.post-textarea:focus {
		border-color: rgba(255, 61, 127, 0.4);
		box-shadow: 0 0 0 2px rgba(255, 61, 127, 0.1);
	}

	.post-textarea::placeholder {
		color: var(--text-muted);
	}

	/* Composer Footer */
	.composer-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.char-counter {
		font-size: 11px;
		color: var(--text-muted);
		font-family: var(--font-body);
	}

	.char-counter.warning {
		color: #ffa502;
	}

	.post-btn {
		padding: 10px 20px;
		border: none;
		border-radius: var(--radius-md);
		background: var(--gradient-primary);
		color: white;
		font-size: var(--text-sm);
		font-weight: 600;
		font-family: var(--font-body);
		cursor: pointer;
		transition: all var(--duration-fast);
		box-shadow: 0 4px 12px rgba(255, 61, 127, 0.3);
	}

	.post-btn:hover:not(:disabled) {
		transform: scale(1.03);
		box-shadow: 0 6px 18px rgba(255, 61, 127, 0.45);
	}

	.post-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
		transform: none;
	}

	/* Loading */
	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-2xl) 0;
		color: var(--text-muted);
	}

	.loading-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid rgba(255, 255, 255, 0.1);
		border-top-color: var(--accent-pink);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	/* Empty State */
	.empty-state {
		padding: var(--space-2xl) var(--space-lg);
		border-radius: var(--radius-xl);
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-sm);
	}

	.empty-icon {
		font-size: 48px;
	}

	.empty-state h3 {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		color: var(--text-primary);
		margin: 0;
	}

	.empty-state p {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		margin: 0;
	}

	/* Posts Masonry */
	.posts-masonry {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-sm);
	}

	@media (min-width: 480px) {
		.posts-masonry {
			grid-template-columns: 1fr 1fr;
		}
	}

	/* Post Card */
	.post-card {
		padding: var(--space-md);
		border-radius: var(--radius-xl);
		border: 1px solid var(--glass-border);
		display: flex;
		flex-direction: column;
		gap: 10px;
		transition: transform var(--duration-fast), border-color var(--duration-fast);
		animation: fade-in-up 0.4s var(--ease-out-expo);
	}

	.post-card:hover {
		transform: translateY(-2px);
		border-color: rgba(255, 61, 127, 0.25);
	}

	.post-top {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.poster-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-weight: 700;
		font-size: 14px;
		flex-shrink: 0;
	}

	.poster-meta {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.poster-dept {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.post-time {
		font-size: 10px;
		color: var(--text-muted);
	}

	.post-mood-badge {
		font-size: 22px;
		flex-shrink: 0;
	}

	.post-text {
		font-size: var(--text-sm);
		color: var(--text-primary);
		line-height: 1.6;
		margin: 0;
		word-break: break-word;
	}

	.post-footer {
		display: flex;
		align-items: center;
	}

	.vibe-btn {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 5px 12px;
		border: 1px solid var(--glass-border);
		border-radius: 20px;
		background: var(--glass-light);
		cursor: pointer;
		transition: all var(--duration-fast);
		font-family: var(--font-body);
	}

	.vibe-btn:hover:not(:disabled) {
		border-color: rgba(255, 100, 50, 0.4);
		background: rgba(255, 100, 50, 0.1);
		transform: scale(1.05);
	}

	.vibe-btn.vibed {
		border-color: rgba(255, 100, 50, 0.5);
		background: rgba(255, 100, 50, 0.15);
	}

	.vibe-icon { font-size: 14px; }

	.vibe-count {
		font-size: 12px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.vibe-label {
		font-size: 11px;
		color: var(--text-secondary);
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	@keyframes fade-in-up {
		from { opacity: 0; transform: translateY(12px); }
		to { opacity: 1; transform: translateY(0); }
	}

	@keyframes pulse-glow {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}
</style>
