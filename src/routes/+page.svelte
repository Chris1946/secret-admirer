<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ParticleBackground from '$lib/components/ParticleBackground.svelte';
	import GlassInput from '$lib/components/GlassInput.svelte';
	import GradientButton from '$lib/components/GradientButton.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { generateUserGradient, generateUserGlow } from '$lib/utils/colors';
	import { validateEmail, validateName, validatePasscode, validateYear } from '$lib/utils/validation';
	import { COLLEGE_YEARS } from '$lib/data/prompts';
	import {
		getCurrentUser,
		setCurrentUser,
		setAuthenticated,
		checkEmailDecision,
		adminLogin,
		registerUser,
		addToast,
		getEventSettings,
		logoutUser,
		type UserProfile
	} from '$lib/stores/gameState.svelte';

	// View steps: 'email_entry' -> 'admin_name_prompt' | 'new_student_details'
	let step = $state<'email_entry' | 'admin_name_prompt' | 'new_student_details'>('email_entry');

	// Form inputs
	let email = $state('');
	let organizerName = $state('');
	let name = $state('');
	let year = $state('1st Year');
	let passcode = $state('');
	let showPasscode = $state(false);
	let isSubmitting = $state(false);

	let settings = $derived(getEventSettings());
	let existingSession = $state<UserProfile | null>(null);

	// Detect existing device session on load without aggressive auto-redirect
	onMount(() => {
		const existingUser = getCurrentUser();
		if (existingUser) {
			existingSession = existingUser;
		}
	});

	function handleResumeSession() {
		if (!existingSession) return;
		if (existingSession.department && existingSession.department.length > 0) {
			goto('/discover');
		} else {
			goto('/profile');
		}
	}

	function handleSwitchAccount() {
		logoutUser();
		existingSession = null;
		step = 'email_entry';
		email = '';
		organizerName = '';
		name = '';
		passcode = '';
		addToast('Session cleared. Enter college email to sign in or register new attendee 🎓', 'info');
	}

	// Email validation for Step 1
	let emailValidation = $derived(
		email.length > 0 ? validateEmail(email) : { valid: false, message: '' }
	);
	let emailError = $derived(
		email.length > 3 && !emailValidation.valid ? emailValidation.message : ''
	);

	// New student validations
	let nameValidation = $derived(name.length > 0 ? validateName(name) : { valid: false, message: '' });
	let yearValidation = $derived(validateYear(year));
	let nameError = $derived(name.length > 0 && !nameValidation.valid ? nameValidation.message : '');

	let canSubmitEmail = $derived(email.trim().length > 3 && !isSubmitting);
	let canSubmitNewUser = $derived(
		!settings.signupsPaused &&
			nameValidation.valid &&
			yearValidation.valid &&
			!isSubmitting
	);

	/**
	 * Step 1 & 2: Single email entry point & decision logic
	 */
	async function handleEmailSubmit() {
		const cleanEmail = email.trim().toLowerCase();
		if (!cleanEmail || isSubmitting) return;

		isSubmitting = true;

		try {
			const decision = await checkEmailDecision(cleanEmail);
			isSubmitting = false;

			if (decision.error) {
				addToast(decision.error, 'error');
				return;
			}

			// Branch A: Master Admin Key recognized
			if (decision.role === 'admin') {
				step = 'admin_name_prompt';
				return;
			}

			// Branch B: Returning Student (Profile already exists!)
			if (decision.role === 'returning' && decision.user) {
				setCurrentUser(decision.user);
				setAuthenticated(true);
				addToast(`Welcome back, ${decision.user.name}! ✨`, 'success');

				if (decision.user.department && decision.user.department.length > 0) {
					goto('/discover');
				} else {
					goto('/profile');
				}
				return;
			}

			// Branch C: New Student Registration
			if (decision.role === 'new') {
				if (decision.signupsPaused) {
					addToast('Registrations are currently paused by orientation coordinators ⏸️', 'error');
					return;
				}
				step = 'new_student_details';
			}
		} catch (err: any) {
			isSubmitting = false;
			addToast(err.message || 'Unable to connect to server', 'error');
		}
	}

	/**
	 * Step 3: Admin Flow - prompt for organizer name and verify
	 */
	async function handleAdminLogin() {
		const cleanName = organizerName.trim();
		if (!cleanName || isSubmitting) return;

		isSubmitting = true;
		const result = await adminLogin(email.trim().toLowerCase(), cleanName);
		isSubmitting = false;

		if (!result.success) {
			addToast(result.error || 'Failed to authenticate admin', 'error');
			return;
		}

		addToast(`Organizer verified: Welcome, ${result.adminName}! 🛡️`, 'success');
		goto('/admin');
	}

	/**
	 * Step 4: New Student Registration completion
	 */
	async function handleNewStudentRegister() {
		if (!canSubmitNewUser || isSubmitting) return;

		if (year !== '1st Year') {
			addToast('Secret Admirer is exclusive to 1st Year students only!', 'error');
			return;
		}

		if (passcode && !validatePasscode(passcode)) {
			addToast('Invalid event passcode', 'error');
			return;
		}

		isSubmitting = true;

		const result = await registerUser({
			name: name.trim(),
			email: email.trim().toLowerCase(),
			year,
			passcode: passcode.trim() || undefined
		});

		isSubmitting = false;

		if (!result.success || !result.user) {
			addToast(result.error || 'Registration failed', 'error');
			return;
		}

		addToast(`Welcome, ${result.user.name}! ✨ Let's setup your profile.`, 'success');
		goto('/profile');
	}
