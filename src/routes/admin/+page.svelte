<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import {
		getEventSettings,
		updateEventSettings,
		getPendingProfiles,
		approvePendingProfile,
		rejectPendingProfile,
		approveAllPhotos,
		getSafetyReports,
		loadReports,
		actionReport,
		loadAdminData,
		getAdminToken,
		getAdminName,
		clearAdminSession,
		resetAllData,
		addToast,
		getRegisteredUsers,
		type RegisteredUserSummary
	} from '$lib/stores/gameState.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let settings = $derived(getEventSettings());
	let pending = $derived(getPendingProfiles());
	let reports = $derived(getSafetyReports());
	let adminName = $derived(getAdminName());
	let registeredUsers = $derived<RegisteredUserSummary[]>(getRegisteredUsers());

	let announcementDraft = $state(settings.announcement);
	let pollInterval: ReturnType<typeof setInterval> | null = null;
	let manualUnmatchUser1 = $state('');
	let manualUnmatchUser2 = $state('');
	let showManualUnmatch = $state(false);

	onMount(async () => {
		const token = getAdminToken();
		if (!token) {
			addToast('Admin authorization required. Please sign in.', 'error');
			goto('/');
			return;
		}

		const success = await loadAdminData();
		if (!success) {
			addToast('Admin session expired or unauthorized', 'error');
			goto('/');
			return;
		}

		await loadReports();

		// Live polling every 4s for fresh moderation items
		pollInterval = setInterval(async () => {
			await loadAdminData();
			await loadReports();
		}, 4000);
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});

	function toggleSignups() {
		const newVal = !settings.signupsPaused;
		updateEventSettings({ signupsPaused: newVal });
		if (newVal) {
			addToast('Emergency Kill-Switch: New signups are now PAUSED ⏸️', 'error');
		} else {
			addToast('Signups resumed! Freshers can join again ✨', 'success');
		}
	}

	function toggleMatching() {
		const newVal = !settings.matchesPaused;
		updateEventSettings({ matchesPaused: newVal });
		addToast(newVal ? 'Matching paused temporarily' : 'Matching resumed', 'info');
	}

	function broadcastAnnouncement() {
		updateEventSettings({ announcement: announcementDraft.trim() });
		addToast('Announcement broadcast to all attendee screens! 📢', 'success');
	}

	function clearAnnouncement() {
		announcementDraft = '';
		updateEventSettings({ announcement: '' });
		addToast('Announcement banner cleared', 'info');
	}

	async function handleActionReport(reportId: string, action: 'dismiss' | 'unmatch' | 'ban') {
		await actionReport(reportId, action);
		await loadReports();
		await loadAdminData();
	}

	async function handleManualForceUnmatch() {
		if (!manualUnmatchUser1.trim() || !manualUnmatchUser2.trim()) {
			addToast('Enter both user IDs or emails', 'error');
			return;
		}
		try {
			const res = await fetch('/api/reports', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${getAdminToken()}`
				},
				body: JSON.stringify({
					action: 'forceUnmatch',
					user1Id: manualUnmatchUser1.trim(),
					user2Id: manualUnmatchUser2.trim()
				})
			});
			if (res.ok) {
				addToast('Users successfully separated and force-unmatched', 'success');
				manualUnmatchUser1 = '';
				manualUnmatchUser2 = '';
				showManualUnmatch = false;
				await loadAdminData();
			}
		} catch (err) {
			console.error(err);
		}
	}

	function handleLogout() {
		clearAdminSession();
		addToast('Organizer logged out', 'info');
		goto('/');
	}
</script>

<svelte:head>
	<title>Organizer Command Center — Secret Admirer</title>
</svelte:head>

<main class="admin-page">
	<!-- Top Bar -->
	<header class="admin-header glass-strong">
		<div class="header-left">
			<button class="back-app-btn" onclick={() => goto('/')}>
				← Student View
			</button>
			<div class="live-indicator">
				<span class="pulse-dot"></span>
				<span class="live-text">LIVE ORGANIZER DESK</span>
			</div>
		</div>

		<h1 class="header-title">TKMCE Orientation Console</h1>

		<div class="header-right">
			<ThemeToggle />
			<button class="projector-link-btn glass" onclick={() => goto('/admin/projector')}>
				📽️ Projector Mode
			</button>
			<button class="logs-link-btn glass" onclick={() => goto('/admin/logs')}>
				📜 Audit & Login Logs
			</button>
			<div class="role-badge glass">
				<span>🛡️ {adminName}</span>
			</div>
			<button class="logout-btn" onclick={handleLogout} title="Log out of organizer session">
				🚪
			</button>
		</div>
	</header>

	<div class="admin-content container">
		<!-- Emergency Kill-Switch Quick Bar -->
		<section class="killswitch-bar glass" class:paused-state={settings.signupsPaused}>
			<div class="killswitch-meta">
				<div class="killswitch-title-row">
					<span class="killswitch-icon">{settings.signupsPaused ? '⏸️' : '⚡'}</span>
					<strong>Attendee Registration Gate</strong>
					<span class="status-chip" class:chip-paused={settings.signupsPaused}>
						{settings.signupsPaused ? 'SIGNUPS PAUSED' : 'SIGNUPS ACTIVE'}
					</span>
				</div>
				<p class="killswitch-desc">
					{settings.signupsPaused
						? 'New attendees cannot sign up. Returning users can still access existing chats and profiles.'
						: 'Orientation freshers can freely register with @tkmce.ac.in emails.'}
				</p>
			</div>

			<button
				type="button"
				class="killswitch-btn"
				class:btn-resume={settings.signupsPaused}
				onclick={toggleSignups}
			>
				{settings.signupsPaused ? '▶️ Resume Signups' : '⏸️ Pause New Signups (Kill-Switch)'}
			</button>
		</section>

		<!-- Metrics Overview -->
		<section class="metrics-grid">
			<div class="metric-card glass">
				<span class="metric-icon">👥</span>
				<div class="metric-info">
					<span class="metric-value">{settings.totalSignups}</span>
					<span class="metric-label">1st-Year Attendees</span>
				</div>
			</div>

			<div class="metric-card glass">
				<span class="metric-icon">📸</span>
				<div class="metric-info">
					<span class="metric-value">{pending.length}</span>
					<span class="metric-label">Photos Pending</span>
				</div>
			</div>

			<div class="metric-card glass">
				<span class="metric-icon">🚨</span>
				<div class="metric-info">
					<span class="metric-value">{reports.filter((r) => r.status === 'pending').length}</span>
					<span class="metric-label">Safety Reports</span>
				</div>
			</div>

			<div class="metric-card glass">
				<span class="metric-icon">📽️</span>
				<div class="metric-info">
					<span class="metric-value" style="font-size: 16px;">Clean Stream</span>
					<span class="metric-label">Projector Ready</span>
				</div>
				<button class="quick-nav-btn" onclick={() => goto('/admin/projector')}>
					Launch →
				</button>
			</div>
		</section>

		<!-- Section 1: Photo Moderation Queue (Actionable List with Approve / Reject / Approve All) -->
		<section class="queue-section glass-strong">
			<div class="section-heading-between">
				<div class="heading-left">
					<span class="section-icon">📸</span>
					<div>
						<h2 class="section-title">Photo Moderation Queue</h2>
						<span class="section-desc">Review and approve student photos before they appear in the discovery feed.</span>
					</div>
				</div>

				{#if pending.length > 0}
					<button type="button" class="approve-all-btn" onclick={approveAllPhotos}>
						✓ Approve All ({pending.length})
					</button>
				{/if}
			</div>

			{#if pending.length > 0}
				<div class="queue-grid">
					{#each pending as item}
						<div class="photo-card glass">
							{#if item.photo}
								<img src={item.photo} alt={item.name} class="photo-preview" />
							{:else}
								<div class="avatar-fallback" style="background: {item.photoGradient || 'linear-gradient(135deg, #ff3d7f, #7c3aed)'}">
									<span>{item.photoInitial || item.name.charAt(0)}</span>
								</div>
							{/if}

							<div class="card-details">
								<h4 class="card-name">{item.name}</h4>
								<span class="card-dept">{item.department || 'Dept Pending'} • {item.year}</span>
								<span class="card-email">📧 {item.email}</span>
							</div>

							<div class="card-action-bar">
								<button
									type="button"
									class="card-approve-btn"
									onclick={() => approvePendingProfile(item.id)}
								>
									✓ Approve
								</button>
								<button
									type="button"
									class="card-reject-btn"
									onclick={() => rejectPendingProfile(item.id)}
								>
									✕ Reject
								</button>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="queue-empty glass">
					<span class="empty-icon">✨</span>
					<h3>Moderation Queue is Clean!</h3>
					<p>All attendee photos are approved. New student uploads will appear here in real time.</p>
				</div>
			{/if}
		</section>

		<!-- Section 2: User Safety Reports & Force Unmatch Panel -->
		<section class="reports-section glass-strong">
			<div class="section-heading-between">
				<div class="heading-left">
					<span class="section-icon">🚨</span>
					<div>
						<h2 class="section-title">Safety Reports & Force-Unmatch Panel</h2>
						<span class="section-desc">Moderation actions tied to in-chat reports and mutual separation controls.</span>
					</div>
				</div>

				<button
					type="button"
					class="manual-unmatch-toggle-btn"
					onclick={() => (showManualUnmatch = !showManualUnmatch)}
				>
					{showManualUnmatch ? 'Hide Manual Tool' : '⚡ Manual Force-Unmatch'}
				</button>
			</div>

			<!-- Manual Unmatch Form -->
			{#if showManualUnmatch}
				<div class="manual-unmatch-box glass">
					<h4 style="margin: 0 0 6px; font-size: 13px; color: #ff7597;">Manual Match Separation:</h4>
					<p style="font-size: 11px; color: var(--text-muted); margin: 0 0 10px;">
						Immediately separates any two attendees, cancels existing matches, and places mutual blocks between them.
					</p>
					<div class="unmatch-inputs">
						<input
							type="text"
							class="glass-mini-input"
							placeholder="User 1 ID or Email"
							bind:value={manualUnmatchUser1}
						/>
						<span style="color: var(--text-muted);">✕</span>
						<input
							type="text"
							class="glass-mini-input"
							placeholder="User 2 ID or Email"
							bind:value={manualUnmatchUser2}
						/>
						<button type="button" class="execute-unmatch-btn" onclick={handleManualForceUnmatch}>
							Force Unmatch 🚫
						</button>
					</div>
				</div>
			{/if}

			<!-- Reports List -->
			{#if reports.length > 0}
				<div class="reports-list">
					{#each reports as r}
						<div class="report-item glass" class:is-resolved={r.status !== 'pending'}>
							<div class="report-info">
								<div class="report-header-line">
									<span class="report-target">Reported: <strong>{r.reportedUserName}</strong></span>
									<span class="target-email">({r.reportedUserEmail})</span>
									<span class="report-status-badge status-{r.status}">{r.status.toUpperCase()}</span>
								</div>
								<p class="report-reason">Reason: <em>"{r.reason}"</em></p>
								<span class="report-meta">Filed by: {r.reporterName} • {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
							</div>

							{#if r.status === 'pending'}
								<div class="report-actions">
									<button
										type="button"
										class="report-unmatch-btn"
										onclick={() => handleActionReport(r.id, 'unmatch')}
										title="Force-unmatch and block both attendees"
									>
										🚫 Force Unmatch
									</button>
									<button
										type="button"
										class="report-ban-btn"
										onclick={() => handleActionReport(r.id, 'ban')}
										title="Suspend reported user from platform"
									>
										🔨 Suspend User
									</button>
									<button
										type="button"
										class="report-dismiss-btn"
										onclick={() => handleActionReport(r.id, 'dismiss')}
										title="Dismiss report if benign"
									>
										Dismiss
									</button>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<div class="queue-empty glass">
					<span class="empty-icon">🛡️</span>
					<h3>No Safety Incidents Reported</h3>
					<p>Attendees can use the shield button in chat to quietly report harassment or fake profiles.</p>
				</div>
			{/if}
		</section>

		<!-- Section 3: Registered Students Directory (Summary Card) -->
		<section class="students-summary-section glass-strong">
			<div class="section-heading-between">
				<div class="heading-left">
					<span class="section-icon">👥</span>
					<div>
						<h2 class="section-title">Registered Students Directory</h2>
						<span class="section-desc">Live roster of unique 1st-year attendees</span>
					</div>
				</div>
				<div class="directory-actions">
					<button class="view-members-btn" onclick={() => goto('/admin/members')}>
						👥 View Full Directory →
					</button>
					<button class="logs-shortcut-btn glass" onclick={() => goto('/admin/logs')}>
						📜 Audit Logs →
					</button>
				</div>
			</div>

			<!-- Quick Stats Row -->
			<div class="members-quick-stats">
				<div class="quick-stat-pill">
					<span class="qs-num">{registeredUsers.length}</span>
					<span class="qs-label">Total Enrolled</span>
				</div>
				<div class="quick-stat-pill success">
					<span class="qs-num">{registeredUsers.filter(u => u.approved).length}</span>
					<span class="qs-label">Active Profiles</span>
				</div>
				<div class="quick-stat-pill warn">
					<span class="qs-num">{registeredUsers.filter(u => !u.approved).length}</span>
					<span class="qs-label">Pending Review</span>
				</div>
				<div class="quick-stat-pill pink">
					<span class="qs-num">{registeredUsers.reduce((s, u) => s + u.matchesCount, 0)}</span>
					<span class="qs-label">Total Matches</span>
				</div>
			</div>

			<!-- Latest registrants mini-row -->
			{#if registeredUsers.length > 0}
				<div class="latest-students-row">
					<span class="latest-label">Recent:</span>
					{#each registeredUsers.slice(0, 5) as u (u.id)}
						<div
							class="student-mini-chip"
							title="{u.name} — {u.department}"
						>
							<div class="mini-avatar" style="background: {u.photoGradient || 'linear-gradient(135deg, #ff3d7f, #7c3aed)'}">
								{u.photoInitial || u.name.charAt(0).toUpperCase()}
							</div>
							<span class="mini-name">{u.name.split(' ')[0]}</span>
						</div>
					{/each}
					{#if registeredUsers.length > 5}
						<span class="more-chip">+{registeredUsers.length - 5} more</span>
					{/if}
				</div>
			{:else}
				<p class="no-members-hint">No attendees registered yet. Share the link to get started!</p>
			{/if}
		</section>


		<!-- Section 4: Live Broadcast Announcement -->
		<section class="announcement-section glass">
			<div class="section-heading">
				<span class="section-icon">📢</span>
				<h2 class="section-title">Broadcast Announcement Banner</h2>
			</div>

			<p class="section-desc">
				Pins a live banner message to all attendee screens (Discover, Matches, Chat).
			</p>

			<div class="announcement-form">
				<input
					type="text"
					class="broadcast-input glass"
					placeholder="e.g. 5 minutes remaining in orientation session! Check your matches 💕"
					bind:value={announcementDraft}
				/>
				<div class="broadcast-actions">
					<button type="button" class="broadcast-btn" onclick={broadcastAnnouncement}>
						Broadcast Live 📢
					</button>
					{#if settings.announcement}
						<button type="button" class="clear-btn" onclick={clearAnnouncement}>
							Clear Banner
						</button>
					{/if}
				</div>
			</div>
		</section>

		<!-- Section 4: Secondary Gates & Data Reset -->
		<section class="controls-section glass">
			<div class="section-heading">
				<span class="section-icon">⚙️</span>
				<h2 class="section-title">Secondary Controls & Database Reset</h2>
			</div>

			<div class="switches-grid">
				<div class="control-box">
					<div>
						<h3 class="control-title">Hold Match Reveals</h3>
						<p class="control-desc">Allow attendees to browse and swipe, but hold off revealing mutual matches until orientation reveal time.</p>
					</div>
					<button
						type="button"
						class="toggle-switch-btn"
						class:is-paused={settings.matchesPaused}
						onclick={toggleMatching}
					>
						{settings.matchesPaused ? 'MATCHES ON HOLD ⏸️' : 'REVEALS ACTIVE ✅'}
					</button>
				</div>

				<div class="control-box danger-box">
					<div>
						<h3 class="control-title" style="color: #ff4d4f;">Reset Event Database</h3>
						<p class="control-desc">Completely clear all signups, swipes, matches, and messages to start a clean event run.</p>
					</div>
					<button
						type="button"
						class="reset-btn"
						onclick={async () => {
							if (confirm('Are you sure you want to reset ALL attendee data, matches, and messages?')) {
								await resetAllData();
								await loadAdminData();
							}
						}}
					>
						🗑️ Reset All Event Data
					</button>
				</div>
			</div>
		</section>
	</div>
</main>

<style>
	.admin-page {
		min-height: 100dvh;
		background: #08080d;
		color: var(--text-primary);
		padding-bottom: var(--space-2xl);
		font-family: var(--font-body);
	}

	/* Header */
	.admin-header {
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

	.header-left {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.back-app-btn {
		background: none;
		border: 1px solid var(--glass-border);
		color: var(--text-secondary);
		padding: 6px 12px;
		border-radius: var(--radius-sm);
		font-size: var(--text-xs);
		cursor: pointer;
		transition: all var(--duration-fast);
	}

	.back-app-btn:hover {
		color: white;
		background: var(--glass-medium);
	}

	.live-indicator {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.pulse-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #00e5a0;
		box-shadow: 0 0 10px #00e5a0;
		animation: live-blink 1.5s infinite;
	}

	.live-text {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: #00e5a0;
	}

	.header-title {
		font-family: var(--font-display);
		font-size: var(--text-lg);
		font-weight: 600;
		margin: 0;
		color: var(--text-primary);
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.projector-link-btn {
		font-size: var(--text-xs);
		font-weight: 600;
		color: #ffd32a;
		background: rgba(255, 211, 42, 0.12);
		border: 1px solid rgba(255, 211, 42, 0.35);
		padding: 6px 12px;
		border-radius: 14px;
		cursor: pointer;
		transition: all var(--duration-fast);
	}

	.projector-link-btn:hover {
		background: rgba(255, 211, 42, 0.25);
		transform: translateY(-1px);
	}

	.logs-link-btn {
		font-size: var(--text-xs);
		font-weight: 500;
		color: #c4b5fd;
		background: rgba(124, 58, 237, 0.15);
		border: 1px solid rgba(124, 58, 237, 0.35);
		padding: 6px 12px;
		border-radius: 14px;
		cursor: pointer;
		transition: all var(--duration-fast);
	}

	.logs-link-btn:hover {
		background: rgba(124, 58, 237, 0.28);
		transform: translateY(-1px);
	}

	.role-badge {
		font-size: var(--text-xs);
		padding: 5px 12px;
		border-radius: 14px;
		color: var(--text-secondary);
		border: 1px solid var(--glass-border);
	}

	.logout-btn {
		background: none;
		border: 1px solid var(--glass-border);
		color: var(--text-muted);
		padding: 6px 10px;
		border-radius: 12px;
		cursor: pointer;
		font-size: 14px;
	}

	.logout-btn:hover {
		color: #ff4d4f;
		background: rgba(255, 77, 79, 0.15);
	}

	/* Content */
	.admin-content {
		padding-top: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
	}

	/* Kill-switch quick bar */
	.killswitch-bar {
		padding: 16px 22px;
		border-radius: var(--radius-xl);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		border: 1px solid rgba(0, 229, 160, 0.3);
		background: rgba(0, 229, 160, 0.04);
	}

	.killswitch-bar.paused-state {
		border-color: #ff3d7f;
		background: rgba(255, 61, 127, 0.08);
		box-shadow: 0 0 24px rgba(255, 61, 127, 0.15);
	}

	.killswitch-title-row {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: var(--text-sm);
	}

	.status-chip {
		font-size: 10px;
		font-weight: 700;
		padding: 2px 8px;
		border-radius: 10px;
		background: rgba(0, 229, 160, 0.15);
		color: #00e5a0;
	}

	.status-chip.chip-paused {
		background: rgba(255, 61, 127, 0.2);
		color: #ff7597;
	}

	.killswitch-desc {
		font-size: 11px;
		color: var(--text-secondary);
		margin: 4px 0 0;
	}

	.killswitch-btn {
		padding: 10px 18px;
		border-radius: 10px;
		font-size: var(--text-xs);
		font-weight: 700;
		cursor: pointer;
		border: 1px solid #ff3d7f;
		background: rgba(255, 61, 127, 0.15);
		color: #ff7597;
		transition: all 0.2s;
	}

	.killswitch-btn.btn-resume {
		background: rgba(0, 229, 160, 0.2);
		border-color: #00e5a0;
		color: #00e5a0;
	}

	/* Metrics Grid */
	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.metric-card {
		position: relative;
		padding: var(--space-lg);
		border-radius: var(--radius-xl);
		display: flex;
		align-items: center;
		gap: var(--space-md);
		border: 1px solid var(--glass-border);
	}

	.metric-icon {
		font-size: 30px;
	}

	.metric-value {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		font-weight: 700;
		color: var(--text-primary);
	}

	.metric-label {
		font-size: var(--text-xs);
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.quick-nav-btn {
		margin-left: auto;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid var(--glass-border);
		color: #ffd32a;
		padding: 4px 10px;
		border-radius: 8px;
		font-size: 11px;
		cursor: pointer;
	}

	/* Headings */
	.section-heading-between {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: var(--space-md);
		flex-wrap: wrap;
	}

	.heading-left {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.section-icon {
		font-size: 24px;
	}

	.section-title {
		font-family: var(--font-display);
		font-size: var(--text-lg);
		font-weight: 600;
		margin: 0;
	}

	.section-desc {
		font-size: 11px;
		color: var(--text-muted);
		display: block;
		margin-top: 2px;
	}

	/* Photo Queue Grid */
	.queue-section {
		padding: var(--space-xl);
		border-radius: var(--radius-2xl);
		border: 1px solid var(--glass-border);
	}

	.approve-all-btn {
		padding: 8px 16px;
		border-radius: 8px;
		background: rgba(0, 229, 160, 0.15);
		border: 1px solid rgba(0, 229, 160, 0.4);
		color: #00e5a0;
		font-size: var(--text-xs);
		font-weight: 700;
		cursor: pointer;
	}

	.queue-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: var(--space-md);
	}

	.photo-card {
		padding: var(--space-md);
		border-radius: var(--radius-lg);
		border: 1px solid var(--glass-border);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 10px;
	}

	.photo-preview {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid var(--accent-pink);
	}

	.avatar-fallback {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-size: 28px;
		font-weight: 700;
	}

	.card-name {
		font-size: var(--text-sm);
		font-weight: 600;
		margin: 0;
	}

	.card-dept {
		font-size: 11px;
		color: var(--text-secondary);
		display: block;
	}

	.card-email {
		font-size: 10px;
		color: var(--text-muted);
		display: block;
	}

	.card-action-bar {
		display: flex;
		gap: 8px;
		width: 100%;
		margin-top: 4px;
	}

	.card-approve-btn {
		flex: 1;
		padding: 7px;
		border-radius: 6px;
		background: #00e5a0;
		color: #000;
		border: none;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
	}

	.card-reject-btn {
		flex: 1;
		padding: 7px;
		border-radius: 6px;
		background: rgba(255, 61, 127, 0.15);
		color: #ff7597;
		border: 1px solid rgba(255, 61, 127, 0.4);
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
	}

	/* Reports Section */
	.reports-section {
		padding: var(--space-xl);
		border-radius: var(--radius-2xl);
		border: 1px solid var(--glass-border);
	}

	.manual-unmatch-toggle-btn {
		padding: 6px 12px;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid var(--glass-border);
		color: var(--text-secondary);
		font-size: 11px;
		cursor: pointer;
	}

	.manual-unmatch-box {
		padding: 14px 18px;
		border-radius: var(--radius-md);
		border: 1px solid rgba(255, 61, 127, 0.3);
		background: rgba(255, 61, 127, 0.05);
		margin-bottom: var(--space-md);
	}

	.unmatch-inputs {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.glass-mini-input {
		flex: 1;
		min-width: 180px;
		padding: 8px 12px;
		border-radius: 6px;
		border: 1px solid var(--glass-border);
		background: rgba(0, 0, 0, 0.4);
		color: #fff;
		font-size: 12px;
	}

	.execute-unmatch-btn {
		padding: 8px 14px;
		background: #ff3d7f;
		color: #fff;
		border: none;
		border-radius: 6px;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
	}

	.reports-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.report-item {
		padding: 14px 18px;
		border-radius: var(--radius-md);
		border: 1px solid var(--glass-border);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		flex-wrap: wrap;
	}

	.report-item.is-resolved {
		opacity: 0.5;
	}

	.report-header-line {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
	}

	.target-email {
		font-size: 11px;
		color: var(--text-muted);
	}

	.report-status-badge {
		font-size: 9px;
		font-weight: 700;
		padding: 1px 6px;
		border-radius: 6px;
	}

	.status-pending {
		background: rgba(255, 77, 79, 0.2);
		color: #ff4d4f;
	}

	.status-resolved {
		background: rgba(0, 229, 160, 0.2);
		color: #00e5a0;
	}

	.status-dismissed {
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-muted);
	}

	.report-reason {
		margin: 4px 0 2px;
		font-size: 12px;
		color: #ff7597;
	}

	.report-meta {
		font-size: 10px;
		color: var(--text-muted);
	}

	/* Students Directory Table Section */
	.students-directory-section,
	.students-summary-section {
		padding: var(--space-xl);
		border-radius: var(--radius-xl);
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.view-members-btn {
		padding: 8px 16px;
		font-size: 13px;
		font-weight: 600;
		background: var(--gradient-primary);
		color: white;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all var(--duration-fast);
		font-family: var(--font-body);
		box-shadow: 0 4px 12px rgba(255, 61, 127, 0.25);
	}

	.view-members-btn:hover {
		transform: scale(1.03);
		box-shadow: 0 6px 18px rgba(255, 61, 127, 0.4);
	}

	.members-quick-stats {
		display: flex;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.quick-stat-pill {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 12px 20px;
		border-radius: var(--radius-md);
		background: var(--glass-light);
		border: 1px solid var(--glass-border);
		min-width: 90px;
	}

	.quick-stat-pill.success { border-color: rgba(0, 229, 160, 0.25); background: rgba(0, 229, 160, 0.06); }
	.quick-stat-pill.warn { border-color: rgba(245, 158, 11, 0.25); background: rgba(245, 158, 11, 0.06); }
	.quick-stat-pill.pink { border-color: rgba(255, 61, 127, 0.25); background: rgba(255, 61, 127, 0.06); }

	.qs-num {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		font-weight: 700;
		color: var(--text-primary);
	}

	.qs-label {
		font-size: 11px;
		color: var(--text-muted);
		text-align: center;
	}

	.latest-students-row {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.latest-label {
		font-size: 12px;
		color: var(--text-muted);
		font-weight: 500;
	}

	.student-mini-chip {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px 4px 4px;
		border-radius: 20px;
		background: var(--glass-light);
		border: 1px solid var(--glass-border);
		cursor: default;
	}

	.mini-avatar {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-weight: 700;
		font-size: 11px;
	}

	.mini-name {
		font-size: 12px;
		color: var(--text-primary);
		font-weight: 500;
	}

	.more-chip {
		font-size: 12px;
		color: var(--text-muted);
		padding: 4px 10px;
		border-radius: 20px;
		background: var(--glass-light);
		border: 1px solid var(--glass-border);
	}

	.no-members-hint {
		font-size: var(--text-sm);
		color: var(--text-muted);
		text-align: center;
		padding: var(--space-md);
	}


	.logs-shortcut-btn {
		padding: 8px 14px;
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		border-radius: 8px;
		border: 1px solid var(--glass-border);
		cursor: pointer;
		transition: all var(--duration-fast);
	}

	.logs-shortcut-btn:hover {
		color: #ffffff;
		background: rgba(255, 255, 255, 0.1);
	}

	.directory-search-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
	}

	.search-box {
		flex: 1;
		max-width: 440px;
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 12px;
		font-size: 14px;
		pointer-events: none;
		opacity: 0.6;
	}

	.search-input {
		width: 100%;
		padding: 10px 36px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--glass-border);
		border-radius: 10px;
		color: var(--text-primary);
		font-size: 13px;
	}

	.search-input:focus {
		outline: none;
		border-color: rgba(255, 61, 127, 0.4);
		background: rgba(255, 255, 255, 0.08);
	}

	.clear-search-btn {
		position: absolute;
		right: 12px;
		font-size: 11px;
		color: var(--text-muted);
		cursor: pointer;
	}

	.student-count-badge {
		font-size: 12px;
		font-weight: 600;
		color: var(--accent-pink);
		background: rgba(255, 61, 127, 0.1);
		border: 1px solid rgba(255, 61, 127, 0.25);
		padding: 4px 12px;
		border-radius: 20px;
		white-space: nowrap;
	}

	.students-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
		text-align: left;
	}

	.students-table th {
		padding: 12px 16px;
		background: rgba(255, 255, 255, 0.04);
		color: var(--text-muted);
		font-weight: 600;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		border-bottom: 1px solid var(--glass-border);
	}

	.students-table td {
		padding: 12px 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		vertical-align: middle;
	}

	.student-row:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.idx-cell {
		color: var(--text-muted);
		font-weight: 600;
		text-align: center;
	}

	.avatar-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.user-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #ffffff;
		font-size: 14px;
		font-weight: 700;
		flex-shrink: 0;
	}

	.avatar-thumb {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		object-fit: cover;
	}

	.user-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.student-name {
		font-size: 13px;
		color: var(--text-primary);
	}

	.student-insta {
		font-size: 10px;
		color: var(--accent-pink);
	}

	.student-email {
		font-size: 12px;
		color: #a5b4fc;
		background: rgba(99, 102, 241, 0.1);
		border: 1px solid rgba(99, 102, 241, 0.25);
		padding: 3px 8px;
		border-radius: 6px;
	}

	.dept-badge {
		font-size: 11px;
		font-weight: 600;
		color: var(--accent-purple);
		background: rgba(155, 89, 182, 0.12);
		border: 1px solid rgba(155, 89, 182, 0.25);
		padding: 2px 8px;
		border-radius: 10px;
		display: inline-block;
	}

	.year-sub {
		display: block;
		font-size: 10px;
		color: var(--text-muted);
		margin-top: 2px;
	}

	.intro-cell {
		max-width: 220px;
	}

	.student-intro-bubble {
		display: flex;
		align-items: flex-start;
		gap: 6px;
		padding: 6px 10px;
		border-radius: 10px;
		background: rgba(255, 61, 127, 0.08);
		border: 1px solid rgba(255, 61, 127, 0.25);
	}

	.bubble-icon {
		font-size: 12px;
		flex-shrink: 0;
		margin-top: 1px;
	}

	.intro-text {
		font-size: 11px;
		color: #ffffff;
		font-style: italic;
		line-height: 1.35;
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.no-intro-tag {
		color: var(--text-muted);
		font-size: 12px;
	}

	.time-cell {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.time-main {
		font-weight: 500;
		color: var(--text-primary);
	}

	.time-sub {
		font-size: 10px;
		color: var(--text-muted);
	}

	.status-pill {
		font-size: 10px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 10px;
		white-space: nowrap;
	}

	.status-approved {
		color: #10b981;
		background: rgba(16, 185, 129, 0.12);
		border: 1px solid rgba(16, 185, 129, 0.3);
	}

	.status-pending {
		color: #f59e0b;
		background: rgba(245, 158, 11, 0.12);
		border: 1px solid rgba(245, 158, 11, 0.3);
	}

	.activity-chips {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.activity-chips span {
		font-size: 10px;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: 6px;
	}

	.chip-match {
		color: var(--accent-pink);
		background: rgba(255, 61, 127, 0.12);
	}

	.chip-swipe {
		color: #38bdf8;
		background: rgba(56, 189, 248, 0.12);
	}

	.chip-login {
		color: #fbbf24;
		background: rgba(251, 191, 36, 0.12);
	}

	.device-cell .device-text {
		font-size: 11px;
		color: var(--text-secondary);
	}

	.report-actions {
		display: flex;
		gap: 8px;
	}

	.report-unmatch-btn {
		padding: 6px 12px;
		border-radius: 6px;
		background: rgba(255, 61, 127, 0.2);
		border: 1px solid #ff3d7f;
		color: #ff7597;
		font-size: 11px;
		font-weight: 600;
		cursor: pointer;
	}

	.report-ban-btn {
		padding: 6px 12px;
		border-radius: 6px;
		background: rgba(255, 77, 79, 0.25);
		border: 1px solid #ff4d4f;
		color: #ff7875;
		font-size: 11px;
		font-weight: 600;
		cursor: pointer;
	}

	.report-dismiss-btn {
		padding: 6px 10px;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--glass-border);
		color: var(--text-muted);
		font-size: 11px;
		cursor: pointer;
	}

	/* Announcement & Controls */
	.announcement-section,
	.controls-section {
		padding: var(--space-xl);
		border-radius: var(--radius-2xl);
		border: 1px solid var(--glass-border);
	}

	.announcement-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.broadcast-input {
		width: 100%;
		padding: 12px 16px;
		border-radius: var(--radius-md);
		border: 1px solid var(--glass-border);
		background: rgba(255, 255, 255, 0.04);
		color: var(--text-primary);
		font-size: var(--text-sm);
		outline: none;
	}

	.broadcast-actions {
		display: flex;
		gap: 8px;
	}

	.broadcast-btn {
		padding: 10px 20px;
		border-radius: var(--radius-md);
		border: none;
		background: linear-gradient(135deg, #ffa502, #ff6348);
		color: white;
		font-size: var(--text-xs);
		font-weight: 600;
		cursor: pointer;
	}

	.clear-btn {
		padding: 10px 16px;
		border-radius: var(--radius-md);
		border: 1px solid var(--glass-border);
		background: rgba(255, 255, 255, 0.05);
		color: var(--text-secondary);
		font-size: var(--text-xs);
		cursor: pointer;
	}

	.switches-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-md);
		margin-top: var(--space-md);
	}

	.control-box {
		padding: var(--space-md);
		border-radius: var(--radius-lg);
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--glass-border);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: var(--space-md);
	}

	.danger-box {
		border-color: rgba(255, 77, 79, 0.3);
		background: rgba(255, 77, 79, 0.05);
	}

	.control-title {
		font-size: var(--text-sm);
		font-weight: 600;
		margin: 0 0 4px;
	}

	.control-desc {
		font-size: 11px;
		color: var(--text-secondary);
		line-height: 1.4;
		margin: 0;
	}

	.toggle-switch-btn {
		padding: 9px 14px;
		border-radius: var(--radius-md);
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
		border: 1px solid rgba(0, 229, 160, 0.4);
		background: rgba(0, 229, 160, 0.12);
		color: #00e5a0;
	}

	.toggle-switch-btn.is-paused {
		background: rgba(255, 61, 127, 0.2);
		border-color: #ff3d7f;
		color: #ff7597;
	}

	.reset-btn {
		padding: 9px 14px;
		border-radius: var(--radius-md);
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
		background: rgba(255, 77, 79, 0.15);
		border: 1px solid rgba(255, 77, 79, 0.4);
		color: #ff4d4f;
	}

	.queue-empty {
		padding: var(--space-xl);
		border-radius: var(--radius-lg);
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		color: var(--text-muted);
	}

	.empty-icon {
		font-size: 28px;
	}
</style>
