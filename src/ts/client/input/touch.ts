import { Key, InputController } from './input';
import { Point } from '../../common/interfaces';
import { setTransform } from '../../common/utils';
import { InputManager } from './inputManager';

function getTouch(e: TouchEvent, id: number) {
	if (id !== -1) {
		for (let i = 0; i < e.changedTouches.length; ++i) {
			const touch = e.changedTouches.item(i);

			if (touch && touch.identifier === id) {
				return touch;
			}
		}
	}

	return undefined;
}

const TOUCH_DEADZONE = 15;
const TOUCH_MAX = 100;

export class TouchController implements InputController {
	private initialized = false;
	private touchId = -1;
	private touch2Id = -1;
	private touchStart: Point = { x: 0, y: 0 };
	private touchCurrent: Point = { x: 0, y: 0 };
	private touchIsDrag = false;
	private tapInvalidated = false;
	private origin?: HTMLElement;
	private position?: HTMLElement;
	private originShown = false;
	private originTransform?: string;
	private positionShown = false;
	private positionTransform?: string;
	private element?: HTMLElement;
	constructor(private manager: InputManager) {
	}
	initialize(element: HTMLElement) {
		if (!this.initialized) {
			this.initialized = true;
			this.element = element;
			this.origin = document.getElementById('touch-origin')!;
			this.position = document.getElementById('touch-position')!;

			element.addEventListener('touchstart', this.touchstart);
			element.addEventListener('touchmove', this.touchmove);
			element.addEventListener('touchend', this.touchend);
			window.addEventListener('touchend', this.blur);
			window.addEventListener('blur', this.blur);
		}
	}
	release() {
		this.initialized = false;

		if (this.element) {
			this.element.removeEventListener('touchstart', this.touchstart);
			this.element.removeEventListener('touchmove', this.touchmove);
			this.element.removeEventListener('touchend', this.touchend);
			this.element = undefined;
		}

		window.removeEventListener('touchend', this.blur);
		window.removeEventListener('blur', this.blur);
	}
	update() {
		const showOrigin = this.touchIsDrag && this.touchId !== -1;
		const showPosition = this.touchId !== -1;

		if (this.origin && this.position) {
			if (this.originShown !== showOrigin) {
				this.originShown = showOrigin;
				this.origin.style.display = showOrigin ? 'block' : 'none';
			}

			if (this.positionShown !== showPosition) {
				this.positionShown = showPosition;
				this.position.style.display = showPosition ? 'block' : 'none';
			}

			if (showOrigin) {
				const transform = `translate3d(${this.touchStart.x - 50}px, ${this.touchStart.y - 50}px, 0px)`;

				if (this.originTransform !== transform) {
					this.originTransform = transform;
					setTransform(this.origin, transform);
				}
			}

			if (showPosition) {
				const transform = `translate3d(${this.touchCurrent.x - 25}px, ${this.touchCurrent.y - 25}px, 0px)`;

				if (this.positionTransform !== transform) {
					this.positionTransform = transform;
					setTransform(this.position, transform);
				}
			}
		}
	}
	clear() {
	}
	private reset() {
		this.touch2Id = -1;
		this.resetTouch();
	}
	private resetTouch() {
		this.touchId = -1;
		this.touchStart = this.touchCurrent = { x: 0, y: 0 };
		this.touchIsDrag = false;
		this.manager.setValue(Key.TOUCH, 0);
		this.updateInput();
	}
	private updateInput() {
		const dy = this.touchStart.y - this.touchCurrent.y;
		const dx = this.touchStart.x - this.touchCurrent.x;
		const theta = Math.atan2(dy, dx);
		const dist = Math.sqrt(dy * dy + dx * dx);

		if (dist > TOUCH_DEADZONE) {
			const scaledDist = Math.min((dist - TOUCH_DEADZONE) / (TOUCH_MAX - TOUCH_DEADZONE), 1);
			this.touchIsDrag = true;
			this.manager.setValue(Key.GAMEPAD_AXIS1_X, -Math.cos(theta) * scaledDist);
			this.manager.setValue(Key.GAMEPAD_AXIS1_Y, -Math.sin(theta) * scaledDist);
		} else {
			this.manager.setValue(Key.GAMEPAD_AXIS1_X, 0);
			this.manager.setValue(Key.GAMEPAD_AXIS1_Y, 0);
		}
	}
	private touchstart = (e: any) => {
		e.cancellable && e.preventDefault();
		e.stopPropagation();

		this.manager.usingTouch = true;

		if (this.touchId === -1) {
			const touch = e.changedTouches.item(0);

			if (touch) {
				this.tapInvalidated = false;
				this.touchId = touch.identifier;
				this.touchStart = this.touchCurrent = this.getTouchXY(touch);
				this.manager.setValue(Key.MOUSE_X, this.touchStart.x);
				this.manager.setValue(Key.MOUSE_Y, this.touchStart.y);
				this.manager.setValue(Key.TOUCH, 1);
			}
		} else if (this.touch2Id === -1) {
			const touch = e.changedTouches.item(0);

			if (touch) {
				this.tapInvalidated = true;
				this.touch2Id = touch.identifier;
			}
		}
	}
	private touchmove = (e: any) => {
		e.preventDefault();
		e.stopPropagation();

		const touch = getTouch(e, this.touchId);

		if (touch) {
			this.touchCurrent = this.getTouchXY(touch);
			this.manager.setValue(Key.MOUSE_X, this.touchCurrent.x);
			this.manager.setValue(Key.MOUSE_Y, this.touchCurrent.y);
			this.updateInput();
		}
	}
	private touchend = (e: any) => {
		e.preventDefault();
		e.stopPropagation();

		const touch = getTouch(e, this.touchId);

		if (touch) {
			if (!this.touchIsDrag && !this.tapInvalidated) {
				this.manager.setValue(Key.MOUSE_X, this.touchStart.x);
				this.manager.setValue(Key.MOUSE_Y, this.touchStart.y);
				this.manager.setValue(Key.TOUCH_CLICK, 1);
			}

			this.resetTouch();
		}

		const touch2 = getTouch(e, this.touch2Id);

		if (touch2) {
			this.manager.setValue(Key.TOUCH_SECOND_CLICK, 1);
			this.touch2Id = -1;
		}
	}
	private blur = () => {
		this.reset();
	}
	private getTouchXY(touch: Touch) {
		const { left, top } = this.element!.getBoundingClientRect();

		return {
			x: touch.clientX - left,
			y: touch.clientY - top,
		};
	}
}
