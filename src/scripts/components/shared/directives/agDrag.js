"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const lodash_1 = require("lodash");
const utils_1 = require("../../../common/utils");
function handleDrag(element, emit, options = {}) {
    // typeof PointerEvent !== 'undefined'
    const eventSets = window.navigator.pointerEnabled ? [
        { down: 'pointerdown', move: 'pointermove', up: 'pointerup' },
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
    let lastEvent;
    function setupScrollAndRect() {
        // TODO: fix issue with scroll
        switch (options.relative) {
            case 'self':
                rect = element.getBoundingClientRect();
                scrollLeft = -(window.scrollX || window.pageXOffset || 0);
                scrollTop = -(window.scrollY || window.pageYOffset || 0);
                break;
            case 'parent':
                rect = element.parentElement.getBoundingClientRect();
                scrollLeft = element.parentElement.scrollLeft;
                scrollTop = element.parentElement.scrollTop;
                break;
            default:
                rect = emptyRect;
                scrollLeft = 0;
                scrollTop = 0;
        }
    }
    function send(event, type) {
        const x = utils_1.getX(event);
        const y = utils_1.getY(event);
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
        function move(e) {
            lastEvent = e;
            e.preventDefault();
            send(e, 'drag');
        }
        function up(e) {
            if (utils_1.getButton(e) === button) {
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
        function handler(e) {
            if (!dragging) {
                setupScrollAndRect();
                dragging = true;
                button = utils_1.getButton(e);
                startX = utils_1.getX(e);
                startY = utils_1.getY(e);
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
exports.handleDrag = handleDrag;
let AgDrag = class AgDrag {
    constructor(element) {
        this.element = element;
        this.relative = undefined;
        this.prevent = false;
        this.drag = new core_1.EventEmitter();
        this.unsubscribe = lodash_1.noop;
    }
    ngOnInit() {
        this.unsubscribe = handleDrag(this.element.nativeElement, e => this.drag.emit(e), this);
    }
    ngOnDestroy() {
        this.unsubscribe();
    }
};
tslib_1.__decorate([
    core_1.Input('agDragRelative'),
    tslib_1.__metadata("design:type", Object)
], AgDrag.prototype, "relative", void 0);
tslib_1.__decorate([
    core_1.Input('agDragPrevent'),
    tslib_1.__metadata("design:type", Object)
], AgDrag.prototype, "prevent", void 0);
tslib_1.__decorate([
    core_1.Output('agDrag'),
    tslib_1.__metadata("design:type", Object)
], AgDrag.prototype, "drag", void 0);
AgDrag = tslib_1.__decorate([
    core_1.Directive({ selector: '[agDrag]' }),
    tslib_1.__metadata("design:paramtypes", [core_1.ElementRef])
], AgDrag);
exports.AgDrag = AgDrag;
//# sourceMappingURL=agDrag.js.map