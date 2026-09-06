/**
 * Odd-One-Out puzzle definitions.
 * Each puzzle is a grid of CSS-based shape descriptors.
 * One item is subtly different.
 */
export interface OddOneOutPuzzle {
	/** Grid items — each is a CSS shape config */
	items: ShapeItem[];
	/** Index of the odd one */
	oddIndex: number;
	/** Difficulty label */
	difficulty: 'easy' | 'medium' | 'hard';
}

export interface ShapeItem {
	shape: 'circle' | 'square' | 'triangle' | 'diamond' | 'hexagon' | 'star';
	color: string;
	rotation: number;
	scale: number;
	borderRadius?: string;
}

function makeGrid(
	base: Omit<ShapeItem, 'rotation' | 'scale'>,
	odd: Partial<ShapeItem>,
	oddIdx: number,
	count: number = 9,
	difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): OddOneOutPuzzle {
	const items: ShapeItem[] = [];
	for (let i = 0; i < count; i++) {
		if (i === oddIdx) {
			items.push({
				...base,
				rotation: 0,
				scale: 1,
				...odd
			});
		} else {
			items.push({
				...base,
				rotation: 0,
				scale: 1
			});
		}
	}
	return { items, oddIndex: oddIdx, difficulty };
}

// Color-based differences
const colorPuzzles: OddOneOutPuzzle[] = [
	makeGrid({ shape: 'circle', color: '#ff3d7f' }, { color: '#ff5d8f' }, 3, 9, 'medium'),
	makeGrid({ shape: 'circle', color: '#7c3aed' }, { color: '#8c4afd' }, 7, 9, 'hard'),
	makeGrid({ shape: 'square', color: '#00e5a0' }, { color: '#20f5b0' }, 5, 9, 'medium'),
	makeGrid({ shape: 'circle', color: '#4f46e5' }, { color: '#5f56f5' }, 1, 9, 'hard'),
	makeGrid({ shape: 'diamond', color: '#ffa502' }, { color: '#ffb522' }, 6, 9, 'medium'),
	makeGrid({ shape: 'circle', color: '#c850c0' }, { color: '#d860d0' }, 2, 9, 'hard'),
	makeGrid({ shape: 'square', color: '#ff3d7f' }, { color: '#ff5d9f' }, 8, 9, 'easy'),
	makeGrid({ shape: 'hexagon', color: '#00e5a0' }, { color: '#30f5c0' }, 4, 9, 'easy'),
];

// Rotation-based differences
const rotationPuzzles: OddOneOutPuzzle[] = [
	makeGrid({ shape: 'triangle', color: '#ff3d7f' }, { rotation: 15 }, 2, 9, 'medium'),
	makeGrid({ shape: 'diamond', color: '#7c3aed' }, { rotation: 10 }, 6, 9, 'hard'),
	makeGrid({ shape: 'triangle', color: '#c850c0' }, { rotation: 20 }, 0, 9, 'easy'),
	makeGrid({ shape: 'star', color: '#ffa502' }, { rotation: 12 }, 4, 9, 'medium'),
	makeGrid({ shape: 'triangle', color: '#4f46e5' }, { rotation: 8 }, 7, 9, 'hard'),
	makeGrid({ shape: 'diamond', color: '#00e5a0' }, { rotation: 18 }, 1, 9, 'easy'),
	makeGrid({ shape: 'hexagon', color: '#ff3d7f' }, { rotation: 25 }, 5, 9, 'easy'),
	makeGrid({ shape: 'star', color: '#c850c0' }, { rotation: 15 }, 3, 9, 'medium'),
];

// Scale-based differences
const scalePuzzles: OddOneOutPuzzle[] = [
	makeGrid({ shape: 'circle', color: '#ff3d7f' }, { scale: 0.85 }, 4, 9, 'hard'),
	makeGrid({ shape: 'square', color: '#7c3aed' }, { scale: 1.15 }, 1, 9, 'medium'),
	makeGrid({ shape: 'circle', color: '#00e5a0' }, { scale: 0.8 }, 7, 9, 'easy'),
	makeGrid({ shape: 'diamond', color: '#ffa502' }, { scale: 1.2 }, 3, 9, 'easy'),
	makeGrid({ shape: 'hexagon', color: '#c850c0' }, { scale: 0.88 }, 6, 9, 'hard'),
	makeGrid({ shape: 'star', color: '#4f46e5' }, { scale: 1.12 }, 2, 9, 'medium'),
];

// Shape-based differences
const shapePuzzles: OddOneOutPuzzle[] = [
	makeGrid({ shape: 'circle', color: '#ff3d7f' }, { shape: 'square', borderRadius: '30%' }, 5, 9, 'medium'),
	makeGrid({ shape: 'square', color: '#7c3aed' }, { borderRadius: '8px' }, 3, 9, 'hard'),
	makeGrid({ shape: 'circle', color: '#c850c0' }, { shape: 'circle', scale: 0.9, borderRadius: '45%' }, 7, 9, 'hard'),
	makeGrid({ shape: 'diamond', color: '#00e5a0' }, { shape: 'square', rotation: 45 }, 1, 9, 'medium'),
	makeGrid({ shape: 'triangle', color: '#ffa502' }, { shape: 'triangle', rotation: 180 }, 4, 9, 'easy'),
	makeGrid({ shape: 'hexagon', color: '#4f46e5' }, { shape: 'circle' }, 6, 9, 'easy'),
	makeGrid({ shape: 'star', color: '#ff3d7f' }, { rotation: 36 }, 8, 9, 'medium'),
	makeGrid({ shape: 'circle', color: '#00e5a0' }, { shape: 'hexagon' }, 0, 9, 'easy'),
];

export const ODD_ONE_OUT_PUZZLES: OddOneOutPuzzle[] = [
	...colorPuzzles,
	...rotationPuzzles,
	...scalePuzzles,
	...shapePuzzles
];
