<script lang="ts">
	import { getTheme, toggleTheme } from '$lib/stores/gameState.svelte';

	const currentTheme = $derived(getTheme());

	function handleClick(e: MouseEvent) {
		e.stopPropagation();
		toggleTheme();
	}
</script>

<button
	type="button"
	class="theme-toggle-btn glass"
	onclick={handleClick}
	title={currentTheme === 'dark' ? 'Switch to White Theme ☀️' : 'Switch to Dark Theme 🌙'}
	aria-label="Toggle theme"
>
	<span class="icon" class:rotate={currentTheme === 'light'}>
		{currentTheme === 'dark' ? '🌙' : '☀️'}
	</span>
	<span class="theme-text">{currentTheme === 'dark' ? 'Dark' : 'Light'}</span>
</button>

<style>
	.theme-toggle-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 5px 10px;
		border-radius: var(--radius-full);
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 200ms ease;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
	}

	.theme-toggle-btn:hover {
		color: var(--text-primary);
		border-color: var(--glass-border-hover);
		transform: translateY(-1px);
	}

	.icon {
		font-size: 14px;
		display: inline-block;
		transition: transform 300ms var(--ease-out-back);
	}

	.icon.rotate {
		transform: rotate(360deg);
	}

	.theme-text {
		font-size: 11px;
		letter-spacing: 0.02em;
	}
</style>
