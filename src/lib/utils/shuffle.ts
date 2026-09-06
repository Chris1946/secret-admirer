/**
 * Fisher-Yates shuffle — unbiased random permutation.
 */
export function shuffle<T>(array: T[]): T[] {
	const arr = [...array];
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}

/**
 * Pick N random items from an array without replacement.
 */
export function pickRandom<T>(array: T[], n: number): T[] {
	return shuffle(array).slice(0, n);
}

/**
 * Generate a random integer between min and max (inclusive).
 */
export function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