</script>

<svelte:head>
	<title>Secret Admirer — Enter</title>
</svelte:head>

<ParticleBackground />

<main class="entry-page">
	<!-- Top Bar with Theme Switcher -->
	<div class="entry-top-bar container">
		<div class="top-bar-spacer"></div>
		<ThemeToggle />
	</div>

	<!-- Ambient gradient orbs -->
	<div class="ambient-orb orb-1"></div>
	<div class="ambient-orb orb-2"></div>

	<div class="entry-content container">
		<!-- Live Announcement Banner -->
		{#if settings.announcement}
			<div class="announcement-banner glass">
				<span class="banner-icon">📢</span>
				<span class="banner-text">{settings.announcement}</span>
			</div>
		{/if}

		<!-- Kill Switch Warning Banner -->
		{#if settings.signupsPaused && step !== 'admin_name_prompt'}
			<div class="paused-banner glass-strong">
				<span class="paused-icon">⏸️</span>
				<div class="paused-text">
					<strong>Signups Temporarily Paused</strong>
					<p>The event organizer has paused new signups. Returning users can still sign in.</p>
				</div>
			</div>
		{/if}

		<!-- Logo/Brand -->
		<div class="brand">
			<div class="brand-icon">💌</div>
			<h1 class="brand-title">Secret Admirer</h1>
			<p class="brand-tagline">Find your match. Play the game.</p>
		</div>

		<!-- ACTIVE DEVICE SESSION DETECTED -->
		{#if existingSession}
			<div class="entry-form glass-strong active-session-card">
				<div class="session-badge">
					<span class="pulse-dot"></span> Active Session on this Device
				</div>

				<div class="session-user-row">
					<div
						class="session-avatar"
						style="background: {existingSession.photoGradient || generateUserGradient(existingSession.id || existingSession.name)}; box-shadow: 0 0 16px {generateUserGlow(existingSession.id || existingSession.name)};"
					>
						{existingSession.photoInitial || existingSession.name?.charAt(0)?.toUpperCase() || '👤'}
					</div>
					<div class="session-user-details">
						<h2 class="session-name">{existingSession.name}</h2>
						<p class="session-meta">{existingSession.email}</p>
						<span class="session-dept-pill">{existingSession.department || existingSession.year}</span>
					</div>
				</div>

				<div class="session-actions">
					<GradientButton
						variant="primary"
						size="lg"
						fullWidth={true}
						onclick={handleResumeSession}
					>
						Continue as {existingSession.name} →
					</GradientButton>

					<button type="button" class="switch-account-btn glass" onclick={handleSwitchAccount}>
						<span>👤 Switch Account / Register New Attendee</span>
					</button>
				</div>

				<p class="session-hint">
					💡 Testing 2 accounts on 1 device? Click <strong>Switch Account</strong> above or open an <strong>Incognito / Private tab</strong> so each account stays isolated.
				</p>
			</div>

		<!-- STEP 1: SINGLE ENTRY POINT (One email field for everyone) -->
		{:else if step === 'email_entry'}
			<form class="entry-form glass-strong" onsubmit={(e) => { e.preventDefault(); handleEmailSubmit(); }}>
				<div class="form-fields">
					<div class="field">
						<label class="field-label" for="email-input">College Email</label>
						<GlassInput
							type="email"
							placeholder="yourname@tkmce.ac.in"
							bind:value={email}
							error={emailError}
							success={emailValidation.valid}
							icon="📧"
						/>
						<p class="field-hint">Enter your college email address to continue</p>
					</div>
				</div>

				<GradientButton
					variant="primary"
					size="lg"
					fullWidth={true}
					disabled={!canSubmitEmail}
					loading={isSubmitting}
					onclick={handleEmailSubmit}
				>
					Continue →
				</GradientButton>

				<p class="form-footer">
					Orientation 2026 • Exclusive to TKMCE Freshers 🎓
				</p>
			</form>

		<!-- STEP 3: ADMIN ORGANIZER NAME PROMPT -->
		{:else if step === 'admin_name_prompt'}
			<form class="entry-form glass-strong admin-gate-form" onsubmit={(e) => { e.preventDefault(); handleAdminLogin(); }}>
				<div class="admin-badge-header">
					<span class="admin-badge-icon">🛡️</span>
					<div>
						<h3 class="admin-gate-title">Organizer Authorization</h3>
						<p class="admin-gate-desc">Master admin key recognized. Enter your name for the event audit log.</p>
					</div>
				</div>

				<div class="form-fields">
					<div class="field">
						<label class="field-label" for="admin-name">Logging in as admin — enter your name</label>
						<GlassInput
							placeholder="e.g. Chris / Dr. Suresh"
							bind:value={organizerName}
							icon="👤"
						/>
						<p class="field-hint">This name will be attached to all moderation actions in the live audit log.</p>
					</div>
				</div>

				<GradientButton
					variant="primary"
					size="lg"
					fullWidth={true}
					disabled={!organizerName.trim() || isSubmitting}
					loading={isSubmitting}
					onclick={handleAdminLogin}
				>
					Access Organizer Dashboard 🛡️
				</GradientButton>

				<button
					type="button"
					class="back-step-btn"
					onclick={() => { step = 'email_entry'; organizerName = ''; }}
				>
					← Back
				</button>
			</form>

		<!-- STEP 2/3: NEW STUDENT DETAILS (First name + Year check) -->
		{:else if step === 'new_student_details'}
			<form class="entry-form glass-strong" onsubmit={(e) => { e.preventDefault(); handleNewStudentRegister(); }}>
				<div class="registration-header">
					<span class="student-pill">🎓 First-Year Registration</span>
					<span class="confirmed-email">📧 {email}</span>
				</div>

				<div class="form-fields">
					<div class="field">
						<label class="field-label" for="student-name">Your first name</label>
						<GlassInput
							placeholder="What should batchmates call you?"
							bind:value={name}
							error={nameError}
							success={nameValidation.valid}
							icon="👤"
						/>
					</div>

					<div class="field">
						<div class="field-header-row">
							<span class="field-label" id="batch-label">Which year?</span>
							<span class="batch-badge">1st Years Only 🎓</span>
						</div>
						<div class="year-grid" role="group" aria-labelledby="batch-label">
							{#each COLLEGE_YEARS as y}
								<button
									type="button"
									class="year-chip glass"
									class:selected={year === y}
									class:invalid-year={year === y && y !== '1st Year'}
									onclick={() => (year = y)}
								>
									{y}
								</button>
							{/each}
						</div>

						{#if year !== '1st Year'}
							<div class="senior-warning glass-strong">
								<span class="warning-icon">🚫</span>
								<div class="warning-text">
									<strong>First Years Only</strong>
									<p>Secret Admirer is exclusive to 1st Year students for Orientation 2026. Seniors cannot participate!</p>
								</div>
							</div>
						{/if}
					</div>

					<!-- Passcode toggle -->
					<button
						type="button"
						class="passcode-toggle"
						onclick={() => (showPasscode = !showPasscode)}
					>
						{showPasscode ? '▾' : '▸'} Have an event passcode?
					</button>

					{#if showPasscode}
						<div class="field passcode-field">
							<GlassInput
								placeholder="Enter passcode"
								bind:value={passcode}
								icon="🔑"
							/>
							<p class="field-hint">Given at orientation (optional)</p>
						</div>
					{/if}
				</div>

				<GradientButton
					variant="primary"
					size="lg"
					fullWidth={true}
					disabled={!canSubmitNewUser}
					loading={isSubmitting}
					onclick={handleNewStudentRegister}
				>
					Create Profile & Join ✨
				</GradientButton>

				<button
					type="button"
					class="back-step-btn"
					onclick={() => { step = 'email_entry'; }}
				>
					← Use a different email
				</button>
			</form>
		{/if}

		<!-- Event badge -->
		<div class="footer-links">
			<div class="event-badge glass">
				<span>🎓</span> TKMCE Orientation 2026
			</div>
		</div>
	</div>
</main>

<style>
	.entry-page {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-md) 0 var(--space-xl);
		position: relative;
		overflow: hidden;
	}

	.entry-top-bar {
		width: 100%;
		display: flex;
		justify-content: flex-end;
		padding: 0 var(--space-md);
		margin-bottom: var(--space-sm);
		position: relative;
		z-index: 10;
	}

	/* Ambient gradient orbs */
	.ambient-orb {
		position: fixed;
		border-radius: 50%;
		filter: blur(100px);
		opacity: 0.15;
		pointer-events: none;
		z-index: 0;
	}

	.orb-1 {
		width: 400px;
		height: 400px;
		background: var(--accent-pink);
		top: -100px;
		right: -100px;
		animation: float-slow 8s ease-in-out infinite;
	}

	.orb-2 {
		width: 350px;
		height: 350px;
		background: var(--accent-violet);
		bottom: -80px;
		left: -80px;
		animation: float-slow 10s ease-in-out infinite reverse;
	}

	.entry-content {
		position: relative;
		z-index: var(--z-base);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xl);
		width: 100%;
		max-width: 440px;
	}

	/* Brand */
	.brand {
		text-align: center;
		animation: fade-in-up 0.8s var(--ease-out-expo);
	}

	.brand-icon {
		font-size: 56px;
		margin-bottom: var(--space-sm);
		animation: float 3s ease-in-out infinite;
	}

	.brand-title {
		font-family: var(--font-display);
		font-size: clamp(2.5rem, 8vw, 3.5rem);
		font-weight: 600;
		font-style: italic;
		background: var(--gradient-accent);
		background-size: 200% auto;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		animation: gradient-shift 4s ease infinite;
		line-height: 1.1;
	}

	.brand-tagline {
		font-size: var(--text-lg);
		color: var(--text-secondary);
		margin-top: var(--space-sm);
		font-style: italic;
	}

	/* Form */
	.entry-form {
		width: 100%;
		max-width: 440px;
		padding: var(--space-xl);
		border-radius: var(--radius-xl);
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
		animation: fade-in-up 0.5s var(--ease-out-expo) 0.1s both;
	}

	/* Active Session Card styles */
	.active-session-card {
		text-align: left;
	}

	.session-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		align-self: flex-start;
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--accent-pink);
		background: rgba(255, 61, 127, 0.12);
		border: 1px solid rgba(255, 61, 127, 0.25);
		padding: 4px 12px;
		border-radius: 20px;
	}

	.pulse-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--accent-pink);
		box-shadow: 0 0 8px var(--accent-pink);
		animation: live-blink 1.5s infinite;
	}

	.session-user-row {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md);
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-lg);
	}

	.session-avatar {
		width: 52px;
		height: 52px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #ffffff;
		font-size: 22px;
		font-weight: 700;
		flex-shrink: 0;
		box-shadow: var(--shadow-sm);
	}

	.session-user-details {
		display: flex;
		flex-direction: column;
		gap: 2px;
		overflow: hidden;
	}

	.session-name {
		font-size: var(--text-lg);
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.session-meta {
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin: 0;
		word-break: break-all;
	}

	.session-dept-pill {
		align-self: flex-start;
		font-size: 11px;
		font-weight: 500;
		color: var(--accent-purple);
		background: rgba(155, 89, 182, 0.15);
		border-radius: 12px;
		padding: 2px 8px;
		margin-top: 4px;
	}

	.session-actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.switch-account-btn {
		width: 100%;
		padding: 12px 18px;
		border-radius: var(--radius-md);
		border: 1px solid var(--glass-border);
		background: rgba(255, 255, 255, 0.06);
		color: var(--text-secondary);
		font-size: var(--text-sm);
		font-weight: 500;
		cursor: pointer;
		transition: all var(--duration-fast);
		font-family: var(--font-body);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}

	.switch-account-btn:hover {
		color: #ffffff;
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.25);
	}

	.session-hint {
		font-size: var(--text-xs);
		color: var(--text-muted);
		line-height: 1.4;
		text-align: center;
		margin: 0;
		padding-top: 4px;
	}

	@keyframes live-blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
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
		padding-left: 2px;
	}

	.field-hint {
		font-size: var(--text-xs);
		color: var(--text-muted);
		padding-left: 2px;
	}

	.form-footer {
		text-align: center;
		font-size: var(--text-xs);
		color: var(--text-muted);
		line-height: 1.5;
	}

	.back-step-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: var(--text-xs);
		cursor: pointer;
		padding: 4px;
		text-align: center;
		transition: color var(--duration-fast);
		font-family: var(--font-body);
	}

	.back-step-btn:hover {
		color: var(--text-secondary);
	}

	/* Admin Prompt Styles */
	.admin-badge-header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding-bottom: 12px;
		border-bottom: 1px solid rgba(124, 58, 237, 0.3);
	}

	.admin-badge-icon {
		font-size: 32px;
	}

	.admin-gate-title {
		font-size: var(--text-base);
		font-weight: 700;
		color: #c4b5fd;
		margin: 0;
	}

	.admin-gate-desc {
		font-size: 11px;
		color: var(--text-muted);
		margin: 2px 0 0;
		line-height: 1.3;
	}

	/* Registration Step Styles */
	.registration-header {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--glass-border);
	}

	.student-pill {
		font-size: 11px;
		font-weight: 700;
		color: #00e5a0;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.confirmed-email {
		font-size: var(--text-xs);
		color: var(--text-secondary);
	}

	.field-header-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.batch-badge {
		font-size: 11px;
		font-weight: 600;
		color: #00e5a0;
		background: rgba(0, 229, 160, 0.1);
		border: 1px solid rgba(0, 229, 160, 0.3);
		padding: 2px 8px;
		border-radius: 12px;
	}

	.year-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}

	.year-chip {
		padding: 9px 8px;
		font-size: var(--text-xs);
		font-weight: 500;
		color: var(--text-secondary);
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--duration-fast) var(--ease-out-expo);
		text-align: center;
		font-family: var(--font-body);
	}

	.year-chip:hover {
		color: var(--text-primary);
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.year-chip.selected {
		color: #ffffff;
		background: linear-gradient(135deg, rgba(255, 61, 127, 0.35), rgba(124, 58, 237, 0.35));
		border-color: rgba(255, 61, 127, 0.65);
		box-shadow: 0 0 16px rgba(255, 61, 127, 0.25);
		font-weight: 600;
	}

	.year-chip.invalid-year {
		color: #ff4d4f;
		background: rgba(255, 77, 79, 0.15);
		border-color: rgba(255, 77, 79, 0.5);
	}

	.senior-warning {
		margin-top: 8px;
		padding: 10px 14px;
		border-radius: var(--radius-md);
		border: 1px solid #ff4d4f;
		background: rgba(255, 77, 79, 0.12);
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.warning-icon {
		font-size: 20px;
		flex-shrink: 0;
	}

	.warning-text strong {
		color: #ff7875;
		font-size: var(--text-xs);
		display: block;
	}

	.warning-text p {
		margin: 2px 0 0;
		font-size: 11px;
		color: var(--text-secondary);
		line-height: 1.3;
	}

	.passcode-toggle {
		font-size: var(--text-sm);
		color: var(--text-muted);
		text-align: left;
		padding: 4px 0;
		cursor: pointer;
		background: none;
		border: none;
		font-family: var(--font-body);
	}

	.passcode-toggle:hover {
		color: var(--text-secondary);
	}

	/* Announcement Banner */
	.announcement-banner {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 16px;
		border-radius: var(--radius-md);
		border: 1px solid rgba(255, 165, 2, 0.3);
		background: rgba(255, 165, 2, 0.08);
		font-size: var(--text-xs);
		color: #ffd32a;
	}

	/* Paused Banner */
	.paused-banner {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 18px;
		border-radius: var(--radius-lg);
		border: 1px solid #ff3d7f;
		background: rgba(255, 61, 127, 0.12);
		box-shadow: 0 0 20px rgba(255, 61, 127, 0.25);
	}

	.paused-icon {
		font-size: 24px;
	}

	.paused-text strong {
		color: #ff7597;
		font-size: var(--text-sm);
		display: block;
	}

	.paused-text p {
		font-size: 11px;
		color: var(--text-secondary);
		margin: 2px 0 0;
	}

	.footer-links {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.event-badge {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 20px;
		font-size: var(--text-sm);
		color: var(--text-secondary);
		animation: fade-in-up 0.8s var(--ease-out-expo) 0.4s both;
	}
</style>
