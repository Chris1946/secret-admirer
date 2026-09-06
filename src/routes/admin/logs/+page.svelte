<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import {
		loadAuditLogs,
		getAuditLogs,
		getRegisteredUsers,
		clearAuditLogs,
		addToast,
		type AccessLogRecord,
		type RegisteredUserSummary
	} from '$lib/stores/gameState.svelte';

	let logs = $derived<AccessLogRecord[]>(getAuditLogs());
	let registeredUsers = $derived<RegisteredUserSummary[]>(getRegisteredUsers());
	let viewMode = $state<'users' | 'audit'>('users');
	let searchQuery = $state('');
	let activeTab = $state<'all' | 'admin' | 'user'>('all');
	let autoRefresh = $state(true);
	let refreshInterval: ReturnType<typeof setInterval> | null = null;
	let isRefreshing = $state(false);

	// Derived filtered logs
	let filteredLogs = $derived.by(() => {
		let list = logs;
		if (activeTab === 'admin') {
			list = list.filter((l) => l.role === 'admin');
		} else if (activeTab === 'user') {
			list = list.filter((l) => l.role === 'user');
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter(
				(l) =>
					l.name.toLowerCase().includes(q) ||
					l.email.toLowerCase().includes(q) ||
					(l.ip && l.ip.toLowerCase().includes(q)) ||
					(l.device && l.device.toLowerCase().includes(q)) ||
					l.action.toLowerCase().includes(q) ||
					(l.details && l.details.toLowerCase().includes(q))
			);
		}

		return list;
	});

	// Derived filtered registered students (unique table)
	let filteredRegisteredUsers = $derived.by(() => {
		let list = registeredUsers;
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter(
				(u) =>
					u.name.toLowerCase().includes(q) ||
					u.email.toLowerCase().includes(q) ||
					u.department.toLowerCase().includes(q) ||
					u.year.toLowerCase().includes(q) ||
					(u.lastDevice && u.lastDevice.toLowerCase().includes(q))
			);
		}
		return list;
	});

	// Metrics: STRICTLY UNIQUE REGISTERED STUDENTS
	let uniqueUsersCount = $derived(
		registeredUsers.length > 0
			? registeredUsers.length
			: new Set(logs.filter((l) => l.role === 'user').map((l) => l.email)).size
	);
	let userLoginsCount = $derived(logs.filter((l) => l.role === 'user').length);
	let adminLoginsCount = $derived(logs.filter((l) => l.role === 'admin').length);
	let uniqueIpsCount = $derived(
		new Set(logs.map((l) => l.ip).filter(Boolean)).size
	);

	async function refresh() {
		isRefreshing = true;
		await loadAuditLogs();
		setTimeout(() => {
			isRefreshing = false;
		}, 400);
	}

	function formatTimestamp(isoStr: string): string {
		try {
			const d = new Date(isoStr);
			return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
				' (' + d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ')';
		} catch {
			return isoStr;
		}
	}

	function getRelativeTime(isoStr: string): string {
		try {
			const diffMs = Date.now() - new Date(isoStr).getTime();
			const diffSec = Math.floor(diffMs / 1000);
			if (diffSec < 10) return 'Just now';
			if (diffSec < 60) return `${diffSec}s ago`;
			const diffMin = Math.floor(diffSec / 60);
			if (diffMin < 60) return `${diffMin}m ago`;
			const diffHr = Math.floor(diffMin / 60);
			return `${diffHr}h ago`;
		} catch {
			return '';
		}
	}

	function exportCsv() {
		if (logs.length === 0) {
			addToast('No logs to export', 'info');
			return;
		}

		const headers = ['Timestamp', 'Role', 'Action', 'Name', 'Email', 'IP Address', 'Device', 'Details'];
		const rows = logs.map((l) => [
			`"${l.timestamp}"`,
			`"${l.role}"`,
			`"${l.action}"`,
			`"${l.name}"`,
			`"${l.email}"`,
			`"${l.ip || ''}"`,
			`"${l.device || ''}"`,
			`"${(l.details || '').replace(/"/g, '""')}"`
		]);

		const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', `secret_admirer_access_logs_${Date.now()}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		addToast('Exported CSV logs', 'success');
	}

	async function handleClear() {
		if (confirm('Are you sure you want to clear all login and access history?')) {
			await clearAuditLogs();
		}
	}

	onMount(async () => {
		const token = localStorage.getItem('secret_admirer_admin_token');
		if (!token) {
			addToast('Admin authorization required. Please sign in.', 'error');
			goto('/');
			return;
		}

		await refresh();
		// Live polling every 3 seconds for continuous monitoring
		refreshInterval = setInterval(() => {
			if (autoRefresh) {
				loadAuditLogs();
			}
		}, 3000);
	});

	onDestroy(() => {
		if (refreshInterval) clearInterval(refreshInterval);
	});
