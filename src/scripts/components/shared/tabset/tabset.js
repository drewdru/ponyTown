"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const lodash_1 = require("lodash");
let TabTitle = class TabTitle {
    constructor(templateRef) {
        this.templateRef = templateRef;
    }
};
TabTitle = tslib_1.__decorate([
    core_1.Directive({
        selector: '[tabTitle]'
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.TemplateRef])
], TabTitle);
exports.TabTitle = TabTitle;
let TabContent = class TabContent {
    constructor(templateRef) {
        this.templateRef = templateRef;
    }
};
TabContent = tslib_1.__decorate([
    core_1.Directive({
        selector: '[tabContent]',
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.TemplateRef])
], TabContent);
exports.TabContent = TabContent;
let Tab = class Tab {
    constructor() {
        this.id = lodash_1.uniqueId(`tabset-tab`);
        this.disabled = false;
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], Tab.prototype, "id", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], Tab.prototype, "title", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], Tab.prototype, "icon", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], Tab.prototype, "disabled", void 0);
tslib_1.__decorate([
    core_1.ContentChild(TabContent, { static: false }),
    tslib_1.__metadata("design:type", TabContent)
], Tab.prototype, "contentTpl", void 0);
tslib_1.__decorate([
    core_1.ContentChild(TabTitle, { static: false }),
    tslib_1.__metadata("design:type", TabTitle)
], Tab.prototype, "titleTpl", void 0);
Tab = tslib_1.__decorate([
    core_1.Directive({
        selector: 'tab',
    })
], Tab);
exports.Tab = Tab;
let Tabset = class Tabset {
    constructor() {
        this.label = '';
        this.destroyOnHide = true;
        this.orientation = 'horizontal';
        this.type = 'tabs';
        this.activeIndex = 0;
        this.activeIndexChange = new core_1.EventEmitter();
        this.justify = 'start';
    }
    set justify(className) {
        if (className === 'fill' || className === 'justified') {
            this.justifyClass = `nav-${className}`;
        }
        else {
            this.justifyClass = `justify-content-${className}`;
        }
    }
    get navClass() {
        return `nav-${this.type}${this.orientation === 'horizontal' ? ` ${this.justifyClass}` : ' flex-column'}`;
    }
    select(index) {
        if (this.activeIndex !== index) {
            this.activeIndex = index;
            this.activeIndexChange.emit(index);
        }
    }
    keydown(e) {
        const index = this.handleKey(e.keyCode);
        if (index !== undefined) {
            e.preventDefault();
            const element = document.getElementById(this.tabs.toArray()[index].id);
            element && element.focus();
            this.select(index);
        }
    }
    handleKey(keyCode) {
        if (keyCode === 37 /* LEFT */) {
            return this.activeIndex === 0 ? this.tabs.length - 1 : this.activeIndex - 1;
        }
        else if (keyCode === 39 /* RIGHT */) {
            return this.activeIndex === this.tabs.length - 1 ? 0 : this.activeIndex + 1;
        }
        else if (keyCode === 36 /* HOME */) {
            return 0;
        }
        else if (keyCode === 35 /* END */) {
            return this.tabs.length - 1;
        }
        else {
            return undefined;
        }
    }
};
tslib_1.__decorate([
    core_1.ContentChildren(Tab),
    tslib_1.__metadata("design:type", core_1.QueryList)
], Tabset.prototype, "tabs", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], Tabset.prototype, "label", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], Tabset.prototype, "destroyOnHide", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String),
    tslib_1.__metadata("design:paramtypes", [String])
], Tabset.prototype, "justify", null);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], Tabset.prototype, "orientation", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], Tabset.prototype, "type", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], Tabset.prototype, "activeIndex", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], Tabset.prototype, "activeIndexChange", void 0);
Tabset = tslib_1.__decorate([
    core_1.Component({
        selector: 'tabset',
        templateUrl: 'tabset.pug',
    }),
    tslib_1.__metadata("design:paramtypes", [])
], Tabset);
exports.Tabset = Tabset;
exports.tabsetComponents = [TabContent, TabTitle, Tabset, Tab];
//# sourceMappingURL=tabset.js.map