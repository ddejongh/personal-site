import * as THREE from 'three';
import { FollowCamera } from './camera/followCamera';
import { Input } from './input';
import { startLoop } from './loop';
import { createPhysics } from './physics/physics';
import { Player } from './player/player';
import { createWorld } from './world/world';

/** Boot the game on `canvas`. Returns a function that tears everything down. */
export async function startGame(canvas: HTMLCanvasElement): Promise<() => void> {
	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;

	const physics = await createPhysics();
	const scene = new THREE.Scene();
	const world = createWorld(scene, physics);
	const input = new Input();
	const player = new Player(scene, physics);
	const follow = new FollowCamera(canvas, (origin, direction, maxDistance) =>
		physics.raycast(origin, direction, maxDistance, player.collider),
	);
	// One step so the colliders are in place before the first movement or raycast.
	physics.step(1 / 60);
	follow.snapTo(player.position);

	const debugEnabled = import.meta.env.DEV || new URLSearchParams(location.search).has('debug');
	const debug = debugEnabled ? (await import('./debug')).createDebug(scene, physics) : undefined;
	// Handy for poking at things from the browser console, e.g. `game.player.position`.
	if (debug) Object.assign(window, { game: { scene, physics, player, camera: follow } });

	function resize() {
		renderer.setSize(window.innerWidth, window.innerHeight, false);
		follow.setAspect(window.innerWidth / window.innerHeight);
	}
	resize();
	window.addEventListener('resize', resize);

	const stopLoop = startLoop({
		step(dt) {
			player.step(dt, input, follow.yaw);
			physics.step(dt);
		},
		render(alpha, frameDt) {
			debug?.begin();
			player.sync(alpha);
			follow.update(player.mesh.position, frameDt);
			world.followSun(player.mesh.position);
			debug?.update();
			renderer.render(scene, follow.camera);
			debug?.end();
		},
	});

	return () => {
		stopLoop();
		window.removeEventListener('resize', resize);
		input.dispose();
		follow.dispose();
		debug?.dispose();
		physics.world.free();
		renderer.dispose();
	};
}
