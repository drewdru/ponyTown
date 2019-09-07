import { Directive, OnInit, Input, Output, EventEmitter, ElementRef, OnDestroy } from '@angular/core';
import { noop } from 'lodash';
import { getButton, getX, getY, AnyEvent } from '../../../common/utils';

export interface AgDragEvent {
	event: AnyEvent;
	type: 'start' | 'drag' | 'end';
	x: number;
	y: number;
	dx: number;
	dy: number;
}

export interface AgDragOptions {
	relative?: 'self' | 'parent';
	prevent?: boolean;
}

export function handleDrag(element: HTMLElement, emit: (event: AgDragEvent) => void, options: AgDragOptions = {}) {
	// typeof PointerEvent !== 'undefined'
	const eventSets = window.navigator.pointerEnabled ? [
		{ down: 'pointerdown', move: 'pointermove', up: 'pointerup' }, // , up2: 'pointercancel' },
	] : [
			{ down: 'mousedown', move: 'mousemove', up: 'mouseup' },
			{ down: 'touchstart', move: 'touchmove', up: 'touchend', up2: 'touchcancel' },
		];
	const emptyRect = { left: 0, top: 0 };
	let rect = emptyRect;
	let scrollLeft = 0;
	let scrollTop = 0;
	let startX = 0;
	let startY = 0;
	let button = 0;
	let dragging = false;
	let lastEvent: any;

	function setupScrollAndRect() {
		// TODO: fix issue with scroll
		switch (options.relative) {
			case 'self':
				rect = element.getBoundingClientRect();
				scrollLeft = -(window.scrollX || window.pageXOffset || 0);
				scrollTop = -(window.scrollY || window.pageYOffset || 0);
				break;
			case 'parent':
				rect = element.parentElement!.getBoundingClientRect();
				scrollLeft = element.parentElement!.scrollLeft;
				scrollTop = element.parentElement!.scrollTop;
				break;
			default:
				rect = emptyRect;
				scrollLeft = 0;
				scrollTop = 0;
		}
	}

	function send(event: AnyEvent, type: 'start' | 'drag' | 'end') {
		const x = getX(event);
		const y = getY(event);

		emit({
			event,
			type,
			x: x - rect.left + scrollLeft,
			y: y - rect.top + scrollTop,
			dx: x - startX,
			dy: y - startY,
		});
	}

	const handlers = eventSets.map(events => {
		function move(e: any) {
			lastEvent = e;
			e.preventDefault();
			send(e, 'drag');
		}

		function up(e: any) {
			if (getButton(e) === button) {
				// touchend event does not have x, y coordinates, use last touchmove event instead
				if (e.type !== 'touchend' && e.type !== 'touchcancel') {
					lastEvent = e;
				}
				end();
			}
		}

		function end() {
			send(lastEvent, 'end');
			window.removeEventListener(events.move, move);
			window.removeEventListener(events.up, up);
			events.up2 && window.removeEventListener(events.up2, up);
			window.removeEventListener('blur', end);
			dragging = false;
		}

		function handler(e: any) {
			if (!dragging) {
				setupScrollAndRect();
				dragging = true;
				button = getButton(e);
				startX = getX(e);
				startY = getY(e);
				send(e, 'start');
				lastEvent = e;

				window.addEventListener(events.move, move);
				window.addEventListener(events.up, up);
				events.up2 && window.addEventListener(events.up2, up);
				window.addEventListener('blur', end);
				e.stopPropagation();

				if (options.prevent) {
					e.preventDefault();
				}
			}
		}

		element.addEventListener(events.down, handler);
		return () => element.removeEventListener(events.down, handler);
	});

	return () => handlers.forEach(f => f());
}

@Directive({ selector: '[agDrag]' })
export class AgDrag implements OnInit, OnDestroy {
	@Input('agDragRelative') relative: 'self' | 'parent' | undefined = undefined;
	@Input('agDragPrevent') prevent = false;
	@Output('agDrag') drag = new EventEmitter<AgDragEvent>();
	private unsubscribe = noop;
	constructor(private element: ElementRef) {
	}
	ngOnInit() {
		this.unsubscribe = handleDrag(this.element.nativeElement, e => this.drag.emit(e), this);
	}
	ngOnDestroy() {
		this.unsubscribe();
	}
}
