export interface Game {
	fps: number;
	load(): any;
	init(): void;
	update(delta: number, now: number, last: number): void;
	draw(): void;
}

export interface GameLoop {
	started: Promise<void>;
	cancel(): void;
}

let gameLoop: GameLoop | undefined = undefined;

export function startGameLoop(game: Game, onError = (e: Error) => console.error(e)): GameLoop {
	let handle: any;
	let backup: any;
	let cancelled = false;

	let last = Math.round(performance.now());
	let lastFps = last;
	let frames = 0;
	let fps = 0;

	function step(now: number, draw: boolean) {
		if (draw) {
			handle = requestAnimationFrame(onFrame);
		}

		frames++;

		if ((now - lastFps) > 1000) {
			fps = frames * 1000 / (now - lastFps);
			frames = 0;
			lastFps = now;
		}

		try {
			game.fps = fps;
			game.update((now - last) / 1000, now, last);

			if (draw) {
				game.draw();
			}
		} catch (e) {
			onError(e);
		}

		last = now;
	}

	function onTimer() {
		step(Math.round(performance.now()), false);
		backup = setTimeout(onTimer, 1000 / 10);
	}

	function onFrame() {
		clearTimeout(backup);
		step(Math.round(performance.now()), true);
		backup = setTimeout(onTimer, 1000 / 10);
	}

	function cancel() {
		cancelAnimationFrame(handle);
		clearTimeout(backup);
		cancelled = true;
	}

	if (gameLoop) {
		gameLoop.cancel();
	}

	const started = Promise.resolve()
		.then(() => game.load())
		.then(() => {
			if (cancelled) {
				throw new Error('Cancelled (loop)');
			} else {
				game.init();
				handle = requestAnimationFrame(onFrame);
				backup = setTimeout(onTimer, 1000 / 10);
			}
		});

	gameLoop = { started, cancel };

	return gameLoop;
}
