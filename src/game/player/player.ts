import * as THREE from 'three';
import type { Input } from '../input';
import { WORLD_HALF_SIZE } from '../world/world';

const RADIUS = 0.4;
const HEIGHT = 1.8;

export const playerSettings = {
	walkSpeed: 4,
	runSpeed: 8,
	/** How quickly velocity reaches the target speed (higher = snappier). */
	acceleration: 12,
	/** How quickly the body turns to face its direction of travel. */
	turnRate: 12,
};

/**
 * A capsule moved directly with WASD. No physics yet (that's milestone 4):
 * it only gets clamped to the edge of the ground.
 *
 * Simulation state (`position`, `velocity`, `facing`) is updated in fixed
 * steps; the mesh is moved at render time, interpolated between the
 * previous and current step.
 */
export class Player {
	readonly mesh: THREE.Group;
	readonly position = new THREE.Vector3();
	private readonly previous = new THREE.Vector3();
	private readonly velocity = new THREE.Vector3();
	// Start facing away from the camera, into the world (-Z).
	private facing = Math.PI;
	private previousFacing = Math.PI;

	private readonly wish = new THREE.Vector3();

	constructor(scene: THREE.Scene) {
		this.mesh = createMesh();
		scene.add(this.mesh);
	}

	step(dt: number, input: Input, cameraYaw: number) {
		this.previous.copy(this.position);
		this.previousFacing = this.facing;

		// Input in camera space: forward is away from the camera, flattened onto the ground.
		const forward = input.axis('KeyS', 'KeyW');
		const strafe = input.axis('KeyA', 'KeyD');
		const sin = Math.sin(cameraYaw);
		const cos = Math.cos(cameraYaw);
		this.wish.set(-sin * forward + cos * strafe, 0, -cos * forward - sin * strafe);
		if (this.wish.lengthSq() > 1) this.wish.normalize();

		const running = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
		const speed = running ? playerSettings.runSpeed : playerSettings.walkSpeed;
		this.wish.multiplyScalar(speed);

		// Exponential smoothing toward the target velocity: framerate-independent easing.
		this.velocity.lerp(this.wish, 1 - Math.exp(-playerSettings.acceleration * dt));
		this.position.addScaledVector(this.velocity, dt);

		const limit = WORLD_HALF_SIZE - RADIUS;
		this.position.x = THREE.MathUtils.clamp(this.position.x, -limit, limit);
		this.position.z = THREE.MathUtils.clamp(this.position.z, -limit, limit);

		if (this.wish.lengthSq() > 0.01) {
			const target = Math.atan2(this.wish.x, this.wish.z);
			this.facing = dampAngle(this.facing, target, playerSettings.turnRate, dt);
		}
	}

	/** Place the mesh between the last two simulation steps. */
	sync(alpha: number) {
		this.mesh.position.lerpVectors(this.previous, this.position, alpha);
		this.mesh.rotation.y = this.previousFacing + shortestAngle(this.previousFacing, this.facing) * alpha;
	}
}

function createMesh() {
	const group = new THREE.Group();

	const body = new THREE.Mesh(
		new THREE.CapsuleGeometry(RADIUS, HEIGHT - RADIUS * 2, 8, 16),
		new THREE.MeshStandardMaterial({ color: 0xf4f1de, roughness: 0.6 }),
	);
	body.position.y = HEIGHT / 2;
	body.castShadow = true;
	group.add(body);

	// A visor on the front so you can see which way the capsule faces (+Z).
	const visor = new THREE.Mesh(
		new THREE.BoxGeometry(0.5, 0.18, 0.2),
		new THREE.MeshStandardMaterial({ color: 0x3d405b }),
	);
	visor.position.set(0, HEIGHT - 0.45, RADIUS - 0.05);
	visor.castShadow = true;
	group.add(visor);

	return group;
}

function shortestAngle(from: number, to: number) {
	return THREE.MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI;
}

function dampAngle(from: number, to: number, rate: number, dt: number) {
	return from + shortestAngle(from, to) * (1 - Math.exp(-rate * dt));
}
