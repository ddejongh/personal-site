import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import GUI from 'three/addons/libs/lil-gui.module.min.js';
import { cameraSettings } from './camera/followCamera';
import type { Physics } from './physics/physics';
import { playerSettings } from './player/player';

/** FPS meter, live tweak panel and collider wireframes. Loaded only in dev or with `?debug`. */
export function createDebug(scene: THREE.Scene, physics: Physics) {
	const stats = new Stats();
	stats.dom.style.left = 'auto';
	stats.dom.style.right = '0';
	stats.dom.style.top = 'auto';
	stats.dom.style.bottom = '0';
	document.body.append(stats.dom);

	const gui = new GUI({ title: 'Debug' });
	// Left side, below the skip link, so it doesn't cover the intro card.
	Object.assign(gui.domElement.style, { left: '1rem', right: 'auto', top: '4.5rem' });
	gui.close();

	const player = gui.addFolder('Player');
	player.add(playerSettings, 'walkSpeed', 1, 10, 0.1);
	player.add(playerSettings, 'runSpeed', 2, 20, 0.1);
	player.add(playerSettings, 'acceleration', 1, 40, 0.5);
	player.add(playerSettings, 'airControl', 0, 1, 0.05);
	player.add(playerSettings, 'turnRate', 1, 40, 0.5);
	player.add(playerSettings, 'jumpSpeed', 2, 20, 0.1);
	player.add(playerSettings, 'gravity', 5, 50, 0.5);
	player.add(playerSettings, 'coyoteTime', 0, 0.5, 0.01);
	player.add(playerSettings, 'jumpBuffer', 0, 500, 10);

	const camera = gui.addFolder('Camera');
	camera.add(cameraSettings, 'distance', cameraSettings.minDistance, cameraSettings.maxDistance, 0.1).listen();
	camera.add(cameraSettings, 'sensitivity', 0.001, 0.02, 0.001);
	camera.add(cameraSettings, 'followRate', 1, 30, 0.5);

	// Rapier can describe every collider as line segments; draw them on top of the scene.
	const colliders = new THREE.LineSegments(
		new THREE.BufferGeometry(),
		new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false }),
	);
	colliders.renderOrder = 1;
	colliders.frustumCulled = false;
	colliders.visible = false;
	scene.add(colliders);
	gui.add(colliders, 'visible').name('show colliders');

	return {
		begin: () => stats.begin(),
		end: () => stats.end(),
		update() {
			if (!colliders.visible) return;
			const { vertices, colors } = physics.world.debugRender();
			colliders.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
			colliders.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
		},
		dispose() {
			gui.destroy();
			stats.dom.remove();
			scene.remove(colliders);
			colliders.geometry.dispose();
			colliders.material.dispose();
		},
	};
}
