<script lang="ts">
	interface Props {
		question: string;
		answer: string;
		maxLength?: number;
		onAnswer: (answer: string) => void;
	}

	let { question, answer = $bindable(''), maxLength = 80, onAnswer }: Props = $props();

	let focused = $state(false);

	function handleInput(e: Event) {
		const val = (e.target as HTMLTextAreaElement).value;
		answer = val;
		onAnswer(val);
	}
</script>

<div class="prompt-card glass" class:focused>
	<p class="prompt-question">
		<span class="prompt-quote">"</span>{question}<span class="prompt-cursor">|</span>
	</p>
	<div class="prompt-input-wrap">
		<textarea
			class="prompt-textarea"
			placeholder="Type your answer..."
			maxlength={maxLength}
			value={answer}
			oninput={handleInput}
			onfocus={() => (focused = true)}
			onblur={() => (focused = false)}
			rows={2}
		></textarea>
		<div class="char-counter">
			<div class="char-bar-track">
				<div
					class="char-bar-fill"
					style="width: {(answer.length / maxLength) * 100}%"
					class:near-limit={answer.length / maxLength > 0.8}
				></div>
			</div>
			<span class="char-count" class:near-limit={answer.length / maxLength > 0.8}>
				{answer.length}/{maxLength}
			</span>
		</div>
	</div>
</div>

<style>
	.prompt-card {
		padding: 24px;
		transition: all var(--duration-normal) var(--ease-out-expo);
		animation: fade-in-up 0.4s var(--ease-out-back);
	}

	.prompt-card.focused {
		border-color: var(--accent-pink);
		box-shadow: 0 0 0 2px rgba(255, 61, 127, 0.1);
	}

	.prompt-question {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		font-style: italic;
		color: var(--text-primary);
		margin-bottom: 16px;
		line-height: 1.4;
	}

	.prompt-quote {
		font-size: var(--text-3xl);
		color: var(--accent-pink);
		opacity: 0.6;
		line-height: 0;
		vertical-align: -0.3em;
		margin-right: 2px;
	}

	.prompt-cursor {
		color: var(--accent-pink);
		animation: typewriter-cursor 1s step-end infinite;
		margin-left: 2px;
	}

	.prompt-input-wrap {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.prompt-textarea {
		width: 100%;
		padding: 12px 14px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-sm);
		color: var(--text-primary);
		font-size: var(--text-base);
		font-family: var(--font-body);
		resize: none;
		outline: none;
		transition: border-color var(--duration-fast);
	}

	.prompt-textarea:focus {
		border-color: var(--accent-pink);
	}

	.prompt-textarea::placeholder {
		color: var(--text-muted);
		font-style: italic;
	}

	.char-counter {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.char-bar-track {
		flex: 1;
		height: 3px;
		background: var(--glass-light);
		border-radius: 2px;
		overflow: hidden;
	}

	.char-bar-fill {
		height: 100%;
		background: var(--gradient-primary);
		border-radius: 2px;
		transition: width 0.2s ease;
	}

	.char-bar-fill.near-limit {
		background: var(--warning);
	}

	.char-count {
		font-size: var(--text-xs);
		color: var(--text-muted);
		min-width: 48px;
		text-align: right;
	}

	.char-count.near-limit {
		color: var(--warning);
	}
</style>
