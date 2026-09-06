<script lang="ts">
	import { onMount } from 'svelte';
	import ProfileCard from './ProfileCard.svelte';
	import type { Profile } from '$lib/data/mockProfiles';
	import { addToast } from '$lib/stores/gameState.svelte';

	interface Props {
		profiles: Profile[];
		currentIndex: number;
		onAccept: (profile: Profile) => void;
		onSkip: (profile: Profile) => void;
		onRefresh?: () => void;
		onReviewSkips?: () => void;
	}

	let { profiles, currentIndex, onAccept, onSkip, onRefresh, onReviewSkips }: Props = $props();

	let shareUrl = $state('');
	let copied = $state(false);

	onMount(() => {
		if (typeof window !== 'undefined') {
			shareUrl = window.location.origin;
		}
	});

	async function copyLink() {
		const url = shareUrl || (typeof window !== 'undefined' ? window.location.origin : '');
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
			copied = true;
			addToast('Invite link copied! Share with your batchmates 📋', 'success');
			setTimeout(() => {
				copied = false;
			}, 2500);
		} catch {
			addToast('Could not copy link to clipboard', 'error');
		}
	}

	async function shareWithApps() {
		const url = shareUrl || (typeof window !== 'undefined' ? window.location.origin : '');
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

		// Fallback for non-supported browsers or non-secure contexts
		await copyLink();
		addToast('Link copied! Paste it into WhatsApp or Instagram ✨', 'info');
	}


	let offsetX = $state(0);
	let offsetY = $state(0);
	let isDragging = $state(false);
	let startX = 0;
	let startY = 0;
	let isAnimatingOut = $state(false);
	let exitDirection = $state<'left' | 'right' | null>(null);

	const SWIPE_THRESHOLD = 100;
	const ROTATION_FACTOR = 0.1;

	let currentProfile = $derived(profiles[currentIndex] ?? null);
	let nextProfile = $derived(profiles[currentIndex + 1] ?? null);

	let rotation = $derived(offsetX * ROTATION_FACTOR);
	let acceptOpacity = $derived(Math.max(0, Math.min(1, offsetX / SWIPE_THRESHOLD)));
	let skipOpacity = $derived(Math.max(0, Math.min(1, -offsetX / SWIPE_THRESHOLD)));

	function handlePointerDown(e: PointerEvent) {
		if (isAnimatingOut) return;
		isDragging = true;
		startX = e.clientX;
		startY = e.clientY;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDragging || isAnimatingOut) return;
		offsetX = e.clientX - startX;
		offsetY = (e.clientY - startY) * 0.3; // Dampen vertical movement
	}

	function handlePointerUp() {
		if (!isDragging || isAnimatingOut) return;
		isDragging = false;

		if (offsetX > SWIPE_THRESHOLD && currentProfile) {
			animateOut('right');
		} else if (offsetX < -SWIPE_THRESHOLD && currentProfile) {
			animateOut('left');
		} else {
			// Spring back
			offsetX = 0;
			offsetY = 0;
		}
	}

	function animateOut(direction: 'left' | 'right') {
		isAnimatingOut = true;
		exitDirection = direction;
		offsetX = direction === 'right' ? 500 : -500;
		offsetY = 0;

		setTimeout(() => {
			if (direction === 'right' && currentProfile) {
				onAccept(currentProfile);
			} else if (currentProfile) {
				onSkip(currentProfile);
			}
			offsetX = 0;
			offsetY = 0;
			isAnimatingOut = false;
			exitDirection = null;
		}, 300);
	}

	export function triggerAccept() {
		if (currentProfile && !isAnimatingOut) {
			animateOut('right');
		}
	}

	export function triggerSkip() {
		if (currentProfile && !isAnimatingOut) {
			animateOut('left');
		}
	}
</script>

