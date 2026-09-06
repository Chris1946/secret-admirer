<script lang="ts">
	import { goto } from '$app/navigation';
	import GlassInput from '$lib/components/GlassInput.svelte';
	import GradientButton from '$lib/components/GradientButton.svelte';
	import PhotoCapture from '$lib/components/PhotoCapture.svelte';
	import PromptCard from '$lib/components/PromptCard.svelte';
	import { DEPARTMENTS, PROFILE_PROMPTS, COLLEGE_YEARS } from '$lib/data/prompts';
	import { pickRandom } from '$lib/utils/shuffle';
	import { onMount } from 'svelte';
	import {
		getCurrentUser,
		saveUserProfile,
		addToast,
		logoutUser
	} from '$lib/stores/gameState.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { generateUserGradient, generateUserGlow } from '$lib/utils/colors';

	// 3 random prompts for this user
	let selectedPrompts = $state(pickRandom(PROFILE_PROMPTS, 3));

	let step = $state(1);
	const TOTAL_STEPS = 3;

	// Form data
	let name = $state(getCurrentUser()?.name ?? '');
	let year = $state(getCurrentUser()?.year ?? '1st Year');
	let department = $state('');
	let deptSearch = $state('');
	let showDeptDropdown = $state(false);
	let bio = $state(getCurrentUser()?.bio ?? '');
	let photo = $state<string | null>(null);
	let promptAnswers = $state<string[]>(['', '', '']);
	let isSubmitting = $state(false);
	let showSuccess = $state(false);

	// Detect edit mode: user already has a completed profile
	let isEditMode = $state(false);

	onMount(() => {
		const user = getCurrentUser();
		if (!user) {
			goto('/');
			return;
		}
		name = user.name;
		year = user.year;
		if (user.bio) bio = user.bio;

		// Edit mode: user already has a department (completed onboarding)
		if (user.department && user.department.length > 0) {
			isEditMode = true;
			department = user.department;
			deptSearch = user.department;
			// Pre-fill photo if available
			if (user.photo) photo = user.photo;
			// Pre-fill existing prompts
			if (user.prompts && user.prompts.length > 0) {
				selectedPrompts = user.prompts.map(p => p.question);
				promptAnswers = user.prompts.map(p => p.answer || '');
			}
		}
	});

	function handleCancelSwitch() {
		if (isEditMode) {
			// In edit mode, go back to discover instead of logging out
			goto('/discover');
		} else {
			logoutUser();
			goto('/');
		}
	}

	let filteredDepts = $derived(
		deptSearch
			? DEPARTMENTS.filter((d) => d.toLowerCase().includes(deptSearch.toLowerCase()))
			: DEPARTMENTS
	);

	function nextStep() {
		if (step < TOTAL_STEPS) {
			step++;
		}
	}

	function prevStep() {
		if (step > 1) {
			step--;
		}
	}

	function canProceed(): boolean {
		switch (step) {
			case 1:
				return name.trim().length >= 2 && department.length > 0 && year.length > 0;
			case 2:
				return true; // Profile picture is strictly optional!
			case 3:
				return promptAnswers.filter((a) => a.trim().length > 0).length >= 2;
			default:
				return false;
		}
	}

	async function handleSubmit() {
		if (isSubmitting) return;
		isSubmitting = true;

		const result = await saveUserProfile({
			department,
			bio: bio.trim(),
			photo,
			prompts: selectedPrompts.map((q, i) => ({
				question: q,
				answer: promptAnswers[i]
			}))
		});

		isSubmitting = false;

		if (!result.success) {
			addToast(result.error || 'Failed to save profile', 'error');
			return;
		}

		if (isEditMode) {
			addToast('Profile updated! ✨', 'success');
			goto('/discover');
		} else {
			showSuccess = true;
			setTimeout(() => {
				addToast('Profile active in discovery feed! ✨', 'success');
				goto('/discover');
			}, 1800);
		}
	}


	function selectDept(dept: string) {
		department = dept;
		deptSearch = dept;
		showDeptDropdown = false;
	}
</script>

<svelte:head>
	<title>{isEditMode ? 'Edit Profile' : 'Create Profile'} — Secret Admirer</title>
</svelte:head>

