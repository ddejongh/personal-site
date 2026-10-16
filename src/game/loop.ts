/**
 * Fixed-timestep game loop.
 *
 * Simulation (`step`) always advances in equal slices of `fixedDt`, so movement
 * and (later) physics behave the same at 30 fps or 144 fps. Rendering happens
 * once per animation frame and gets `alpha`, how far we are between the last
 * two simulation steps (0..1), so it can interpolate and look smooth.
 */
export interface LoopCallbacks {
	step(dt: number): void;
	render(alpha: number, frameDt: number): void;
}

const FIXED_DT = 1 / 60;
// Cap a single frame so a long pause (tab switch, breakpoint) doesn't
// trigger hundreds of catch-up steps: the "spiral of death".
const MAX_FRAME = 0.25;

export function startLoop({ step, render }: LoopCallbacks): () => void {
	let accumulator = 0;
	let last = performance.now();
	let handle = 0;

	function frame(now: number) {
		const frameDt = Math.min((now - last) / 1000, MAX_FRAME);
		last = now;

		accumulator += frameDt;
		while (accumulator >= FIXED_DT) {
			step(FIXED_DT);
			accumulator -= FIXED_DT;
		}

		render(accumulator / FIXED_DT, frameDt);
		handle = requestAnimationFrame(frame);
	}

	handle = requestAnimationFrame(frame);
	return () => cancelAnimationFrame(handle);
}
