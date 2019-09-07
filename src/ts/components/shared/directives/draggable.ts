import { Component, Directive, Input, Output, EventEmitter, ElementRef, OnInit, Injectable, OnDestroy } from '@angular/core';
import { noop } from 'lodash';
import { AgDragEvent, handleDrag } from './agDrag';
import { clamp, setTransform, removeItem, pointInRect } from '../../../common/utils';
import { rect } from '../../../common/rect';

@Injectable({ providedIn: 'root' })
export class DraggableService {
	root?: ElementRef;
	draggedItem?: any;
	activeDropZone?: DraggableDrop<any>;
	dropZones: DraggableDrop<any>[] = [];
	get rootElement(): HTMLElement {
		return this.root ? this.root.nativeElement : document.body;
	}
	setActiveDropZone(dropZone: DraggableDrop<any> | undefined) {
		if (this.activeDropZone !== dropZone) {
			if (this.activeDropZone) {
				this.activeDropZone.setActive(false);
			}

			this.activeDropZone = dropZone;

			if (this.activeDropZone) {
				this.activeDropZone.setActive(true);
			}
		}
	}
	startMove(element: HTMLElement, item: any) {
		this.setActiveDropZone(undefined);
		this.rootElement.appendChild(element);
		this.draggedItem = item;
		this.initRects();
	}
	endMove() {
		if (this.activeDropZone) {
			this.activeDropZone.drop.emit(this.draggedItem);
			this.setActiveDropZone(undefined);
		}

		this.draggedItem = undefined;
	}
	addDropZone(dropZone: DraggableDrop<any>) {
		this.dropZones.push(dropZone);

		if (this.draggedItem) {
			this.initRects();
		}
	}
	removeDropZone(dropZone: DraggableDrop<any>) {
		removeItem(this.dropZones, dropZone);

		if (this.draggedItem) {
			this.initRects();
		}

		if (this.activeDropZone === dropZone) {
			this.setActiveDropZone(undefined);
		}
	}
	updateHover(x: number, y: number) {
		if (this.draggedItem) {
			for (const zone of this.dropZones) {
				if (pointInRect(x, y, zone.rect)) {
					this.setActiveDropZone(zone);
					return;
				}
			}

			this.setActiveDropZone(undefined);
		}
	}
	private initRects() {
		this.dropZones.forEach(i => i.initRect());
	}
}

@Component({
	selector: 'draggable-outlet',
	template: `<div></div>`,
	styles: [`:host { position: fixed; top: 0; left: 0; z-index: 10000; }`],
})
export class DraggableOutlet {
	constructor(element: ElementRef, service: DraggableService) {
		service.root = element;
	}
}

@Directive({ selector: '[draggableDrop]' })
export class DraggableDrop<T> implements OnInit, OnDestroy {
	@Input('draggablePad') pad = 0;
	@Output('draggableDrop') drop = new EventEmitter<T>();
	rect = rect(0, 0, 0, 0);
	constructor(private element: ElementRef, private service: DraggableService) {
	}
	ngOnInit() {
		this.service.addDropZone(this);
	}
	ngOnDestroy() {
		this.service.removeDropZone(this);
	}
	setActive(active: boolean) {
		const element = this.element.nativeElement as HTMLElement;

		if (active) {
			element.classList.add('draggable-hover');
		} else {
			element.classList.remove('draggable-hover');
		}
	}
	initRect() {
		const element = this.element.nativeElement as HTMLElement;
		const clientBounds = element.getBoundingClientRect();
		this.rect.x = clientBounds.left - this.pad;
		this.rect.y = clientBounds.top - this.pad;
		this.rect.w = clientBounds.width + 2 * this.pad;
		this.rect.h = clientBounds.height + 2 * this.pad;
	}
}

@Directive({
	selector: '[draggableItem]',
	host: {
		'[style.touch-action]': `touchAction`,
	}
})
export class DraggableItem<T> implements OnInit, OnDestroy {
	@Input('draggableItem') item: T | undefined;
	@Output('draggableDrag') dragStarted = new EventEmitter<void>();
	private startX = 0;
	private startY = 0;
	private draggable?: HTMLElement;
	private width = 0;
	private height = 0;
	private unsubscribeDrag = noop;
	private _disabled = false;
	constructor(private element: ElementRef, private service: DraggableService) {
	}
	ngOnInit() {
		this.setupDragEvents();
	}
	ngOnDestroy() {
		this.unsubscribeDrag();
	}
	get touchAction() {
		return this.disabled ? 'inherit' : 'none';
	}
	@Input('draggableDisabled') get disabled() {
		return this._disabled;
	}
	set disabled(value) {
		if (this._disabled !== value) {
			this._disabled = value;
			this.setupDragEvents();
		}
	}
	private setupDragEvents() {
		this.unsubscribeDrag();
		this.unsubscribeDrag = noop;

		if (!this.disabled) {
			this.unsubscribeDrag = handleDrag(this.element.nativeElement, e => this.drag(e), { prevent: true });
		}
	}
	drag(e: AgDragEvent) {
		if (this.item && !this.disabled && !this.draggable && (Math.abs(e.dx) > 5 || Math.abs(e.dy) > 5)) {
			const element = this.element.nativeElement as HTMLElement;
			const rect = element.getBoundingClientRect();
			this.startX = rect.left;
			this.startY = rect.top;
			this.draggable = element.cloneNode(true) as HTMLElement;
			this.draggable.style.position = 'absolute';
			this.draggable.style.width = `${rect.width}px`;
			this.draggable.style.height = `${rect.height}px`;
			this.draggable.style.margin = '0';
			this.draggable.classList.add('draggable-dragging');
			this.width = rect.width;
			this.height = rect.height;

			const src = element.querySelectorAll('canvas') as NodeListOf<HTMLCanvasElement>;
			const dst = this.draggable.querySelectorAll('canvas') as NodeListOf<HTMLCanvasElement>;

			for (let i = 0; i < src.length; i++) {
				const context = dst.item(i).getContext('2d');
				context && context.drawImage(src.item(i), 0, 0);
			}

			this.service.startMove(this.draggable, this.item!);
			this.dragStarted.emit();
		}

		if (this.draggable) {
			if (e.type === 'end') {
				this.draggable!.parentNode!.removeChild(this.draggable!);
				this.draggable = undefined;
				this.service.endMove();
			} else {
				const x = clamp(this.startX + e.dx, 0, window.innerWidth - this.width);
				const y = clamp(this.startY + e.dy, 0, window.innerHeight - this.height);
				setTransform(this.draggable, `translate3d(${x}px, ${y}px, 0px)`);
				this.service.updateHover(e.x, e.y);
			}
		}
	}
}

export const draggableComponents = [DraggableOutlet, DraggableItem, DraggableDrop];
