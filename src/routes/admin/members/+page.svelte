<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { getAdminToken, getAdminName, addToast } from '$lib/stores/gameState.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { generateUserGradient, generateUserGlow, getDepartmentBadgeStyle } from '$lib/utils/colors';

	interface Member {
		id: string;
		name: string;
		email: string;
		year: string;
		department: string;
		bio?: string;
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
	}

	let members = $state<Member[]>([]);
	let isLoading = $state(true);
	let searchQuery = $state('');
	let filterDept = $state('');
	let filterStatus = $state<'all' | 'approved' | 'pending'>('all');
	let removingId = $state<string | null>(null);
	let pollInterval: ReturnType<typeof setInterval> | null = null;
	const adminName = $derived(getAdminName());

	let filteredMembers = $derived.by(() => {
		let list = members;
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter(
				u =>
					u.name.toLowerCase().includes(q) ||
					u.email.toLowerCase().includes(q) ||
					u.department.toLowerCase().includes(q)
			);
		}
		if (filterDept) {
			list = list.filter(u => u.department === filterDept);
		}
		if (filterStatus === 'approved') list = list.filter(u => u.approved);
		if (filterStatus === 'pending') list = list.filter(u => !u.approved);
		return list;
	});

	const departments = $derived([...new Set(members.map(m => m.department))].sort());

	async function loadMembers() {
		try {
			const token = getAdminToken();
			const res = await fetch('/api/admin/members', {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (res.ok) {
				const data = await res.json();
				members = data.members || [];
			}
		} catch {
			// silent fail on poll
		} finally {
			isLoading = false;
		}
	}

	async function handleRemove(member: Member) {
		const confirmed = confirm(
			`⚠️ Remove "${member.name}" (${member.email})?\n\nThis will permanently delete their profile, matches, and all data. This cannot be undone.`
		);
		if (!confirmed) return;

		removingId = member.id;
		try {
			const token = getAdminToken();
			const res = await fetch('/api/admin/members', {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({ userId: member.id })
			});
			if (res.ok) {
				members = members.filter(m => m.id !== member.id);
				addToast(`${member.name} removed from the event ✓`, 'success');
			} else {
				addToast('Failed to remove user', 'error');
			}
		} catch {
			addToast('Connection error', 'error');
		} finally {
			removingId = null;
		}
	}

	function formatTime(iso: string): string {
		try {
			return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		} catch {
			return '—';
		}
	}

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
		} catch {
			return '—';
		}
	}

	function getRelativeTime(iso: string): string {
		const diff = Date.now() - new Date(iso).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		return `${Math.floor(hrs / 24)}d ago`;
	}

	onMount(async () => {
		const token = getAdminToken();
		if (!token) {
			goto('/');
			return;
		}
		await loadMembers();
		pollInterval = setInterval(loadMembers, 5000);
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});
</script>

<svelte:head>
	<title>Registered Members — Organizer Console</title>
</svelte:head>

