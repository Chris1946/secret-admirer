<script lang="ts">
	let { onCapture }: { onCapture: (dataUrl: string) => void } = $props();

	let mode = $state<'choose' | 'camera' | 'preview'>('choose');
	let videoEl = $state<HTMLVideoElement>();
	let canvasEl = $state<HTMLCanvasElement>();
	let stream: MediaStream | null = null;
	let previewUrl = $state('');
	let dragOver = $state(false);

	const TARGET_WIDTH = 750;
	const TARGET_HEIGHT = 1000; // 3:4 ratio crisp HD
	const ASPECT = TARGET_WIDTH / TARGET_HEIGHT;

	async function startCamera() {
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }
			});
			mode = 'camera';
			// Wait for DOM to update before setting srcObject
			await new Promise((r) => setTimeout(r, 50));
			if (videoEl) {
				videoEl.srcObject = stream;
			}
		} catch {
			// Fallback to file upload if camera not available
			mode = 'choose';
		}
	}

	function capturePhoto() {
		if (!videoEl || !canvasEl) return;
		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		canvasEl.width = TARGET_WIDTH;
		canvasEl.height = TARGET_HEIGHT;

		// Center-crop the video to 3:4
		const vw = videoEl.videoWidth;
		const vh = videoEl.videoHeight;
		const videoAspect = vw / vh;

		let sx = 0,
			sy = 0,
			sw = vw,
			sh = vh;

		if (videoAspect > ASPECT) {
			sw = vh * ASPECT;
			sx = (vw - sw) / 2;
		} else {
			sh = vw / ASPECT;
			sy = (vh - sh) / 2;
		}

		ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
		previewUrl = canvasEl.toDataURL('image/jpeg', 0.8);

		stopCamera();
		mode = 'preview';
	}

	function stopCamera() {
		if (stream) {
			stream.getTracks().forEach((t) => t.stop());
			stream = null;
		}
	}

	function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files?.[0]) return;
		processFile(input.files[0]);
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		if (!e.dataTransfer?.files?.[0]) return;
		processFile(e.dataTransfer.files[0]);
	}

	function processFile(file: File) {
		if (!file.type.startsWith('image/')) return;

		const img = new Image();
		img.onload = () => {
			if (!canvasEl) return;
			const ctx = canvasEl.getContext('2d');
			if (!ctx) return;

			canvasEl.width = TARGET_WIDTH;
			canvasEl.height = TARGET_HEIGHT;

			// Center-crop to 3:4
			const imgAspect = img.width / img.height;
			let sx = 0,
				sy = 0,
				sw = img.width,
				sh = img.height;

			if (imgAspect > ASPECT) {
				sw = img.height * ASPECT;
				sx = (img.width - sw) / 2;
			} else {
				sh = img.width / ASPECT;
				sy = (img.height - sh) / 2;
			}

			ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
			previewUrl = canvasEl.toDataURL('image/jpeg', 0.8);
			mode = 'preview';
			URL.revokeObjectURL(img.src);
		};
		img.src = URL.createObjectURL(file);
	}

	function confirmPhoto() {
		if (previewUrl) {
			onCapture(previewUrl);
		}
	}

	function retake() {
		previewUrl = '';
		mode = 'choose';
	}
</script>

