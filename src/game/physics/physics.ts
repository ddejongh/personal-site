import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

/**
 * Owns the Rapier world. Rapier is a WASM physics engine; the `-compat`
 * build inlines the WASM so there's no separate file to serve, but it still
 * has to be initialized before anything else is called.
 */
export async function createPhysics() {
	await RAPIER.init();
	return new Physics(new RAPIER.World({ x: 0, y: -9.81, z: 0 }));
}

export class Physics {
	private readonly ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });

	constructor(readonly world: RAPIER.World) {}

	step(dt: number) {
		this.world.timestep = dt;
		this.world.step();
	}

	/** A fixed (immovable) box collider matching a `BoxGeometry` mesh, including its scale and rotation. */
	addStaticBox(mesh: THREE.Mesh<THREE.BoxGeometry>) {
		const { width, height, depth } = mesh.geometry.parameters;
		const { x, y, z } = mesh.position;
		const desc = RAPIER.ColliderDesc.cuboid(
			(width * mesh.scale.x) / 2,
			(height * mesh.scale.y) / 2,
			(depth * mesh.scale.z) / 2,
		)
			.setTranslation(x, y, z)
			.setRotation(mesh.quaternion);
		return this.world.createCollider(desc);
	}

	/** An invisible fixed box, given its center and half-extents. */
	addStaticCuboid(center: THREE.Vector3Like, halfExtents: THREE.Vector3Like) {
		const desc = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z).setTranslation(
			center.x,
			center.y,
			center.z,
		);
		return this.world.createCollider(desc);
	}

	/**
	 * Distance along `direction` (unit length) to the first collider hit, or
	 * `maxDistance` if nothing is in the way.
	 */
	raycast(origin: THREE.Vector3Like, direction: THREE.Vector3Like, maxDistance: number, exclude?: RAPIER.Collider) {
		this.ray.origin = origin;
		this.ray.dir = direction;
		const hit = this.world.castRay(this.ray, maxDistance, true, undefined, undefined, exclude);
		return hit ? hit.timeOfImpact : maxDistance;
	}
}
