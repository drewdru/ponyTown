import { Injectable, NgZone } from '@angular/core';

export interface FrameLoop {
	init(): void;
	destroy(): void;
}

@Injectable({
	providedIn: 'root',
})
export class FrameService {
	constructor(private zone: NgZone) {
	}
	create(frame: (delta: number) => void) {
		const zone = this.zone;
		let ref = 0;
		let last = 0;

		function tick(now: number) {
			ref = requestAnimationFrame(tick);
			frame((now - last) / 1000);
			last = now;
		}

		return {
			init() {
				if (!ref) {
					last = performance.now();
					zone.runOutsideAngular(() => ref = requestAnimationFrame(tick));
				}
			},
			destroy() {
				cancelAnimationFrame(ref);
				ref = 0;
			}
		};
	}
}
