import { Key, InputController } from './input';
import { InputManager } from './inputManager';
import { clamp } from '../../common/utils';

const MOUSE_BUTTONS = [Key.MOUSE_BUTTON1, Key.MOUSE_BUTTON3, Key.MOUSE_BUTTON2];

export class MouseController implements InputController {
	private initialized = false;
	private element?: HTMLElement;
	constructor(private manager: InputManager) {
	}
	initialize(element: HTMLElement) {
		if (!this.initialized) {
			this.initialized = true;
			this.element = element;
			element.addEventListener('mousemove', this.mousemove);
			element.addEventListener('mousedown', this.mousedown);
			element.addEventListener('mouseup', this.mouseup);
			element.addEventListener('mousewheel', this.mousewheel);
			element.addEventListener('wheel', this.mousewheel);
			element.addEventListener('contextmenu', this.contextmenu);
			element.addEventListener('click', this.click);
			window.addEventListener('blur', this.blur);
		}
	}
	release() {
		this.initialized = false;

		if (this.element) {
			this.element.removeEventListener('mousemove', this.mousemove);
			this.element.removeEventListener('mousedown', this.mousedown);
			this.element.removeEventListener('mouseup', this.mouseup);
			this.element.removeEventListener('mousewheel', this.mousewheel);
			this.element.removeEventListener('wheel', this.mousewheel);
			this.element.removeEventListener('contextmenu', this.contextmenu);
			this.element.removeEventListener('click', this.click);
			this.element = undefined;
		}

		window.removeEventListener('blur', this.blur);
	}
	update() {
	}
	clear() {
	}
	private mousemove = (e: MouseEvent) => {
		if (this.element) {
			const rect = this.element.getBoundingClientRect();
			this.manager.setValue(Key.MOUSE_X, Math.floor(e.clientX - rect.left));
			this.manager.setValue(Key.MOUSE_Y, Math.floor(e.clientY - rect.top));
		}
	}
	private mousedown = (e: MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		this.manager.usingTouch = false;

		const button = MOUSE_BUTTONS[e.button];

		if (button) {
			this.manager.setValue(button, 1);
		}
	}
	private mouseup = (e: MouseEvent) => {
		const button = MOUSE_BUTTONS[e.button];

		if (button) {
			this.manager.setValue(button, 0);
		}
	}
	private mousewheel: any = (e: MouseWheelEvent) => {
		this.manager.addValue(Key.MOUSE_WHEEL_X, clamp(e.deltaX, -1, 1));
		this.manager.addValue(Key.MOUSE_WHEEL_Y, clamp(e.deltaY, -1, 1));
	}
	private contextmenu = (e: Event) => {
		e.preventDefault();
		e.stopPropagation();
	}
	private click = (e: Event) => {
		e.preventDefault();
		e.stopPropagation();
	}
	private blur = () => {
		for (const button of MOUSE_BUTTONS) {
			this.manager.setValue(button, 0);
		}
	}
}