<div class="swipe-stack">
	{#if !currentProfile}
		<div class="empty-state glass-strong">
			<div class="radar-container">
				<div class="radar-pulse-ring ring-1"></div>
				<div class="radar-pulse-ring ring-2"></div>
				<div class="radar-pulse-ring ring-3"></div>
				<div class="radar-center-icon">💌</div>
			</div>

			<div class="radar-pill">
				<span class="live-blink-dot"></span>
				<span>SCANNING TKMCE ORIENTATION</span>
			</div>

			{#if profiles.length === 0}
				<h3 class="waiting-title">Waiting for Batchmates! ✨</h3>
				<p class="empty-sub">
					The room is still filling up! Invite your 1st-year batchmates to join the game:
				</p>
			{:else}
				<h3 class="waiting-title">You've Caught Up! 🎉</h3>
				<p class="empty-sub">
					You've swiped on all batchmates active right now. Invite more friends to keep the game going!
				</p>
			{/if}

			<!-- Share & Invite Box -->
			<div class="share-invite-box glass">
				<div class="share-header-row">
					<span class="share-icon">📢</span>
					<div class="share-text-meta">
						<strong class="share-title">Invite Your Batchmates</strong>
						<span class="share-caption">More 1st years = more mutual matches!</span>
					</div>
				</div>

				<!-- Link preview & copy action -->
				<div class="link-copy-container">
					<div class="link-url-display">
						<span class="link-icon">🔗</span>
						<span class="url-text">{shareUrl || 'Loading link...'}</span>
					</div>
					<button
						type="button"
						class="copy-action-btn"
						class:copied-success={copied}
						onclick={copyLink}
					>
						{copied ? '✓ Copied' : '📋 Copy'}
					</button>
				</div>

				<!-- Native Mobile Share Button (WhatsApp / Instagram / Apps) -->
				<button type="button" class="native-app-share-btn" onclick={shareWithApps}>
					<span>📤 Share via WhatsApp / Apps</span>
				</button>
			</div>

			<div class="pro-tip-box glass">
				<span class="tip-sparkle">💡</span>
				<p class="tip-text">
					<strong>Secret Admirer Rule:</strong> Your swipes remain completely anonymous until both of you accept each other!
				</p>
			</div>

			<div class="empty-actions">
				{#if onRefresh}
					<button class="scan-radar-btn" onclick={onRefresh}>
						<span>📡 Scan For New Batchmates</span>
					</button>
				{/if}
				{#if onReviewSkips}
					<button type="button" class="review-skips-btn glass" onclick={onReviewSkips}>
						<span>🔄 Review Skipped Profiles</span>
					</button>
				{/if}
			</div>
		</div>
	{:else}

		<!-- Next card (peeking behind) -->
		{#if nextProfile}
			<div class="card-wrapper next-card">
				<ProfileCard profile={nextProfile} zIndex={1} />
			</div>
		{/if}

		<!-- Current card (interactive) -->
		<div
			class="card-wrapper current-card"
			class:dragging={isDragging}
			class:animating-out={isAnimatingOut}
			style="transform: translate({offsetX}px, {offsetY}px) rotate({rotation}deg)"
			onpointerdown={handlePointerDown}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerUp}
			role="button"
			tabindex="0"
		>
			<ProfileCard profile={currentProfile} zIndex={2} isTop={true} />

			<!-- Swipe feedback overlays -->
			{#if acceptOpacity > 0}
				<div class="swipe-feedback accept" style="opacity: {acceptOpacity}">
					<span class="feedback-icon">♥</span>
					<span class="feedback-text">Accept</span>
				</div>
			{/if}
			{#if skipOpacity > 0}
				<div class="swipe-feedback skip" style="opacity: {skipOpacity}">
					<span class="feedback-icon">→</span>
					<span class="feedback-text">Skip</span>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.swipe-stack {
		position: relative;
		width: 100%;
		max-width: 360px;
		margin: 0 auto;
		height: min(520px, 66vh);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.card-wrapper {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
	}

	.current-card {
		cursor: grab;
		z-index: 2;
		transition: none;
	}

	.current-card.dragging {
		cursor: grabbing;
	}

	.current-card:not(.dragging):not(.animating-out) {
		transition: transform 0.4s var(--ease-spring);
	}

	.current-card.animating-out {
		transition: transform 0.3s var(--ease-out-expo);
		pointer-events: none;
	}

	.next-card {
		z-index: 1;
		transform: scale(0.95) translateY(10px);
		opacity: 0.6;
		pointer-events: none;
	}

	/* Swipe feedback */
	.swipe-feedback {
		position: absolute;
		top: 30%;
		z-index: 10;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 16px 24px;
		border-radius: var(--radius-lg);
		pointer-events: none;
	}

	.swipe-feedback.accept {
		right: 30px;
		background: rgba(0, 229, 160, 0.15);
		border: 2px solid var(--success);
		color: var(--success);
	}

	.swipe-feedback.skip {
		left: 30px;
		background: rgba(255, 255, 255, 0.08);
		border: 2px solid var(--text-muted);
		color: var(--text-muted);
	}

	.feedback-icon {
		font-size: 32px;
	}

	.feedback-text {
		font-size: var(--text-sm);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	/* Empty state */
	.empty-state {
		text-align: center;
		padding: 32px 24px;
		border-radius: var(--radius-2xl);
		border: 1px solid var(--glass-border);
		animation: fade-in-scale 0.5s var(--ease-out-back);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		max-width: 340px;
		margin: 0 auto;
	}

	/* Pulsing Radar Animation */
	.radar-container {
		position: relative;
		width: 76px;
		height: 76px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 2px;
	}

	.radar-pulse-ring {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		border: 1.5px solid rgba(255, 61, 127, 0.45);
		animation: radar-expand 2.6s cubic-bezier(0.2, 0.8, 0.4, 1) infinite;
	}

	.ring-2 {
		animation-delay: 0.8s;
		border-color: rgba(124, 58, 237, 0.45);
	}

	.ring-3 {
		animation-delay: 1.6s;
		border-color: rgba(0, 229, 160, 0.45);
	}

	.radar-center-icon {
		font-size: 34px;
		position: relative;
		z-index: 2;
		animation: float 3s ease-in-out infinite;
	}

	/* Status Pill */
	.radar-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 12px;
		border-radius: 20px;
		background: rgba(0, 229, 160, 0.1);
		border: 1px solid rgba(0, 229, 160, 0.3);
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.08em;
		color: #00e5a0;
	}

	.live-blink-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #00e5a0;
		box-shadow: 0 0 8px #00e5a0;
		animation: live-blink 1.2s infinite;
	}

	.waiting-title {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.empty-sub {
		font-size: var(--text-xs);
		color: var(--text-secondary);
		line-height: 1.5;
		margin: 0;
		max-width: 290px;
	}

	/* Share & Invite Box */
	.share-invite-box {
		width: 100%;
		padding: 12px 14px;
		border-radius: var(--radius-lg);
		border: 1px solid rgba(255, 61, 127, 0.25);
		background: rgba(255, 61, 127, 0.05);
		display: flex;
		flex-direction: column;
		gap: 10px;
		text-align: left;
		margin-top: 2px;
	}

	.share-header-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.share-icon {
		font-size: 20px;
	}

	.share-text-meta {
		display: flex;
		flex-direction: column;
	}

	.share-title {
		font-size: 13px;
		color: #ffffff;
	}

	.share-caption {
		font-size: 11px;
		color: var(--text-muted);
	}

	.link-copy-container {
		display: flex;
		align-items: center;
		gap: 6px;
		background: rgba(0, 0, 0, 0.35);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-md);
		padding: 4px 6px;
	}

	.link-url-display {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 6px;
		overflow: hidden;
		padding-left: 4px;
	}

	.link-icon {
		font-size: 12px;
		opacity: 0.7;
	}

	.url-text {
		font-size: 11px;
		color: #00e5a0;
		font-family: monospace;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.copy-action-btn {
		padding: 6px 12px;
		border-radius: 6px;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.08);
		color: #ffffff;
		transition: all var(--duration-fast);
		white-space: nowrap;
	}

	.copy-action-btn:hover {
		background: rgba(255, 255, 255, 0.18);
	}

	.copy-action-btn.copied-success {
		background: #00e5a0;
		color: #000000;
		border-color: #00e5a0;
	}

	.native-app-share-btn {
		width: 100%;
		padding: 9px 14px;
		border-radius: var(--radius-md);
		border: 1px solid rgba(255, 61, 127, 0.4);
		background: linear-gradient(135deg, rgba(255, 61, 127, 0.25), rgba(124, 58, 237, 0.25));
		color: #ffffff;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		transition: all var(--duration-fast);
		font-family: var(--font-body);
	}

	.native-app-share-btn:hover {
		background: linear-gradient(135deg, rgba(255, 61, 127, 0.4), rgba(124, 58, 237, 0.4));
		transform: translateY(-1px);
	}

	/* Pro-tip Card */
	.pro-tip-box {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 10px 14px;
		border-radius: var(--radius-md);
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		text-align: left;
		margin-top: 2px;
	}

	.tip-sparkle {
		font-size: 16px;
		flex-shrink: 0;
		margin-top: 1px;
	}

	.tip-text {
		font-size: 11px;
		color: var(--text-muted);
		line-height: 1.4;
		margin: 0;
	}

	.tip-text strong {
		color: #ff7597;
	}

	.empty-actions {
		width: 100%;
		margin-top: 4px;
	}

	.scan-radar-btn {
		width: 100%;
		padding: 10px 18px;
		border-radius: var(--radius-md);
		border: none;
		background: var(--gradient-accent);
		color: #ffffff;
		font-size: var(--text-xs);
		font-weight: 600;
		cursor: pointer;
		font-family: var(--font-body);
		transition: transform var(--duration-fast), box-shadow var(--duration-fast);
		box-shadow: 0 4px 16px rgba(255, 61, 127, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}

	.scan-radar-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 20px rgba(255, 61, 127, 0.45);
	}

	.review-skips-btn {
		width: 100%;
		padding: 9px 16px;
		border-radius: var(--radius-md);
		border: 1px solid var(--glass-border);
		background: rgba(255, 255, 255, 0.06);
		color: var(--text-secondary);
		font-size: var(--text-xs);
		font-weight: 600;
		cursor: pointer;
		font-family: var(--font-body);
		transition: all var(--duration-fast);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		margin-top: 6px;
	}

	.review-skips-btn:hover {
		color: #ffffff;
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.25);
		transform: translateY(-1px);
	}

	@keyframes radar-expand {
		0% {
			transform: scale(0.6);
			opacity: 0.9;
		}
		100% {
			transform: scale(1.65);
			opacity: 0;
		}
	}

	@keyframes live-blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}
</style>

