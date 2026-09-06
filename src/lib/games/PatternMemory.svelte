<script lang="ts">
	interface Props {
		onResult: (won: boolean) => void;
	}

	let { onResult }: Props = $props();

	type Phase = 'showing' | 'input' | 'result';

	const GRID_SIZE = 3;
	const SEQUENCE_LENGTH = 4;
	const FLASH_INTERVAL = 600; // ms
	const INPUT_TIMEOUT = 5000; // ms

	let phase = $state<Phase>('showing');
	let sequence = $state<number[]>([]);
	let playerInput = $state<number[]>([]);
	let currentFlash = $state(-1);
	let retryCount = $state(0);
	let flashedTiles = $state<Set<number>>(new Set());
	let wrongTile = $state(-1);
	let correctCount = $state(0);

	let timerId: ReturnType<typeof setTimeout> | null = null;
	let inputTimerId: ReturnType<typeof setTimeout> | null = null;

	function generateSequence(): number[] {
		const seq: number[] = [];
		while (seq.length < SEQUENCE_LENGTH) {
			const n = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
			if (!seq.includes(n)) seq.push(n);
		}
		return seq;
	}

	function startRound() {
		sequence = generateSequence();
		playerInput = [];
		currentFlash = -1;
		wrongTile = -1;
		correctCount = 0;
		flashedTiles = new Set();
		phase = 'showing';

		// Flash sequence
		let i = 0;
		function flashNext() {
			if (i < sequence.length) {
				currentFlash = sequence[i];
				flashedTiles.add(sequence[i]);
				flashedTiles = new Set(flashedTiles);
				timerId = setTimeout(() => {
					currentFlash = -1;
					i++;
					timerId = setTimeout(flashNext, 200);
				}, FLASH_INTERVAL);
			} else {
				phase = 'input';
				// Start input timeout
				inputTimerId = setTimeout(() => {
					handleTimeout();
				}, INPUT_TIMEOUT);
			}
		}

		timerId = setTimeout(flashNext, 500);
	}

	function handleTileTap(index: number) {
		if (phase !== 'input') return;

		const expected = sequence[playerInput.length];

		if (index === expected) {
			playerInput = [...playerInput, index];
			correctCount = playerInput.length;

			if (playerInput.length === sequence.length) {
				// Win!
				if (inputTimerId) clearTimeout(inputTimerId);
				phase = 'result';
				setTimeout(() => onResult(true), 1000);
			}
		} else {
			// Wrong!
			wrongTile = index;
			if (inputTimerId) clearTimeout(inputTimerId);

			setTimeout(() => {
				retryCount++;
				if (retryCount >= 2) {
					onResult(false);
				} else {
					startRound();
				}
			}, 1000);
		}
	}

	function handleTimeout() {
		retryCount++;
		if (retryCount >= 2) {
			onResult(false);
		} else {
			startRound();
		}
	}

	$effect(() => {
		startRound();
		return () => {
			if (timerId) clearTimeout(timerId);
			if (inputTimerId) clearTimeout(inputTimerId);
		};
	});
</script>

<div class="pattern-game">
	<div class="game-header">
		{#if phase === 'showing'}
			<p class="phase-label">Watch the pattern...</p>
		{:else if phase === 'input'}
			<p class="phase-label">Your turn! Tap in order</p>
			<div class="progress-dots">
				{#each sequence as _, i}
					<span class="progress-dot" class:filled={i < correctCount}></span>
				{/each}
			</div>
		{:else}
			<p class="phase-label success-text">✓ Perfect memory!</p>
		{/if}
	</div>

	<div class="tile-grid">
		{#each Array(GRID_SIZE * GRID_SIZE) as _, i}
			<button
				class="tile"
				class:flashing={currentFlash === i}
				class:flashed={phase === 'showing' && flashedTiles.has(i)}
				class:correct={phase === 'input' && playerInput.includes(i)}
				class:wrong={wrongTile === i}
				onclick={() => handleTileTap(i)}
				disabled={phase !== 'input'}
			>
				{#if phase === 'input' && playerInput.includes(i)}
					<span class="tile-number">{playerInput.indexOf(i) + 1}</span>
				{/if}
			</button>
		{/each}
	</div>

	{#if retryCount > 0 && phase !== 'result'}
		<p class="retry-hint">Attempt {retryCount + 1} of 2</p>
	{/if}
</div>

<style>
	.pattern-game {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 24px;
		padding: 16px;
	}

	.game-header {
		text-align: center;
	}

	.phase-label {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		color: var(--text-primary);
		margin-bottom: 8px;
	}

	.success-text {
		color: var(--success);
	}

	.progress-dots {
		display: flex;
		gap: 8px;
		justify-content: center;
	}

	.progress-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--glass-medium);
		border: 1px solid var(--glass-border);
		transition: all 0.2s ease;
	}

	.progress-dot.filled {
		background: var(--accent-pink);
		border-color: var(--accent-pink);
		box-shadow: 0 0 8px rgba(255, 61, 127, 0.5);
	}

	.tile-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
		width: 100%;
		max-width: 280px;
	}

	.tile {
		aspect-ratio: 1;
		border-radius: var(--radius-md);
		background: var(--glass-light);
		border: 1px solid var(--glass-border);
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-body);
		-webkit-tap-highlight-color: transparent;
	}

	.tile:disabled {
		cursor: default;
	}

	.tile:not(:disabled):hover {
		background: var(--glass-medium);
		border-color: var(--glass-border-hover);
	}

	.tile:not(:disabled):active {
		transform: scale(0.95);
	}

	.tile.flashing {
		background: var(--accent-pink) !important;
		border-color: var(--accent-pink) !important;
		box-shadow: 0 0 30px rgba(255, 61, 127, 0.5);
		transform: scale(1.05);
	}

	.tile.correct {
		background: rgba(0, 229, 160, 0.2);
		border-color: var(--success);
	}

	.tile.wrong {
		background: rgba(255, 71, 87, 0.2);
		border-color: var(--error);
		animation: shake 0.3s ease;
	}

	.tile-number {
		font-size: var(--text-lg);
		font-weight: 700;
		color: var(--success);
	}

	.retry-hint {
		font-size: var(--text-xs);
		color: var(--text-muted);
	}
</style>
