/**
 * SECRET ADMIRER — Generative Color Identity System
 * Generates deterministic, vibrant, aesthetically curated palettes for students.
 */

// A curated collection of 16 stunning multi-stop modern gradients
const CURATED_GRADIENTS = [
	'linear-gradient(135deg, #ff3d7f 0%, #c850c0 50%, #7c3aed 100%)', // Neon Sunset
	'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #06b6d4 100%)', // Electric Twilight
	'linear-gradient(135deg, #ff5e62 0%, #ff9966 100%)', // Coral Sunrise
	'linear-gradient(135deg, #00c9ff 0%, #92fe9d 100%)', // Aqua Breeze
	'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)', // Rose Velvet
	'linear-gradient(135deg, #4776e6 0%, #8e54e9 100%)', // Royal Violet
	'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // Sweet Peach
	'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)', // Emerald Mint
	'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Deep Lavender
	'linear-gradient(135deg, #b224ef 0%, #7579ff 100%)', // Cyber Orchid
	'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)', // Cherry Blossom
	'linear-gradient(135deg, #00e5a0 0%, #00b4d8 100%)', // Cyan Spring
	'linear-gradient(135deg, #f77062 0%, #fe5196 100%)', // Sunset Glow
	'linear-gradient(135deg, #8a2387 0%, #e94057 50%, #f27121 100%)', // Poly Fire
	'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', // Midnight Ocean
	'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'  // Pastel Euphoria
];

function hashString(str: string): number {
	let hash = 0;
	if (!str || str.length === 0) return 42;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash |= 0; // Convert to 32bit integer
	}
	return Math.abs(hash);
}

/**
 * Returns a deterministic gradient string for a user based on their ID or name.
 */
export function generateUserGradient(seed: string): string {
	if (!seed) return CURATED_GRADIENTS[0];
	const hash = hashString(seed);
	return CURATED_GRADIENTS[hash % CURATED_GRADIENTS.length];
}

/**
 * Generates an accent color (hex or hsl) for borders, highlights, and icons.
 */
export function generateUserAccent(seed: string): string {
	if (!seed) return '#ff3d7f';
	const hash = hashString(seed);
	const hue = hash % 360;
	return `hsl(${hue}, 85%, 60%)`;
}

/**
 * Generates a translucent shadow glow color for the user's card/avatar.
 */
export function generateUserGlow(seed: string): string {
	if (!seed) return 'rgba(255, 61, 127, 0.35)';
	const hash = hashString(seed);
	const hue = hash % 360;
	return `hsla(${hue}, 85%, 60%, 0.35)`;
}

/**
 * Generates consistent, beautiful badges for TKMCE Departments
 */
export function getDepartmentBadgeStyle(dept: string): { bg: string; text: string; border: string } {
	const d = (dept || '').toLowerCase();
	if (d.includes('computer') || d.includes('cs') || d.includes('data') || d.includes('ai')) {
		return {
			bg: 'rgba(99, 102, 241, 0.15)',
			text: '#818cf8',
			border: 'rgba(99, 102, 241, 0.3)'
		};
	}
	if (d.includes('mech')) {
		return {
			bg: 'rgba(249, 115, 22, 0.15)',
			text: '#fb923c',
			border: 'rgba(249, 115, 22, 0.3)'
		};
	}
	if (d.includes('civil')) {
		return {
			bg: 'rgba(16, 185, 129, 0.15)',
			text: '#34d399',
			border: 'rgba(16, 185, 129, 0.3)'
		};
	}
	if (d.includes('electr')) {
		return {
			bg: 'rgba(234, 179, 8, 0.15)',
			text: '#facc15',
			border: 'rgba(234, 179, 8, 0.3)'
		};
	}
	if (d.includes('chem')) {
		return {
			bg: 'rgba(236, 72, 153, 0.15)',
			text: '#f472b6',
			border: 'rgba(236, 72, 153, 0.3)'
		};
	}
	if (d.includes('arch')) {
		return {
			bg: 'rgba(168, 85, 247, 0.15)',
			text: '#c084fc',
			border: 'rgba(168, 85, 247, 0.3)'
		};
	}
	return {
		bg: 'rgba(255, 61, 127, 0.15)',
		text: '#ff6b9d',
		border: 'rgba(255, 61, 127, 0.3)'
	};
}
