<script lang="ts">
	import TimerBar from '$lib/components/TimerBar.svelte';
	import { ODD_ONE_OUT_PUZZLES, type OddOneOutPuzzle } from '$lib/data/oddOneOut';
	import { shuffle } from '$lib/utils/shuffle';

	interface Props {
		onResult: (won: boolean) => void;
	}

	let { onResult }: Props = $props();

	const TIMEOUT = 8000;

	let puzzle = $state<OddOneOutPuzzle>(shuffle(ODD_ONE_OUT_PUZZLES)[0]);
	let timerRunning = $state(true);
	let tappedIndex = $state(-1);
	let resolved = $state(false);
	let retryCount = $state(0);

	function handleTap(index: number) {
		if (resolved) return;
		tappedIndex = index;

		if (index === puzzle.oddIndex) {
			// Correct!
			resolved = true;
			timerRunning = false;
			setTimeout(() => onResult(true), 800);
		} else {
			// Wrong — shake
			setTimeout(() => {
				tappedIndex = -1;
				retryCount++;
				if (retryCount >= 2) {
					resolved = true;
					timerRunning = false;
					onResult(false);
				}
			}, 400);
		}
	}

	function handleTimeout() {
		if (!resolved) {
			resolved = true;
			onResult(false);
		}
	}

	function getShapeStyle(item: (typeof puzzle.items)[0]): string {
		const styles: string[] = [
			`background: ${item.color}`,
			`transform: rotate(${item.rotation}deg) scale(${item.scale})`
		];

		if (item.borderRadius) {
			styles.push(`border-radius: ${item.borderRadius}`);
		}

		switch (item.shape) {
			case 'circle':
				styles.push('border-radius: 50%');
				break;
			case 'square':
				if (!item.borderRadius) styles.push('border-radius: 6px');
				break;
			case 'diamond':
				styles.push('transform: rotate(' + (item.rotation + 45) + 'deg) scale(' + item.scale + ')');
				break;
			case 'triangle':
				styles.push('clip-path: polygon(50% 0%, 0% 100%, 100% 100%)');
				styles.push('background: ' + item.color);
				break;
			case 'hexagon':
				styles.push('clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)');
				break;
			case 'star':
				styles.push(
					'clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
				);
				break;
		}

		return styles.join('; ');
	}
</script>

<div class="odd-game">
	<div class="game-header">
		<p class="instruction">Find the odd one out!</p>
		<TimerBar duration={TIMEOUT} running={timerRunning} onComplete={handleTimeout} color="warning" />
	</div>

	<div class="shape-grid">
		{#each puzzle.items as item, i}
			<button
				class="shape-cell"
				class:correct={resolved && i === puzzle.oddIndex}
				class:wrong={tappedIndex === i && i !== puzzle.oddIndex}
				onclick={() => handleTap(i)}
				disabled={resolved}
			>
				<div class="shape" style={getShapeStyle(item)}></div>
			</button>
		{/each}
	</div>

	{#if retryCount > 0 && !resolved}
		<p class="retry-hint">Try again! ({retryCount}/2)</p>
	{/if}
</div>

<style>
	.odd-game {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 20px;
		padding: 16px;
	}

	.game-header {
		width: 100%;
		max-width: 300px;
		text-align: center;
	}

	.instruction {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		color: var(--text-primary);
		margin-bottom: 12px;
	}

	.shape-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
		width: 100%;
		max-width: 280px;
	}

	.shape-cell {
		aspect-ratio: 1;
		border-radius: var(--radius-md);
		background: var(--glass-light);
		border: 2px solid var(--glass-border);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		transition: all 0.2s ease;
		-webkit-tap-highlight-color: transparent;
	}

	.shape-cell:not(:disabled):hover {
		border-color: var(--glass-border-hover);
		background: var(--glass-medium);
	}

	.shape-cell:not(:disabled):active {
		transform: scale(0.95);
	}

	.shape-cell.correct {
		border-color: var(--success);
		background: rgba(0, 229, 160, 0.1);
		animation: scale-in 0.3s var(--ease-out-back);
	}

	.shape-cell.wrong {
		border-color: var(--error);
		background: rgba(255, 71, 87, 0.1);
		animation: shake 0.3s ease;
	}

	.shape {
		width: 100%;
		height: 100%;
		transition: all 0.2s ease;
	}

	.retry-hint {
		font-size: var(--text-xs);
		color: var(--text-muted);
	}
</style>