<div class="photo-capture">
	<canvas bind:this={canvasEl} class="hidden-canvas"></canvas>

	{#if mode === 'choose'}
		<div
			class="upload-area"
			class:drag-over={dragOver}
			ondragover={(e) => { e.preventDefault(); dragOver = true; }}
			ondragleave={() => (dragOver = false)}
			ondrop={handleDrop}
			role="presentation"
		>
			<div class="upload-icon">📸</div>
			<p class="upload-text">Add your photo</p>
			<p class="upload-hint">3:4 ratio · Auto-cropped</p>

			<div class="upload-actions">
				<button class="upload-btn camera-btn" onclick={startCamera}>
					<span>📷</span> Camera
				</button>
				<label class="upload-btn file-btn">
					<span>📁</span> Upload
					<input
						type="file"
						accept="image/*"
						class="file-input"
						onchange={handleFileInput}
					/>
				</label>
			</div>
		</div>
	{:else if mode === 'camera'}
		<div class="camera-view">
			<!-- svelte-ignore element_invalid_self_closing_tag -->
			<video bind:this={videoEl} autoplay playsinline muted class="camera-video" />
			<div class="crop-overlay">
				<div class="crop-frame"></div>
			</div>
			<div class="camera-controls">
				<button class="capture-btn" onclick={capturePhoto}>
					<span class="capture-ring"></span>
				</button>
				<button
					class="cancel-camera"
					onclick={() => {
						stopCamera();
						mode = 'choose';
					}}>✕</button
				>
			</div>
		</div>
	{:else if mode === 'preview'}
		<div class="preview-view">
			<div class="preview-frame">
				<img src={previewUrl} alt="Your photo preview" class="preview-img" />
			</div>
			<div class="preview-actions">
				<button class="preview-btn retake" onclick={retake}>Retake</button>
				<button class="preview-btn confirm" onclick={confirmPhoto}>✓ Use Photo</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.photo-capture {
		width: 100%;
	}

	.hidden-canvas {
		display: none;
	}

	/* Upload Area */
	.upload-area {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 40px 20px;
		border: 2px dashed var(--glass-border);
		border-radius: var(--radius-lg);
		background: var(--glass-light);
		transition: all var(--duration-normal) var(--ease-out-expo);
	}

	.upload-area.drag-over {
		border-color: var(--accent-pink);
		background: rgba(255, 61, 127, 0.05);
	}

	.upload-icon {
		font-size: 48px;
		animation: float 3s ease-in-out infinite;
	}

	.upload-text {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		color: var(--text-primary);
	}

	.upload-hint {
		font-size: var(--text-xs);
		color: var(--text-muted);
	}

	.upload-actions {
		display: flex;
		gap: 12px;
		margin-top: 8px;
	}

	.upload-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 10px 20px;
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: 500;
		cursor: pointer;
		transition: all var(--duration-fast);
		border: none;
		font-family: var(--font-body);
		color: var(--text-primary);
	}

	.camera-btn {
		background: var(--gradient-primary);
	}

	.file-btn {
		background: var(--glass-medium);
		border: 1px solid var(--glass-border);
	}

	.file-input {
		display: none;
	}

	/* Camera View */
	.camera-view {
		position: relative;
		border-radius: var(--radius-lg);
		overflow: hidden;
		aspect-ratio: 3 / 4;
		max-height: 400px;
	}

	.camera-video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transform: scaleX(-1);
	}

	.crop-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.crop-frame {
		width: 80%;
		aspect-ratio: 3 / 4;
		border: 2px solid rgba(255, 255, 255, 0.5);
		border-radius: var(--radius-md);
	}

	.camera-controls {
		position: absolute;
		bottom: 20px;
		left: 0;
		right: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 20px;
	}

	.capture-btn {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: white;
		border: 4px solid rgba(255, 255, 255, 0.5);
		cursor: pointer;
		position: relative;
		transition: transform 0.15s;
	}

	.capture-btn:active {
		transform: scale(0.9);
	}

	.cancel-camera {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.5);
		color: white;
		font-size: 18px;
		cursor: pointer;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Preview */
	.preview-view {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
	}

	.preview-frame {
		width: 200px;
		aspect-ratio: 3 / 4;
		border-radius: var(--radius-lg);
		overflow: hidden;
		border: 2px solid var(--glass-border);
		box-shadow: var(--shadow-lg);
	}

	.preview-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.preview-actions {
		display: flex;
		gap: 12px;
	}

	.preview-btn {
		padding: 10px 24px;
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: 600;
		cursor: pointer;
		border: none;
		font-family: var(--font-body);
		transition: all var(--duration-fast);
	}

	.retake {
		background: var(--glass-medium);
		color: var(--text-secondary);
		border: 1px solid var(--glass-border);
	}

	.confirm {
		background: var(--gradient-primary);
		color: white;
	}

	.confirm:hover {
		box-shadow: var(--shadow-glow-pink);
	}
</style>
