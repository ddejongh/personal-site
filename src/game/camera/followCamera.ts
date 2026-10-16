import * as THREE from 'three';

export const cameraSettings = {
	distance: 8,
	minDistance: 3,
	maxDistance: 16,
	/** Radians per pixel of mouse drag. */
	sensitivity: 0.005,
	/** How quickly the camera catches up to the player. */
	followRate: 10,
};

const MIN_PITCH = 0.05;
const MAX_PITCH = 1.3;
const LOOK_HEIGHT = 1.4;
/** How far the camera stays in front of whatever blocks it. */
const CLIP_MARGIN = 0.3;

/** Returns the free distance along a unit `direction` from `origin`, up to `maxDistance`. */
export type ClipTest = (origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number) => number;

/**
 * Third-person orbit camera. Drag to rotate, scroll to zoom.
 *
 * `yaw` is read by the player so WASD stays relative to the view. A ray from
 * the player's head toward the camera pulls it in when a wall is in the way:
 * instantly when blocked, easing back out once clear.
 */
export class FollowCamera {
	readonly camera: THREE.PerspectiveCamera;
	yaw = 0;
	private pitch = 0.35;
	private readonly focus = new THREE.Vector3();
	private readonly pivot = new THREE.Vector3();
	private readonly direction = new THREE.Vector3();
	private currentDistance = cameraSettings.distance;
	private dragging = false;

	constructor(
		private readonly element: HTMLElement,
		private readonly clip?: ClipTest,
	) {
		this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
		element.addEventListener('pointerdown', this.onPointerDown);
		element.addEventListener('pointermove', this.onPointerMove);
		element.addEventListener('pointerup', this.onPointerUp);
		element.addEventListener('pointercancel', this.onPointerUp);
		element.addEventListener('wheel', this.onWheel, { passive: false });
	}

	/** Snap to the target without easing (on spawn). */
	snapTo(target: THREE.Vector3) {
		this.focus.copy(target);
		this.currentDistance = cameraSettings.distance;
		this.update(target, 0);
	}

	update(target: THREE.Vector3, frameDt: number) {
		this.focus.lerp(target, 1 - Math.exp(-cameraSettings.followRate * frameDt));
		this.pivot.set(this.focus.x, this.focus.y + LOOK_HEIGHT, this.focus.z);

		// Unit vector from the pivot out toward the camera.
		const horizontal = Math.cos(this.pitch);
		this.direction.set(Math.sin(this.yaw) * horizontal, Math.sin(this.pitch), Math.cos(this.yaw) * horizontal);

		const wanted = cameraSettings.distance;
		const free = this.clip ? this.clip(this.pivot, this.direction, wanted + CLIP_MARGIN) - CLIP_MARGIN : wanted;
		const allowed = THREE.MathUtils.clamp(free, 0.5, wanted);
		this.currentDistance =
			allowed < this.currentDistance
				? allowed
				: THREE.MathUtils.lerp(this.currentDistance, allowed, 1 - Math.exp(-4 * frameDt));

		this.camera.position.copy(this.pivot).addScaledVector(this.direction, this.currentDistance);
		this.camera.lookAt(this.pivot);
	}

	setAspect(aspect: number) {
		this.camera.aspect = aspect;
		this.camera.updateProjectionMatrix();
	}

	dispose() {
		this.element.removeEventListener('pointerdown', this.onPointerDown);
		this.element.removeEventListener('pointermove', this.onPointerMove);
		this.element.removeEventListener('pointerup', this.onPointerUp);
		this.element.removeEventListener('pointercancel', this.onPointerUp);
		this.element.removeEventListener('wheel', this.onWheel);
	}

	private onPointerDown = (event: PointerEvent) => {
		this.dragging = true;
		this.element.setPointerCapture(event.pointerId);
	};

	private onPointerMove = (event: PointerEvent) => {
		if (!this.dragging) return;
		this.yaw -= event.movementX * cameraSettings.sensitivity;
		this.pitch = THREE.MathUtils.clamp(
			this.pitch + event.movementY * cameraSettings.sensitivity,
			MIN_PITCH,
			MAX_PITCH,
		);
	};

	private onPointerUp = (event: PointerEvent) => {
		this.dragging = false;
		this.element.releasePointerCapture(event.pointerId);
	};

	private onWheel = (event: WheelEvent) => {
		event.preventDefault();
		cameraSettings.distance = THREE.MathUtils.clamp(
			cameraSettings.distance + event.deltaY * 0.01,
			cameraSettings.minDistance,
			cameraSettings.maxDistance,
		);
	};
}