<main class="profile-page">
	<!-- Ambient -->
	<div class="ambient-orb orb-top"></div>

	{#if showSuccess}
		<!-- Success Screen -->
		<div class="success-screen">
			<div class="success-content">
				<div class="success-icon">✨</div>
				<h2 class="success-title">Profile Submitted!</h2>
				<p class="success-text">Your profile is being reviewed</p>
				<div class="success-spinner">
					<div class="spinner-ring"></div>
				</div>
			</div>
		</div>
	{:else}
		<div class="profile-content container">
			<!-- Header -->
			<div class="profile-header">
				<div class="profile-nav-row">
					<h1 class="page-title">{isEditMode ? 'Edit Profile' : 'Create Profile'}</h1>
					<div class="nav-btn-group">
						<ThemeToggle />
						<button type="button" class="profile-cancel-btn glass" onclick={handleCancelSwitch} title={isEditMode ? 'Back to discover' : 'Cancel and sign out'}>
							<span>{isEditMode ? '← Back' : '✕ Switch User'}</span>
						</button>
					</div>
				</div>
				<div class="progress-bar">
					{#each Array(TOTAL_STEPS) as _, i}
						<div class="progress-dot" class:active={i + 1 <= step} class:current={i + 1 === step}>
							<span class="dot-number">{i + 1}</span>
						</div>
						{#if i < TOTAL_STEPS - 1}
							<div class="progress-line" class:filled={i + 1 < step}></div>
						{/if}
					{/each}
				</div>
			</div>

			<!-- Step Content -->
			<div class="step-content">
				{#if step === 1}
					<!-- Step 1: Name + Department -->
					<div class="step-panel">
						<h2 class="step-title">The basics</h2>
						<p class="step-subtitle">Let people know who you are</p>

						<div class="form-fields">
							<div class="field">
								<label class="field-label">Name</label>
								<GlassInput
									placeholder="Your first name"
									bind:value={name}
									icon="✏️"
								/>
							</div>

							<div class="field">
								<label class="field-label">Department</label>
								<div class="dept-select">
									<GlassInput
										placeholder="Search department..."
										bind:value={deptSearch}
										icon="🎓"
										oninput={() => (showDeptDropdown = true)}
									/>
									{#if showDeptDropdown && filteredDepts.length > 0}
										<div class="dept-dropdown glass">
											{#each filteredDepts as dept}
												<button
													class="dept-option"
													class:selected={department === dept}
													onclick={() => selectDept(dept)}
												>
													{dept}
												</button>
											{/each}
										</div>
									{/if}
								</div>
							</div>

							<div class="field">
								<span class="field-label" id="profile-year-label">Year of Study</span>
								<div class="locked-year-badge glass">
									<span class="lock-icon">🎓</span>
									<div class="locked-year-text">
										<strong>1st Year Student</strong>
										<small>Orientation 2026 Batch (Exclusive)</small>
									</div>
									<span class="verified-check">✓</span>
								</div>
							</div>

							<div class="field">
								<div class="field-header-row">
									<label class="field-label" for="profile-bio-input">Introduction & Free Space of Creativity ✨</label>
									<span class="optional-tag">Optional</span>
								</div>
								<textarea
									id="profile-bio-input"
									class="bio-textarea glass"
									placeholder="Drop your vibe, favorite quote, hobbies, creative thoughts, or what you're excited for in TKMCE... (Shows in dreamy glass bubbles on your card!)"
									bind:value={bio}
									rows="3"
									maxlength="300"
								></textarea>
								<div class="bio-footer">
									<small class="field-hint">Your creative thoughts float in glass bubbles around your card!</small>
									<span class="char-count">{bio.length}/300</span>
								</div>
							</div>

						</div>
					</div>
				{:else if step === 2}
					<!-- Step 2: Photo (Optional) -->
					<div class="step-panel">
						<div class="step-header-with-badge">
							<div>
								<h2 class="step-title">Show yourself</h2>
								<p class="step-subtitle">Take a photo, upload one, or skip to use your colorful avatar</p>
							</div>
							<span class="optional-pill">Optional</span>
						</div>

						<PhotoCapture onCapture={(url) => (photo = url)} />

						{#if !photo}
							<div class="avatar-preview-banner glass">
								<div
									class="mini-avatar-preview"
									style="background: {getCurrentUser()?.photoGradient || generateUserGradient(getCurrentUser()?.id || name)}; box-shadow: 0 0 16px {generateUserGlow(getCurrentUser()?.id || name)};"
								>
									<span>{name.charAt(0).toUpperCase() || 'U'}</span>
								</div>
								<div class="avatar-preview-text">
									<strong>Default Initial Avatar Ready</strong>
									<small>You can continue without a photo. Your colorful initial avatar will represent you.</small>
								</div>
								<span class="preview-check">✓ Ready</span>
							</div>
						{:else}
							<div class="photo-controls-row">
								<button type="button" class="remove-photo-btn glass" onclick={() => (photo = null)}>
									<span>✕ Remove Photo & Use Initial Avatar</span>
								</button>
							</div>
						{/if}
					</div>
				{:else if step === 3}
					<!-- Step 3: Prompts -->
					<div class="step-panel">
						<h2 class="step-title">Get personal</h2>
						<p class="step-subtitle">Answer at least 2 prompts</p>

						<div class="prompts-list">
							{#each selectedPrompts as prompt, i}
								<PromptCard
									question={prompt}
									bind:answer={promptAnswers[i]}
									onAnswer={(val) => (promptAnswers[i] = val)}
								/>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Navigation -->
			<div class="step-nav">
				{#if step > 1}
					<GradientButton variant="ghost" onclick={prevStep}>
						← Back
					</GradientButton>
				{:else}
					<div></div>
				{/if}

				{#if step < TOTAL_STEPS}
					<GradientButton
						variant="primary"
						disabled={!canProceed()}
						onclick={nextStep}
					>
						{step === 2 && !photo ? 'Skip Photo & Next →' : 'Next →'}
					</GradientButton>
				{:else}
					<GradientButton
						variant="primary"
						disabled={!canProceed()}
						loading={isSubmitting}
						onclick={handleSubmit}
					>
						{isEditMode ? 'Save Changes ✨' : 'Submit for Review ✨'}
					</GradientButton>
				{/if}
			</div>
	</div>
	{/if}

	<BottomNav />
</main>

<style>
	.profile-page {
		min-height: 100dvh;
		padding: var(--space-xl) 0 96px;
		position: relative;
		overflow: hidden;
	}

	.ambient-orb {
		position: fixed;
		border-radius: 50%;
		filter: blur(120px);
		opacity: 0.1;
		pointer-events: none;
	}

	.orb-top {
		width: 300px;
		height: 300px;
		background: var(--accent-magenta);
		top: -50px;
		left: 50%;
		transform: translateX(-50%);
	}

	.profile-content {
		position: relative;
		z-index: var(--z-base);
	}

	/* Header */
	.profile-header {
		text-align: center;
		margin-bottom: var(--space-xl);
		animation: fade-in-up 0.5s var(--ease-out-expo);
	}

	.profile-nav-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-md);
		gap: 12px;
	}

	.nav-btn-group {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.profile-cancel-btn {
		display: inline-flex;
		align-items: center;
		padding: 6px 12px;
		border-radius: var(--radius-full);
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 180ms ease;
	}

	.profile-cancel-btn:hover {
		color: var(--text-primary);
		border-color: var(--glass-border-hover);
		transform: translateY(-1px);
	}

	.page-title {
		font-family: var(--font-display);
		font-size: var(--text-3xl);
		font-style: italic;
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0;
	}

	/* Progress bar */
	.progress-bar {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0;
	}

	.progress-dot {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--glass-light);
		border: 2px solid var(--glass-border);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all var(--duration-normal) var(--ease-out-expo);
		position: relative;
	}

	.progress-dot.active {
		background: var(--accent-pink);
		border-color: var(--accent-pink);
	}

	.progress-dot.current {
		box-shadow: 0 0 15px rgba(255, 61, 127, 0.4);
		transform: scale(1.1);
	}

	.dot-number {
		font-size: var(--text-xs);
		font-weight: 700;
		color: var(--text-muted);
	}

	.progress-dot.active .dot-number {
		color: white;
	}

	.progress-line {
		width: 40px;
		height: 2px;
		background: var(--glass-border);
		transition: background var(--duration-normal);
	}

	.progress-line.filled {
		background: var(--accent-pink);
	}

	/* Step content */
	.step-content {
		margin-bottom: var(--space-xl);
	}

	.step-panel {
		animation: fade-in-up 0.4s var(--ease-out-expo);
	}

	.step-title {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		color: var(--text-primary);
		margin-bottom: 4px;
	}

	.step-subtitle {
		font-size: var(--text-sm);
		color: var(--text-muted);
		margin-bottom: var(--space-lg);
	}

	.form-fields {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field-label {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--text-secondary);
	}

	/* Department dropdown */
	.dept-select {
		position: relative;
	}

	.dept-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		max-height: 200px;
		overflow-y: auto;
		z-index: var(--z-overlay);
		margin-top: 4px;
		padding: 4px;
		animation: fade-in 0.2s ease;
	}

	.dept-option {
		width: 100%;
		padding: 10px 14px;
		text-align: left;
		font-size: var(--text-sm);
		color: var(--text-secondary);
		border: none;
		background: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all var(--duration-fast);
		font-family: var(--font-body);
	}

	.dept-option:hover {
		background: var(--glass-medium);
		color: var(--text-primary);
	}

	.dept-option.selected {
		color: var(--accent-pink);
		background: rgba(255, 61, 127, 0.1);
	}

	/* Locked Year badge */
	.locked-year-badge {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		border-radius: var(--radius-md);
		border: 1px solid rgba(0, 229, 160, 0.3);
		background: rgba(0, 229, 160, 0.06);
	}

	.lock-icon {
		font-size: 22px;
	}

	.locked-year-text {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.locked-year-text strong {
		color: #00e5a0;
		font-size: var(--text-sm);
	}

	.locked-year-text small {
		color: var(--text-muted);
		font-size: 11px;
	}

	.verified-check {
		font-size: 14px;
		font-weight: 700;
		color: #00e5a0;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: rgba(0, 229, 160, 0.15);
		display: flex;
		align-items: center;
		justify-content: center;
	}


	/* Prompts */
	.prompts-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	/* Navigation */
	.step-nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-md);
	}

	/* Success screen */
	.success-screen {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.success-content {
		text-align: center;
		animation: fade-in-scale 0.5s var(--ease-out-back);
	}

	.success-icon {
		font-size: 80px;
		margin-bottom: var(--space-lg);
		animation: float 2s ease-in-out infinite;
	}

	.success-title {
		font-family: var(--font-display);
		font-size: var(--text-3xl);
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin-bottom: var(--space-sm);
	}

	.success-text {
		color: var(--text-secondary);
		font-size: var(--text-lg);
		margin-bottom: var(--space-xl);
	}

	.success-spinner {
		display: flex;
		justify-content: center;
	}

	.spinner-ring {
		width: 40px;
		height: 40px;
		border: 3px solid var(--glass-border);
		border-top-color: var(--accent-pink);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	/* Bio / Introduction & Free Space styling */
	.field-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.optional-tag {
		font-size: 11px;
		color: var(--text-muted);
		background: rgba(255, 255, 255, 0.06);
		padding: 2px 8px;
		border-radius: 10px;
		border: 1px solid var(--glass-border);
	}

	.bio-textarea {
		width: 100%;
		padding: 12px 14px;
		border-radius: var(--radius-md);
		border: 1px solid var(--glass-border);
		background: rgba(255, 255, 255, 0.05);
		color: var(--text-primary);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		line-height: 1.5;
		resize: vertical;
		outline: none;
		transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
	}

	.bio-textarea:focus {
		border-color: rgba(255, 61, 127, 0.5);
		box-shadow: 0 0 12px rgba(255, 61, 127, 0.2);
	}

	.bio-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 4px;
	}

	.field-hint {
		font-size: 11px;
		color: #00e5a0;
	}

	.char-count {
		font-size: 11px;
		color: var(--text-muted);
	}

	/* Step 2 Optional Photo Enhancements */
	.step-header-with-badge {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 8px;
	}

	.optional-pill {
		font-size: 11px;
		font-weight: 600;
		color: #00e5a0;
		background: rgba(0, 229, 160, 0.12);
		border: 1px solid rgba(0, 229, 160, 0.3);
		padding: 4px 10px;
		border-radius: 12px;
	}

	.avatar-preview-banner {
		margin-top: var(--space-md);
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		border-radius: var(--radius-md);
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
	}

	.mini-avatar-preview {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-weight: 700;
		font-size: 18px;
		border: 2px solid rgba(255, 255, 255, 0.2);
		flex-shrink: 0;
	}

	.avatar-preview-text {
		flex: 1;
		display: flex;
		flex-direction: column;
		text-align: left;
	}

	.avatar-preview-text strong {
		color: var(--text-primary);
		font-size: var(--text-sm);
	}

	.avatar-preview-text small {
		color: var(--text-muted);
		font-size: 11px;
		line-height: 1.3;
	}

	.preview-check {
		font-size: 11px;
		font-weight: 700;
		color: #00e5a0;
		padding: 3px 8px;
		border-radius: 10px;
		background: rgba(0, 229, 160, 0.15);
		white-space: nowrap;
	}

	.photo-controls-row {
		margin-top: var(--space-sm);
		display: flex;
		justify-content: center;
	}

	.remove-photo-btn {
		background: none;
		border: 1px solid var(--glass-border);
		color: var(--text-muted);
		font-size: var(--text-xs);
		padding: 6px 14px;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--duration-fast);
	}

	.remove-photo-btn:hover {
		color: #ff6b6b;
		border-color: rgba(255, 107, 107, 0.4);
		background: rgba(255, 107, 107, 0.1);
	}
</style>
