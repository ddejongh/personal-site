import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import type { Input } from '../input';
import type { Physics } from '../physics/physics';

const RADIUS = 0.4;
const HEIGHT = 1.8;
/** Gap the controller keeps between the capsule and the world, so it doesn't snag. */
const SKIN = 0.02;

export const playerSettings = {
	walkSpeed: 4,
	runSpeed: 8,
	/** How quickly velocity reaches the target speed (higher = snappier). */
	acceleration: 12,
	/** How much control you keep in the air, as a fraction of `acceleration`. */
	airControl: 0.3,
	/** How quickly the body turns to face its direction of travel. */
	turnRate: 12,
	jumpSpeed: 8,
	/** Stronger than real gravity: real-world values feel floaty in games. */
	gravity: 22,
	/** Seconds after walking off a ledge during which you can still jump. */
	coyoteTime: 0.1,
	/** Milliseconds a jump press is remembered before landing. */
	jumpBuffer: 150,
};

/**
 * A capsule driven by Rapier's kinematic character controller.
 *
 * Each step we decide where the player *wants* to move (input, gravity,
 * jumping). The controller then sweeps the capsule through the world and
 * returns how far it can actually go, sliding along walls, climbing steps
 * and slopes, and snapping down onto the ground.
 *
 * Simulation state is updated in fixed steps; the mesh is moved at render
 * time, interpolated between the previous and current step.
 */
export class Player {
	readonly mesh: THREE.Group;
	readonly collider: RAPIER.Collider;
	/** Feet position (bottom of the capsule). */
	readonly position = new THREE.Vector3();
	private readonly previous = new THREE.Vector3();
	private readonly body: RAPIER.RigidBody;
	private readonly controller: RAPIER.KinematicCharacterController;

	private readonly velocity = new THREE.Vector3();
	private grounded = false;
	private timeSinceGrounded = 0;
	// Start facing away from the camera, into the world (-Z).
	private facing = Math.PI;
	private previousFacing = Math.PI;

	private readonly wish = new THREE.Vector3();
	private readonly horizontal = new THREE.Vector3();

	constructor(scene: THREE.Scene, physics: Physics) {
		this.mesh = createMesh();
		scene.add(this.mesh);

		const { world } = physics;
		// Kinematic: moved only by us, never pushed around by the solver.
		this.body = world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, HEIGHT / 2 + SKIN, 0),
		);
		this.collider = world.createCollider(RAPIER.ColliderDesc.capsule(HEIGHT / 2 - RADIUS, RADIUS), this.body);

		this.controller = world.createCharacterController(SKIN);
		this.controller.setMaxSlopeClimbAngle(THREE.MathUtils.degToRad(45));
		this.controller.setMinSlopeSlideAngle(THREE.MathUtils.degToRad(30));
		this.controller.enableAutostep(0.35, 0.2, true);
		this.controller.enableSnapToGround(0.3);
		this.controller.setApplyImpulsesToDynamicBodies(true);

		this.syncPositionFromBody();
		this.previous.copy(this.position);
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
		this.wish.multiplyScalar(running ? playerSettings.runSpeed : playerSettings.walkSpeed);

		// Exponential smoothing toward the target velocity: framerate-independent easing.
		const acceleration = playerSettings.acceleration * (this.grounded ? 1 : playerSettings.airControl);
		this.horizontal.set(this.velocity.x, 0, this.velocity.z).lerp(this.wish, 1 - Math.exp(-acceleration * dt));
		this.velocity.x = this.horizontal.x;
		this.velocity.z = this.horizontal.z;

		// Vertical: jump if grounded (or only just left the ground), otherwise fall.
		this.timeSinceGrounded = this.grounded ? 0 : this.timeSinceGrounded + dt;
		if (
			this.timeSinceGrounded <= playerSettings.coyoteTime &&
			input.consumePress('Space', playerSettings.jumpBuffer)
		) {
			this.velocity.y = playerSettings.jumpSpeed;
			this.timeSinceGrounded = Infinity;
		} else if (this.grounded && this.velocity.y < 0) {
			// A small constant push keeps the controller in contact with the ground.
			this.velocity.y = -2;
		}
		this.velocity.y -= playerSettings.gravity * dt;

		const desired = { x: this.velocity.x * dt, y: this.velocity.y * dt, z: this.velocity.z * dt };
		this.controller.computeColliderMovement(this.collider, desired);
		const moved = this.controller.computedMovement();
		this.grounded = this.controller.computedGrounded();

		// Bumped our head: stop rising.
		if (desired.y > 0 && moved.y < desired.y * 0.5) this.velocity.y = 0;

		const t = this.body.translation();
		const next = { x: t.x + moved.x, y: t.y + moved.y, z: t.z + moved.z };
		this.body.setNextKinematicTranslation(next);
		this.position.set(next.x, next.y - HEIGHT / 2, next.z);

		if (this.wish.lengthSq() > 0.01) {
			const target = Math.atan2(this.wish.x, this.wish.z);
			this.facing = dampAngle(this.facing, target, playerSettings.turnRate, dt);
		}
	}

	get isGrounded() {
		return this.grounded;
	}

	/** Place the mesh between the last two simulation steps. */
	sync(alpha: number) {
		this.mesh.position.lerpVectors(this.previous, this.position, alpha);
		this.mesh.rotation.y = this.previousFacing + shortestAngle(this.previousFacing, this.facing) * alpha;
	}

	private syncPositionFromBody() {
		const t = this.body.translation();
		this.position.set(t.x, t.y - HEIGHT / 2, t.z);
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
