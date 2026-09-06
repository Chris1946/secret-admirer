<script lang="ts">
	import TimerBar from '$lib/components/TimerBar.svelte';
	import { RIDDLES, type Riddle } from '$lib/data/riddles';
	import { shuffle } from '$lib/utils/shuffle';

	interface Props {
		onResult: (won: boolean) => void;
	}

	let { onResult }: Props = $props();

	const TIMEOUT = 10000;

	let riddle = $state<Riddle>(shuffle(RIDDLES)[0]);
	let timerRunning = $state(true);
	let selectedIndex = $state(-1);
	let resolved = $state(false);
	let retryCount = $state(0);

	function handleAnswer(index: number) {
		if (resolved) return;
		selectedIndex = index;

		if (index === riddle.correctIndex) {
			resolved = true;
			timerRunning = false;
			setTimeout(() => onResult(true), 800);
		} else {
			setTimeout(() => {
				selectedIndex = -1;
				retryCount++;
				if (retryCount >= 2) {
					resolved = true;
					timerRunning = false;
					onResult(false);
				}
			}, 500);
		}
	}

	function handleTimeout() {
		if (!resolved) {
			resolved = true;
			onResult(false);
		}
	}
</script>

<div class="riddle-game">
	<div class="timer-wrap">
		<TimerBar duration={TIMEOUT} running={timerRunning} onComplete={handleTimeout} color="violet" />
	</div>

	<div class="question-card glass">
		<span class="question-icon">🤔</span>
		<p class="question-text">{riddle.question}</p>
	</div>

	<div class="options">
		{#each riddle.options as option, i}
			<button
				class="option-btn"
				class:correct={resolved && i === riddle.correctIndex}
				class:wrong={selectedIndex === i && i !== riddle.correctIndex}
				class:selected={selectedIndex === i}
				onclick={() => handleAnswer(i)}
				disabled={resolved}
			>
				<span class="option-letter">{String.fromCharCode(65 + i)}</span>
				<span class="option-text">{option}</span>
			</button>
		{/each}
	</div>

	{#if retryCount > 0 && !resolved}
		<p class="retry-hint">Not quite! Try again ({retryCount}/2)</p>
	{/if}
</div>

<style>
	.riddle-game {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding: 16px;
	}

	.timer-wrap {
		width: 100%;
	}

	.question-card {
		padding: 24px;
		text-align: center;
	}

	.question-icon {
		font-size: 40px;
		display: block;
		margin-bottom: 12px;
	}

	.question-text {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		font-style: italic;
		color: var(--text-primary);
		line-height: 1.5;
	}

	.options {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.option-btn {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 14px 18px;
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

	.option-btn:not(:disabled):hover {
		background: var(--glass-medium);
		border-color: var(--glass-border-hover);
	}

	.option-btn:not(:disabled):active {
		transform: scale(0.98);
	}

	.option-btn.correct {
		background: rgba(0, 229, 160, 0.15);
		border-color: var(--success);
	}

	.option-btn.wrong {
		background: rgba(255, 71, 87, 0.15);
		border-color: var(--error);
		animation: shake 0.3s ease;
	}

	.option-letter {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--glass-medium);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	.option-btn.correct .option-letter {
		background: var(--success);
		color: white;
	}

	.option-btn.wrong .option-letter {
		background: var(--error);
		color: white;
	}

	.option-text {
		font-size: var(--text-base);
	}

	.retry-hint {
		text-align: center;
		font-size: var(--text-xs);
		color: var(--text-muted);
	}
</style>
