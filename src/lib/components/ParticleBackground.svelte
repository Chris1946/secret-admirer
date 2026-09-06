<script lang="ts">
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;

	interface Particle {
		x: number;
		y: number;
		size: number;
		speedX: number;
		speedY: number;
		opacity: number;
		hue: number;
	}

	onMount(() => {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		let particles: Particle[] = [];
		let animationId: number;
		let width = 0;
		let height = 0;

		function resize() {
			width = canvas.offsetWidth;
			height = canvas.offsetHeight;
			const dpr = window.devicePixelRatio || 1;
			canvas.width = Math.floor(width * dpr);
			canvas.height = Math.floor(height * dpr);
			ctx!.setTransform(1, 0, 0, 1, 0, 0);
			ctx!.scale(dpr, dpr);
		}

		function createParticle(): Particle {
			return {
				x: Math.random() * width,
				y: Math.random() * height,
				size: Math.random() * 2 + 0.5,
				speedX: (Math.random() - 0.5) * 0.3,
				speedY: (Math.random() - 0.5) * 0.3,
				opacity: Math.random() * 0.4 + 0.1,
				hue: Math.random() > 0.5 ? 340 : 280 // pink or violet
			};
		}

		function init() {
			resize();
			const count = Math.min(40, Math.floor((width * height) / 12000));
			particles = Array.from({ length: count }, createParticle);
		}

		function animate() {
			ctx!.clearRect(0, 0, width, height);

			for (const p of particles) {
				p.x += p.speedX;
				p.y += p.speedY;

				if (p.x < 0) p.x = width;
				if (p.x > width) p.x = 0;
				if (p.y < 0) p.y = height;
				if (p.y > height) p.y = 0;

				ctx!.beginPath();
				ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
				ctx!.fillStyle = `hsla(${p.hue}, 80%, 65%, ${p.opacity})`;
				ctx!.fill();
			}

			// Draw subtle connections
			for (let i = 0; i < particles.length; i++) {
				for (let j = i + 1; j < particles.length; j++) {
					const dx = particles[i].x - particles[j].x;
					const dy = particles[i].y - particles[j].y;
					const dist = Math.sqrt(dx * dx + dy * dy);

					if (dist < 120) {
						ctx!.beginPath();
						ctx!.moveTo(particles[i].x, particles[i].y);
						ctx!.lineTo(particles[j].x, particles[j].y);
						ctx!.strokeStyle = `rgba(255, 61, 127, ${0.06 * (1 - dist / 120)})`;
						ctx!.lineWidth = 0.5;
						ctx!.stroke();
					}
				}
			}

			animationId = requestAnimationFrame(animate);
		}

		init();
		animate();

		const resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(canvas);

		return () => {
			cancelAnimationFrame(animationId);
			resizeObserver.disconnect();
		};
	});
</script>

<canvas bind:this={canvas} class="particle-canvas" aria-hidden="true"></canvas>

<style>
	.particle-canvas {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 0;
	}
</style>
