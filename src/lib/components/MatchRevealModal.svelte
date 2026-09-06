<script lang="ts">
	import { onMount } from 'svelte';
	import type { Profile } from '$lib/data/mockProfiles';
	import { getCurrentUser, addToast } from '$lib/stores/gameState.svelte';
	import GradientButton from './GradientButton.svelte';

	interface Props {
		profile: Profile;
		onChat: () => void;
		onClose: () => void;
	}

	let { profile, onChat, onClose }: Props = $props();

	const currentUser = getCurrentUser();
	let canvasEl: HTMLCanvasElement;
	let copied = $state(false);

	function copyInstagram() {
		if (profile.instagram) {
			navigator.clipboard.writeText(profile.instagram);
			copied = true;
			addToast(`Copied ${profile.instagram} to clipboard! 📋`, 'success');
			setTimeout(() => (copied = false), 2500);
		}
	}

	onMount(() => {
		// Confetti explosion animation
		if (!canvasEl) return;
		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		canvasEl.width = window.innerWidth;
		canvasEl.height = window.innerHeight;

		const particles: {
			x: number;
			y: number;
			vx: number;
			vy: number;
			size: number;
			color: string;
			alpha: number;
			rotation: number;
			rotSpeed: number;
		}[] = [];

		const colors = ['#ff3d7f', '#c850c0', '#7c3aed', '#00e5a0', '#ffa502', '#ffffff'];

		for (let i = 0; i < 90; i++) {
			particles.push({
				x: canvasEl.width / 2,
				y: canvasEl.height * 0.38,
				vx: (Math.random() - 0.5) * 14,
				vy: (Math.random() - 0.7) * 14,
				size: Math.random() * 8 + 4,
				color: colors[Math.floor(Math.random() * colors.length)],
				alpha: 1,
				rotation: Math.random() * 360,
				rotSpeed: (Math.random() - 0.5) * 10
			});
		}

		let animId: number;
		function render() {
			if (!ctx) return;
			ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);


			for (const p of particles) {
				p.x += p.vx;
				p.y += p.vy;
				p.vy += 0.25; // gravity
				p.vx *= 0.98;
				p.alpha -= 0.008;
				p.rotation += p.rotSpeed;

				if (p.alpha > 0) {
					ctx.save();
					ctx.translate(p.x, p.y);
					ctx.rotate((p.rotation * Math.PI) / 180);
					ctx.globalAlpha = Math.max(0, p.alpha);
					ctx.fillStyle = p.color;
					ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
					ctx.restore();
				}
			}

			if (particles.some((p) => p.alpha > 0)) {
				animId = requestAnimationFrame(render);
			}
		}

		animId = requestAnimationFrame(render);

		return () => cancelAnimationFrame(animId);
	});
</script>

