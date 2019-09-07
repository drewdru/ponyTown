"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const lodash_1 = require("lodash");
const agDrag_1 = require("./agDrag");
const utils_1 = require("../../../common/utils");
const rect_1 = require("../../../common/rect");
let DraggableService = class DraggableService {
    constructor() {
        this.dropZones = [];
    }
    get rootElement() {
        return this.root ? this.root.nativeElement : document.body;
    }
    setActiveDropZone(dropZone) {
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
    startMove(element, item) {
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
    addDropZone(dropZone) {
        this.dropZones.push(dropZone);
        if (this.draggedItem) {
            this.initRects();
        }
    }
    removeDropZone(dropZone) {
        utils_1.removeItem(this.dropZones, dropZone);
        if (this.draggedItem) {
            this.initRects();
        }
        if (this.activeDropZone === dropZone) {
            this.setActiveDropZone(undefined);
        }
    }
    updateHover(x, y) {
        if (this.draggedItem) {
            for (const zone of this.dropZones) {
                if (utils_1.pointInRect(x, y, zone.rect)) {
                    this.setActiveDropZone(zone);
                    return;
                }
            }
            this.setActiveDropZone(undefined);
        }
    }
    initRects() {
        this.dropZones.forEach(i => i.initRect());
    }
};
DraggableService = tslib_1.__decorate([
    core_1.Injectable({ providedIn: 'root' })
], DraggableService);
exports.DraggableService = DraggableService;
let DraggableOutlet = class DraggableOutlet {
    constructor(element, service) {
        service.root = element;
    }
};
DraggableOutlet = tslib_1.__decorate([
    core_1.Component({
        selector: 'draggable-outlet',
        template: `<div></div>`,
        styles: [`:host { position: fixed; top: 0; left: 0; z-index: 10000; }`],
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.ElementRef, DraggableService])
], DraggableOutlet);
exports.DraggableOutlet = DraggableOutlet;
let DraggableDrop = class DraggableDrop {
    constructor(element, service) {
        this.element = element;
        this.service = service;
        this.pad = 0;
        this.drop = new core_1.EventEmitter();
        this.rect = rect_1.rect(0, 0, 0, 0);
    }
    ngOnInit() {
        this.service.addDropZone(this);
    }
    ngOnDestroy() {
        this.service.removeDropZone(this);
    }
    setActive(active) {
        const element = this.element.nativeElement;
        if (active) {
            element.classList.add('draggable-hover');
        }
        else {
            element.classList.remove('draggable-hover');
        }
    }
    initRect() {
        const element = this.element.nativeElement;
        const clientBounds = element.getBoundingClientRect();
        this.rect.x = clientBounds.left - this.pad;
        this.rect.y = clientBounds.top - this.pad;
        this.rect.w = clientBounds.width + 2 * this.pad;
        this.rect.h = clientBounds.height + 2 * this.pad;
    }
};
tslib_1.__decorate([
    core_1.Input('draggablePad'),
    tslib_1.__metadata("design:type", Object)
], DraggableDrop.prototype, "pad", void 0);
tslib_1.__decorate([
    core_1.Output('draggableDrop'),
    tslib_1.__metadata("design:type", Object)
], DraggableDrop.prototype, "drop", void 0);
DraggableDrop = tslib_1.__decorate([
    core_1.Directive({ selector: '[draggableDrop]' }),
    tslib_1.__metadata("design:paramtypes", [core_1.ElementRef, DraggableService])
], DraggableDrop);
exports.DraggableDrop = DraggableDrop;
let DraggableItem = class DraggableItem {
    constructor(element, service) {
        this.element = element;
        this.service = service;
        this.dragStarted = new core_1.EventEmitter();
        this.startX = 0;
        this.startY = 0;
        this.width = 0;
        this.height = 0;
        this.unsubscribeDrag = lodash_1.noop;
        this._disabled = false;
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
    get disabled() {
        return this._disabled;
    }
    set disabled(value) {
        if (this._disabled !== value) {
            this._disabled = value;
            this.setupDragEvents();
        }
    }
    setupDragEvents() {
        this.unsubscribeDrag();
        this.unsubscribeDrag = lodash_1.noop;
        if (!this.disabled) {
            this.unsubscribeDrag = agDrag_1.handleDrag(this.element.nativeElement, e => this.drag(e), { prevent: true });
        }
    }
    drag(e) {
        if (this.item && !this.disabled && !this.draggable && (Math.abs(e.dx) > 5 || Math.abs(e.dy) > 5)) {
            const element = this.element.nativeElement;
            const rect = element.getBoundingClientRect();
            this.startX = rect.left;
            this.startY = rect.top;
            this.draggable = element.cloneNode(true);
            this.draggable.style.position = 'absolute';
            this.draggable.style.width = `${rect.width}px`;
            this.draggable.style.height = `${rect.height}px`;
            this.draggable.style.margin = '0';
            this.draggable.classList.add('draggable-dragging');
            this.width = rect.width;
            this.height = rect.height;
            const src = element.querySelectorAll('canvas');
            const dst = this.draggable.querySelectorAll('canvas');
            for (let i = 0; i < src.length; i++) {
                const context = dst.item(i).getContext('2d');
                context && context.drawImage(src.item(i), 0, 0);
            }
            this.service.startMove(this.draggable, this.item);
            this.dragStarted.emit();
        }
        if (this.draggable) {
            if (e.type === 'end') {
                this.draggable.parentNode.removeChild(this.draggable);
                this.draggable = undefined;
                this.service.endMove();
            }
            else {
                const x = utils_1.clamp(this.startX + e.dx, 0, window.innerWidth - this.width);
                const y = utils_1.clamp(this.startY + e.dy, 0, window.innerHeight - this.height);
                utils_1.setTransform(this.draggable, `translate3d(${x}px, ${y}px, 0px)`);
                this.service.updateHover(e.x, e.y);
            }
        }
    }
};
tslib_1.__decorate([
    core_1.Input('draggableItem'),
    tslib_1.__metadata("design:type", Object)
], DraggableItem.prototype, "item", void 0);
tslib_1.__decorate([
    core_1.Output('draggableDrag'),
    tslib_1.__metadata("design:type", Object)
], DraggableItem.prototype, "dragStarted", void 0);
tslib_1.__decorate([
    core_1.Input('draggableDisabled'),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], DraggableItem.prototype, "disabled", null);
DraggableItem = tslib_1.__decorate([
    core_1.Directive({
        selector: '[draggableItem]',
        host: {
            '[style.touch-action]': `touchAction`,
        }
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.ElementRef, DraggableService])
], DraggableItem);
exports.DraggableItem = DraggableItem;
exports.draggableComponents = [DraggableOutlet, DraggableItem, DraggableDrop];
//# sourceMappingURL=draggable.js.map