</script>

<svelte:head>
	<title>Audit & Login Logs — Secret Admirer</title>
</svelte:head>

<main class="logs-page">
	<!-- Top Navigation -->
	<header class="logs-header glass-strong">
		<div class="header-left">
			<button class="nav-btn" onclick={() => goto('/admin')}>
				← Admin Dashboard
			</button>
			<button class="nav-btn-sub" onclick={() => goto('/discover')}>
				App Feed
			</button>
		</div>

		<div class="header-center">
			<span class="header-icon">📜</span>
			<h1 class="header-title">Access & Login Logs</h1>
			<span class="live-dot" title="Live Logging Active"></span>
		</div>

		<div class="header-right">
			<button
				class="refresh-btn"
				class:spinning={isRefreshing}
				onclick={refresh}
				title="Refresh logs"
			>
				🔄 {isRefreshing ? 'Syncing...' : 'Refresh'}
			</button>
			<button class="export-btn" onclick={exportCsv} title="Download CSV report">
				📥 Export CSV
			</button>
		</div>
	</header>

	<div class="logs-container container">
		<!-- Metric Summary Cards: Keep Unique Users As Primary Metric -->
		<section class="metrics-row">
			<button
				type="button"
				class="stat-card glass highlight-user-stat"
				class:active-stat-card={viewMode === 'users'}
				onclick={() => (viewMode = 'users')}
				title="View Unique Registered Students Table"
			>
				<div class="stat-icon-wrap user-icon">👥</div>
				<div class="stat-content">
					<span class="stat-val">{uniqueUsersCount}</span>
					<span class="stat-lbl">Unique Registered Students</span>
					<span class="stat-sub">{userLoginsCount} sign-in sessions</span>
				</div>
			</button>

			<button
				type="button"
				class="stat-card glass"
				class:active-stat-card={viewMode === 'audit' && activeTab === 'admin'}
				onclick={() => { viewMode = 'audit'; activeTab = 'admin'; }}
				title="View Admin Access Logs"
			>
				<div class="stat-icon-wrap admin-icon">🛡️</div>
				<div class="stat-content">
					<span class="stat-val">{adminLoginsCount}</span>
					<span class="stat-lbl">Admin Access Sessions</span>
				</div>
			</button>

			<div class="stat-card glass">
				<div class="stat-icon-wrap ip-icon">🌐</div>
				<div class="stat-content">
					<span class="stat-val">{uniqueIpsCount}</span>
					<span class="stat-lbl">Unique IPs Tracked</span>
				</div>
			</div>

			<button
				type="button"
				class="stat-card glass"
				class:active-stat-card={viewMode === 'audit' && activeTab === 'all'}
				onclick={() => { viewMode = 'audit'; activeTab = 'all'; }}
				title="View All Audit Events"
			>
				<div class="stat-icon-wrap total-icon">⚡</div>
				<div class="stat-content">
					<span class="stat-val">{logs.length}</span>
					<span class="stat-lbl">Total Audit Events</span>
				</div>
			</button>
		</section>

		<!-- Table Mode Switcher: Dedicated Registered Students Table vs Live Audit Stream -->
		<section class="view-mode-bar glass-strong">
			<div class="mode-buttons-group">
				<button
					type="button"
					class="mode-switch-btn"
					class:active={viewMode === 'users'}
					onclick={() => (viewMode = 'users')}
				>
					<span class="mode-btn-icon">👥</span>
					<div class="mode-btn-text">
						<strong>Registered Students Directory</strong>
						<span class="mode-btn-sub">Dedicated Attendee Table • 1 row per student</span>
					</div>
					<span class="mode-counter">{uniqueUsersCount} Unique</span>
				</button>

				<button
					type="button"
					class="mode-switch-btn"
					class:active={viewMode === 'audit'}
					onclick={() => (viewMode = 'audit')}
				>
					<span class="mode-btn-icon">📜</span>
					<div class="mode-btn-text">
						<strong>Login & Activity Audit Stream</strong>
						<span class="mode-btn-sub">Chronological Access Events Log</span>
					</div>
					<span class="mode-counter">{logs.length} Events</span>
				</button>
			</div>
		</section>

		<!-- TABLE VIEW 1: DEDICATED REGISTERED STUDENTS TABLE -->
		{#if viewMode === 'users'}
			<section class="users-directory-section">
				<div class="directory-toolbar glass-strong">
					<div class="search-box">
						<span class="search-icon">🔍</span>
						<input
							type="text"
							placeholder="Search registered students by name, email, department..."
							bind:value={searchQuery}
							class="search-input"
						/>
						{#if searchQuery}
							<button class="clear-search-btn" onclick={() => (searchQuery = '')}>✕</button>
						{/if}
					</div>

					<div class="directory-summary-pills">
						<span class="dir-pill">🎓 {filteredRegisteredUsers.length} of {uniqueUsersCount} Unique Students</span>
						<label class="auto-refresh-toggle">
							<input type="checkbox" bind:checked={autoRefresh} />
							<span>Live auto-poll</span>
						</label>
					</div>
				</div>

				{#if filteredRegisteredUsers.length === 0}
					<div class="empty-feed glass">
						<span class="empty-icon">👥</span>
						<h3>No registered students found</h3>
						<p>
							{#if searchQuery}
								No students matching "{searchQuery}". Try clearing your search.
							{:else}
								No 1st-year students have registered yet. As soon as students sign up, they will appear in this table.
							{/if}
						</p>
					</div>
				{:else}
					<div class="table-card glass">
						<div class="table-header-intro">
							<div>
								<h3 class="intro-title">1st-Year Student Roster ({filteredRegisteredUsers.length} Unique Enrolled)</h3>
								<p class="intro-desc">Each student has exactly one unique record in this table upon registration.</p>
							</div>
						</div>

						<div class="table-responsive">
							<table class="logs-table users-table">
								<thead>
									<tr>
										<th style="width: 45px;">#</th>
										<th>Student Name</th>
										<th>College Email</th>
										<th>Department & Year</th>
										<th>Introduction / Bio</th>
										<th>Registered At</th>
										<th>Profile Status</th>
										<th>Activity & Matches</th>
										<th>Last Seen Device</th>
									</tr>
								</thead>
								<tbody>
									{#each filteredRegisteredUsers as u, idx (u.id)}
										<tr class="log-row">
											<td class="idx-col">{idx + 1}</td>

											<!-- Student Name & Avatar -->
											<td class="user-col">
												<div class="user-cell">
													<div
														class="user-avatar"
														style="background: {u.photoGradient || 'linear-gradient(135deg, #ff3d7f, #7c3aed)'}"
													>
														{#if u.photo}
															<img src={u.photo} alt={u.name} class="avatar-photo-thumb" />
														{:else}
															{u.photoInitial || u.name.charAt(0).toUpperCase()}
														{/if}
													</div>
													<div class="user-meta">
														<strong class="user-name">{u.name}</strong>
														{#if u.instagram}
															<span class="user-insta">📷 @{u.instagram}</span>
														{/if}
													</div>
												</div>
											</td>

											<!-- Email -->
											<td class="email-col">
												<div class="email-cell">
													<code class="email-code">{u.email}</code>
												</div>
											</td>

											<!-- Department & Year -->
											<td class="dept-col">
												<span class="dept-pill">{u.department}</span>
												<span class="year-sub">{u.year}</span>
											</td>

											<!-- Introduction / Bio -->
											<td class="intro-col">
												{#if u.bio}
													<div class="user-intro-chip" title={u.bio}>
														<span class="intro-icon">💭</span>
														<span class="intro-text">"{u.bio}"</span>
													</div>
												{:else}
													<span class="no-intro-tag">—</span>
												{/if}
											</td>

											<!-- Registration Time -->
											<td class="time-col">
												<div class="time-wrapper">
													<span class="time-exact">{formatTimestamp(u.createdAt)}</span>
													<span class="time-rel">{getRelativeTime(u.createdAt)}</span>
												</div>
											</td>

											<!-- Status -->
											<td class="status-col">
												{#if u.approved}
													<span class="status-pill status-approved">✓ Active Profile</span>
												{:else}
													<span class="status-pill status-pending">⏳ Photo Pending</span>
												{/if}
											</td>

											<!-- Activity & Matches -->
											<td class="stats-col">
												<div class="user-activity-badges">
													<span class="act-badge matches" title="Mutual admirers matched">
														💕 {u.matchesCount} match{u.matchesCount !== 1 ? 'es' : ''}
													</span>
													<span class="act-badge swipes" title="Batchmates swiped">
														👉 {u.swipesCount} swipes
													</span>
													<span class="act-badge logins" title="Total sign-ins on this account">
														🔑 {u.loginCount} logins
													</span>
												</div>
											</td>

											<!-- Last Seen Device -->
											<td class="device-col">
												<div class="device-meta">
													<span class="device-name">{u.lastDevice || 'Web Client'}</span>
													<span class="device-time">{getRelativeTime(u.lastLogin || u.createdAt)}</span>
												</div>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}
			</section>

		<!-- TABLE VIEW 2: ACCESS & SECURITY AUDIT STREAM -->
		{:else}
			<section class="audit-stream-section">
				<!-- Filter & Search Toolbar -->
				<div class="toolbar glass-strong">
					<div class="tabs-group" role="tablist">
						<button
							role="tab"
							aria-selected={activeTab === 'all'}
							class="tab-btn"
							class:active={activeTab === 'all'}
							onclick={() => (activeTab = 'all')}
						>
							All Events <span class="tab-count">{logs.length}</span>
						</button>
						<button
							role="tab"
							aria-selected={activeTab === 'admin'}
							class="tab-btn"
							class:active={activeTab === 'admin'}
							onclick={() => (activeTab = 'admin')}
						>
							🛡️ Admin Logins <span class="tab-count">{adminLoginsCount}</span>
						</button>
						<button
							role="tab"
							aria-selected={activeTab === 'user'}
							class="tab-btn"
							class:active={activeTab === 'user'}
							onclick={() => (activeTab = 'user')}
						>
							🎓 1st Year Logins <span class="tab-count">{userLoginsCount}</span>
						</button>
					</div>

					<div class="search-box">
						<span class="search-icon">🔍</span>
						<input
							type="text"
							placeholder="Search by name, email, IP, or device..."
							bind:value={searchQuery}
							class="search-input"
						/>
						{#if searchQuery}
							<button class="clear-search-btn" onclick={() => (searchQuery = '')}>✕</button>
						{/if}
					</div>

					<div class="toolbar-actions">
						<label class="auto-refresh-toggle">
							<input type="checkbox" bind:checked={autoRefresh} />
							<span>Live auto-poll</span>
						</label>
						{#if logs.length > 0}
							<button class="danger-btn" onclick={handleClear} title="Clear audit history">
								Clear Logs
							</button>
						{/if}
					</div>
				</div>

				<!-- Log Records Table / Card List -->
				<div class="logs-feed">
					{#if filteredLogs.length === 0}
						<div class="empty-feed glass">
							<span class="empty-icon">📂</span>
							<h3>No log records found</h3>
							<p>
								{#if searchQuery}
									No results matching "{searchQuery}". Try clearing your search term.
								{:else if activeTab !== 'all'}
									No {activeTab} login records yet.
								{:else}
									No attendee or admin logins recorded yet.
								{/if}
							</p>
						</div>
					{:else}
						<div class="table-card glass">
							<div class="table-responsive">
								<table class="logs-table">
									<thead>
										<tr>
											<th>Timestamp</th>
											<th>User / Actor</th>
											<th>Role</th>
											<th>Action</th>
											<th>Device & Browser</th>
											<th>IP Address</th>
											<th>Details</th>
										</tr>
									</thead>
									<tbody>
										{#each filteredLogs as log (log.id)}
											<tr class="log-row" class:is-admin={log.role === 'admin'}>
												<!-- Timestamp -->
												<td class="time-col">
													<div class="time-wrapper">
														<span class="time-exact">{formatTimestamp(log.timestamp)}</span>
														<span class="time-rel">{getRelativeTime(log.timestamp)}</span>
													</div>
												</td>

												<!-- User Info -->
												<td class="user-col">
													<div class="user-cell">
														<div
															class="user-avatar"
															class:admin-avatar={log.role === 'admin'}
														>
															{log.role === 'admin' ? '🛡️' : (log.name ? log.name.charAt(0).toUpperCase() : 'U')}
														</div>
														<div class="user-meta">
															<strong class="user-name">{log.name || 'Anonymous'}</strong>
															<span class="user-email">{log.email}</span>
														</div>
													</div>
												</td>

												<!-- Role -->
												<td class="role-col">
													{#if log.role === 'admin'}
														<span class="role-chip admin-chip">
															🛡️ Admin
														</span>
													{:else}
														<span class="role-chip student-chip">
															🎓 1st Year
														</span>
													{/if}
												</td>

												<!-- Action -->
												<td class="action-col">
													<span
														class="action-badge"
														class:act-register={log.action === 'register'}
														class:act-login={log.action === 'login'}
														class:act-admin-login={log.action === 'admin_login'}
														class:act-admin-action={log.action === 'admin_action'}
														class:act-profile={log.action === 'profile_update'}
													>
														{#if log.action === 'register'}
															✨ Registered
														{:else if log.action === 'login'}
															🔑 Signed In
														{:else if log.action === 'admin_login'}
															🛡️ Admin Auth
														{:else if log.action === 'admin_action'}
															⚙️ Admin Action
														{:else if log.action === 'profile_update'}
															📝 Profile Setup
														{:else}
															{log.action}
														{/if}
													</span>
												</td>

												<!-- Device & Browser -->
												<td class="device-col">
													<span class="device-text">{log.device || 'Unknown'}</span>
												</td>

												<!-- IP Address -->
												<td class="ip-col">
													<code class="ip-code">{log.ip || '127.0.0.1'}</code>
												</td>

												<!-- Details -->
												<td class="details-col">
													<span class="details-text" title={log.details || ''}>
														{log.details || '—'}
													</span>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{/if}
				</div>
			</section>
		{/if}
	</div>
</main>

<style>
	.logs-page {
		min-height: 100dvh;
		background: #08080d;
		color: var(--text-primary);
		padding-bottom: var(--space-3xl);
		font-family: var(--font-body);
	}

	/* Top Header */
	.logs-header {
		position: sticky;
		top: 0;
		z-index: var(--z-sticky);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px var(--space-lg);
		border-bottom: 1px solid var(--glass-border);
		backdrop-filter: blur(20px);
		background: rgba(10, 10, 16, 0.85);
	}

	.header-left,
	.header-right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.header-center {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.header-icon {
		font-size: 22px;
	}

	.header-title {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		font-style: italic;
		background: var(--gradient-accent);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0;
	}

	.live-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #00e5a0;
		box-shadow: 0 0 10px #00e5a0;
		animation: pulse-glow 2s infinite;
	}

	.nav-btn {
		background: none;
		border: 1px solid var(--glass-border);
		color: var(--text-secondary);
		font-size: var(--text-xs);
		padding: 6px 12px;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all var(--duration-fast);
	}

	.nav-btn:hover {
		color: var(--text-primary);
		background: var(--glass-light);
	}

	.nav-btn-sub {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: var(--text-xs);
		cursor: pointer;
		padding: 6px 8px;
	}

	.nav-btn-sub:hover {
		color: var(--text-secondary);
	}

	.refresh-btn,
	.export-btn {
		padding: 6px 14px;
		font-size: var(--text-xs);
		font-weight: 500;
		border-radius: 20px;
		cursor: pointer;
		transition: all var(--duration-fast);
		border: 1px solid var(--glass-border);
		background: var(--glass-light);
		color: var(--text-primary);
	}

	.refresh-btn:hover,
	.export-btn:hover {
		background: var(--glass-medium);
		transform: translateY(-1px);
	}

	.export-btn {
		background: rgba(124, 58, 237, 0.2);
		border-color: rgba(124, 58, 237, 0.4);
		color: #c4b5fd;
	}

	/* Main Container */
	.logs-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
		padding-top: var(--space-xl);
	}

	/* Metric Cards */
	.metrics-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: var(--space-md);
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 16px 20px;
		border-radius: var(--radius-lg);
		border: 1px solid var(--glass-border);
		transition: transform var(--duration-fast);
	}

	.stat-card:hover {
		transform: translateY(-2px);
	}

	.stat-icon-wrap {
		width: 44px;
		height: 44px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 20px;
		flex-shrink: 0;
	}

	.user-icon {
		background: rgba(0, 229, 160, 0.12);
		border: 1px solid rgba(0, 229, 160, 0.3);
	}

	.admin-icon {
		background: rgba(255, 165, 2, 0.12);
		border: 1px solid rgba(255, 165, 2, 0.3);
	}

	.ip-icon {
		background: rgba(84, 160, 255, 0.12);
		border: 1px solid rgba(84, 160, 255, 0.3);
	}

	.total-icon {
		background: rgba(255, 61, 127, 0.12);
		border: 1px solid rgba(255, 61, 127, 0.3);
	}

	.stat-content {
		display: flex;
		flex-direction: column;
	}

	.stat-val {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.1;
	}

	.stat-lbl {
		font-size: 11px;
		color: var(--text-muted);
		margin-top: 2px;
	}

	/* Toolbar */
	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px;
		padding: 12px 18px;
		border-radius: var(--radius-xl);
		border: 1px solid var(--glass-border);
	}

	.tabs-group {
		display: flex;
		gap: 4px;
		background: rgba(0, 0, 0, 0.3);
		padding: 4px;
		border-radius: var(--radius-md);
		border: 1px solid var(--glass-border);
	}

	.tab-btn {
		background: none;
		border: none;
		padding: 6px 14px;
		font-size: var(--text-xs);
		font-weight: 500;
		color: var(--text-secondary);
		border-radius: var(--radius-sm);
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 6px;
		transition: all var(--duration-fast);
		font-family: var(--font-body);
	}

	.tab-btn:hover {
		color: var(--text-primary);
	}

	.tab-btn.active {
		background: var(--gradient-accent);
		color: white;
		font-weight: 600;
		box-shadow: 0 2px 10px rgba(255, 61, 127, 0.3);
	}

	.tab-count {
		font-size: 10px;
		padding: 1px 6px;
		border-radius: 10px;
		background: rgba(0, 0, 0, 0.25);
	}

	.search-box {
		position: relative;
		flex: 1;
		min-width: 240px;
		max-width: 400px;
	}

	.search-icon {
		position: absolute;
		left: 12px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 14px;
		color: var(--text-muted);
	}

	.search-input {
		width: 100%;
		padding: 8px 32px 8px 34px;
		border-radius: 20px;
		border: 1px solid var(--glass-border);
		background: rgba(255, 255, 255, 0.05);
		color: var(--text-primary);
		font-size: var(--text-xs);
		outline: none;
		transition: border-color var(--duration-fast);
	}

	.search-input:focus {
		border-color: rgba(255, 61, 127, 0.5);
	}

	.clear-search-btn {
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 11px;
		cursor: pointer;
	}

	.toolbar-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.auto-refresh-toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.danger-btn {
		padding: 6px 12px;
		font-size: 11px;
		color: #ff7875;
		background: rgba(255, 77, 79, 0.1);
		border: 1px solid rgba(255, 77, 79, 0.3);
		border-radius: 8px;
		cursor: pointer;
		transition: background var(--duration-fast);
	}

	.danger-btn:hover {
		background: rgba(255, 77, 79, 0.2);
	}

	/* Table Card */
	.table-card {
		border-radius: var(--radius-xl);
		overflow: hidden;
		border: 1px solid var(--glass-border);
	}

	.table-responsive {
		width: 100%;
		overflow-x: auto;
	}

	.logs-table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
		font-size: var(--text-xs);
	}

	.logs-table th {
		padding: 14px 16px;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		font-size: 10px;
		letter-spacing: 0.08em;
		background: rgba(255, 255, 255, 0.02);
		border-bottom: 1px solid var(--glass-border);
		white-space: nowrap;
	}

	.logs-table td {
		padding: 14px 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		vertical-align: middle;
	}

	.log-row:hover td {
		background: rgba(255, 255, 255, 0.02);
	}

	.log-row.is-admin td {
		background: rgba(255, 165, 2, 0.02);
	}

	/* Cell Styles */
	.time-wrapper {
		display: flex;
		flex-direction: column;
		gap: 2px;
		white-space: nowrap;
	}

	.time-exact {
		font-family: monospace;
		font-size: 11px;
		color: var(--text-secondary);
	}

	.time-rel {
		font-size: 10px;
		color: var(--text-muted);
	}

	.user-cell {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 180px;
	}

	.user-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--gradient-primary);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 12px;
		flex-shrink: 0;
	}

	.admin-avatar {
		background: linear-gradient(135deg, #ffa502, #ff6348);
	}

	.user-meta {
		display: flex;
		flex-direction: column;
	}

	.user-name {
		color: var(--text-primary);
		font-size: 12px;
		font-weight: 600;
	}

	.user-email {
		color: var(--text-muted);
		font-size: 10px;
		font-family: monospace;
	}

	.role-chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 8px;
		border-radius: 12px;
		font-size: 10px;
		font-weight: 600;
		white-space: nowrap;
	}

	.admin-chip {
		color: #ffd32a;
		background: rgba(255, 211, 42, 0.12);
		border: 1px solid rgba(255, 211, 42, 0.3);
	}

	.student-chip {
		color: #00e5a0;
		background: rgba(0, 229, 160, 0.1);
		border: 1px solid rgba(0, 229, 160, 0.3);
	}

	.action-badge {
		display: inline-block;
		padding: 3px 8px;
		border-radius: 10px;
		font-size: 10px;
		font-weight: 600;
		white-space: nowrap;
	}

	.act-register {
		color: #a855f7;
		background: rgba(168, 85, 247, 0.12);
		border: 1px solid rgba(168, 85, 247, 0.3);
	}

	.act-login {
		color: #38bdf8;
		background: rgba(56, 189, 248, 0.12);
		border: 1px solid rgba(56, 189, 248, 0.3);
	}

	.act-admin-login {
		color: #f59e0b;
		background: rgba(245, 158, 11, 0.15);
		border: 1px solid rgba(245, 158, 11, 0.4);
	}

	.act-admin-action {
		color: #ec4899;
		background: rgba(236, 72, 153, 0.12);
		border: 1px solid rgba(236, 72, 153, 0.3);
	}

	.act-profile {
		color: #10b981;
		background: rgba(16, 185, 129, 0.12);
		border: 1px solid rgba(16, 185, 129, 0.3);
	}

	.device-text {
		color: var(--text-secondary);
		font-size: 11px;
		white-space: nowrap;
	}

	.ip-code {
		font-size: 11px;
		color: #38bdf8;
		background: rgba(56, 189, 248, 0.08);
		border: 1px solid rgba(56, 189, 248, 0.2);
		padding: 2px 6px;
		border-radius: 6px;
	}

	.details-text {
		color: var(--text-secondary);
		font-size: 11px;
		max-width: 260px;
		display: inline-block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Empty state */
	.empty-feed {
		padding: var(--space-3xl) var(--space-lg);
		text-align: center;
		border-radius: var(--radius-xl);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.empty-icon {
		font-size: 48px;
		margin-bottom: 8px;
	}

	.empty-feed h3 {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		margin: 0;
	}

	.empty-feed p {
		color: var(--text-muted);
		font-size: var(--text-sm);
		max-width: 320px;
		margin: 0;
	}

	/* Sub-caption in stat card */
	.stat-sub {
		font-size: 10px;
		color: rgba(255, 255, 255, 0.45);
		margin-top: 2px;
	}

	.highlight-user-stat {
		cursor: pointer;
		border-color: rgba(0, 229, 160, 0.3);
	}

	.highlight-user-stat:hover {
		border-color: rgba(0, 229, 160, 0.6);
		box-shadow: 0 4px 20px rgba(0, 229, 160, 0.15);
	}

	.active-stat-card {
		border-color: rgba(255, 255, 255, 0.4) !important;
		background: rgba(255, 255, 255, 0.08) !important;
	}

	/* View mode bar & switcher buttons */
	.view-mode-bar {
		margin-bottom: var(--space-lg);
		padding: 6px;
		border-radius: var(--radius-xl);
		border: 1px solid var(--glass-border);
		background: rgba(255, 255, 255, 0.03);
	}

	.mode-buttons-group {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.mode-switch-btn {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 18px;
		border-radius: var(--radius-lg);
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
		transition: all var(--duration-fast);
		text-align: left;
	}

	.mode-switch-btn:hover {
		color: var(--text-primary);
		background: rgba(255, 255, 255, 0.05);
	}

	.mode-switch-btn.active {
		color: #ffffff;
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.2);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	}

	.mode-btn-icon {
		font-size: 22px;
	}

	.mode-btn-text {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.mode-btn-text strong {
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.mode-btn-sub {
		font-size: 11px;
		color: var(--text-muted);
	}

	.mode-counter {
		padding: 4px 10px;
		border-radius: 20px;
		font-size: var(--text-xs);
		font-weight: 700;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid var(--glass-border);
		color: var(--text-secondary);
	}

	.mode-switch-btn.active .mode-counter {
		background: var(--gradient-primary);
		color: #ffffff;
		border-color: transparent;
	}

	/* Dedicated Users Directory Table */
	.users-table th {
		white-space: nowrap;
	}

	.avatar-photo-thumb {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		object-fit: cover;
	}

	.user-insta {
		font-size: 10px;
		color: var(--accent-pink);
	}

	.email-code {
		font-size: 12px;
		color: #a5b4fc;
		background: rgba(99, 102, 241, 0.1);
		border: 1px solid rgba(99, 102, 241, 0.25);
		padding: 3px 8px;
		border-radius: 6px;
		font-family: monospace;
	}

	.dept-pill {
		font-size: 12px;
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

	.intro-col {
		max-width: 220px;
	}

	.user-intro-chip {
		display: flex;
		align-items: flex-start;
		gap: 6px;
		padding: 6px 10px;
		border-radius: 10px;
		background: rgba(255, 61, 127, 0.08);
		border: 1px solid rgba(255, 61, 127, 0.25);
	}

	.intro-icon {
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

	.status-pill {
		display: inline-block;
		font-size: 11px;
		font-weight: 600;
		padding: 3px 10px;
		border-radius: 12px;
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

	.user-activity-badges {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.act-badge {
		font-size: 11px;
		padding: 2px 7px;
		border-radius: 8px;
		font-weight: 600;
		white-space: nowrap;
	}

	.act-badge.matches {
		color: var(--accent-pink);
		background: rgba(255, 61, 127, 0.12);
		border: 1px solid rgba(255, 61, 127, 0.25);
	}

	.act-badge.swipes {
		color: #38bdf8;
		background: rgba(56, 189, 248, 0.1);
		border: 1px solid rgba(56, 189, 248, 0.25);
	}

	.act-badge.logins {
		color: #fbbf24;
		background: rgba(251, 191, 36, 0.1);
		border: 1px solid rgba(251, 191, 36, 0.25);
	}

	.device-meta {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.device-name {
		font-size: 11px;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.device-time {
		font-size: 10px;
		color: var(--text-muted);
	}

	.idx-col {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-muted);
		text-align: center;
	}

	.table-header-intro {
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--glass-border);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.intro-title {
		font-family: var(--font-display);
		font-size: var(--text-lg);
		margin: 0;
		color: var(--text-primary);
	}

	.intro-desc {
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin: 2px 0 0;
	}

	.directory-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-lg);
		border-radius: var(--radius-xl);
		margin-bottom: var(--space-md);
	}

	.directory-summary-pills {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.dir-pill {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--accent-pink);
		background: rgba(255, 61, 127, 0.1);
		border: 1px solid rgba(255, 61, 127, 0.25);
		padding: 4px 12px;
		border-radius: 20px;
		white-space: nowrap;
	}
</style>
