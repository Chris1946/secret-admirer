<script lang="ts">
	import { getToasts } from '$lib/stores/gameState.svelte';
</script>

{#if getToasts().length > 0}
	<div class="toast-container" role="status" aria-live="polite">
		{#each getToasts() as toast (toast.id)}
			<div class="toast toast-{toast.type}">
				<span class="toast-icon">
					{#if toast.type === 'success'}✓
					{:else if toast.type === 'error'}✕
					{:else}ℹ
					{/if}
				</span>
				<span class="toast-message">{toast.message}</span>
			</div>
		{/each}
	</div>
{/if}

<style>
	.toast-container {
		position: fixed;
		top: calc(env(safe-area-inset-top, 0px) + 16px);
		left: 50%;
		transform: translateX(-50%);
		z-index: var(--z-toast);
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 90%;
		max-width: 380px;
	}

	.toast {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 18px;
		border-radius: var(--radius-md);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		font-size: var(--text-sm);
		font-weight: 500;
		animation: fade-in-up 0.3s var(--ease-out-back);
		box-shadow: var(--shadow-lg);
	}

	.toast-success {
		background: rgba(0, 229, 160, 0.15);
		border: 1px solid rgba(0, 229, 160, 0.3);
		color: var(--success);
	}

	.toast-error {
		background: rgba(255, 71, 87, 0.15);
		border: 1px solid rgba(255, 71, 87, 0.3);
		color: var(--error);
	}

	.toast-info {
		background: rgba(124, 58, 237, 0.15);
		border: 1px solid rgba(124, 58, 237, 0.3);
		color: #a78bfa;
	}

	.toast-icon {
		font-size: 16px;
		flex-shrink: 0;
	}

	.toast-message {
		flex: 1;
	}
</style>
