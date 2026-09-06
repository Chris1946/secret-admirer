<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ReflexTap from '$lib/games/ReflexTap.svelte';
	import PatternMemory from '$lib/games/PatternMemory.svelte';
	import OddOneOut from '$lib/games/OddOneOut.svelte';
	import QuickRiddle from '$lib/games/QuickRiddle.svelte';
	import EmojiSprint from '$lib/games/EmojiSprint.svelte';
	import GradientButton from '$lib/components/GradientButton.svelte';
	import {
		getAcceptingProfile,
		setAcceptingProfile,
		acceptProfile,
		skipProfile,
		addGameResult,
		addToast,
		getRandomGameType,
		getMatchedIds,
		type GameType
	} from '$lib/stores/gameState.svelte';
	import { generateUserGradient, generateUserGlow } from '$lib/utils/colors';

	type Phase = 'intro' | 'playing' | 'result';

	let phase = $state<Phase>('intro');
	let gameType = $state<GameType>(getRandomGameType());
	let won = $state(false);
	let score = $state<number | undefined>();
	let showMatch = $state(false);

	let profile = $derived(getAcceptingProfile());

	const GAME_INFO: Record<GameType, { name: string; icon: string; description: string }> = {
		reflex: {
			name: 'Reflex Tap',
			icon: '⚡',
			description: 'Tap when the circle appears!'
		},
		pattern: {
			name: 'Pattern Memory',
			icon: '🧠',
			description: 'Remember the tile sequence'
		},
		oddOneOut: {
			name: 'Odd One Out',
			icon: '👁️',
			description: 'Find the different shape'
		},
		riddle: {
			name: 'Quick Riddle',
			icon: '🤔',
			description: 'Answer the riddle'
		},
		emoji: {
			name: 'Emoji Sprint',
			icon: '🎯',
			description: 'Pick the best match'
		}
	};

	let gameInfo = $derived(GAME_INFO[gameType]);

	onMount(() => {
		if (!profile) {
			goto('/discover');
		}
	});

	function startGame() {
		phase = 'playing';
	}

	async function handleResult(didWin: boolean, gameScore?: number) {
		won = didWin;
		score = gameScore;
		phase = 'result';

		if (profile) {
			addGameResult({
				profileId: profile.id,
				game: gameType,
				won: didWin,
				score: gameScore
			});

			if (didWin) {
				const isMatch = await acceptProfile(profile.id);
				if (isMatch) {
					showMatch = true;
				} else {
					addToast(`Chat request sent to ${profile.name}! 💌`, 'success');
				}
			} else {
				skipProfile();
			}
		}
	}


	function goBack() {
		setAcceptingProfile(null);
		goto('/discover');
	}

	function handleMatchContinue() {
		showMatch = false;
		goBack();
		addToast("It's a match! 💕 Check your matches", 'success');
	}
</script>

<svelte:head>
	<title>Mini Game — Secret Admirer</title>
</svelte:head>

