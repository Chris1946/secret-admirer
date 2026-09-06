<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import SwipeStack from '$lib/components/SwipeStack.svelte';
	import GradientButton from '$lib/components/GradientButton.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import type { Profile } from '$lib/data/mockProfiles';
	import MatchRevealModal from '$lib/components/MatchRevealModal.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import {
		initializeFeed,
		loadMatches,
		getFeedProfiles,
		getCurrentFeedIndex,
		setAcceptingProfile,
		skipProfile,
		addToast,
		acceptProfile,
		getMatchedIds,
		feedHasMore,
		getCurrentUser,
		logoutUser,
		getEventSettings,
		reviewSkippedProfiles,
		undoLastSwipeAction,
		getSkipsCount
	} from '$lib/stores/gameState.svelte';


	let swipeStack: SwipeStack;
	let showMatchAnimation = $state(false);
	let matchedProfile = $state<Profile | null>(null);
	let pollInterval: ReturnType<typeof setInterval> | null = null;

	onMount(async () => {
		const user = getCurrentUser();
		if (!user) {
			goto('/');
			return;
		}
		await initializeFeed();
		await loadMatches();

		// Auto-poll every 4 seconds to silently pick up new batchmates joining the hall!
		pollInterval = setInterval(async () => {
			if (remaining === 0) {
				await initializeFeed();
			}
			await loadMatches();
		}, 4000);
	});

	import { onDestroy } from 'svelte';
	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});

	function handleAccept(profile: Profile) {
		// Navigate to minigame with profile context
		setAcceptingProfile(profile);
		goto('/minigame');
	}

	function handleSkip(_profile: Profile) {
		skipProfile();
	}

	function handleAcceptButton() {
		swipeStack?.triggerAccept();
	}

	function handleSkipButton() {
		swipeStack?.triggerSkip();
	}

	let profiles = $derived(getFeedProfiles());
	let currentIdx = $derived(getCurrentFeedIndex());
	let remaining = $derived(Math.max(0, profiles.length - currentIdx));
	let settings = $derived(getEventSettings());
	let currentUser = $derived(getCurrentUser());
	let skipsCount = $derived(getSkipsCount());

	async function handleReviewSkips() {
		await reviewSkippedProfiles();
	}

	async function handleUndoSwipe() {
		await undoLastSwipeAction();
	}

	async function handleShareApp() {
		const url = typeof window !== 'undefined' ? window.location.origin : '';
		const shareData = {
			title: 'Secret Admirer — TKMCE Orientation 2026',
			text: "Join Secret Admirer for TKMCE Orientation 2026! 🎓 See who's your admirer & match with 1st-year batchmates:",
			url
		};

		if (typeof navigator !== 'undefined' && navigator.share) {
			try {
				await navigator.share(shareData);
				return;
			} catch (err: any) {
				if (err?.name === 'AbortError') return;
			}
		}

		try {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				await navigator.clipboard.writeText(url);
			} else {
				const textarea = document.createElement('textarea');
				textarea.value = url;
				textarea.style.position = 'fixed';
				textarea.style.opacity = '0';
				document.body.appendChild(textarea);
				textarea.select();
				document.execCommand('copy');
				document.body.removeChild(textarea);
			}
			addToast('Invite link copied to clipboard! 📋', 'success');
		} catch {
			addToast('Could not copy link', 'error');
		}
	}
</script>


<svelte:head>
	<title>Discover — Secret Admirer</title>
</svelte:head>

