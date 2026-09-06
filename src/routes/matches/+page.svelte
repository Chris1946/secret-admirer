<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import {
		loadMatches,
		getMatchedProfiles,
		getIncomingRequests,
		getOutgoingRequests,
		acceptChatRequest,
		declineChatRequest,
		getMessages,
		getEventSettings,
		getCurrentUser,
		getAdminToken
	} from '$lib/stores/gameState.svelte';
	import GradientButton from '$lib/components/GradientButton.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { generateUserGradient, generateUserGlow, getDepartmentBadgeStyle } from '$lib/utils/colors';

	const matches = $derived(getMatchedProfiles());
	const incomingRequests = $derived(getIncomingRequests());
	const outgoingRequests = $derived(getOutgoingRequests());
	const settings = $derived(getEventSettings());

	let pollInterval: ReturnType<typeof setInterval> | null = null;
	let acceptingId = $state<string | null>(null);

	onMount(async () => {
		const user = getCurrentUser();
		if (!user) {
			goto('/');
			return;
		}
		await loadMatches();

		// Auto-poll matches and chat requests every 3 seconds
		pollInterval = setInterval(async () => {
			await loadMatches();
		}, 3000);
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});

	async function handleAccept(matchId: string) {
		acceptingId = matchId;
		await acceptChatRequest(matchId);
		acceptingId = null;
	}

	async function handleDecline(matchId: string) {
		await declineChatRequest(matchId);
	}

	function openChat(profileId: string) {
		goto(`/chat?id=${profileId}`);
	}

	function getLastMessageText(profileId: string): string {
		const msgs = getMessages(profileId);
		if (msgs.length === 0) return 'Tap to say hello! 👋';
		const last = msgs[msgs.length - 1];
		return last.sender === 'user' ? `You: ${last.text}` : last.text;
	}
</script>

<svelte:head>
	<title>Your Matches & Chat Requests — Secret Admirer</title>
</svelte:head>

