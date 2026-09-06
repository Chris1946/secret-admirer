<script lang="ts">
	interface Props {
		type?: string;
		placeholder?: string;
		value?: string;
		error?: string;
		success?: boolean;
		icon?: string;
		maxlength?: number;
		oninput?: (e: Event) => void;
	}

	let {
		type = 'text',
		placeholder = '',
		value = $bindable(''),
		error = '',
		success = false,
		icon = '',
		maxlength,
		oninput
	}: Props = $props();

	let focused = $state(false);
</script>

<div class="glass-input-wrapper" class:focused class:error={!!error} class:success>
	{#if icon}
		<span class="input-icon">{icon}</span>
	{/if}
	<input
		{type}
		{placeholder}
		{maxlength}
		bind:value
		onfocus={() => (focused = true)}
		onblur={() => (focused = false)}
		{oninput}
		class="glass-input"
		class:has-icon={!!icon}
	/>
	{#if error}
		<span class="validation-message error-message">{error}</span>
	{:else if success && value}
		<span class="validation-message success-message">✓</span>
	{/if}
	<div class="input-glow"></div>
</div>

<style>
	.glass-input-wrapper {
		position: relative;
		width: 100%;
	}

	.glass-input {
		width: 100%;
		padding: 14px 18px;
		background: var(--glass-light);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-md);
		color: var(--text-primary);
		font-size: var(--text-base);
		font-family: var(--font-body);
		outline: none;
		transition: all var(--duration-normal) var(--ease-out-expo);
	}

	.glass-input.has-icon {
		padding-left: 44px;
	}

	.glass-input::placeholder {
		color: var(--text-muted);
		font-style: italic;
	}

	.glass-input-wrapper.focused .glass-input {
		border-color: var(--accent-pink);
		box-shadow: 0 0 0 2px rgba(255, 61, 127, 0.1);
	}

	.glass-input-wrapper.error .glass-input {
		border-color: var(--error);
		box-shadow: 0 0 0 2px var(--error-glow);
		animation: shake 0.4s ease;
	}

	.glass-input-wrapper.success .glass-input {
		border-color: var(--success);
		box-shadow: 0 0 0 2px var(--success-glow);
	}

	.input-icon {
		position: absolute;
		left: 14px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 18px;
		z-index: 2;
		opacity: 0.6;
		transition: opacity var(--duration-fast);
	}

	.glass-input-wrapper.focused .input-icon {
		opacity: 1;
	}

	.validation-message {
		position: absolute;
		right: 14px;
		top: 50%;
		transform: translateY(-50%);
		font-size: var(--text-xs);
		font-weight: 500;
		animation: fade-in-scale 0.2s ease;
	}

	.error-message {
		color: var(--error);
	}

	.success-message {
		color: var(--success);
		font-size: 16px;
	}

	.input-glow {
		position: absolute;
		inset: -1px;
		border-radius: var(--radius-md);
		opacity: 0;
		transition: opacity var(--duration-normal);
		pointer-events: none;
		background: var(--gradient-primary);
		z-index: -1;
		filter: blur(8px);
	}

	.glass-input-wrapper.focused .input-glow {
		opacity: 0.15;
	}
</style>
