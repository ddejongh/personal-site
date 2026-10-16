import * as THREE from 'three';
import { FollowCamera } from './camera/followCamera';
import { Input } from './input';
import { startLoop } from './loop';
import { Player } from './player/player';
import { createWorld } from './world/world';

/** Boot the game on `canvas`. Returns a function that tears everything down. */
export async function startGame(canvas: HTMLCanvasElement): Promise<() => void> {
	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;

	const scene = new THREE.Scene();
	const world = createWorld(scene);
	const input = new Input();
	const player = new Player(scene);
	const follow = new FollowCamera(canvas);
	follow.snapTo(player.position);

	const debugEnabled = import.meta.env.DEV || new URLSearchParams(location.search).has('debug');
	const debug = debugEnabled ? (await import('./debug')).createDebug() : undefined;

	function resize() {
		renderer.setSize(window.innerWidth, window.innerHeight, false);
		follow.setAspect(window.innerWidth / window.innerHeight);
	}
	resize();
	window.addEventListener('resize', resize);

	const stopLoop = startLoop({
		step(dt) {
			player.step(dt, input, follow.yaw);
		},
		render(alpha, frameDt) {
			debug?.begin();
			player.sync(alpha);
			follow.update(player.mesh.position, frameDt);
			world.followSun(player.mesh.position);
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
		renderer.dispose();
	};
}