<main class="matches-page">
	<!-- Background Ambient Orbs -->
	<div class="ambient-orb orb-1"></div>
	<div class="ambient-orb orb-2"></div>

	<!-- Top Navigation Bar -->
	<header class="top-nav glass-strong">
		<div class="nav-brand">
			<span class="nav-icon">💌</span>
			<span class="nav-title">Matches</span>
		</div>
		<div class="nav-actions">
			<ThemeToggle />
			{#if getAdminToken()}
				<button class="admin-link-btn glass" onclick={() => goto('/admin')} title="Organizer Dashboard">
					🛡️
				</button>
			{/if}
		</div>
	</header>

	<div class="matches-content container">
		<!-- Announcement Banner -->
		{#if settings.announcement}
			<div class="announcement-banner glass">
				<span class="banner-icon">📢</span>
				<span class="banner-text">{settings.announcement}</span>
			</div>
		{/if}

		<!-- SECTION 1: INCOMING CHAT REQUESTS -->
		{#if incomingRequests.length > 0}
			<section class="requests-section glass-strong">
				<div class="requests-header">
					<div class="header-tag-row">
						<span class="pulse-sparkle">✨</span>
						<h2 class="requests-title">Incoming Chat Requests</h2>
						<span class="requests-count-pill">{incomingRequests.length} pending</span>
					</div>
					<p class="requests-subtitle">
						These batchmates expressed interest in you! Accept their chat request to start talking.
					</p>
				</div>

				<div class="requests-grid">
					{#each incomingRequests as req (req.matchId)}
						<div class="request-card glass">
							<div class="request-card-top">
								<div
									class="request-avatar"
									style="background: {req.user.photoGradient || generateUserGradient(req.user.id)}; box-shadow: 0 0 16px {generateUserGlow(req.user.id)};"
								>
									{#if req.user.photo}
										<img src={req.user.photo} alt={req.user.name} class="req-img" />
									{:else}
										<span>{req.user.photoInitial || req.user.name.charAt(0).toUpperCase()}</span>
									{/if}
								</div>

								<div class="request-user-info">
									<div class="req-name-row">
										<h3 class="req-name">{req.user.name}</h3>
										<span class="req-time">{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
									</div>
									<div class="badges">
										<span
											class="dept-badge"
											style="background: {getDepartmentBadgeStyle(req.user.department).bg}; color: {getDepartmentBadgeStyle(req.user.department).text}; border: 1px solid {getDepartmentBadgeStyle(req.user.department).border};"
										>
											{req.user.department}
										</span>
										{#if req.user.year}
											<span class="year-badge">{req.user.year}</span>
										{/if}
									</div>
								</div>
							</div>

							<!-- Bio / Free Space Creative Thought Bubble -->
							{#if req.user.bio}
								<div class="request-thought-bubble glass">
									<span class="thought-tag">💭 Creative Thought:</span>
									<p class="thought-text">"{req.user.bio}"</p>
								</div>
							{/if}

							<!-- Prompt Snippet -->
							{#if req.user.prompts && req.user.prompts.length > 0 && req.user.prompts[0].answer}
								<div class="request-prompt-preview">
									<span class="req-prompt-q">{req.user.prompts[0].question}</span>
									<p class="req-prompt-a">"{req.user.prompts[0].answer}"</p>
								</div>
							{/if}

							<div class="request-actions">
								<button
									type="button"
									class="accept-req-btn"
									disabled={acceptingId === req.matchId}
									onclick={() => handleAccept(req.matchId)}
								>
									{acceptingId === req.matchId ? 'Accepting...' : '✨ Accept Chat Request'}
								</button>
								<button
									type="button"
									class="decline-req-btn glass"
									onclick={() => handleDecline(req.matchId)}
								>
									Decline
								</button>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- SECTION 2: MUTUAL ADMIRERS -->
		<div class="page-header">
			<h1 class="page-title">Mutual Admirers</h1>
			<p class="page-subtitle">
				{#if matches.length > 0}
					You have <strong>{matches.length}</strong> mutual {matches.length === 1 ? 'match' : 'matches'}! Locked info is revealed & chats are open.
				{:else}
					{#if incomingRequests.length === 0}
						No mutual matches yet. Head to Discover, send interest to batchmates, and they will appear here once accepted!
					{:else}
						Accept an incoming chat request above to start your first chat!
					{/if}
				{/if}
			</p>
		</div>

		<!-- Match Grid -->
		{#if matches.length > 0}
			<div class="matches-grid">
				{#each matches as profile}
					<div class="match-card glass">
						<div class="card-left">
							<div
								class="avatar"
								style="background: {profile.photoGradient || generateUserGradient(profile.id)}; box-shadow: 0 0 18px {generateUserGlow(profile.id)};"
							>
								{#if profile.photo}
									<img src={profile.photo} alt={profile.name} class="avatar-photo" />
								{:else}
									<span>{profile.photoInitial || profile.name.charAt(0).toUpperCase()}</span>
								{/if}
							</div>
						</div>

						<div class="card-body">
							<div class="card-top">
								<h2 class="profile-name">{profile.name}</h2>
								<div class="badges">
									<span
										class="dept-badge"
										style="background: {getDepartmentBadgeStyle(profile.department).bg}; color: {getDepartmentBadgeStyle(profile.department).text}; border: 1px solid {getDepartmentBadgeStyle(profile.department).border};"
									>
										{profile.department}
									</span>
									{#if profile.year}
										<span class="year-badge">{profile.year}</span>
									{/if}
								</div>
							</div>

							<!-- Bio snippet if available -->
							{#if profile.bio}
								<p class="match-bio-snippet">💭 "{profile.bio}"</p>
							{/if}

							<!-- Unlocked Instagram -->
							{#if profile.instagram}
								<div class="ig-unlocked">
									<span class="ig-icon">📸</span>
									<span class="ig-handle">{profile.instagram}</span>
								</div>
							{/if}

							<!-- Last message / prompt snippet -->
							<p class="message-preview">
								{getLastMessageText(profile.id)}
							</p>
						</div>

						<div class="card-action">
							<button class="chat-btn" onclick={() => openChat(profile.id)}>
								Chat 💬
							</button>
						</div>
					</div>
				{/each}
			</div>
		{:else if incomingRequests.length === 0}
			<div class="empty-state glass">
				<span class="empty-icon">💔</span>
				<h3 class="empty-title">No matches yet</h3>
				<p class="empty-desc">
					Head over to discovery, find people that catch your eye, and win their icebreaker minigame!
				</p>
				<GradientButton variant="primary" size="md" onclick={() => goto('/discover')}>
					Find Admirers ✨
				</GradientButton>
			</div>
		{/if}

		<!-- SECTION 3: OUTGOING CHAT REQUESTS (PENDING) -->
		{#if outgoingRequests.length > 0}
			<section class="outgoing-section">
				<div class="outgoing-header">
					<h3 class="outgoing-title">Chat Requests Sent ({outgoingRequests.length})</h3>
					<span class="outgoing-subtitle">Waiting for these batchmates to accept your chat invitation:</span>
				</div>

				<div class="outgoing-grid">
					{#each outgoingRequests as req (req.matchId)}
						<div class="outgoing-card glass">
							<div
								class="out-avatar"
								style="background: {req.user.photoGradient || generateUserGradient(req.user.id)}; box-shadow: 0 0 14px {generateUserGlow(req.user.id)};"
							>
								{#if req.user.photo}
									<img src={req.user.photo} alt={req.user.name} class="out-img" />
								{:else}
									<span>{req.user.photoInitial || req.user.name.charAt(0).toUpperCase()}</span>
								{/if}
							</div>
							<div class="out-meta">
								<strong class="out-name">{req.user.name}</strong>
								<span
									class="out-dept"
									style="color: {getDepartmentBadgeStyle(req.user.department).text}"
								>
									{req.user.department}
								</span>
								<span class="out-pending-tag">⏳ Pending Acceptance</span>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}
	</div>

	<BottomNav />
</main>

<style>
	.matches-page {
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
		opacity: 0.3;
		pointer-events: none;
		z-index: 0;
	}

	.orb-1 {
		width: 320px;
		height: 320px;
		background: var(--accent-pink);
		top: -80px;
		right: -80px;
	}

	.orb-2 {
		width: 350px;
		height: 350px;
		background: var(--accent-violet);
		bottom: -80px;
		left: -80px;
	}

	/* Top Nav */
	.top-nav {
		position: sticky;
		top: 0;
		z-index: var(--z-sticky);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-sm) var(--space-lg);
		border-bottom: 1px solid var(--glass-border);
		backdrop-filter: blur(20px);
	}


	.nav-brand {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.nav-icon {
		font-size: 20px;
	}

	.nav-title {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		font-weight: 600;
		font-style: italic;
		color: var(--text-primary);
	}

	.admin-link-btn {
		background: none;
		border: none;
		font-size: 18px;
		cursor: pointer;
		padding: 6px;
		border-radius: 50%;
		transition: transform var(--duration-fast);
	}

	.admin-link-btn:hover {
		transform: scale(1.15);
	}

	/* Content */
	.matches-content {
		position: relative;
		z-index: 1;
		padding-top: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	/* Announcement */
	.announcement-banner {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 16px;
		border-radius: var(--radius-md);
		border: 1px solid rgba(255, 165, 2, 0.3);
		background: rgba(255, 165, 2, 0.08);
		font-size: var(--text-xs);
		color: #ffd32a;
	}

	/* Page header */
	.page-header {
		text-align: left;
	}

	.page-title {
		font-family: var(--font-display);
		font-size: clamp(2rem, 5vw, 2.5rem);
		font-weight: 600;
		font-style: italic;
		color: var(--text-primary);
		margin-bottom: 4px;
	}

	.page-subtitle {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		margin: 0;
	}

	.page-subtitle strong {
		color: var(--accent-pink);
	}

	/* Grid */
	.matches-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.match-card {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md);
		border-radius: var(--radius-xl);
		border: 1px solid var(--glass-border);
		transition: transform var(--duration-fast), border-color var(--duration-fast);
	}

	.match-card:hover {
		transform: translateY(-2px);
		border-color: rgba(255, 61, 127, 0.35);
	}

	.avatar {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-size: var(--text-xl);
		font-weight: 700;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		border: 2px solid rgba(255, 255, 255, 0.2);
		flex-shrink: 0;
	}

	.card-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.card-top {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
	}

	.profile-name {
		font-family: var(--font-display);
		font-size: var(--text-lg);
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.badges {
		display: flex;
		gap: 6px;
	}

	.dept-badge,
	.year-badge {
		font-size: 11px;
		padding: 2px 8px;
		border-radius: 10px;
		font-weight: 500;
	}

	.dept-badge {
		background: var(--glass-light);
		color: var(--text-secondary);
	}

	.year-badge {
		background: rgba(255, 61, 127, 0.15);
		color: #ff7597;
	}

	.ig-unlocked {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: #e1306c;
		font-weight: 600;
		padding: 2px 0;
	}

	.message-preview {
		font-size: var(--text-xs);
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin: 0;
	}

	.chat-btn {
		padding: 8px 16px;
		background: var(--gradient-accent);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--text-xs);
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition: transform var(--duration-fast);
		box-shadow: 0 4px 12px rgba(255, 61, 127, 0.3);
		font-family: var(--font-body);
	}

	.chat-btn:hover {
		transform: scale(1.05);
	}

	/* Empty state */
	.empty-state {
		padding: var(--space-2xl) var(--space-lg);
		border-radius: var(--radius-xl);
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
	}

	.empty-icon {
		font-size: 48px;
	}

	.empty-title {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		color: var(--text-primary);
		margin: 0;
	}

	.empty-desc {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		max-width: 320px;
		line-height: 1.5;
		margin: 0;
	}

	/* INCOMING REQUESTS SECTION */
	.requests-section {
		padding: var(--space-lg);
		border-radius: var(--radius-2xl);
		border: 1px solid rgba(255, 61, 127, 0.4);
		background: rgba(255, 61, 127, 0.05);
		box-shadow: 0 0 30px rgba(255, 61, 127, 0.15);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.requests-header {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.header-tag-row {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.pulse-sparkle {
		font-size: 18px;
		animation: pulse-glow 2s infinite;
	}

	.requests-title {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		color: #ffffff;
		margin: 0;
	}

	.requests-count-pill {
		font-size: 11px;
		font-weight: 700;
		color: #ffffff;
		background: var(--gradient-primary);
		padding: 2px 8px;
		border-radius: 12px;
	}

	.requests-subtitle {
		font-size: var(--text-xs);
		color: var(--text-secondary);
		margin: 0;
	}

	.requests-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-md);
	}

	.request-card {
		padding: var(--space-md);
		border-radius: var(--radius-xl);
		border: 1px solid var(--glass-border);
		background: rgba(18, 18, 30, 0.7);
		display: flex;
		flex-direction: column;
		gap: 10px;
		transition: transform var(--duration-fast);
	}

	.request-card:hover {
		transform: translateY(-2px);
		border-color: rgba(255, 61, 127, 0.4);
	}

	.request-card-top {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.request-avatar {
		width: 52px;
		height: 52px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-weight: 700;
		font-size: 18px;
		overflow: hidden;
		border: 2px solid rgba(255, 255, 255, 0.2);
		flex-shrink: 0;
	}

	.req-img, .avatar-photo, .out-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.request-user-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.req-name-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.req-name {
		font-family: var(--font-display);
		font-size: var(--text-base);
		color: var(--text-primary);
		margin: 0;
	}

	.req-time {
		font-size: 10px;
		color: var(--text-muted);
	}

	.request-thought-bubble {
		padding: 8px 12px;
		border-radius: var(--radius-md);
		border: 1px solid rgba(255, 61, 127, 0.25);
		background: rgba(255, 61, 127, 0.06);
	}

	.thought-tag {
		font-size: 10px;
		font-weight: 700;
		color: #ff7597;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.thought-text {
		font-size: var(--text-xs);
		color: #ffffff;
		margin: 2px 0 0;
		line-height: 1.4;
		font-style: italic;
	}

	.request-prompt-preview {
		padding: 6px 10px;
		border-radius: var(--radius-sm);
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--glass-border);
	}

	.req-prompt-q {
		font-size: 10px;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.req-prompt-a {
		font-size: 11px;
		color: var(--text-secondary);
		margin: 2px 0 0;
		font-style: italic;
	}

	.request-actions {
		display: flex;
		gap: 8px;
		margin-top: 4px;
	}

	.accept-req-btn {
		flex: 1;
		padding: 9px 12px;
		border-radius: var(--radius-md);
		border: none;
		background: var(--gradient-primary);
		color: white;
		font-size: var(--text-xs);
		font-weight: 600;
		cursor: pointer;
		transition: all var(--duration-fast);
		font-family: var(--font-body);
		box-shadow: 0 4px 12px rgba(255, 61, 127, 0.3);
	}

	.accept-req-btn:hover:not(:disabled) {
		transform: scale(1.03);
		box-shadow: 0 6px 16px rgba(255, 61, 127, 0.45);
	}

	.accept-req-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.decline-req-btn {
		padding: 8px 14px;
		border-radius: var(--radius-md);
		border: 1px solid var(--glass-border);
		background: rgba(255, 255, 255, 0.05);
		color: var(--text-muted);
		font-size: var(--text-xs);
		cursor: pointer;
		font-family: var(--font-body);
		transition: all var(--duration-fast);
	}

	.decline-req-btn:hover {
		color: #ff6b6b;
		border-color: rgba(255, 107, 107, 0.4);
		background: rgba(255, 107, 107, 0.1);
	}

	.match-bio-snippet {
		font-size: 11px;
		color: #00e5a0;
		margin: 0;
		font-style: italic;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* OUTGOING REQUESTS SECTION */
	.outgoing-section {
		margin-top: var(--space-xl);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.outgoing-header {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.outgoing-title {
		font-family: var(--font-display);
		font-size: var(--text-lg);
		color: var(--text-secondary);
		margin: 0;
	}

	.outgoing-subtitle {
		font-size: 11px;
		color: var(--text-muted);
	}

	.outgoing-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 10px;
	}

	.outgoing-card {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		border-radius: var(--radius-md);
		border: 1px solid var(--glass-border);
		background: rgba(255, 255, 255, 0.03);
	}

	.out-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-weight: 700;
		font-size: 14px;
		flex-shrink: 0;
		overflow: hidden;
	}

	.out-meta {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.out-name {
		font-size: var(--text-sm);
		color: var(--text-primary);
	}

	.out-dept {
		font-size: 11px;
		color: var(--text-muted);
	}

	.out-pending-tag {
		font-size: 10px;
		color: #ffd32a;
		font-weight: 500;
	}
</style>
