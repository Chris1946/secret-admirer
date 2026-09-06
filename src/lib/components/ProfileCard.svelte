<script lang="ts">
	import type { Profile } from '$lib/data/mockProfiles';
	import { generateUserGradient, generateUserGlow, getDepartmentBadgeStyle } from '$lib/utils/colors';

	interface Props {
		profile: Profile;
		style?: string;
		zIndex?: number;
		isTop?: boolean;
	}

	let { profile, style = '', zIndex = 1, isTop = false }: Props = $props();

	let activePromptIndex = $state(0);
	let answeredPrompts = $derived(
		(profile.prompts || []).filter((p) => p.answer && p.answer.trim().length > 0)
	);
	let currentPrompt = $derived(
		answeredPrompts[activePromptIndex] || answeredPrompts[0] || { question: 'Orientation Vibe', answer: 'Excited to connect with batchmates! ✨' }
	);

	function cyclePrompt(e: MouseEvent) {
		e.stopPropagation();
		if (answeredPrompts.length > 1) {
			activePromptIndex = (activePromptIndex + 1) % answeredPrompts.length;
		}
	}
</script>

<div class="profile-card" {style} style:z-index={zIndex} class:is-top={isTop}>
	<!-- Floating Glass Thought Bubble (Creative Free Space) -->
	{#if profile.bio && profile.bio.trim().length > 0}
		<div class="creative-thought-bubble glass-bubble">
			<div class="bubble-sparkle-row">
				<span class="bubble-tag">✨ Creative Mind</span>
				<span class="bubble-emoji">💭</span>
			</div>
			<p class="bubble-text">"{profile.bio}"</p>
			<div class="bubble-tail"></div>
		</div>
	{/if}

	<!-- Photo area with gradient fallback -->
	<div class="card-photo">
		{#if profile.photo}
			<img src={profile.photo} alt={profile.name} class="photo-img" />
		{:else}
			<div
				class="photo-gradient"
				style="background: {profile.photoGradient || generateUserGradient(profile.id)}; box-shadow: inset 0 0 40px rgba(0,0,0,0.2), 0 0 24px {generateUserGlow(profile.id)};"
			>
				<span class="photo-initial">{profile.photoInitial || profile.name.charAt(0).toUpperCase()}</span>
				<div class="avatar-badge glass">
					<span>🎓 1st Year</span>
				</div>
			</div>
		{/if}
		<div class="photo-overlay"></div>
	</div>

	<!-- Info section -->
	<div class="card-info">
		<div class="card-header-row">
			<h2 class="card-name">{profile.name}</h2>
			{#if profile.instagram}
				<span class="ig-chip" title="Instagram profile attached">📸 @{profile.instagram}</span>
			{/if}
		</div>

		<div class="card-meta">
			<span
				class="card-dept"
				style="background: {getDepartmentBadgeStyle(profile.department).bg}; color: {getDepartmentBadgeStyle(profile.department).text}; border: 1px solid {getDepartmentBadgeStyle(profile.department).border};"
			>
				{profile.department}
			</span>
			{#if profile.year}
				<span class="card-year">{profile.year}</span>
			{/if}
		</div>

		<!-- Interactive Prompts Glass Capsule -->
		<div class="card-prompt glass-prompt" onclick={cyclePrompt} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && cyclePrompt(e as any)}>
			<div class="prompt-header-row">
				<span class="prompt-q">{currentPrompt.question}</span>
				{#if answeredPrompts.length > 1}
					<span class="prompt-counter">{activePromptIndex + 1}/{answeredPrompts.length} ↻</span>
				{/if}
			</div>
			<p class="prompt-a">"{currentPrompt.answer}"</p>

			{#if answeredPrompts.length > 1}
				<div class="prompt-dots">
					{#each answeredPrompts as _, idx}
						<span class="dot" class:active={idx === activePromptIndex}></span>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Swipe indicators (shown when dragging) -->
	<div class="swipe-indicator accept-indicator">
		<span>♥</span>
	</div>
	<div class="swipe-indicator skip-indicator">
		<span>→</span>
	</div>
</div>

<style>
	.profile-card {
		position: absolute;
		width: 100%;
		max-width: 360px;
		height: 100%;
		max-height: 560px;
		border-radius: var(--radius-xl);
		overflow: visible;
		background: var(--bg-secondary);
		border: 1px solid var(--glass-border);
		box-shadow: var(--shadow-lg);
		user-select: none;
		touch-action: none;
		will-change: transform;
		display: flex;
		flex-direction: column;
	}

	/* Floating Creative Thought Glass Bubble */
	.creative-thought-bubble {
		position: absolute;
		top: 14px;
		right: 14px;
		left: 14px;
		z-index: 5;
		padding: 10px 14px;
		border-radius: 18px;
		background: rgba(18, 18, 30, 0.75);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 61, 127, 0.4);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 16px rgba(255, 61, 127, 0.25);
		animation: float-bubble 4s ease-in-out infinite;
		pointer-events: none;
	}

	.bubble-sparkle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 2px;
	}

	.bubble-tag {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		background: var(--gradient-accent);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.bubble-emoji {
		font-size: 14px;
	}

	.bubble-text {
		font-family: var(--font-body);
		font-size: var(--text-xs);
		line-height: 1.4;
		color: #ffffff;
		margin: 0;
		font-weight: 500;
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@keyframes float-bubble {
		0%, 100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-5px);
		}
	}

	.card-photo {
		position: relative;
		width: 100%;
		flex: 1;
		min-height: 240px;
		max-height: 380px;
		overflow: hidden;
		border-top-left-radius: var(--radius-xl);
		border-top-right-radius: var(--radius-xl);
		background: #14141f;
	}

	.photo-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 20%;
		display: block;
	}

	.photo-gradient {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.photo-initial {
		font-family: var(--font-display);
		font-size: 110px;
		color: rgba(255, 255, 255, 0.28);
		font-weight: 700;
		text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	}

	.avatar-badge {
		position: absolute;
		bottom: 45px;
		padding: 4px 12px;
		border-radius: 20px;
		font-size: 11px;
		color: #ffffff;
		font-weight: 600;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.photo-overlay {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 60%;
		background: linear-gradient(to top, rgba(18, 18, 26, 0.98) 0%, transparent 100%);
		pointer-events: none;
	}

	.card-info {
		padding: 16px 20px 20px;
		position: relative;
		margin-top: -36px;
		z-index: 2;
		background: linear-gradient(to bottom, transparent, var(--bg-secondary) 30%);
		border-bottom-left-radius: var(--radius-xl);
		border-bottom-right-radius: var(--radius-xl);
	}

	.card-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 4px;
	}

	.card-name {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.ig-chip {
		font-size: 11px;
		color: #e1306c;
		font-weight: 600;
		background: rgba(225, 48, 108, 0.1);
		padding: 2px 8px;
		border-radius: 10px;
		border: 1px solid rgba(225, 48, 108, 0.25);
	}

	.card-meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 12px;
	}

	.card-dept {
		display: inline-block;
		padding: 3px 10px;
		background: var(--glass-light);
		border: 1px solid var(--glass-border);
		border-radius: 20px;
		font-size: var(--text-xs);
		color: var(--text-secondary);
	}

	.card-year {
		display: inline-block;
		padding: 3px 8px;
		background: rgba(255, 61, 127, 0.12);
		border: 1px solid rgba(255, 61, 127, 0.3);
		border-radius: 20px;
		font-size: var(--text-xs);
		color: #ff7597;
		font-weight: 500;
	}

	/* Interactive Prompts Glass Capsule */
	.glass-prompt {
		padding: 12px 14px;
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(10px);
		border-radius: var(--radius-md);
		border: 1px solid var(--glass-border);
		cursor: pointer;
		transition: all var(--duration-fast);
	}

	.glass-prompt:hover {
		border-color: rgba(255, 61, 127, 0.4);
		background: rgba(255, 255, 255, 0.08);
	}

	.prompt-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 4px;
	}

	.prompt-q {
		font-size: 11px;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 600;
	}

	.prompt-counter {
		font-size: 10px;
		color: var(--accent-pink);
		font-weight: 700;
		background: rgba(255, 61, 127, 0.12);
		padding: 1px 6px;
		border-radius: 8px;
	}

	.prompt-a {
		font-family: var(--font-display);
		font-size: var(--text-base);
		font-style: italic;
		color: var(--text-primary);
		line-height: 1.35;
		margin: 0;
	}

	.prompt-dots {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		margin-top: 6px;
	}

	.dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.2);
		transition: all var(--duration-fast);
	}

	.dot.active {
		background: var(--accent-pink);
		width: 14px;
		border-radius: 4px;
	}

	/* Swipe indicators */
	.swipe-indicator {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 60px;
		height: 60px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 28px;
		opacity: 0;
		transition: opacity var(--duration-fast);
		pointer-events: none;
		z-index: 10;
	}

	.accept-indicator {
		right: 20px;
		background: rgba(0, 229, 160, 0.2);
		border: 2px solid var(--success);
		color: var(--success);
	}

	.skip-indicator {
		left: 20px;
		background: rgba(255, 255, 255, 0.1);
		border: 2px solid var(--text-muted);
		color: var(--text-muted);
	}
</style>