<main class="discover-page">
	<!-- Ambient Orbs -->
	<div class="ambient-orb orb-left"></div>
	<div class="ambient-orb orb-right"></div>

	<!-- Top Navigation Bar -->
	<header class="top-nav glass-strong">
		<div class="nav-brand">
			<span class="nav-icon">💌</span>
			<span class="nav-title">Secret Admirer</span>
		</div>

		<div class="nav-actions">
			<ThemeToggle />
			<span class="nav-greeting">Hi, {currentUser?.name?.split(' ')[0] || 'there'} ✨</span>
		</div>
	</header>

	<div class="discover-content container">
		<!-- Live Announcement Banner -->
		{#if settings.announcement}
			<div class="announcement-banner glass">
				<span class="banner-icon">📢</span>
				<span class="banner-text">{settings.announcement}</span>
			</div>
		{/if}

		<!-- Sub Header -->
		<div class="discover-header">
			<h1 class="page-title">Discover</h1>
			<div class="header-meta">
				<span class="profile-count">{remaining} left</span>
				<button type="button" class="matches-nav-pill-small" onclick={() => goto('/matches')} title="View Matches">
					<span class="match-count">
						{getMatchedIds().size} match{getMatchedIds().size !== 1 ? 'es' : ''} 💕
					</span>
				</button>
				{#if skipsCount > 0}
					<button type="button" class="skips-pill glass" onclick={handleReviewSkips} title="Review passed profiles">
						<span>🔄 {skipsCount} skipped</span>
					</button>
				{/if}
			</div>
		</div>

		<!-- Card Stack -->
		<div class="stack-area">
			<SwipeStack
				bind:this={swipeStack}
				{profiles}
				currentIndex={currentIdx}
				onAccept={handleAccept}
				onSkip={handleSkip}
				onRefresh={() => initializeFeed()}
				onReviewSkips={handleReviewSkips}
			/>
		</div>

		<!-- Action Buttons -->
		{#if feedHasMore()}
			<div class="action-buttons">
				<button type="button" class="undo-btn glass" onclick={handleUndoSwipe} title="Undo last swipe / rewind card">
					<span class="undo-icon">↩️</span>
					<span class="undo-text">Undo</span>
				</button>
				<button class="skip-btn" onclick={handleSkipButton}>
					Skip
				</button>
				<button class="accept-btn" onclick={handleAcceptButton}>
					<span class="accept-icon">♥</span>
					<span class="accept-text">Accept</span>
				</button>
			</div>
		{:else}
			<div class="empty-feed-bar">
				{#if skipsCount > 0}
					<button type="button" class="review-passes-bar-btn glass" onclick={handleReviewSkips}>
						<span>🔄 Review {skipsCount} Skipped Profile{skipsCount > 1 ? 's' : ''}</span>
					</button>
				{/if}
				{#if getMatchedIds().size > 0}
					<button type="button" class="open-matches-bar-btn" onclick={() => goto('/matches')}>
						<span>💕 View Your {getMatchedIds().size} Match{getMatchedIds().size > 1 ? 'es' : ''} →</span>
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Rich Match Reveal Modal -->
	{#if showMatchAnimation && matchedProfile}
		<MatchRevealModal
			profile={matchedProfile}
			onChat={() => {
				const id = matchedProfile?.id;
				showMatchAnimation = false;
				goto(`/chat?id=${id}`);
			}}
			onClose={() => (showMatchAnimation = false)}
		/>
	{/if}

	<BottomNav />
</main>

<style>
	.discover-page {
		min-height: 100dvh;
		padding: 0 0 80px;
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	/* Top Sticky Nav */
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
		margin-bottom: var(--space-md);
	}

	.nav-brand {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.nav-icon {
		font-size: 22px;
	}

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

	.nav-actions {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.nav-greeting {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		font-weight: 500;
		opacity: 0.8;
	}

	/* Announcement Banner */
	.announcement-banner {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 16px;
		border-radius: var(--radius-md);
		border: 1px solid rgba(255, 165, 2, 0.3);
		background: rgba(255, 165, 2, 0.08);
		font-size: var(--text-xs);
		color: #ffd32a;
		margin-bottom: var(--space-sm);
	}

	.ambient-orb {
		position: fixed;
		border-radius: 50%;
		filter: blur(120px);
		opacity: 0.08;
		pointer-events: none;
	}

	.orb-left {
		width: 300px;
		height: 300px;
		background: var(--accent-pink);
		top: 30%;
		left: -100px;
	}

	.orb-right {
		width: 250px;
		height: 250px;
		background: var(--accent-violet);
		bottom: 10%;
		right: -80px;
	}

	.discover-content {
		position: relative;
		z-index: var(--z-base);
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 1;
		gap: var(--space-lg);
	}

	/* Header */
	.discover-header {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		animation: fade-in 0.5s var(--ease-out-expo);
	}

	.page-title {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		font-style: italic;
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.header-meta {
		display: flex;
		gap: var(--space-md);
		align-items: center;
	}

	.profile-count,
	.match-count {
		font-size: var(--text-xs);
		padding: 4px 10px;
		border-radius: 20px;
		background: var(--glass-light);
		border: 1px solid var(--glass-border);
		color: var(--text-muted);
	}

	.match-count {
		color: var(--accent-pink);
		border-color: rgba(255, 61, 127, 0.2);
		background: rgba(255, 61, 127, 0.08);
	}

	/* Stack area */
	.stack-area {
		flex: 1;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 500px;
	}

	/* Action buttons */
	.action-buttons {
		display: flex;
		align-items: center;
		gap: var(--space-xl);
		padding: var(--space-md) 0;
		animation: fade-in-up 0.5s var(--ease-out-expo) 0.3s both;
	}

	.undo-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 12px 20px;
		font-size: var(--text-sm);
		color: var(--text-secondary);
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--duration-fast);
		font-family: var(--font-body);
		font-weight: 500;
	}

	.undo-btn:hover {
		color: #ffffff;
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.25);
		transform: translateY(-1px);
	}

	.undo-btn:active {
		transform: scale(0.97);
	}

	.undo-icon {
		font-size: 16px;
	}

	.skips-pill {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: var(--text-xs);
		padding: 4px 10px;
		border-radius: 20px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid var(--glass-border);
		color: var(--accent-purple);
		cursor: pointer;
		transition: all var(--duration-fast);
	}

	.skips-pill:hover {
		background: rgba(155, 89, 182, 0.2);
		border-color: rgba(155, 89, 182, 0.4);
		transform: translateY(-1px);
	}

	.matches-nav-pill-small {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	.empty-feed-bar {
		display: flex;
		flex-direction: column;
		gap: 10px;
		width: 100%;
		max-width: 420px;
		margin: 0 auto;
		padding-top: var(--space-md);
	}

	.review-passes-bar-btn {
		width: 100%;
		padding: 12px 20px;
		border-radius: var(--radius-lg);
		border: 1px solid rgba(255, 61, 127, 0.3);
		background: rgba(255, 61, 127, 0.1);
		color: #ffffff;
		font-size: var(--text-sm);
		font-weight: 600;
		cursor: pointer;
		font-family: var(--font-body);
		transition: all var(--duration-fast);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}

	.review-passes-bar-btn:hover {
		background: rgba(255, 61, 127, 0.2);
		border-color: rgba(255, 61, 127, 0.5);
		transform: translateY(-1px);
	}

	.open-matches-bar-btn {
		width: 100%;
		padding: 12px 20px;
		border-radius: var(--radius-lg);
		border: none;
		background: var(--gradient-primary);
		color: #ffffff;
		font-size: var(--text-sm);
		font-weight: 600;
		cursor: pointer;
		font-family: var(--font-body);
		transition: all var(--duration-fast);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		box-shadow: var(--shadow-sm), var(--shadow-glow-pink);
	}

	.open-matches-bar-btn:hover {
		transform: translateY(-1px);
		box-shadow: var(--shadow-md), 0 0 30px rgba(255, 61, 127, 0.4);
	}

	.skip-btn {
		padding: 12px 24px;
		font-size: var(--text-sm);
		color: var(--text-muted);
		background: var(--glass-light);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--duration-fast);
		font-family: var(--font-body);
		font-weight: 500;
	}

	.skip-btn:hover {
		color: var(--text-secondary);
		background: var(--glass-medium);
	}

	.skip-btn:active {
		transform: scale(0.97);
	}

	.accept-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 16px 36px;
		background: var(--gradient-primary);
		border-radius: var(--radius-lg);
		color: white;
		font-size: var(--text-lg);
		font-weight: 600;
		cursor: pointer;
		border: none;
		box-shadow: var(--shadow-md), var(--shadow-glow-pink);
		transition: all var(--duration-normal) var(--ease-out-expo);
		animation: pulse-glow 3s ease-in-out infinite;
		font-family: var(--font-body);
	}

	.accept-btn:hover {
		transform: translateY(-2px);
		box-shadow:
			var(--shadow-lg),
			0 0 50px rgba(255, 61, 127, 0.4);
	}

	.accept-btn:active {
		transform: scale(0.97);
	}

	.accept-icon {
		font-size: 22px;
	}
</style>