<main class="minigame-page">
	<div class="ambient-orb orb-center"></div>

	<div class="game-content container">
		{#if phase === 'intro'}
			<!-- Game Intro -->
			<div class="intro-screen">
				<button class="back-btn" onclick={goBack}>← Back</button>

				{#if profile}
					<div class="target-info glass">
						<div
							class="target-avatar"
							style="background: {profile.photoGradient || generateUserGradient(profile.id)}; box-shadow: 0 0 16px {generateUserGlow(profile.id)};"
						>
							{#if profile.photo}
								<img src={profile.photo} alt={profile.name} class="target-img" />
							{:else}
								<span>{profile.photoInitial || profile.name.charAt(0).toUpperCase()}</span>
							{/if}
						</div>
						<p class="target-name">Send Chat Request to {profile.name}?</p>
					</div>
				{/if}

				<div class="game-intro glass-strong">
					<span class="game-icon">{gameInfo.icon}</span>
					<h2 class="game-title">{gameInfo.name}</h2>
					<p class="game-desc">{gameInfo.description}</p>

					<div class="game-rules glass">
						{#if gameType === 'reflex'}
							<p>🎯 Tap the heart as fast as possible</p>
							<p>⚡ Under 600ms to win</p>
						{:else if gameType === 'pattern'}
							<p>🎯 Repeat the sequence of 4</p>
							<p>🧠 Memory check</p>
						{:else if gameType === 'oddOneOut'}
							<p>🎯 Spot the different emoji</p>
							<p>⏱️ 5 seconds</p>
						{:else if gameType === 'riddle'}
							<p>🎯 Answer correctly</p>
							<p>⏱️ 10 seconds</p>
						{:else}
							<p>🎯 Pick the best match</p>
							<p>⏱️ 8 seconds</p>
						{/if}
					</div>

					<GradientButton variant="primary" size="lg" fullWidth onclick={startGame}>
						Win Minigame to Send Request! ✨
					</GradientButton>
				</div>
			</div>
		{:else if phase === 'playing'}
			<!-- Active Game -->
			<div class="game-area glass">
				<div class="game-label">
					<span class="game-label-icon">{gameInfo.icon}</span>
					<span class="game-label-name">{gameInfo.name}</span>
				</div>

				{#if gameType === 'reflex'}
					<ReflexTap onResult={handleResult} />
				{:else if gameType === 'pattern'}
					<PatternMemory onResult={handleResult} />
				{:else if gameType === 'oddOneOut'}
					<OddOneOut onResult={handleResult} />
				{:else if gameType === 'riddle'}
					<QuickRiddle onResult={handleResult} />
				{:else}
					<EmojiSprint onResult={handleResult} />
				{/if}
			</div>
		{:else if phase === 'result'}
			<!-- Result Screen -->
			<div class="result-screen">
				{#if won}
					<div class="result-content win">
						<span class="result-emoji">💌</span>
						<h2 class="result-title">Chat Request Sent!</h2>
						{#if score}
							<p class="result-score">Solved in {score}ms! ⚡</p>
						{/if}
						<p class="result-text">
							Your invitation has been delivered to <strong>{profile?.name}</strong>.
							Once they accept, your private chat will unlock! ✨
						</p>
						<div class="request-preview-pill glass">
							<span>Status: <strong>Pending Acceptance ⏳</strong></span>
						</div>
					</div>
				{:else}
					<div class="result-content lose">
						<span class="result-emoji">😅</span>
						<h2 class="result-title">Not this time</h2>
						<p class="result-text">
							{profile?.name ?? 'They'} has been skipped. On to the next!
						</p>
					</div>
				{/if}

				<div class="result-actions-column">
					<GradientButton
						variant={won ? 'primary' : 'ghost'}
						size="lg"
						fullWidth
						onclick={goBack}
					>
						{won ? 'Continue Discovering 💌' : 'Back to Feed'}
					</GradientButton>
					{#if won}
						<button type="button" class="view-matches-sublink glass" onclick={() => goto('/matches')}>
							View Sent Requests in Matches →
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Match Overlay -->
	{#if showMatch}
		<div class="match-overlay">
			<div class="match-content">
				<!-- Confetti particles -->
				<div class="confetti-container" aria-hidden="true">
					{#each Array(20) as _, i}
						<div
							class="confetti-piece"
							style="
								left: {Math.random() * 100}%;
								animation-delay: {Math.random() * 0.5}s;
								animation-duration: {1.5 + Math.random()}s;
								background: {['#ff3d7f', '#c850c0', '#7c3aed', '#00e5a0', '#ffa502'][i % 5]};
								width: {6 + Math.random() * 6}px;
								height: {6 + Math.random() * 6}px;
							"
						></div>
					{/each}
				</div>

				<div class="match-avatars">
					<div
						class="match-avatar"
						style="background: var(--gradient-primary)"
					>
						<span>You</span>
					</div>
					<span class="match-heart">💕</span>
					<div
						class="match-avatar"
						style="background: {profile?.photoGradient || generateUserGradient(profile?.id || '')}; box-shadow: 0 0 24px {generateUserGlow(profile?.id || '')};"
					>
						<span>{profile?.photoInitial || profile?.name?.charAt(0).toUpperCase()}</span>
					</div>
				</div>

				<h2 class="match-title">It's a Match!</h2>
				<p class="match-subtitle">
					You and {profile?.name} liked each other! 🎉
				</p>

				{#if profile?.instagram}
					<div class="match-reveal glass">
						<p class="reveal-label">Unlocked:</p>
						<p class="reveal-handle">📸 {profile.instagram}</p>
					</div>
				{/if}

				<div class="match-actions">
					<GradientButton
						variant="primary"
						size="lg"
						fullWidth={true}
						onclick={() => {
							const id = profile?.id;
							setAcceptingProfile(null);
							goto(`/chat?id=${id}`);
						}}
					>
						Chat with {profile?.name} 💬
					</GradientButton>
					<button type="button" class="keep-playing-btn" onclick={handleMatchContinue}>
						Keep Playing ✨
					</button>
				</div>
			</div>
		</div>
	{/if}
</main>

<style>
	.minigame-page {
		min-height: 100dvh;
		padding: var(--space-lg) 0;
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: center;
	}

	.ambient-orb {
		position: fixed;
		border-radius: 50%;
		filter: blur(100px);
		opacity: 0.1;
		pointer-events: none;
	}

	.orb-center {
		width: 400px;
		height: 400px;
		background: var(--accent-magenta);
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.game-content {
		position: relative;
		z-index: var(--z-base);
		width: 100%;
	}

	/* Back button */
	.back-btn {
		font-size: var(--text-sm);
		color: var(--text-muted);
		padding: 8px 0;
		cursor: pointer;
		background: none;
		border: none;
		font-family: var(--font-body);
		margin-bottom: var(--space-md);
		transition: color var(--duration-fast);
	}

	.back-btn:hover {
		color: var(--text-secondary);
	}

	/* Intro */
	.intro-screen {
		animation: fade-in-up 0.5s var(--ease-out-expo);
	}

	.target-info {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 16px 20px;
		margin-bottom: var(--space-lg);
	}

	.target-avatar {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-display);
		font-size: var(--text-xl);
		color: rgba(255, 255, 255, 0.5);
		font-weight: 600;
		flex-shrink: 0;
	}

	.target-name {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		color: var(--text-primary);
	}

	.game-intro {
		padding: var(--space-xl);
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
	}

	.game-icon {
		font-size: 56px;
		animation: float 3s ease-in-out infinite;
	}

	.game-name {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		color: var(--text-primary);
	}

	.game-desc {
		color: var(--text-secondary);
		font-size: var(--text-base);
	}

	.game-rules {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	/* Game area */
	.game-area {
		padding: var(--space-lg);
		min-height: 420px;
		display: flex;
		flex-direction: column;
		animation: fade-in-scale 0.4s var(--ease-out-back);
	}

	.game-label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: var(--text-sm);
		color: var(--text-muted);
		margin-bottom: var(--space-md);
	}

	.game-label-icon {
		font-size: 20px;
	}

	/* Result */
	.result-screen {
		text-align: center;
		animation: fade-in-scale 0.5s var(--ease-out-back);
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
	}

	.result-content {
		padding: var(--space-2xl) var(--space-lg);
	}

	.result-emoji {
		font-size: 80px;
		display: block;
		margin-bottom: var(--space-md);
	}

	.result-title {
		font-family: var(--font-display);
		font-size: var(--text-3xl);
		margin-bottom: var(--space-sm);
	}

	.win .result-title {
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.lose .result-title {
		color: var(--text-secondary);
	}

	.result-score {
		font-family: var(--font-display);
		font-size: var(--text-4xl);
		color: var(--success);
		font-weight: 700;
		margin-bottom: var(--space-sm);
	}

	.result-text {
		color: var(--text-secondary);
		font-size: var(--text-base);
		margin-bottom: var(--space-md);
	}

	.request-preview-pill {
		display: inline-flex;
		align-items: center;
		padding: 6px 14px;
		border-radius: var(--radius-full);
		font-size: var(--text-xs);
		color: var(--text-primary);
		margin-top: 4px;
	}

	.result-actions-column {
		display: flex;
		flex-direction: column;
		gap: 12px;
		width: 100%;
		margin-top: var(--space-lg);
	}

	.view-matches-sublink {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 10px 16px;
		border-radius: var(--radius-full);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--accent-pink);
		cursor: pointer;
		transition: all 180ms ease;
	}

	.view-matches-sublink:hover {
		transform: translateY(-1px);
		border-color: var(--glass-border-hover);
	}

	/* Match Overlay */
	.match-overlay {
		position: fixed;
		inset: 0;
		z-index: var(--z-modal);
		background: rgba(10, 10, 15, 0.95);
		backdrop-filter: blur(30px);
		display: flex;
		align-items: center;
		justify-content: center;
		animation: fade-in 0.3s ease;
	}

	.match-content {
		text-align: center;
		padding: var(--space-2xl);
		animation: fade-in-scale 0.6s var(--ease-out-back);
		position: relative;
	}

	.confetti-container {
		position: fixed;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
	}

	.confetti-piece {
		position: absolute;
		top: -10px;
		border-radius: 2px;
		animation: confetti-fall 2s ease-in forwards;
	}

	.match-avatars {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-md);
		margin-bottom: var(--space-xl);
	}

	.match-avatar {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-display);
		font-size: var(--text-xl);
		color: rgba(255, 255, 255, 0.5);
		font-weight: 600;
		border: 3px solid var(--accent-pink);
		animation: scale-in 0.5s var(--ease-out-back);
	}

	.match-avatar:last-child {
		animation-delay: 0.15s;
	}

	.match-heart {
		font-size: 36px;
		animation: float 1.5s ease-in-out infinite;
	}

	.match-title {
		font-family: var(--font-display);
		font-size: var(--text-4xl);
		font-style: italic;
		background: var(--gradient-accent);
		background-size: 200% auto;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		animation: gradient-shift 3s ease infinite;
		margin-bottom: var(--space-sm);
	}

	.match-subtitle {
		color: var(--text-secondary);
		font-size: var(--text-lg);
		margin-bottom: var(--space-lg);
	}

	.match-reveal {
		display: inline-flex;
		flex-direction: column;
		gap: 4px;
		padding: 16px 28px;
		margin-bottom: var(--space-xl);
	}

	.reveal-label {
		font-size: var(--text-xs);
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.reveal-handle {
		font-size: var(--text-lg);
		color: var(--accent-pink);
		font-weight: 600;
	}

	.match-actions {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		width: 100%;
		max-width: 320px;
	}

	.keep-playing-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: var(--text-sm);
		cursor: pointer;
		padding: 8px;
		transition: color var(--duration-fast);
		font-family: var(--font-body);
	}

	.keep-playing-btn:hover {
		color: var(--text-primary);
	}
</style>
