<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';

	interface ProjectorData {
		totalSignups: number;
		totalMatches: number;
		totalMessages: number;
		deptStats: Record<string, number>;
		announcement?: string;
		signupsPaused?: boolean;
		timestamp: string;
	}

	let data = $state<ProjectorData>({
		totalSignups: 0,
		totalMatches: 0,
		totalMessages: 0,
		deptStats: {},
		timestamp: ''
	});

	let isFullscreen = $state(false);
	let pollInterval: ReturnType<typeof setInterval> | null = null;

	async function fetchProjectorStats() {
		try {
			const res = await fetch('/api/projector');
			if (res.ok) {
				data = await res.json();
			}
		} catch (err) {
			console.error('Failed to fetch projector stats:', err);
		}
	}

	function toggleFullscreen() {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen().then(() => {
				isFullscreen = true;
			}).catch(() => {});
		} else {
			document.exitFullscreen().then(() => {
				isFullscreen = false;
			}).catch(() => {});
		}
	}

	onMount(() => {
		fetchProjectorStats();
		pollInterval = setInterval(fetchProjectorStats, 3000);

		const handleKey = (e: KeyboardEvent) => {
			if (e.key === 'f' || e.key === 'F') {
				toggleFullscreen();
			}
		};
		window.addEventListener('keydown', handleKey);

		return () => {
			window.removeEventListener('keydown', handleKey);
		};
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});

	let sortedDepts = $derived(
		Object.entries(data.deptStats)
			.filter(([dept]) => dept && dept !== 'Pending')
			.sort((a, b) => b[1] - a[1])
	);
</script>

<svelte:head>
	<title>Live Projector Stream — Secret Admirer</title>
</svelte:head>

