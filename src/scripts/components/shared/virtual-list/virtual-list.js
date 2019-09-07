"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
let VirtualList = class VirtualList {
    constructor(element) {
        this.element = element;
        this.itemSize = 50;
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], VirtualList.prototype, "itemSize", void 0);
tslib_1.__decorate([
    core_1.ViewChild('padStart', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], VirtualList.prototype, "padStart", void 0);
tslib_1.__decorate([
    core_1.ViewChild('padEnd', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], VirtualList.prototype, "padEnd", void 0);
VirtualList = tslib_1.__decorate([
    core_1.Component({
        selector: 'virtual-list',
        template: '<div #padStart></div><ng-content></ng-content><div #padEnd></div>',
        styleUrls: ['virtual-list.scss'],
        host: {
            'tabindex': '0',
        },
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.ElementRef])
], VirtualList);
exports.VirtualList = VirtualList;
let VirtualFor = class VirtualFor {
    constructor(viewContainer, template, differs, list, changeDetector, zone) {
        this.viewContainer = viewContainer;
        this.template = template;
        this.differs = differs;
        this.list = list;
        this.changeDetector = changeDetector;
        this.forOfDirty = true;
        this.differ = null;
        this.first = 0;
        this.last = 0;
        this.detect = () => this.changeDetector.detectChanges();
        zone.runOutsideAngular(() => {
            list.element.nativeElement.addEventListener('scroll', this.detect);
            window.addEventListener('resize', this.detect);
        });
    }
    set virtualForOf(forOf) {
        this.forOf = forOf;
        this.forOfDirty = true;
    }
    set virtualForTemplate(value) {
        if (value) {
            this.template = value;
        }
    }
    ngOnDestroy() {
        this.list.element.nativeElement.removeEventListener('scroll', this.detect);
        window.removeEventListener('resize', this.detect);
    }
    ngAfterViewInit() {
        setTimeout(this.detect, 0);
    }
    ngDoCheck() {
        if (this.forOfDirty) {
            this.forOfDirty = false;
            const value = this.forOf;
            if (!this.differ && value) {
                try {
                    this.differ = this.differs.find(value).create();
                }
                catch (_a) {
                    throw new Error(`Cannot find a differ`);
                }
            }
        }
        const changes = this.differ && this.differ.diff(this.forOf);
        const element = this.list.element.nativeElement;
        const itemSize = this.list.itemSize;
        const { height } = element.getBoundingClientRect();
        const scroll = element.scrollTop;
        const first = Math.floor(scroll / itemSize);
        const last = first + Math.ceil(height / itemSize);
        let scrollChanged = false;
        if (this.first !== first || this.last !== last) {
            this.first = first;
            this.last = last;
            scrollChanged = true;
        }
        if (changes || scrollChanged) {
            this.applyChanges();
        }
    }
    applyChanges() {
        const viewContainer = this.viewContainer;
        const first = this.first;
        const last = this.last;
        const forOf = this.forOf;
        const actualLast = Math.min(last, forOf.length - 1);
        const insertTuples = [];
        const views = [];
        for (let i = viewContainer.length - 1; i >= 0; i--) {
            const ref = viewContainer.get(i);
            if (ref.context._currentIndex < first || ref.context._currentIndex > actualLast) {
                viewContainer.detach(i);
                views.push(ref);
            }
        }
        for (let index = first, i = 0; index <= actualLast; index++, i++) {
            if (viewContainer.length <= i || viewContainer.get(i).context._currentIndex !== index) {
                let view = views.pop();
                if (view) {
                    view.context.$implicit = null;
                    view.context._currentIndex = index;
                    viewContainer.insert(view, i);
                }
                else {
                    const context = { $implicit: null, index: -1, count: -1, _currentIndex: index };
                    view = viewContainer.createEmbeddedView(this.template, context, i);
                }
                insertTuples.push({ item: forOf[index], view });
            }
        }
        if (DEVELOPMENT && viewContainer.length !== (actualLast - first + 1)) {
            console.error('virtual-list: Invalid length', viewContainer.length, first, actualLast);
        }
        for (const view of views) {
            view.destroy();
        }
        for (let i = 0; i < insertTuples.length; i++) {
            insertTuples[i].view.context.$implicit = insertTuples[i].item;
        }
        const count = forOf.length;
        for (let i = 0, ilen = viewContainer.length; i < ilen; i++) {
            const viewRef = viewContainer.get(i);
            viewRef.context.$implicit = forOf[first + i];
            viewRef.context.index = first + i;
            viewRef.context.count = count;
        }
        const itemSize = this.list.itemSize;
        this.list.padStart.nativeElement.style.height = `${first * itemSize}px`;
        this.list.padEnd.nativeElement.style.height = `${(forOf.length - actualLast - 1) * itemSize}px`;
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Array),
    tslib_1.__metadata("design:paramtypes", [Array])
], VirtualFor.prototype, "virtualForOf", null);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", core_1.TemplateRef),
    tslib_1.__metadata("design:paramtypes", [core_1.TemplateRef])
], VirtualFor.prototype, "virtualForTemplate", null);
VirtualFor = tslib_1.__decorate([
    core_1.Directive({
        selector: '[virtualFor][virtualForOf]',
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.ViewContainerRef,
        core_1.TemplateRef,
        core_1.IterableDiffers,
        VirtualList,
        core_1.ChangeDetectorRef,
        core_1.NgZone])
], VirtualFor);
exports.VirtualFor = VirtualFor;
exports.virtualListDirectives = [VirtualFor];
//# sourceMappingURL=virtual-list.js.map