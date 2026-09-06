<script lang="ts">
	interface Props {
		duration: number; // total time in ms
		running?: boolean;
		onComplete?: () => void;
		color?: 'pink' | 'violet' | 'success' | 'warning';
	}

	let { duration, running = true, onComplete, color = 'pink' }: Props = $props();

	let elapsed = $state(0);
	let intervalId: ReturnType<typeof setInterval> | null = null;
	const TICK = 50;

	$effect(() => {
		if (running) {
			elapsed = 0;
			intervalId = setInterval(() => {
				elapsed += TICK;
				if (elapsed >= duration) {
					if (intervalId) clearInterval(intervalId);
					onComplete?.();
				}
			}, TICK);
		} else {
			if (intervalId) clearInterval(intervalId);
		}

		return () => {
			if (intervalId) clearInterval(intervalId);
		};
	});

	let progress = $derived(Math.max(0, 1 - elapsed / duration));
</script>

<div class="timer-bar-track">
	<div
		class="timer-bar-fill {color}"
		style="transform: scaleX({progress})"
	></div>
</div>

<style>
	.timer-bar-track {
		width: 100%;
		height: 6px;
		background: var(--glass-light);
		border-radius: 3px;
		overflow: hidden;
	}

	.timer-bar-fill {
		height: 100%;
		border-radius: 3px;
		transform-origin: left;
		transition: transform 50ms linear;
	}

	.timer-bar-fill.pink {
		background: var(--gradient-primary);
	}

	.timer-bar-fill.violet {
		background: var(--gradient-secondary);
	}

	.timer-bar-fill.success {
		background: linear-gradient(90deg, #00e5a0, #00b4d8);
	}

	.timer-bar-fill.warning {
		background: linear-gradient(90deg, #ffa502, #ff6348);
	}
</style>