<div class="match-overlay" role="dialog" aria-modal="true" aria-labelledby="match-heading">
	<canvas bind:this={canvasEl} class="confetti-canvas"></canvas>

	<div class="match-card glass-strong">
		<!-- Sparkle badge -->
		<div class="match-sparkle">✨ MUTUAL ADMIRER ✨</div>

		<h1 id="match-heading" class="match-title">It's a Match!</h1>
		<p class="match-subtitle">You and <strong>{profile.name}</strong> both liked each other</p>

		<!-- Avatar Collision Visual -->
		<div class="avatar-pair">
			<!-- User Avatar -->
			<div class="avatar-circle user-avatar">
				{#if currentUser?.photo}
					<img src={currentUser.photo} alt="You" class="avatar-img" />
				{:else}
					<div class="avatar-fallback user-fallback">
						<span>{currentUser?.name?.[0] || 'U'}</span>
					</div>
				{/if}
			</div>

			<!-- Heart Center Badge -->
			<div class="heart-badge">
				<span>💖</span>
			</div>

			<!-- Match Avatar -->
			<div class="avatar-circle match-avatar" style="background: {profile.photoGradient}">
				<span class="match-initial">{profile.photoInitial}</span>
			</div>
		</div>

		<!-- Match Info & Reveal -->
		<div class="revealed-details glass">
			<div class="match-meta">
				<h3 class="revealed-name">{profile.name}</h3>
				<div class="meta-badges">
					<span class="dept-badge">{profile.department}</span>
					{#if profile.year}
						<span class="year-badge">{profile.year}</span>
					{/if}
				</div>
			</div>

			<!-- Instagram Unlock Reveal -->
			{#if profile.instagram}
				<div class="instagram-reveal">
					<span class="ig-icon">📸</span>
					<div class="ig-info">
						<span class="ig-label">Secret Instagram Unlocked</span>
						<span class="ig-handle">{profile.instagram}</span>
					</div>
					<button type="button" class="copy-ig-btn" onclick={copyInstagram}>
						{copied ? '✓ Copied' : 'Copy'}
					</button>
				</div>
			{/if}

			<!-- Prompt Quote Preview -->
			{#if profile.prompts.length > 0}
				<div class="prompt-preview">
					<span class="prompt-preview-q">{profile.prompts[0].question}</span>
					<p class="prompt-preview-a">"{profile.prompts[0].answer}"</p>
				</div>
			{/if}
		</div>

		<!-- Action Buttons -->
		<div class="match-actions">
			<GradientButton variant="primary" size="lg" fullWidth={true} onclick={onChat}>
				Chat with {profile.name} 💬
			</GradientButton>

			<button type="button" class="keep-swiping-btn" onclick={onClose}>
				Keep Swiping ✨
			</button>
		</div>
	</div>
</div>

<style>
	.match-overlay {
		position: fixed;
		inset: 0;
		z-index: var(--z-modal);
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(5, 5, 10, 0.88);
		backdrop-filter: blur(16px);
		padding: var(--space-md);
		animation: fade-in 0.4s var(--ease-out-expo);
	}

	.confetti-canvas {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 1;
	}

	.match-card {
		position: relative;
		z-index: 2;
		width: 100%;
		max-width: 390px;
		padding: var(--space-xl) var(--space-lg);
		border-radius: var(--radius-2xl);
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
		border: 1px solid rgba(255, 61, 127, 0.4);
		box-shadow:
			0 0 50px rgba(255, 61, 127, 0.25),
			0 20px 40px rgba(0, 0, 0, 0.6);
		animation: zoom-in-bounce 0.5s var(--ease-spring);
	}

	.match-sparkle {
		font-size: var(--text-xs);
		font-weight: 700;
		letter-spacing: 0.12em;
		color: #00e5a0;
		text-shadow: 0 0 10px rgba(0, 229, 160, 0.5);
	}

	.match-title {
		font-family: var(--font-display);
		font-size: clamp(2.4rem, 7vw, 3rem);
		font-weight: 700;
		font-style: italic;
		background: var(--gradient-accent);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		line-height: 1.1;
		margin: 0;
	}

	.match-subtitle {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		margin: 0;
	}

	.match-subtitle strong {
		color: var(--text-primary);
	}

	/* Avatar Pair */
	.avatar-pair {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: var(--space-sm) 0;
		height: 90px;
	}

	.avatar-circle {
		width: 82px;
		height: 82px;
		border-radius: 50%;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 3px solid #ffffff;
		box-shadow: var(--shadow-lg);
	}

	.user-avatar {
		margin-right: -14px;
		z-index: 1;
		animation: slide-in-left 0.5s var(--ease-spring);
	}

	.match-avatar {
		margin-left: -14px;
		z-index: 1;
		animation: slide-in-right 0.5s var(--ease-spring);
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-fallback {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #7c3aed, #4f46e5);
		color: white;
		font-size: var(--text-2xl);
		font-weight: 700;
	}

	.match-initial {
		color: white;
		font-size: var(--text-2xl);
		font-weight: 700;
	}

	.heart-badge {
		position: absolute;
		z-index: 3;
		width: 36px;
		height: 36px;
		background: rgba(20, 15, 30, 0.9);
		border: 2px solid var(--accent-pink);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
		animation: pulse-glow 1.8s infinite;
	}

	/* Revealed Details Box */
	.revealed-details {
		width: 100%;
		padding: var(--space-md);
		border-radius: var(--radius-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		text-align: left;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--glass-border);
	}

	.match-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 6px;
	}

	.revealed-name {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.meta-badges {
		display: flex;
		gap: 6px;
	}

	.dept-badge,
	.year-badge {
		font-size: var(--text-xs);
		padding: 3px 8px;
		border-radius: 12px;
		font-weight: 500;
	}

	.dept-badge {
		background: var(--glass-light);
		color: var(--text-secondary);
	}

	.year-badge {
		background: rgba(255, 61, 127, 0.15);
		color: #ff7597;
		border: 1px solid rgba(255, 61, 127, 0.3);
	}

	/* Instagram reveal */
	.instagram-reveal {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		background: linear-gradient(135deg, rgba(225, 48, 108, 0.15), rgba(131, 58, 180, 0.15));
		border: 1px solid rgba(225, 48, 108, 0.35);
		border-radius: var(--radius-md);
	}

	.ig-icon {
		font-size: 20px;
	}

	.ig-info {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.ig-label {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #e1306c;
		font-weight: 700;
	}

	.ig-handle {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text-primary);
	}

	.copy-ig-btn {
		padding: 4px 10px;
		font-size: var(--text-xs);
		font-weight: 600;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.1);
		color: white;
		cursor: pointer;
		transition: all var(--duration-fast);
	}

	.copy-ig-btn:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	/* Prompt preview */
	.prompt-preview {
		padding-top: 4px;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.prompt-preview-q {
		font-size: 11px;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.prompt-preview-a {
		font-size: var(--text-xs);
		color: var(--text-secondary);
		font-style: italic;
		margin: 2px 0 0;
	}

	/* Match Actions */
	.match-actions {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-top: 4px;
	}

	.keep-swiping-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: var(--text-sm);
		cursor: pointer;
		padding: 8px;
		transition: color var(--duration-fast);
		font-family: var(--font-body);
	}

	.keep-swiping-btn:hover {
		color: var(--text-primary);
	}

	@keyframes zoom-in-bounce {
		0% {
			transform: scale(0.7);
			opacity: 0;
		}
		80% {
			transform: scale(1.03);
			opacity: 1;
		}
		100% {
			transform: scale(1);
		}
	}

	@keyframes slide-in-left {
		from {
			transform: translateX(-40px);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	@keyframes slide-in-right {
		from {
			transform: translateX(40px);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	@keyframes pulse-glow {
		0%,
		100% {
			transform: scale(1);
			box-shadow: 0 0 10px rgba(255, 61, 127, 0.4);
		}
		50% {
			transform: scale(1.15);
			box-shadow: 0 0 20px rgba(255, 61, 127, 0.8);
		}
	}
</style>
