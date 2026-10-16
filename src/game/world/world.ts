import * as THREE from 'three';

export const WORLD_HALF_SIZE = 40;

const SKY = 0xa8d4f0;

/** Lights, ground and a few landmark blocks so movement is easy to see. */
export function createWorld(scene: THREE.Scene) {
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

	const grid = new THREE.GridHelper(WORLD_HALF_SIZE * 2, WORLD_HALF_SIZE, 0x5f8f4e, 0x6fa05c);
	grid.position.y = 0.01;
	scene.add(grid);

	addLandmarks(scene);

	const sunOffset = new THREE.Vector3(15, 30, 10);

	return {
		/** Keep the shadow box centered on the player. */
		followSun(target: THREE.Vector3) {
			sun.position.copy(target).add(sunOffset);
			sun.target.position.copy(target);
		},
	};
}

function addLandmarks(scene: THREE.Scene) {
	const geometry = new THREE.BoxGeometry(1, 1, 1);
	const colors = [0xe07a5f, 0x3d405b, 0xf2cc8f, 0x81b29a];
	const random = mulberry32(7);

	for (let i = 0; i < 30; i++) {
		const material = new THREE.MeshStandardMaterial({ color: colors[i % colors.length] });
		const block = new THREE.Mesh(geometry, material);
		const height = 1 + random() * 4;
		block.scale.set(1 + random() * 3, height, 1 + random() * 3);

		// Keep a clear area around the spawn point.
		let x: number, z: number;
		do {
			x = (random() * 2 - 1) * (WORLD_HALF_SIZE - 4);
			z = (random() * 2 - 1) * (WORLD_HALF_SIZE - 4);
		} while (Math.hypot(x, z) < 8);

		block.position.set(x, height / 2, z);
		block.rotation.y = random() * Math.PI;
		block.castShadow = true;
		block.receiveShadow = true;
		scene.add(block);
	}
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
