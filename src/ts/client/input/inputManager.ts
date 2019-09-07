import { clamp } from 'lodash';
import { KeyboardController } from './keyboard';
import { MouseController } from './mouse';
import { TouchController } from './touch';
import { GamePadController } from './gamepad';
import { InputController, Key } from './input';
import { array, times } from '../../common/utils';

type Handler = (input: Key, value: number) => boolean | void;

const KEYS = Key.MAX_VALUE;

export class InputManager {
	disabledGamepad = false;
	disabledKeyboard = false;
	disableArrows = false;
	usingTouch = false;
	private state: number[];
	private prevState: number[];
	private actions: Handler[][];
	private controllers: InputController[] = [];
	constructor() {
		this.state = array(KEYS, 0);
		this.prevState = array(KEYS, 0);
		this.actions = times(KEYS, () => []);
	}
	get axisX() {
		const axisX = this.getRange(Key.GAMEPAD_AXIS1_X);
		const left = this.disableArrows ? this.getState(Key.KEY_A) : this.getState(Key.LEFT, Key.KEY_A);
		const right = this.disableArrows ? this.getState(Key.KEY_D) : this.getState(Key.RIGHT, Key.KEY_D);
		const x = axisX + (left ? -1 : (right ? 1 : 0));
		return clamp(x, -1, 1);
	}
	get axisY() {
		const axisY = this.getRange(Key.GAMEPAD_AXIS1_Y);
		const up = this.disableArrows ? this.getState(Key.KEY_W) : this.getState(Key.UP, Key.KEY_W);
		const down = this.disableArrows ? this.getState(Key.KEY_S) : this.getState(Key.DOWN, Key.KEY_S);
		const y = axisY + (up ? -1 : (down ? 1 : 0));
		return clamp(y, -1, 1);
	}
	get isMovementFromButtons() {
		const up = this.getState(Key.UP, Key.KEY_W);
		const down = this.getState(Key.DOWN, Key.KEY_S);
		const left = this.getState(Key.LEFT, Key.KEY_A);
		const right = this.getState(Key.RIGHT, Key.KEY_D);
		return up || down || left || right;
	}
	get axis2X() {
		return clamp(this.getRange(Key.GAMEPAD_AXIS2_X), -1, 1);
	}
	get axis2Y() {
		return clamp(this.getRange(Key.GAMEPAD_AXIS2_Y), -1, 1);
	}
	get pointerX() {
		return this.getRange(Key.MOUSE_X);
	}
	get pointerY() {
		return this.getRange(Key.MOUSE_Y);
	}
	get wheelX() {
		return this.getRange(Key.MOUSE_WHEEL_X);
	}
	get wheelY() {
		return this.getRange(Key.MOUSE_WHEEL_Y);
	}
	initialize(element: HTMLElement) {
		this.controllers = [
			new KeyboardController(this),
			new MouseController(this),
			new TouchController(this),
			new GamePadController(this),
		];

		this.controllers.forEach(c => c.initialize(element));
		this.clear();
	}
	release() {
		this.controllers.forEach(c => c.release());
		this.controllers = [];
		this.clear();
	}
	update() {
		for (const controller of this.controllers) {
			controller.update();
		}
	}
	end() {
		for (let i = 0; i < KEYS; i++) {
			this.prevState[i] = this.state[i];
		}

		this.setValue(Key.TOUCH_CLICK, 0);
		this.setValue(Key.TOUCH_SECOND_CLICK, 0);
		this.setValue(Key.MOUSE_WHEEL_X, 0);
		this.setValue(Key.MOUSE_WHEEL_Y, 0);
	}
	clear() {
		for (let i = 0; i < KEYS; i++) {
			this.state[i] = 0;
			this.prevState[i] = 0;
		}

		for (const controller of this.controllers) {
			controller.clear();
		}
	}
	onPressed(inputs: Key[] | Key, handler: () => void) {
		this.onAction(inputs, (_, v) => {
			if (v === 1) {
				handler();
			}
		});
	}
	onReleased(inputs: Key[] | Key, handler: () => void) {
		this.onAction(inputs, (_, v) => {
			if (v === 0) {
				handler();
			}
		});
	}
	isPressed(key: Key) {
		return this.state[key] !== 0;
	}
	wasPressed(key: Key): boolean {
		return this.state[key] === 1 && this.prevState[key] === 0;
	}
	private onAction(inputs: Key[] | Key, handler: Handler) {
		const inputsArray = Array.isArray(inputs) ? inputs : [inputs];

		for (const i of inputsArray) {
			this.actions[i].push(handler);
		}
	}
	private getState(...inputs: Key[]): boolean {
		for (const i of inputs) {
			if (this.state[i] !== 0) {
				return true;
			}
		}

		return false;
	}
	private getRange(input: Key): number {
		return this.state[input];
	}
	setValue(input: Key, value: number): boolean {
		if (input < 0 || input >= KEYS) {
			console.warn(`Input out of range: ${input}`);
		} else if (this.state[input] !== value) {
			this.state[input] = value;

			if (this.actions[input] && this.actions[input].length) {
				for (const action of this.actions[input]) {
					action(input, value);
				}

				return true;
			}
		}

		return false;
	}
	addValue(input: Key, value: number) {
		if (input < 0 || input >= KEYS) {
			console.warn(`Input out of range: ${input}`);
		} else {
			this.state[input] += value;
		}
	}
}
