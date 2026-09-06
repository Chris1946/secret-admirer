<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount, onDestroy, tick } from 'svelte';
	import {
		getProfileById,
		getMatchedProfiles,
		getMessages,
		loadMessages,
		loadMatches,
		sendMessage,
		blockUser,
		reportUser,
		getCurrentUser,
		addToast,
		type ChatMessage
	} from '$lib/stores/gameState.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { generateUserGradient, generateUserGlow } from '$lib/utils/colors';

	// Determine matchId from URL query param `?id=...` or first match
	const matchId = $derived(
		page.url.searchParams.get('id') || getMatchedProfiles()[0]?.id || ''
	);

	const profile = $derived(getProfileById(matchId));
	const currentUser = getCurrentUser();

	let messages = $derived<ChatMessage[]>(getMessages(matchId));
	let inputText = $state('');
	let showSafetyModal = $state(false);
	let reportReason = $state('inappropriate');
	let messagesContainer = $state<HTMLDivElement>();
	let pollInterval: ReturnType<typeof setInterval> | null = null;
	let lastMsgCount = $state(0);

	// Dynamic icebreaker suggestions tailored to match
	const icebreakers = $derived([
		`Hey ${profile?.name || ''}! 👋`,
		profile?.prompts?.[0] ? `Tell me more about: "${profile.prompts[0].question}"!` : 'Excited for orientation?',
		'Canteen coffee after this session? ☕',
		`Fellow ${currentUser?.department || 'TKMCE'} student here! ✨`
	]);

	async function scrollToBottom() {
		await tick();
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	async function handleSend(textToSend?: string) {
		const text = textToSend || inputText;
		if (!text.trim() || !matchId) return;

		inputText = '';
		await sendMessage(matchId, text.trim());
		scrollToBottom();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	function handleBack() {
		if (typeof window !== 'undefined' && window.history.length > 1) {
			window.history.back();
		} else {
			goto('/matches');
		}
	}

	async function handleBlock() {
		if (!matchId) return;
		await blockUser(matchId);
		showSafetyModal = false;
		addToast('User quietly removed from your matches.', 'info');
		goto('/matches');
	}

	function handleReport() {
		if (!matchId) return;
		reportUser(matchId, reportReason);
		showSafetyModal = false;
		goto('/matches');
	}

	onMount(async () => {
		const user = getCurrentUser();
		if (!user) {
			goto('/');
			return;
		}

		// Ensure mutual matches are loaded so profile is resolved immediately
		await loadMatches();

		if (matchId) {
			await loadMessages(matchId);
			scrollToBottom();
			lastMsgCount = messages.length;

			// Poll server every 1.5 seconds for live multi-device messaging
			pollInterval = setInterval(async () => {
				await loadMessages(matchId);
				if (messages.length > lastMsgCount) {
					lastMsgCount = messages.length;
					scrollToBottom();
				}
			}, 1500);
		}
	});

	onDestroy(() => {
		if (pollInterval) {
			clearInterval(pollInterval);
		}
	});
</script>

<svelte:head>
	<title>Chat with {profile?.name || 'Match'} — Secret Admirer</title>
</svelte:head>

<main class="chat-page">
	{#if !profile}
		<div class="not-found container">
			<p>Match not found or was removed.</p>
			<button class="back-link glass" onclick={handleBack}>← Back to Matches</button>
		</div>
	{:else}
		<!-- Chat Top Header -->
		<header class="chat-header glass-strong">
			<button class="back-btn glass" onclick={handleBack} aria-label="Back to matches">
				<span class="back-icon">←</span>
				<span class="back-text">Matches</span>
			</button>

			<div class="header-profile">
				<div
					class="header-avatar"
					style="background: {profile.photoGradient || generateUserGradient(profile.id)}; box-shadow: 0 0 16px {generateUserGlow(profile.id)};"
				>
					{#if profile.photo}
						<img src={profile.photo} alt={profile.name} class="header-photo-img" />
					{:else}
						<span>{profile.photoInitial || profile.name.charAt(0).toUpperCase()}</span>
					{/if}
					<span class="online-dot" aria-label="Online"></span>
				</div>
				<div class="header-meta">
					<div class="name-row">
						<span class="header-name">{profile.name}</span>
						{#if profile.year}
							<span class="header-year">{profile.year}</span>
						{/if}
					</div>
					<span class="header-sub">{profile.department}</span>
				</div>
			</div>

			<div class="header-actions">
				<ThemeToggle />
				<!-- Safety Menu Trigger -->
				<button
					class="safety-trigger-btn glass"
					onclick={() => (showSafetyModal = true)}
					title="Safety & Moderation Options"
					aria-label="Safety options"
				>
					🛡️
				</button>
			</div>
		</header>

		<!-- Message Container -->
		<div class="messages-area" bind:this={messagesContainer}>
			<div class="messages-content container">
				<!-- Match Banner -->
				<div class="match-info-card glass">
					<div class="info-icon">💖</div>
					<h3 class="info-title">You and {profile.name} matched!</h3>
					{#if profile.instagram}
						<div class="ig-banner">
							<span>Instagram: <strong>{profile.instagram}</strong></span>
						</div>
					{/if}
					<p class="info-hint">Only you two can see this conversation. Be kind & have fun!</p>
				</div>

				<!-- Icebreaker Chips -->
				{#if messages.length <= 2}
					<div class="icebreakers-wrapper">
						<span class="icebreaker-title">Quick Icebreakers:</span>
						<div class="chips-scroll">
							{#each icebreakers as prompt}
								<button
									type="button"
									class="icebreaker-chip glass"
									onclick={() => handleSend(prompt)}
								>
									{prompt}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Messages Thread -->
				<div class="messages-list">
					{#each messages as msg}
						<div
							class="message-row"
							class:is-user={msg.sender === 'user'}
							class:is-match={msg.sender === 'match'}
						>
							{#if msg.sender === 'match'}
								<div
									class="mini-avatar"
									style="background: {profile.photoGradient || generateUserGradient(profile.id)}"
								>
									{#if profile.photo}
										<img src={profile.photo} alt={profile.name} class="mini-avatar-img" />
									{:else}
										<span>{profile.photoInitial || profile.name.charAt(0).toUpperCase()}</span>
									{/if}
								</div>
							{/if}

							<div class="message-bubble" class:bubble-user={msg.sender === 'user'} class:bubble-match={msg.sender === 'match'}>
								<p class="message-text">{msg.text}</p>
								<span class="message-time">{msg.timestamp}</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>


		<!-- Chat Input Bar -->
		<footer class="chat-input-bar glass-strong">
			<div class="input-container container">
				<div class="quick-emojis">
					<button type="button" class="emoji-btn" onclick={() => handleSend('👋')}>👋</button>
					<button type="button" class="emoji-btn" onclick={() => handleSend('😂')}>😂</button>
					<button type="button" class="emoji-btn" onclick={() => handleSend('✨')}>✨</button>
					<button type="button" class="emoji-btn" onclick={() => handleSend('☕')}>☕</button>
				</div>

				<div class="input-row">
					<input
						type="text"
						class="text-input glass"
						placeholder={`Message ${profile.name}...`}
						bind:value={inputText}
						onkeydown={handleKeydown}
					/>
					<button
						type="button"
						class="send-btn"
						class:active={inputText.trim().length > 0}
						disabled={!inputText.trim()}
						onclick={() => handleSend()}
						aria-label="Send message"
					>
						➤
					</button>
				</div>
			</div>
		</footer>

		<!-- Safety & Moderation Modal -->
		{#if showSafetyModal}
			<div class="modal-overlay" role="dialog" aria-modal="true">
				<div class="safety-modal glass-strong">
					<div class="modal-header">
						<span class="modal-icon">🛡️</span>
						<h2 class="modal-title">Safety & Options</h2>
					</div>

					<p class="safety-description">
						We want everyone at TKMCE Orientation to have a safe and comfortable time.
					</p>

					<!-- Block option (Silent removal) -->
					<div class="safety-option block-box">
						<h4>Quietly Block {profile.name}</h4>
						<p>
							Immediately and quietly removes this match. No notifications will be sent to avoid any awkwardness.
						</p>
						<button type="button" class="block-confirm-btn" onclick={handleBlock}>
							Block & Remove 🚫
						</button>
					</div>

					<!-- Report option -->
					<div class="safety-option report-box">
						<h4>Report Inappropriate Behavior</h4>
						<select class="report-select" bind:value={reportReason}>
							<option value="inappropriate">Inappropriate or offensive messages</option>
							<option value="harassment">Harassment or unwanted pressure</option>
							<option value="impersonation">Fake profile or impersonation</option>
							<option value="other">Other reason</option>
						</select>
						<button type="button" class="report-confirm-btn" onclick={handleReport}>
							Submit Report & Block
						</button>
					</div>

					<button type="button" class="close-modal-btn" onclick={() => (showSafetyModal = false)}>
						Cancel
					</button>
				</div>
			</div>
		{/if}
	{/if}
</main>

<style>
	.chat-page {
		height: 100dvh;
		display: flex;
		flex-direction: column;
		background: var(--bg-primary);
		overflow: hidden;
	}

	.not-found {
		padding: var(--space-2xl);
		text-align: center;
		color: var(--text-secondary);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--accent-pink);
		padding: 8px 16px;
		border-radius: var(--radius-full);
		font-size: var(--text-sm);
		font-weight: 600;
		cursor: pointer;
		margin-top: 16px;
	}

	/* Header */
	.chat-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-sm) var(--space-md);
		border-bottom: 1px solid var(--glass-border);
		z-index: var(--z-sticky);
		gap: 8px;
	}

	.back-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: var(--text-primary);
		font-size: var(--text-sm);
		font-weight: 600;
		cursor: pointer;
		padding: 6px 12px;
		border-radius: var(--radius-full);
		transition: all 180ms ease;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
	}

	.back-btn:hover {
		transform: translateX(-2px);
		border-color: var(--glass-border-hover);
	}

	.back-icon {
		font-size: 16px;
		line-height: 1;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.safety-trigger-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-full);
		font-size: 16px;
		cursor: pointer;
		transition: transform 180ms ease;
	}

	.safety-trigger-btn:hover {
		transform: scale(1.08);
	}

	.header-profile {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.header-avatar {
		position: relative;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-weight: 700;
		font-size: var(--text-base);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.online-dot {
		position: absolute;
		bottom: 1px;
		right: 1px;
		width: 10px;
		height: 10px;
		background: #00e5a0;
		border: 2px solid var(--bg-primary);
		border-radius: 50%;
	}

	.header-meta {
		display: flex;
		flex-direction: column;
	}

	.name-row {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.header-name {
		font-family: var(--font-display);
		font-size: var(--text-lg);
		font-weight: 600;
		color: var(--text-primary);
	}

	.header-year {
		font-size: 10px;
		padding: 1px 6px;
		border-radius: 8px;
		background: rgba(255, 61, 127, 0.15);
		color: #ff7597;
	}

	.header-sub {
		font-size: 11px;
		color: var(--text-muted);
	}

	.safety-trigger-btn {
		background: none;
		border: none;
		font-size: 18px;
		cursor: pointer;
		padding: 6px;
		border-radius: 50%;
		transition: transform var(--duration-fast);
	}

	.safety-trigger-btn:hover {
		transform: scale(1.15);
	}

	/* Messages Scroll Area */
	.messages-area {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-md) 0;
	}

	.messages-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	/* Match Banner */
	.match-info-card {
		padding: var(--space-md);
		border-radius: var(--radius-lg);
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		border: 1px solid rgba(255, 61, 127, 0.25);
		background: rgba(255, 61, 127, 0.04);
	}

	.info-icon {
		font-size: 24px;
	}

	.info-title {
		font-family: var(--font-display);
		font-size: var(--text-lg);
		color: var(--text-primary);
		margin: 0;
	}

	.ig-banner {
		font-size: var(--text-xs);
		color: #e1306c;
	}

	.info-hint {
		font-size: 11px;
		color: var(--text-muted);
		margin: 0;
	}

	/* Icebreaker chips */
	.icebreakers-wrapper {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.icebreaker-title {
		font-size: 11px;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.chips-scroll {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		padding-bottom: 4px;
		scrollbar-width: none;
	}

	.icebreaker-chip {
		white-space: nowrap;
		padding: 6px 12px;
		font-size: var(--text-xs);
		border-radius: 16px;
		color: var(--text-secondary);
		border: 1px solid var(--glass-border);
		background: rgba(255, 255, 255, 0.05);
		cursor: pointer;
		transition: all var(--duration-fast);
		font-family: var(--font-body);
	}

	.icebreaker-chip:hover {
		color: var(--text-primary);
		border-color: rgba(255, 61, 127, 0.4);
		background: rgba(255, 61, 127, 0.1);
	}

	/* Message Rows */
	.messages-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-top: 8px;
	}

	.message-row {
		display: flex;
		align-items: flex-end;
		gap: 8px;
	}

	.message-row.is-user {
		justify-content: flex-end;
	}

	.mini-avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-size: 12px;
		font-weight: 700;
		flex-shrink: 0;
	}

	.message-bubble {
		max-width: 76%;
		padding: 10px 14px;
		border-radius: 18px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		word-break: break-word;
	}

	.bubble-user {
		background: var(--gradient-accent);
		color: white;
		border-bottom-right-radius: 4px;
	}

	.bubble-match {
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid var(--glass-border);
		color: var(--text-primary);
		border-bottom-left-radius: 4px;
	}

	.message-text {
		font-size: var(--text-sm);
		line-height: 1.4;
		margin: 0;
	}

	.message-time {
		font-size: 10px;
		opacity: 0.7;
		align-self: flex-end;
	}

	/* Input Bar */

	.chat-input-bar {
		padding: var(--space-sm) var(--space-md);
		border-top: 1px solid var(--glass-border);
		background: rgba(10, 10, 15, 0.9);
	}

	.input-container {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.quick-emojis {
		display: flex;
		gap: 6px;
	}

	.emoji-btn {
		background: none;
		border: none;
		font-size: 16px;
		cursor: pointer;
		padding: 2px 6px;
		border-radius: 8px;
		transition: transform var(--duration-fast);
	}

	.emoji-btn:hover {
		transform: scale(1.2);
	}

	.input-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.text-input {
		flex: 1;
		padding: 12px 16px;
		border-radius: 24px;
		border: 1px solid var(--glass-border);
		background: rgba(255, 255, 255, 0.05);
		color: var(--text-primary);
		font-size: var(--text-sm);
		font-family: var(--font-body);
		outline: none;
	}

	.text-input:focus {
		border-color: rgba(255, 61, 127, 0.5);
		box-shadow: 0 0 12px rgba(255, 61, 127, 0.2);
	}

	.send-btn {
		width: 42px;
		height: 42px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-muted);
		font-size: 16px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all var(--duration-fast);
	}

	.send-btn.active {
		background: var(--gradient-accent);
		color: white;
		box-shadow: 0 0 12px rgba(255, 61, 127, 0.4);
	}

	/* Safety Modal */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(12px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-md);
		z-index: var(--z-modal);
	}

	.safety-modal {
		width: 100%;
		max-width: 400px;
		padding: var(--space-xl);
		border-radius: var(--radius-2xl);
		border: 1px solid var(--glass-border);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.modal-header {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.modal-icon {
		font-size: 24px;
	}

	.modal-title {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		color: var(--text-primary);
		margin: 0;
	}

	.safety-description {
		font-size: var(--text-xs);
		color: var(--text-secondary);
		margin: 0;
		line-height: 1.5;
	}

	.safety-option {
		padding: var(--space-md);
		border-radius: var(--radius-md);
		display: flex;
		flex-direction: column;
		gap: 8px;
		text-align: left;
	}

	.safety-option h4 {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.safety-option p {
		font-size: 11px;
		color: var(--text-muted);
		margin: 0;
		line-height: 1.4;
	}

	.block-box {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.report-box {
		background: rgba(255, 61, 127, 0.04);
		border: 1px solid rgba(255, 61, 127, 0.2);
	}

	.report-select {
		padding: 8px;
		border-radius: var(--radius-sm);
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid var(--glass-border);
		color: var(--text-primary);
		font-size: var(--text-xs);
	}

	.block-confirm-btn {
		padding: 8px 12px;
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-primary);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: var(--radius-sm);
		font-size: var(--text-xs);
		font-weight: 600;
		cursor: pointer;
		align-self: flex-start;
	}

	.report-confirm-btn {
		padding: 8px 12px;
		background: #ff3d7f;
		color: white;
		border: none;
		border-radius: var(--radius-sm);
		font-size: var(--text-xs);
		font-weight: 600;
		cursor: pointer;
		align-self: flex-start;
	}

	.close-modal-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: var(--text-xs);
		cursor: pointer;
		padding: 6px;
	}
</style>