<main class="projector-screen">
	<!-- Background Ambient Glow -->
	<div class="glow-orb orb-1"></div>
	<div class="glow-orb orb-2"></div>
	<div class="glow-orb orb-3"></div>

	<!-- Top Controls (Subtle) -->
	<header class="projector-header">
		<button class="control-btn" onclick={() => goto('/admin')}>
			← Exit to Admin
		</button>
		<div class="live-pill">
			<span class="pulse-beacon"></span>
			<span>LIVE AUDITORIUM VIEW</span>
		</div>
		<button class="control-btn" onclick={toggleFullscreen}>
			{isFullscreen ? 'Exit Fullscreen' : '⛶ Fullscreen (F)'}
		</button>
	</header>

	<div class="projector-body">
		<!-- Hero Title -->
		<div class="hero-section">
			<div class="hero-badge">🎓 TKMCE ORIENTATION 2026</div>
			<h1 class="hero-title">Secret Admirer</h1>
			<p class="hero-subtitle">The Freshers' Connection Game • Find Your Match</p>
		</div>

		<!-- Ticker / Status Banner -->
		{#if data.announcement}
			<div class="live-banner">
				<span class="banner-badge">NOTICE</span>
				<span class="banner-text">{data.announcement}</span>
			</div>
		{/if}

		{#if data.signupsPaused}
			<div class="paused-banner">
				<span>⏸️ SIGNUP GATE CURRENTLY PAUSED BY ORGANIZERS</span>
			</div>
		{/if}

		<!-- Grand Stat Counters -->
		<div class="stats-showcase">
			<div class="stat-box primary-stat">
				<div class="stat-icon">🎓</div>
				<div class="stat-value">{data.totalSignups}</div>
				<div class="stat-label">1st-Year Attendees Joined</div>
				<div class="stat-pulse"></div>
			</div>

			<div class="stat-box match-stat">
				<div class="stat-icon">💖</div>
				<div class="stat-value">{data.totalMatches}</div>
				<div class="stat-label">Secret Admirer Matches</div>
				<div class="stat-pulse pulse-pink"></div>
			</div>

			<div class="stat-box msg-stat">
				<div class="stat-icon">💬</div>
				<div class="stat-value">{data.totalMessages}</div>
				<div class="stat-label">Whispers Exchanged</div>
				<div class="stat-pulse pulse-violet"></div>
			</div>
		</div>

		<!-- Department Distribution -->
		{#if sortedDepts.length > 0}
			<div class="dept-leaderboard">
				<h3 class="dept-title">🏆 Top Departments Active</h3>
				<div class="dept-grid">
					{#each sortedDepts.slice(0, 6) as [dept, count]}
						<div class="dept-card">
							<span class="dept-name">{dept}</span>
							<span class="dept-count">{count} {count === 1 ? 'student' : 'students'}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Footer Join Callout -->
		<footer class="projector-footer">
			<div class="footer-prompt">
				<span class="qr-placeholder">💌</span>
				<div class="prompt-text">
					<strong>Join the Game on your Phone!</strong>
					<p>Go to your Wi-Fi browser & type in your @tkmce.ac.in email to get started.</p>
				</div>
			</div>
			<div class="timestamp-pill">
				Synced: {data.timestamp || 'Live'}
			</div>
		</footer>
	</div>
</main>

<style>
	.projector-screen {
		min-height: 100dvh;
		background: #050508;
		color: #ffffff;
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		font-family: var(--font-body);
		padding: 24px 36px;
	}

	.glow-orb {
		position: fixed;
		border-radius: 50%;
		filter: blur(140px);
		pointer-events: none;
		z-index: 0;
	}

	.orb-1 {
		width: 500px;
		height: 500px;
		background: rgba(255, 61, 127, 0.22);
		top: -150px;
		right: -100px;
		animation: float-slow 10s ease-in-out infinite alternate;
	}

	.orb-2 {
		width: 550px;
		height: 550px;
		background: rgba(124, 58, 237, 0.22);
		bottom: -150px;
		left: -100px;
		animation: float-slow 12s ease-in-out infinite alternate-reverse;
	}

	.orb-3 {
		width: 400px;
		height: 400px;
		background: rgba(0, 229, 160, 0.15);
		top: 40%;
		left: 45%;
		animation: float-slow 15s ease-in-out infinite;
	}

	.projector-header {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.control-btn {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: rgba(255, 255, 255, 0.75);
		padding: 8px 16px;
		border-radius: 20px;
		font-size: 13px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.control-btn:hover {
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
	}

	.live-pill {
		display: flex;
		align-items: center;
		gap: 8px;
		background: rgba(0, 229, 160, 0.12);
		border: 1px solid rgba(0, 229, 160, 0.35);
		padding: 6px 16px;
		border-radius: 20px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: #00e5a0;
	}

	.pulse-beacon {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #00e5a0;
		box-shadow: 0 0 12px #00e5a0;
		animation: live-blink 1.4s infinite;
	}

	.projector-body {
		position: relative;
		z-index: 2;
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-around;
		max-width: 1400px;
		margin: 0 auto;
		width: 100%;
		padding: 20px 0;
	}

	.hero-section {
		text-align: center;
	}

	.hero-badge {
		display: inline-block;
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.15em;
		padding: 6px 20px;
		border-radius: 30px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: #ffd32a;
		margin-bottom: 12px;
	}

	.hero-title {
		font-family: var(--font-display);
		font-size: clamp(3.2rem, 8vw, 6rem);
		font-weight: 800;
		font-style: italic;
		margin: 0;
		background: linear-gradient(135deg, #ff3d7f 0%, #ff7597 30%, #c850c0 60%, #7c3aed 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		line-height: 1.1;
		filter: drop-shadow(0 0 40px rgba(255, 61, 127, 0.35));
	}

	.hero-subtitle {
		font-size: clamp(1.1rem, 2.5vw, 1.6rem);
		color: rgba(255, 255, 255, 0.65);
		margin: 8px 0 0;
		font-style: italic;
	}

	.live-banner {
		display: flex;
		align-items: center;
		gap: 14px;
		background: rgba(255, 165, 2, 0.12);
		border: 1px solid rgba(255, 165, 2, 0.4);
		padding: 12px 28px;
		border-radius: 40px;
		font-size: 16px;
		color: #ffeaa7;
		box-shadow: 0 0 30px rgba(255, 165, 2, 0.2);
	}

	.banner-badge {
		background: #ffa502;
		color: #000;
		font-size: 11px;
		font-weight: 800;
		padding: 3px 8px;
		border-radius: 6px;
	}

	.paused-banner {
		background: rgba(255, 61, 127, 0.18);
		border: 1px solid #ff3d7f;
		padding: 10px 24px;
		border-radius: 30px;
		font-weight: 700;
		color: #ff7597;
		font-size: 14px;
		box-shadow: 0 0 25px rgba(255, 61, 127, 0.3);
	}

	/* Stats Showcase Grid */
	.stats-showcase {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 32px;
		width: 100%;
		margin: 20px 0;
	}

	.stat-box {
		position: relative;
		padding: 36px 28px;
		border-radius: 28px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(24px);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		overflow: hidden;
		transition: transform 0.3s;
	}

	.stat-icon {
		font-size: 48px;
		margin-bottom: 8px;
	}

	.stat-value {
		font-family: var(--font-display);
		font-size: clamp(3.5rem, 6vw, 5.5rem);
		font-weight: 800;
		line-height: 1;
		color: #ffffff;
		text-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
	}

	.stat-label {
		font-size: 15px;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.7);
		margin-top: 10px;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.stat-pulse {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 4px;
		background: linear-gradient(90deg, #00e5a0, #00b4d8);
	}

	.pulse-pink {
		background: linear-gradient(90deg, #ff3d7f, #c850c0);
	}

	.pulse-violet {
		background: linear-gradient(90deg, #7c3aed, #4f46e5);
	}

	/* Dept Leaderboard */
	.dept-leaderboard {
		width: 100%;
		text-align: center;
	}

	.dept-title {
		font-size: 14px;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		margin-bottom: 12px;
	}

	.dept-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 12px;
	}

	.dept-card {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		padding: 10px 20px;
		border-radius: 16px;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.dept-name {
		font-size: 14px;
		font-weight: 600;
		color: #fff;
	}

	.dept-count {
		font-size: 12px;
		color: #00e5a0;
		background: rgba(0, 229, 160, 0.12);
		padding: 2px 8px;
		border-radius: 10px;
	}

	/* Footer */
	.projector-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding-top: 16px;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.footer-prompt {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.qr-placeholder {
		font-size: 32px;
	}

	.prompt-text strong {
		display: block;
		font-size: 15px;
		color: #ffffff;
	}

	.prompt-text p {
		margin: 2px 0 0;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.5);
	}

	.timestamp-pill {
		font-size: 11px;
		color: rgba(255, 255, 255, 0.35);
		font-family: monospace;
	}

	@media (max-width: 900px) {
		.stats-showcase {
			grid-template-columns: 1fr;
			gap: 16px;
		}
		.projector-screen {
			padding: 16px;
		}
	}
</style>
