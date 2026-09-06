<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary' | 'ghost' | 'success';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		loading?: boolean;
		fullWidth?: boolean;
		onclick?: () => void;
		children: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		fullWidth = false,
		onclick,
		children
	}: Props = $props();

	function handleClick(e: MouseEvent) {
		if (disabled || loading) return;

		// Ripple effect
		const btn = e.currentTarget as HTMLButtonElement;
		const rect = btn.getBoundingClientRect();
		const ripple = document.createElement('span');
		ripple.className = 'btn-ripple';
		ripple.style.left = `${e.clientX - rect.left}px`;
		ripple.style.top = `${e.clientY - rect.top}px`;
		btn.appendChild(ripple);
		setTimeout(() => ripple.remove(), 600);

		onclick?.();
	}
</script>

<button
	class="gradient-btn {variant} {size}"
	class:full-width={fullWidth}
	class:loading
	{disabled}
	onclick={handleClick}
>
	{#if loading}
		<span class="spinner"></span>
	{/if}
	<span class="btn-content" class:hidden={loading}>
		{@render children()}
	</span>
</button>

<style>
	.gradient-btn {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		font-weight: 600;
		letter-spacing: 0.02em;
		border: none;
		cursor: pointer;
		overflow: hidden;
		transition: all var(--duration-normal) var(--ease-out-expo);
		-webkit-tap-highlight-color: transparent;
	}

	.gradient-btn:active:not(:disabled) {
		transform: scale(0.97);
	}

	/* Sizes */
	.sm {
		padding: 8px 16px;
		font-size: var(--text-sm);
		border-radius: var(--radius-sm);
	}

	.md {
		padding: 14px 28px;
		font-size: var(--text-base);
		border-radius: var(--radius-md);
	}

	.lg {
		padding: 18px 36px;
		font-size: var(--text-lg);
		border-radius: var(--radius-lg);
	}

	/* Variants */
	.primary {
		background: var(--gradient-primary);
		color: white;
		box-shadow: var(--shadow-md), var(--shadow-glow-pink);
		animation: pulse-glow 3s ease-in-out infinite;
	}

	.primary:hover:not(:disabled) {
		box-shadow:
			var(--shadow-lg),
			0 0 40px rgba(255, 61, 127, 0.4);
		transform: translateY(-1px);
	}

	.secondary {
		background: var(--gradient-secondary);
		color: white;
		box-shadow: var(--shadow-md), var(--shadow-glow-violet);
	}

	.secondary:hover:not(:disabled) {
		box-shadow:
			var(--shadow-lg),
			0 0 40px rgba(124, 58, 237, 0.4);
		transform: translateY(-1px);
	}

	.ghost {
		background: var(--glass-light);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		color: var(--text-secondary);
		border: 1px solid var(--glass-border);
	}

	.ghost:hover:not(:disabled) {
		background: var(--glass-medium);
		border-color: var(--glass-border-hover);
		color: var(--text-primary);
	}

	.success {
		background: linear-gradient(135deg, #00e5a0, #00b4d8);
		color: white;
		box-shadow: var(--shadow-md), 0 0 20px rgba(0, 229, 160, 0.3);
	}

	.full-width {
		width: 100%;
	}

	.gradient-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		animation: none;
	}

	/* Spinner */
	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	.btn-content.hidden {
		visibility: hidden;
		width: 0;
		overflow: hidden;
	}

	/* Ripple */
	:global(.btn-ripple) {
		position: absolute;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.3);
		transform: scale(0);
		animation: ripple 0.6s ease-out forwards;
		pointer-events: none;
	}
</style>
