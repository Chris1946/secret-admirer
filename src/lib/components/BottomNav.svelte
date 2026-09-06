<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getMatchedIds, getIncomingRequests, addToast, getCurrentUser } from '$lib/stores/gameState.svelte';

	const matchCount = $derived(getMatchedIds().size);
	const incomingCount = $derived(getIncomingRequests().length);
	const totalBadge = $derived(matchCount + incomingCount);
	const currentPath = $derived(page.url.pathname);
	const currentUser = $derived(getCurrentUser());

	interface NavItem {
		label: string;
		icon: string;
		path: string;
		badge?: number;
		action?: () => void;
	}

	const navItems: NavItem[] = $derived([
		{ label: 'Discover', icon: '💌', path: '/discover' },
		{ label: 'Matches', icon: '💕', path: '/matches', badge: totalBadge },
		{ label: 'Community', icon: '💡', path: '/community' },
		{ label: 'Profile', icon: '👤', path: '/profile' },
	]);

	function isActive(itemPath: string): boolean {
		if (itemPath === '/discover') {
			return currentPath === '/discover' || currentPath === '/minigame';
		}
		if (itemPath === '/matches') {
			return currentPath === '/matches' || currentPath.startsWith('/chat');
		}
		return currentPath === itemPath;
	}

	async function handleShare() {
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

	function handleNav(item: NavItem) {
		if (item.action) {
			item.action();
		} else {
			goto(item.path);
		}
	}
</script>

<nav class="bottom-nav">
	<div class="nav-inner">
		{#each navItems as item (item.path)}
			<button
				class="nav-tab"
				class:active={isActive(item.path)}
				onclick={() => handleNav(item)}
				title={item.label}
			>
				<span class="tab-icon">{item.icon}</span>
				<span class="tab-label">{item.label}</span>
				{#if item.badge && item.badge > 0}
					<span class="tab-badge">{item.badge}</span>
				{/if}
				{#if isActive(item.path)}
					<span class="active-indicator"></span>
				{/if}
			</button>
		{/each}

		<!-- Share button (always last) -->
		<button class="nav-tab share-tab" onclick={handleShare} title="Invite Batchmates">
			<span class="tab-icon">📤</span>
			<span class="tab-label">Invite</span>
		</button>
	</div>
</nav>

<style>
	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: var(--z-bottom-nav);
		padding: 0 var(--space-sm);
		padding-bottom: env(safe-area-inset-bottom, 0px);
		background: var(--glass-strong);
		backdrop-filter: blur(24px);
		-webkit-backdrop-filter: blur(24px);
		border-top: 1px solid var(--glass-border);
		box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
	}

	.nav-inner {
		display: flex;
		align-items: center;
		justify-content: space-around;
		max-width: 480px;
		margin: 0 auto;
		height: 64px;
	}

	.nav-tab {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		padding: 6px 0;
		min-width: 56px;
		background: none;
		border: none;
		cursor: pointer;
		transition: all 200ms ease;
		-webkit-tap-highlight-color: transparent;
	}

	.tab-icon {
		font-size: 20px;
		line-height: 1;
		transition: transform 200ms var(--ease-out-back);
	}

	.nav-tab.active .tab-icon {
		transform: scale(1.15);
	}

	.nav-tab:active .tab-icon {
		transform: scale(0.9);
	}

	.tab-label {
		font-family: var(--font-body);
		font-size: 10px;
		font-weight: 500;
		color: var(--text-muted);
		transition: color 200ms ease;
		letter-spacing: 0.02em;
	}

	.nav-tab.active .tab-label {
		color: var(--accent-pink);
		font-weight: 700;
	}

	.tab-badge {
		position: absolute;
		top: 2px;
		right: 6px;
		min-width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 9px;
		font-weight: 700;
		font-family: var(--font-body);
		color: white;
		background: var(--gradient-primary);
		border-radius: 10px;
		padding: 0 4px;
		box-shadow: 0 2px 6px rgba(255, 61, 127, 0.4);
		animation: badge-pop 0.3s var(--ease-out-back);
	}

	.active-indicator {
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 24px;
		height: 3px;
		background: var(--gradient-primary);
		border-radius: 3px 3px 0 0;
		animation: indicator-slide 0.25s var(--ease-out-expo);
	}

	.share-tab .tab-label {
		color: var(--text-muted);
	}

	.share-tab:active .tab-icon {
		transform: scale(0.85);
	}

	@keyframes badge-pop {
		0% { transform: scale(0); }
		70% { transform: scale(1.15); }
		100% { transform: scale(1); }
	}

	@keyframes indicator-slide {
		0% { opacity: 0; width: 0; }
		100% { opacity: 1; width: 24px; }
	}

	@media (min-width: 768px) {
		.bottom-nav {
			max-width: 480px;
			left: 50%;
			transform: translateX(-50%);
			border-radius: 20px 20px 0 0;
			border-left: 1px solid var(--glass-border);
			border-right: 1px solid var(--glass-border);
		}
	}
</style>
