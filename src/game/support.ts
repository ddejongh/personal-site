/**
 * Desktop-first: the game needs WebGL2, a mouse or trackpad and a reasonably
 * wide window. Kept apart from `main.ts` so checking doesn't download Three.js.
 */
export function canRunGame(): boolean {
	const finePointer = matchMedia('(pointer: fine)').matches;
	const wide = matchMedia('(min-width: 900px)').matches;
	return finePointer && wide && !!document.createElement('canvas').getContext('webgl2');
}
