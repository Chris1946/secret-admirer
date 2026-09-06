<script lang="ts">
	import { randomInt } from '$lib/utils/shuffle';

	interface Props {
		onResult: (won: boolean, score?: number) => void;
	}

	let { onResult }: Props = $props();

	type Phase = 'waiting' | 'ready' | 'tapped' | 'tooEarly' | 'result';

	let phase = $state<Phase>('waiting');
	let startTime = $state(0);
	let reactionTime = $state(0);
	let retryCount = $state(0);
	let circleColor = $state('#ff3d7f');
	let timerId: ReturnType<typeof setTimeout> | null = null;

	const PASS_THRESHOLD = 600; // ms
	const COLORS = ['#ff3d7f', '#c850c0', '#7c3aed', '#00e5a0', '#ffa502'];

	function startRound() {
		phase = 'waiting';
		circleColor = COLORS[Math.floor(Math.random() * COLORS.length)];

		const delay = randomInt(1000, 3000);
		timerId = setTimeout(() => {
			phase = 'ready';
			startTime = performance.now();
		}, delay);
	}

	function handleTap() {
		if (phase === 'waiting') {
			// Too early!
			if (timerId) clearTimeout(timerId);
			phase = 'tooEarly';
			setTimeout(() => {
				retryCount++;
				if (retryCount >= 3) {
					onResult(false);
				} else {
					startRound();
				}
			}, 1200);
		} else if (phase === 'ready') {
			reactionTime = Math.round(performance.now() - startTime);
			phase = 'result';

			setTimeout(() => {
				if (reactionTime <= PASS_THRESHOLD) {
					onResult(true, reactionTime);
				} else {
					retryCount++;
					if (retryCount >= 2) {
						onResult(false, reactionTime);
					} else {
						startRound();
					}
				}
			}, 1500);
		}
	}

	// Start on mount
	$effect(() => {
		startRound();
		return () => {
			if (timerId) clearTimeout(timerId);
		};
	});
</script>

<div class="reflex-game" role="button" tabindex="0" onclick={handleTap} onkeydown={(e) => e.key === ' ' && handleTap()}>
	{#if phase === 'waiting'}
		<div class="wait-screen">
			<div class="pulse-dots">
				<span class="dot"></span>
				<span class="dot"></span>
				<span class="dot"></span>
			</div>
			<p class="wait-text">Wait for it...</p>
			<p class="wait-hint">Tap when the circle appears!</p>
		</div>
	{:else if phase === 'ready'}
		<div class="ready-screen">
			<div class="tap-circle" style="background: {circleColor}; box-shadow: 0 0 60px {circleColor}40">
				<span class="tap-text">TAP!</span>
			</div>
		</div>
	{:else if phase === 'tooEarly'}
		<div class="early-screen">
			<span class="early-emoji">😬</span>
			<p class="early-text">Too eager!</p>
			<p class="early-hint">Wait for the circle to appear</p>
		</div>
	{:else if phase === 'result'}
		<div class="result-screen">
			<p class="reaction-time" class:fast={reactionTime <= PASS_THRESHOLD}>
				{reactionTime}<span class="ms">ms</span>
			</p>
			{#if reactionTime <= PASS_THRESHOLD}
				<p class="result-label success-label">⚡ Lightning fast!</p>
			{:else}
				<p class="result-label fail-label">Almost! Try again</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.reflex-game {
		width: 100%;
		min-height: 350px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		border-radius: var(--radius-lg);
		overflow: hidden;
		-webkit-tap-highlight-color: transparent;
		outline: none;
	}

	/* Wait screen */
	.wait-screen {
		text-align: center;
	}

	.pulse-dots {
		display: flex;
		gap: 8px;
		justify-content: center;
		margin-bottom: 24px;
	}

	.dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--accent-pink);
		opacity: 0.3;
		animation: pulse-dot 1.4s ease-in-out infinite;
	}

	.dot:nth-child(2) {
		animation-delay: 0.2s;
	}
	.dot:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes pulse-dot {
		0%, 100% { opacity: 0.3; transform: scale(1); }
		50% { opacity: 1; transform: scale(1.3); }
	}

	.wait-text {
		font-family: var(--font-display);
		font-size: var(--text-3xl);
		color: var(--text-primary);
		margin-bottom: 8px;
	}

	.wait-hint {
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	/* Ready screen */
	.ready-screen {
		animation: fade-in-scale 0.15s ease-out;
	}

	.tap-circle {
		width: 160px;
		height: 160px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		animation: scale-in 0.2s var(--ease-out-back);
	}

	.tap-text {
		font-family: var(--font-display);
		font-size: var(--text-3xl);
		font-weight: 700;
		color: white;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	/* Too early */
	.early-screen {
		text-align: center;
		animation: shake 0.4s ease;
	}

	.early-emoji {
		font-size: 64px;
		display: block;
		margin-bottom: 12px;
	}

	.early-text {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		color: var(--error);
		margin-bottom: 4px;
	}

	.early-hint {
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	/* Result */
	.result-screen {
		text-align: center;
		animation: fade-in-scale 0.3s var(--ease-out-back);
	}

	.reaction-time {
		font-family: var(--font-display);
		font-size: 72px;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1;
		margin-bottom: 8px;
	}

	.reaction-time.fast {
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.ms {
		font-size: var(--text-xl);
		opacity: 0.5;
	}

	.result-label {
		font-size: var(--text-lg);
		font-weight: 600;
	}

	.success-label {
		color: var(--success);
	}

	.fail-label {
		color: var(--error);
	}
</style>
