import { GAMEPAD_MAPPINGS, GamepadAxes, GamepadButtons, GamepadMapping } from '../../generated/gamepad-mappings';
import { Key, InputController } from './input';
import { InputManager } from './inputManager';
import { isFocused } from '../clientUtils';

interface GamepadInstance {
	gamepad: Gamepad;
	mapping: GamepadMapping;
}

const JOYSTICK_THRESHHOLD = 0.2;

function createGamepad(gamepad: Gamepad): GamepadInstance {
	const mapping = detectMapping(gamepad.id, navigator.userAgent);
	return { gamepad, mapping };
}

function isCompatible(mapping: any, id: string, browser: string) {
	for (let i = 0; i < mapping.supported.length; i++) {
		const supported = mapping.supported[i];

		if (id.indexOf(supported.id) !== -1 && browser.indexOf(supported.os) !== -1 && browser.indexOf(browser) !== -1) {
			return true;
		}
	}

	return false;
}

function detectMapping(id: string, browser: string) {
	for (let i = 0; i < GAMEPAD_MAPPINGS.length; i++) {
		if (isCompatible(GAMEPAD_MAPPINGS[i], id, browser)) {
			return GAMEPAD_MAPPINGS[i];
		}
	}

	return GAMEPAD_MAPPINGS[0];
}

function axis({ mapping, gamepad }: GamepadInstance, name: GamepadAxes) {
	const axe = mapping.axes[name] as any;
	return axe ? gamepad.axes[axe.index] : 0;
}
function button({ mapping, gamepad }: GamepadInstance, name: GamepadButtons) {
	const button = mapping.buttons[name] as any;

	if (!button) {
		return false;
	}

	if (button.index !== undefined) {
		return gamepad.buttons[button.index] && gamepad.buttons[button.index].pressed;
	}

	if (button.axis !== undefined) {
		if (button.direction < 0) {
			return gamepad.axes[button.axis] < -0.75;
		} else {
			return gamepad.axes[button.axis] > 0.75;
		}
	}

	return false;
}

export class GamePadController implements InputController {
	private initialized = false;
	private gamepadIndex = -1;
	private zeroed1 = false;
	private zeroed2 = false;
	constructor(private manager: InputManager) {
	}
	initialize() {
		if (!this.initialized) {
			this.initialized = true;
			window.addEventListener('gamepadconnected', this.gamepadconnected);
			window.addEventListener('gamepaddisconnected', this.gamepaddisconnected);
			this.scanGamepads();
		}
	}
	release() {
		this.initialized = false;
		window.removeEventListener('gamepadconnected', this.gamepadconnected);
		window.removeEventListener('gamepaddisconnected', this.gamepaddisconnected);
	}
	update() {
		if (this.manager.disabledGamepad || !isFocused() || this.gamepadIndex === -1)
			return;

		const gamepads = navigator.getGamepads();
		const gamepad = gamepads[this.gamepadIndex];

		if (!gamepad) {
			this.scanGamepads();
			return;
		}

		const pad = createGamepad(gamepad);

		this.zeroed1 = readAxis(
			this.manager, Key.GAMEPAD_AXIS1_X, Key.GAMEPAD_AXIS1_Y,
			axis(pad, GamepadAxes.LeftStickX), axis(pad, GamepadAxes.LeftStickY), this.zeroed1);
		this.zeroed2 = readAxis(
			this.manager, Key.GAMEPAD_AXIS2_X, Key.GAMEPAD_AXIS2_Y,
			axis(pad, GamepadAxes.RightStickX), axis(pad, GamepadAxes.RightStickY), this.zeroed2);

		this.manager.setValue(Key.GAMEPAD_BUTTON_X, button(pad, GamepadButtons.X) ? 1 : 0);
		this.manager.setValue(Key.GAMEPAD_BUTTON_Y, button(pad, GamepadButtons.Y) ? 1 : 0);
		this.manager.setValue(Key.GAMEPAD_BUTTON_A, button(pad, GamepadButtons.A) ? 1 : 0);
		this.manager.setValue(Key.GAMEPAD_BUTTON_B, button(pad, GamepadButtons.B) ? 1 : 0);

		this.manager.setValue(Key.GAMEPAD_BUTTON_DOWN, button(pad, GamepadButtons.DpadDown) ? 1 : 0);
		this.manager.setValue(Key.GAMEPAD_BUTTON_LEFT, button(pad, GamepadButtons.DpadLeft) ? 1 : 0);
		this.manager.setValue(Key.GAMEPAD_BUTTON_RIGHT, button(pad, GamepadButtons.DpadRight) ? 1 : 0);
		this.manager.setValue(Key.GAMEPAD_BUTTON_UP, button(pad, GamepadButtons.DpadUp) ? 1 : 0);
	}
	clear() {
	}
	private scanGamepads() {
		const gamepads = navigator.getGamepads();

		// Using regular loop because of issues with iterating over gamepads
		for (let i = 0; i < gamepads.length; i++) {
			const gamepad = gamepads[i];

			if (gamepad) {
				this.gamepadIndex = gamepad.index;
				return;
			}
		}

		this.gamepadIndex = -1;
	}
	private gamepadconnected = (e: Event) => {
		this.gamepadIndex = (e as GamepadEvent).gamepad.index;
	}
	private gamepaddisconnected = (e: Event) => {
		if (this.gamepadIndex === (e as GamepadEvent).gamepad.index) {
			this.scanGamepads();
		}
	}
}

function readAxis(manager: InputManager, keyX: Key, keyY: Key, axisX: number, axisY: number, zeroed: boolean): boolean {
	const dist = Math.sqrt(axisX * axisX + axisY * axisY);

	if (dist > JOYSTICK_THRESHHOLD) {
		const scaledDist = Math.min((dist - JOYSTICK_THRESHHOLD) / (1 - JOYSTICK_THRESHHOLD), 1);
		const theta = Math.atan2(axisY, axisX);
		manager.setValue(keyX, Math.cos(theta) * scaledDist);
		manager.setValue(keyY, Math.sin(theta) * scaledDist);
		return false;
	} else if (!zeroed) {
		manager.setValue(keyX, 0);
		manager.setValue(keyY, 0);
		return true;
	}

	return zeroed;
}