<main class="members-page">
	<!-- Header -->
	<header class="page-header glass-strong">
		<div class="header-left">
			<button class="back-btn" onclick={() => goto('/admin')}>
				← Console
			</button>
			<div class="header-brand">
				<span class="header-icon">👥</span>
				<div>
					<h1 class="header-title">Registered Members</h1>
					<span class="header-sub">1st Year Attendees Directory</span>
				</div>
			</div>
		</div>

		<div class="header-right">
			<ThemeToggle />
			<div class="live-indicator">
				<span class="pulse-dot"></span>
				<span>Live</span>
			</div>
			<span class="admin-badge">🛡️ {adminName}</span>
		</div>
	</header>

	<div class="page-content">
		<!-- Summary Bar -->
		<div class="summary-bar glass">
			<div class="summary-stat">
				<span class="stat-number">{members.length}</span>
				<span class="stat-label">Total Enrolled</span>
			</div>
			<div class="summary-stat">
				<span class="stat-number" style="color: var(--success)">{members.filter(m => m.approved).length}</span>
				<span class="stat-label">Active Profiles</span>
			</div>
			<div class="summary-stat">
				<span class="stat-number" style="color: #f59e0b">{members.filter(m => !m.approved).length}</span>
				<span class="stat-label">Pending</span>
			</div>
			<div class="summary-stat">
				<span class="stat-number" style="color: var(--accent-pink)">{members.reduce((s, m) => s + m.matchesCount, 0)}</span>
				<span class="stat-label">Total Matches</span>
			</div>
		</div>

		<!-- Filters Bar -->
		<div class="filters-bar glass">
			<div class="search-box">
				<span class="search-icon">🔍</span>
				<input
					type="text"
					placeholder="Search name, email, department..."
					class="search-input"
					bind:value={searchQuery}
				/>
				{#if searchQuery}
					<button class="clear-btn" onclick={() => (searchQuery = '')}>✕</button>
				{/if}
			</div>

			<select class="filter-select" bind:value={filterDept}>
				<option value="">All Departments</option>
				{#each departments as dept}
					<option value={dept}>{dept}</option>
				{/each}
			</select>

			<select class="filter-select" bind:value={filterStatus}>
				<option value="all">All Status</option>
				<option value="approved">Active Only</option>
				<option value="pending">Pending Only</option>
			</select>

			<span class="result-count">{filteredMembers.length} of {members.length}</span>
		</div>

		<!-- Table -->
		{#if isLoading}
			<div class="loading-state glass">
				<div class="loading-spinner"></div>
				<p>Loading members...</p>
			</div>
		{:else if filteredMembers.length === 0}
			<div class="empty-state glass">
				<span>👥</span>
				<h3>{searchQuery ? `No matches for "${searchQuery}"` : 'No members yet'}</h3>
				<p>{searchQuery ? 'Try a different search.' : 'Attendees will appear here as they register.'}</p>
			</div>
		{:else}
			<div class="table-wrap glass">
				<div class="table-scroll">
					<table class="members-table">
						<thead>
							<tr>
								<th style="width: 42px;">#</th>
								<th>Student</th>
								<th>Email</th>
								<th>Department</th>
								<th>Introduction</th>
								<th>Registered</th>
								<th>Status</th>
								<th>Activity</th>
								<th>Last Active</th>
								<th style="width: 90px;">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredMembers as member, idx (member.id)}
								<tr class="member-row" class:removing={removingId === member.id}>
									<td class="idx-cell">{idx + 1}</td>

									<!-- Student Name + Avatar -->
									<td class="student-cell">
										<div class="student-row">
											<div
												class="member-avatar"
												style="background: {member.photoGradient || generateUserGradient(member.id)}; box-shadow: 0 0 10px {generateUserGlow(member.id)};"
											>
												{#if member.photo}
													<img src={member.photo} alt={member.name} class="avatar-img" />
												{:else}
													{member.photoInitial || member.name.charAt(0).toUpperCase()}
												{/if}
											</div>
											<div class="student-info">
												<strong class="student-name">{member.name}</strong>
												{#if member.instagram}
													<span class="student-insta">📷 @{member.instagram}</span>
												{/if}
											</div>
										</div>
									</td>

									<!-- Email -->
									<td class="email-cell">
										<code class="email-code">{member.email}</code>
									</td>

									<!-- Department -->
									<td class="dept-cell">
										<span
											class="dept-pill"
											style="background: {getDepartmentBadgeStyle(member.department).bg}; color: {getDepartmentBadgeStyle(member.department).text}; border: 1px solid {getDepartmentBadgeStyle(member.department).border};"
										>
											{member.department}
										</span>
										<span class="year-tag">{member.year}</span>
									</td>

									<!-- Bio -->
									<td class="bio-cell">
										{#if member.bio}
											<div class="bio-chip" title={member.bio}>
												<span>💭</span>
												<span class="bio-text">"{member.bio}"</span>
											</div>
										{:else}
											<span class="no-bio">—</span>
										{/if}
									</td>

									<!-- Registered At -->
									<td class="time-cell">
										<span class="time-main">{formatTime(member.createdAt)}</span>
										<span class="time-sub">{formatDate(member.createdAt)}</span>
									</td>

									<!-- Status -->
									<td class="status-cell">
										{#if member.approved}
											<span class="status-pill approved">✓ Active</span>
										{:else}
											<span class="status-pill pending">⏳ Pending</span>
										{/if}
									</td>

									<!-- Activity -->
									<td class="activity-cell">
										<div class="activity-chips">
											<span class="chip pink" title="Matches">💕 {member.matchesCount}</span>
											<span class="chip blue" title="Swipes">👉 {member.swipesCount}</span>
											<span class="chip yellow" title="Logins">🔑 {member.loginCount}</span>
										</div>
									</td>

									<!-- Last Active -->
									<td class="device-cell">
										<span class="device-name">{member.lastDevice || 'Web'}</span>
										<span class="device-time">{getRelativeTime(member.lastLogin || member.createdAt)}</span>
									</td>

									<!-- Actions -->
									<td class="action-cell">
										<button
											class="remove-btn"
											disabled={removingId === member.id}
											onclick={() => handleRemove(member)}
											title="Remove this student"
										>
											{removingId === member.id ? '...' : '🗑️ Remove'}
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</div>
</main>

<style>
	.members-page {
		min-height: 100dvh;
		background: var(--bg-primary);
		display: flex;
		flex-direction: column;
	}

	/* Header */
	.page-header {
		position: sticky;
		top: 0;
		z-index: var(--z-sticky);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px var(--space-lg);
		border-bottom: 1px solid var(--glass-border);
		backdrop-filter: blur(20px);
		flex-wrap: wrap;
		gap: 10px;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.back-btn {
		background: none;
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		font-size: var(--text-sm);
		font-family: var(--font-body);
		padding: 6px 12px;
		cursor: pointer;
		white-space: nowrap;
		transition: all var(--duration-fast);
	}

	.back-btn:hover {
		color: var(--text-primary);
		border-color: rgba(255, 255, 255, 0.15);
		background: var(--glass-light);
	}

	.header-brand {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.header-icon { font-size: 22px; }

	.header-title {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		font-weight: 600;
		margin: 0;
		color: var(--text-primary);
	}

	.header-sub {
		font-size: 11px;
		color: var(--text-muted);
		display: block;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.live-indicator {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		color: var(--success);
	}

	.pulse-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--success);
		animation: pulse 2s infinite;
	}

	.admin-badge {
		font-size: 12px;
		background: var(--glass-light);
		border: 1px solid var(--glass-border);
		padding: 4px 12px;
		border-radius: 20px;
		color: var(--text-secondary);
	}

	/* Page Content */
	.page-content {
		flex: 1;
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		max-width: 1400px;
		margin: 0 auto;
		width: 100%;
	}

	/* Summary Bar */
	.summary-bar {
		display: flex;
		align-items: center;
		gap: var(--space-lg);
		padding: var(--space-md) var(--space-lg);
		border-radius: var(--radius-xl);
		border: 1px solid var(--glass-border);
		flex-wrap: wrap;
	}

	.summary-stat {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.stat-number {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1;
	}

	.stat-label {
		font-size: 11px;
		color: var(--text-muted);
		font-weight: 500;
	}

	/* Filters */
	.filters-bar {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 16px;
		border-radius: var(--radius-xl);
		border: 1px solid var(--glass-border);
		flex-wrap: wrap;
	}

	.search-box {
		flex: 1;
		min-width: 200px;
		display: flex;
		align-items: center;
		gap: 8px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-md);
		padding: 6px 12px;
	}

	.search-icon { font-size: 14px; }

	.search-input {
		flex: 1;
		background: none;
		border: none;
		color: var(--text-primary);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		outline: none;
	}

	.search-input::placeholder { color: var(--text-muted); }

	.clear-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 12px;
		cursor: pointer;
		padding: 2px;
	}

	.filter-select {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		font-family: var(--font-body);
		font-size: 12px;
		padding: 6px 10px;
		cursor: pointer;
		outline: none;
	}

	.filter-select option { background: var(--bg-secondary); }

	.result-count {
		font-size: 12px;
		color: var(--text-muted);
		white-space: nowrap;
	}

	/* Loading / Empty */
	.loading-state, .empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-2xl);
		border-radius: var(--radius-xl);
		border: 1px solid var(--glass-border);
		text-align: center;
		color: var(--text-secondary);
	}

	.loading-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid rgba(255, 255, 255, 0.1);
		border-top-color: var(--accent-pink);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	.empty-state span { font-size: 40px; }
	.empty-state h3 {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		color: var(--text-primary);
		margin: 0;
	}
	.empty-state p { font-size: var(--text-sm); margin: 0; }

	/* Table */
	.table-wrap {
		border-radius: var(--radius-xl);
		border: 1px solid var(--glass-border);
		overflow: hidden;
	}

	.table-scroll {
		overflow-x: auto;
	}

	.members-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
	}

	.members-table th {
		padding: 12px 14px;
		text-align: left;
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		background: rgba(255, 255, 255, 0.02);
		border-bottom: 1px solid var(--glass-border);
		white-space: nowrap;
	}

	.members-table td {
		padding: 10px 14px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		vertical-align: middle;
	}

	.member-row {
		transition: background var(--duration-fast);
	}

	.member-row:hover { background: rgba(255, 255, 255, 0.02); }
	.member-row.removing { opacity: 0.4; pointer-events: none; }
	.member-row:last-child td { border-bottom: none; }

	.idx-cell {
		color: var(--text-muted);
		font-size: 12px;
		text-align: center;
		font-weight: 600;
	}

	.student-cell { min-width: 160px; }

	.student-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.member-avatar {
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
		overflow: hidden;
	}

	.avatar-img { width: 100%; height: 100%; object-fit: cover; }

	.student-info { display: flex; flex-direction: column; gap: 2px; }

	.student-name {
		font-size: 13px;
		color: var(--text-primary);
		white-space: nowrap;
	}

	.student-insta {
		font-size: 10px;
		color: var(--text-muted);
	}

	.email-cell { min-width: 200px; }

	.email-code {
		font-size: 11px;
		font-family: 'Courier New', monospace;
		color: var(--text-secondary);
		background: rgba(255, 255, 255, 0.04);
		padding: 2px 6px;
		border-radius: 4px;
	}

	.dept-cell { min-width: 140px; }

	.dept-pill {
		display: inline-block;
		font-size: 11px;
		font-weight: 600;
		color: var(--accent-violet);
		background: rgba(124, 58, 237, 0.12);
		border: 1px solid rgba(124, 58, 237, 0.25);
		padding: 2px 8px;
		border-radius: 10px;
	}

	.year-tag {
		display: block;
		font-size: 10px;
		color: var(--text-muted);
		margin-top: 2px;
	}

	.bio-cell { min-width: 180px; max-width: 220px; }

	.bio-chip {
		display: flex;
		align-items: flex-start;
		gap: 5px;
		padding: 5px 9px;
		border-radius: var(--radius-sm);
		background: rgba(255, 61, 127, 0.07);
		border: 1px solid rgba(255, 61, 127, 0.2);
	}

	.bio-text {
		font-size: 11px;
		color: rgba(255, 255, 255, 0.8);
		font-style: italic;
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.no-bio { color: var(--text-muted); font-size: 12px; }

	.time-cell {
		min-width: 90px;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.time-main {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-primary);
	}

	.time-sub {
		font-size: 10px;
		color: var(--text-muted);
	}

	.status-cell { white-space: nowrap; }

	.status-pill {
		display: inline-block;
		font-size: 11px;
		font-weight: 600;
		padding: 3px 10px;
		border-radius: 12px;
		white-space: nowrap;
	}

	.status-pill.approved {
		color: #10b981;
		background: rgba(16, 185, 129, 0.12);
		border: 1px solid rgba(16, 185, 129, 0.3);
	}

	.status-pill.pending {
		color: #f59e0b;
		background: rgba(245, 158, 11, 0.12);
		border: 1px solid rgba(245, 158, 11, 0.3);
	}

	.activity-chips {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.chip {
		font-size: 10px;
		font-weight: 600;
		padding: 1px 6px;
		border-radius: 6px;
		white-space: nowrap;
	}

	.chip.pink {
		color: var(--accent-pink);
		background: rgba(255, 61, 127, 0.1);
	}

	.chip.blue {
		color: #38bdf8;
		background: rgba(56, 189, 248, 0.1);
	}

	.chip.yellow {
		color: #fbbf24;
		background: rgba(251, 191, 36, 0.1);
	}

	.device-cell {
		min-width: 100px;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.device-name {
		font-size: 11px;
		color: var(--text-secondary);
	}

	.device-time {
		font-size: 10px;
		color: var(--text-muted);
	}

	.action-cell { white-space: nowrap; }

	.remove-btn {
		padding: 5px 10px;
		border: 1px solid rgba(255, 71, 87, 0.35);
		border-radius: var(--radius-sm);
		background: rgba(255, 71, 87, 0.08);
		color: #ff4757;
		font-size: 11px;
		font-weight: 600;
		font-family: var(--font-body);
		cursor: pointer;
		transition: all var(--duration-fast);
		white-space: nowrap;
	}

	.remove-btn:hover:not(:disabled) {
		background: rgba(255, 71, 87, 0.2);
		border-color: rgba(255, 71, 87, 0.6);
		transform: scale(1.03);
	}

	.remove-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}
</style>
