import Stats from 'three/addons/libs/stats.module.js';
import GUI from 'three/addons/libs/lil-gui.module.min.js';
import { cameraSettings } from './camera/followCamera';
import { playerSettings } from './player/player';

/** FPS meter and live tweak panel. Loaded only in dev or with `?debug`. */
export function createDebug() {
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
	player.add(playerSettings, 'turnRate', 1, 40, 0.5);

	const camera = gui.addFolder('Camera');
	camera.add(cameraSettings, 'distance', cameraSettings.minDistance, cameraSettings.maxDistance, 0.1).listen();
	camera.add(cameraSettings, 'sensitivity', 0.001, 0.02, 0.001);
	camera.add(cameraSettings, 'followRate', 1, 30, 0.5);

	return {
		begin: () => stats.begin(),
		end: () => stats.end(),
		dispose() {
			gui.destroy();
			stats.dom.remove();
		},
	};
}
