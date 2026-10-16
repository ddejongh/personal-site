import * as THREE from 'three';
import type { Physics } from '../physics/physics';

export const WORLD_HALF_SIZE = 40;

const SKY = 0xa8d4f0;
const WALL_HEIGHT = 4;

const box = new THREE.BoxGeometry(1, 1, 1);

/**
 * Lights, ground, landmark blocks and a small test course for the character
 * controller. Every solid mesh gets a matching static collider.
 */
export function createWorld(scene: THREE.Scene, physics: Physics) {
	scene.background = new THREE.Color(SKY);
	scene.fog = new THREE.Fog(SKY, 40, 110);

	// Sky/ground ambient fill, plus a sun that casts shadows.
	scene.add(new THREE.HemisphereLight(0xdff1ff, 0x5a6b45, 1.2));

	const sun = new THREE.DirectionalLight(0xffffff, 2.2);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	// The shadow camera only covers a box around the player (see `followSun`).
	const extent = 25;
	Object.assign(sun.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, near: 1, far: 80 });
	sun.shadow.bias = -0.0005;
	scene.add(sun, sun.target);

	const ground = new THREE.Mesh(
		new THREE.PlaneGeometry(WORLD_HALF_SIZE * 2, WORLD_HALF_SIZE * 2),
		new THREE.MeshStandardMaterial({ color: 0x7fb069, roughness: 1 }),
	);
	ground.rotation.x = -Math.PI / 2;
	ground.receiveShadow = true;
	scene.add(ground);
	// A thick slab whose top face sits at y = 0, so fast falls can't tunnel through.
	physics.addStaticCuboid({ x: 0, y: -1, z: 0 }, { x: WORLD_HALF_SIZE, y: 1, z: WORLD_HALF_SIZE });

	const grid = new THREE.GridHelper(WORLD_HALF_SIZE * 2, WORLD_HALF_SIZE, 0x5f8f4e, 0x6fa05c);
	grid.position.y = 0.01;
	scene.add(grid);

	addBoundaryWalls(physics);
	addLandmarks(scene, physics);
	addCourse(scene, physics);

	const sunOffset = new THREE.Vector3(15, 30, 10);

	return {
		/** Keep the shadow box centered on the player. */
		followSun(target: THREE.Vector3) {
			sun.position.copy(target).add(sunOffset);
			sun.target.position.copy(target);
		},
	};
}

/** Invisible walls around the edge of the ground. */
function addBoundaryWalls(physics: Physics) {
	const h = WORLD_HALF_SIZE;
	const half = WALL_HEIGHT / 2;
	physics.addStaticCuboid({ x: 0, y: half, z: -h - 0.5 }, { x: h, y: half, z: 0.5 });
	physics.addStaticCuboid({ x: 0, y: half, z: h + 0.5 }, { x: h, y: half, z: 0.5 });
	physics.addStaticCuboid({ x: -h - 0.5, y: half, z: 0 }, { x: 0.5, y: half, z: h });
	physics.addStaticCuboid({ x: h + 0.5, y: half, z: 0 }, { x: 0.5, y: half, z: h });
}

function addBlock(
	scene: THREE.Scene,
	physics: Physics,
	color: number,
	size: THREE.Vector3Tuple,
	position: THREE.Vector3Tuple,
	rotation: THREE.Vector3Tuple = [0, 0, 0],
) {
	const mesh = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color }));
	mesh.scale.set(...size);
	mesh.position.set(...position);
	mesh.rotation.set(...rotation);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	scene.add(mesh);
	physics.addStaticBox(mesh);
	return mesh;
}

function addLandmarks(scene: THREE.Scene, physics: Physics) {
	const colors = [0xe07a5f, 0x3d405b, 0xf2cc8f, 0x81b29a];
	const random = mulberry32(7);

	for (let i = 0; i < 30; i++) {
		const height = 1 + random() * 4;
		const size: THREE.Vector3Tuple = [1 + random() * 3, height, 1 + random() * 3];

		// Keep the spawn point and the test course clear.
		let x: number, z: number;
		do {
			x = (random() * 2 - 1) * (WORLD_HALF_SIZE - 4);
			z = (random() * 2 - 1) * (WORLD_HALF_SIZE - 4);
		} while (Math.hypot(x, z) < 8 || (Math.abs(x) < 12 && z < -5 && z > -22));

		addBlock(scene, physics, colors[i % colors.length], size, [x, height / 2, z], [0, random() * Math.PI, 0]);
	}
}

/**
 * Straight ahead of spawn (-Z): a gentle ramp and a staircase up to a
 * platform, a slope too steep to climb, and a jump to a higher platform.
 */
function addCourse(scene: THREE.Scene, physics: Physics) {
	const stone = 0xb8b8c0;
	const accent = 0xe07a5f;
	const front = -14; // z where the platforms start

	// Platform A (2 m high), reached by the ramp or the stairs.
	const lowHeight = 2;
	addBlock(scene, physics, stone, [10, lowHeight, 4], [-3, lowHeight / 2, front - 2]);

	// Gentle 20° ramp up to platform A.
	addRamp(scene, physics, stone, -6, front, lowHeight, THREE.MathUtils.degToRad(20));

	// Stairs: 0.25 m risers, low enough for the controller's auto-step.
	const rise = 0.25;
	const run = 0.5;
	const steps = lowHeight / rise;
	for (let i = 0; i < steps; i++) {
		const height = (i + 1) * rise;
		const z = front + (steps - i) * run - run / 2;
		addBlock(scene, physics, i % 2 ? stone : 0xa0a0aa, [3, height, run], [0, height / 2, z]);
	}

	// Platform B (3 m high): the 55° slope is steeper than the climb limit,
	// so the way up is jumping across from platform A.
	const highHeight = 3;
	addBlock(scene, physics, accent, [4, highHeight, 4], [6, highHeight / 2, front - 2]);
	addRamp(scene, physics, accent, 6, front, highHeight, THREE.MathUtils.degToRad(55));
}

/** A ramp whose top edge meets a platform face at `frontZ`, rising toward -Z. */
function addRamp(
	scene: THREE.Scene,
	physics: Physics,
	color: number,
	x: number,
	frontZ: number,
	height: number,
	angle: number,
) {
	const thickness = 0.3;
	const length = height / Math.sin(angle);
	const horizontal = length * Math.cos(angle);
	// Rotating +angle about X tips the -Z end up and the +Z end down.
	addBlock(
		scene,
		physics,
		color,
		[3, thickness, length],
		[x, height / 2 - thickness / 2, frontZ + horizontal / 2],
		[angle, 0, 0],
	);
}

/** Tiny seeded PRNG so the layout is the same on every load. */
function mulberry32(seed: number) {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
