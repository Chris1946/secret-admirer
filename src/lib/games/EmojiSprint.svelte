<script lang="ts">
	import TimerBar from '$lib/components/TimerBar.svelte';
	import { EMOJI_SETS, type EmojiSet } from '$lib/data/emojiSets';
	import { shuffle } from '$lib/utils/shuffle';

	interface Props {
		onResult: (won: boolean) => void;
	}

	let { onResult }: Props = $props();

	const TIMEOUT = 8000;

	let emojiSet = $state<EmojiSet>(shuffle(EMOJI_SETS)[0]);
	let timerRunning = $state(true);
	let selectedIndex = $state(-1);
	let resolved = $state(false);

	function handleSelect(index: number) {
		if (resolved) return;
		selectedIndex = index;
		resolved = true;
		timerRunning = false;

		// Any selection is a pass — it's about engagement, not correctness
		setTimeout(() => onResult(true), 800);
	}

	function handleTimeout() {
		if (!resolved) {
			resolved = true;
			onResult(false);
		}
	}
</script>

<div class="emoji-game">
	<div class="timer-wrap">
		<TimerBar duration={TIMEOUT} running={timerRunning} onComplete={handleTimeout} color="pink" />
	</div>

	<div class="emoji-display glass">
		<p class="theme-label">Theme: <span class="theme-name">{emojiSet.theme}</span></p>
		<div class="emojis">{emojiSet.emojis}</div>
		<p class="emoji-instruction">Which fits best?</p>
	</div>

	<div class="emoji-options">
		{#each emojiSet.options as option, i}
			<button
				class="emoji-option"
				class:selected={selectedIndex === i}
				onclick={() => handleSelect(i)}
				disabled={resolved}
			>
				<span class="option-number">{i + 1}</span>
				<span class="option-label">{option}</span>
			</button>
		{/each}
	</div>

	{#if resolved && selectedIndex >= 0}
		<div class="result-msg">
			<p class="pick-label">Great pick! 🎯</p>
			<p class="pick-hint">Compare answers after matching!</p>
		</div>
	{/if}
</div>

<style>
	.emoji-game {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding: 16px;
	}

	.timer-wrap {
		width: 100%;
	}

	.emoji-display {
		text-align: center;
		padding: 28px 20px;
	}

	.theme-label {
		font-size: var(--text-sm);
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin-bottom: 8px;
	}

	.theme-name {
		color: var(--accent-pink);
		font-weight: 600;
	}

	.emojis {
		font-size: 56px;
		letter-spacing: 8px;
		margin-bottom: 12px;
		animation: float-slow 4s ease-in-out infinite;
	}

	.emoji-instruction {
		font-family: var(--font-display);
		font-size: var(--text-lg);
		color: var(--text-secondary);
		font-style: italic;
	}

	.emoji-options {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}

	.emoji-option {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 16px;
		background: var(--glass-light);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		-webkit-tap-highlight-color: transparent;
		font-family: var(--font-body);
		color: var(--text-primary);
	}

	.emoji-option:not(:disabled):hover {
		background: var(--glass-medium);
		border-color: var(--glass-border-hover);
	}

	.emoji-option:not(:disabled):active {
		transform: scale(0.97);
	}

	.emoji-option.selected {
		background: rgba(255, 61, 127, 0.15);
		border-color: var(--accent-pink);
		box-shadow: 0 0 15px rgba(255, 61, 127, 0.2);
	}

	.option-number {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--glass-medium);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-xs);
		font-weight: 700;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.emoji-option.selected .option-number {
		background: var(--accent-pink);
		color: white;
	}

	.option-label {
		font-size: var(--text-sm);
		line-height: 1.3;
	}

	.result-msg {
		text-align: center;
		animation: fade-in-up 0.3s var(--ease-out-back);
	}

	.pick-label {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		color: var(--success);
		margin-bottom: 4px;
	}

	.pick-hint {
		font-size: var(--text-xs);
		color: var(--text-muted);
	}
</style>
