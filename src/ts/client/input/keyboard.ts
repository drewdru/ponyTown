import { InputController, Key } from './input';
import { InputManager } from './inputManager';
import { removeItem, includes } from '../../common/utils';

const firefox = !SERVER && /firefox/i.test(navigator.userAgent);

function isKeyEventInvalid(e: KeyboardEvent) {
	return e.target && /^(input|textarea|select)$/i.test((e.target as HTMLElement).tagName);
}

function allowKey(key: number) {
	return key === Key.ESCAPE || key === Key.F5 || key === Key.F12 || key === Key.F11 || key === Key.TAB;
}

function fixKeyCode(key: number) {
	if (firefox) {
		if (key === 173) return Key.DASH;
		if (key === 61) return Key.EQUALS;
	}

	return key;
}

const iosKeyToKeyCode: { [key: string]: number | undefined; } = {
	UIKeyInputEscape: Key.ESCAPE,
	UIKeyInputUpArrow: Key.UP,
	UIKeyInputLeftArrow: Key.LEFT,
	UIKeyInputRightArrow: Key.RIGHT,
	UIKeyInputDownArrow: Key.DOWN,
};

const iosHandledKeyCodes = [Key.ESCAPE, Key.UP, Key.LEFT, Key.RIGHT, Key.DOWN];

export class KeyboardController implements InputController {
	private initialized = false;
	private stack: number[] = [];
	constructor(private manager: InputManager) {
	}
	initialize() {
		if (!this.initialized) {
			this.initialized = true;
			window.addEventListener('keydown', this.keydown);
			window.addEventListener('keyup', this.keyup);
			window.addEventListener('blur', this.blur);
		}
	}
	release() {
		this.initialized = false;
		window.removeEventListener('keydown', this.keydown);
		window.removeEventListener('keyup', this.keyup);
		window.removeEventListener('blur', this.blur);
		this.clear();
	}
	update() {
	}
	clear() {
		this.stack.length = 0;
	}
	private keydown = (e: KeyboardEvent) => {
		if (!this.manager.disabledKeyboard && !isKeyEventInvalid(e)) {
			const code = fixKeyCode(e.keyCode);
			this.manager.setValue(code, 1);

			if (!allowKey(code)) {
				e.preventDefault();
				e.stopPropagation();
			}

			if (!includes(this.stack, code) && !includes(iosHandledKeyCodes, code)) {
				this.stack.push(code);
			}
		}
	}
	private keyup = (e: KeyboardEvent) => {
		let code = fixKeyCode(e.keyCode);

		// fix keyCode on iOS bluetooth keyboard
		if (code === 0) {
			code = iosKeyToKeyCode[e.key] || 0;

			if (code === 0) {
				code = this.stack.pop() || 0;
			}
		}

		if (this.manager.setValue(code, 0)) {
			e.preventDefault();
			e.stopPropagation();
		}

		removeItem(this.stack, code);
	}
	private blur = () => {
		this.manager.clear();
	}
}
