/**
 * Keyboard state, polled by the simulation each step rather than reacting to
 * events directly. Uses `KeyboardEvent.code` (physical key position), so WASD
 * works on AZERTY and other layouts too.
 */
export class Input {
	private readonly down = new Set<string>();

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

	dispose() {
		this.target.removeEventListener('keydown', this.onKeyDown);
		this.target.removeEventListener('keyup', this.onKeyUp);
		this.target.removeEventListener('blur', this.onBlur);
	}

	private onKeyDown = (event: KeyboardEvent) => {
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		this.down.add(event.code);
	};

	private onKeyUp = (event: KeyboardEvent) => {
		this.down.delete(event.code);
	};

	private onBlur = () => {
		this.down.clear();
	};
}
