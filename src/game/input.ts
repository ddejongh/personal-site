/**
 * Keyboard state, polled by the simulation each step rather than reacting to
 * events directly. Uses `KeyboardEvent.code` (physical key position), so WASD
 * works on AZERTY and other layouts too.
 */
export class Input {
	private readonly down = new Set<string>();
	/** When each key was last pressed, for one-shot actions like jumping. */
	private readonly pressedAt = new Map<string, number>();

	constructor(private readonly target: Window = window) {
		target.addEventListener('keydown', this.onKeyDown);
		target.addEventListener('keyup', this.onKeyUp);
		// Releasing a key while the tab is unfocused never fires keyup.
		target.addEventListener('blur', this.onBlur);
	}

	isDown(code: string): boolean {
		return this.down.has(code);
	}

	/** -1, 0 or 1 from a pair of opposing keys. */
	axis(negative: string, positive: string): number {
		return Number(this.isDown(positive)) - Number(this.isDown(negative));
	}

	/**
	 * True once if `code` was pressed within the last `withinMs`, then forgets
	 * the press. The window is an input buffer: pressing jump slightly before
	 * landing still jumps.
	 */
	consumePress(code: string, withinMs: number): boolean {
		const at = this.pressedAt.get(code);
		if (at === undefined || performance.now() - at > withinMs) return false;
		this.pressedAt.delete(code);
		return true;
	}

	dispose() {
		this.target.removeEventListener('keydown', this.onKeyDown);
		this.target.removeEventListener('keyup', this.onKeyUp);
		this.target.removeEventListener('blur', this.onBlur);
	}

	private onKeyDown = (event: KeyboardEvent) => {
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		// Space would otherwise scroll the page, but leave it alone when a link or control has focus.
		if (event.code === 'Space' && event.target === document.body) event.preventDefault();
		this.down.add(event.code);
		if (!event.repeat) this.pressedAt.set(event.code, performance.now());
	};

	private onKeyUp = (event: KeyboardEvent) => {
		this.down.delete(event.code);
	};

	private onBlur = () => {
		this.down.clear();
		this.pressedAt.clear();
	};
}
