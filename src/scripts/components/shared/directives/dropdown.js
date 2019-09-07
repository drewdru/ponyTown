"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const lodash_1 = require("lodash");
const htmlUtils_1 = require("../../../client/htmlUtils");
let DropdownOutletService = class DropdownOutletService {
};
DropdownOutletService = tslib_1.__decorate([
    core_1.Injectable({ providedIn: 'root' })
], DropdownOutletService);
exports.DropdownOutletService = DropdownOutletService;
let DropdownOutlet = class DropdownOutlet {
    constructor(service, viewContainer, element) {
        service.viewContainer = viewContainer;
        service.rootElement = element.nativeElement.parentElement;
    }
};
DropdownOutlet = tslib_1.__decorate([
    core_1.Component({
        selector: 'dropdown-outlet',
        template: `<ng-template></ng-template>`,
    }),
    tslib_1.__metadata("design:paramtypes", [DropdownOutletService, core_1.ViewContainerRef, core_1.ElementRef])
], DropdownOutlet);
exports.DropdownOutlet = DropdownOutlet;
let DropdownMenu = class DropdownMenu {
    constructor(templateRef, viewContainer, renderer, service) {
        this.templateRef = templateRef;
        this.viewContainer = viewContainer;
        this.renderer = renderer;
        this.service = service;
        this.id = lodash_1.uniqueId('dropdown-menu-');
    }
    get root() {
        return this.ref && this.ref.rootNodes[0];
    }
    open(useOutlet, rootElement) {
        if (!this.ref) {
            if (useOutlet) {
                this.ref = this.service.viewContainer.createEmbeddedView(this.templateRef);
            }
            else {
                this.ref = this.viewContainer.createEmbeddedView(this.templateRef);
            }
            const { renderer, root } = this;
            renderer.addClass(root, 'show');
            renderer.setAttribute(root, 'id', this.id);
            if (useOutlet) {
                const positionMenu = () => {
                    const rect = rootElement.getBoundingClientRect();
                    const menuRect = root.getBoundingClientRect();
                    let transform;
                    if ((rect.bottom + menuRect.height) > window.innerHeight) {
                        transform = `translate3d(${Math.round(rect.left)}px, ${Math.round(rect.top - menuRect.height)}px, 0)`;
                        renderer.addClass(root, 'dropdown-menu-up');
                    }
                    else {
                        transform = `translate3d(${Math.round(rect.left)}px, ${Math.round(rect.bottom)}px, 0)`;
                        renderer.removeClass(root, 'dropdown-menu-up');
                    }
                    renderer.setStyle(root, 'transform', transform);
                };
                renderer.addClass(root, 'dropdown-in-outlet');
                positionMenu();
                const closeDropdown = () => {
                    this.close();
                };
                document.addEventListener('scroll', closeDropdown, true);
                window.addEventListener('resize', closeDropdown, true);
                this.onClose = () => {
                    document.removeEventListener('scroll', closeDropdown, true);
                    window.removeEventListener('resize', closeDropdown, true);
                };
            }
        }
    }
    close() {
        if (this.ref) {
            this.ref.destroy();
            this.ref = undefined;
        }
        if (this.onClose) {
            this.onClose();
            this.onClose = undefined;
        }
    }
    checkTarget(e) {
        return this.root && this.root.contains(e.target);
    }
    focusFirstElement() {
        if (this.root) {
            htmlUtils_1.focusFirstElement(this.root);
        }
    }
};
DropdownMenu = tslib_1.__decorate([
    core_1.Directive({
        selector: '[dropdownMenu]',
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.TemplateRef,
        core_1.ViewContainerRef,
        core_1.Renderer2,
        DropdownOutletService])
], DropdownMenu);
exports.DropdownMenu = DropdownMenu;
let Dropdown = class Dropdown {
    constructor(element, service) {
        this.element = element;
        this.service = service;
        this.autoClose = true;
        this.preventAutoCloseOnOutlet = false;
        this.hookToCanvas = false;
        this.focusOnOpen = true;
        this.focusOnClose = true;
        this.useOutlet = false;
        this.isOpen = false;
        this.isOpenChange = new core_1.EventEmitter();
        this.closeHandler = (e) => {
            if (!e.keyCode
                && (this.autoClose || (this.dropdownToggle && this.dropdownToggle.checkTarget(e)))
                && !(this.preventAutoCloseOnOutlet && this.service.rootElement && this.service.rootElement.contains(e.target))
                && !(this.autoClose === 'outsideClick' && this.menu.checkTarget(e))) {
                this.close();
            }
            else if (this.autoClose && e.keyCode === 27) { // esc
                this.close();
            }
        };
        this.canvasCloseHandler = () => this.close();
    }
    get menuId() {
        return this.isOpen ? this.menu.id : '';
    }
    open() {
        if (!this.isOpen) {
            this.isOpen = true;
            this.isOpenChange.emit(true);
            this.menu.open(this.useOutlet, this.element.nativeElement);
            setTimeout(() => {
                document.addEventListener('click', this.closeHandler);
                document.addEventListener('keydown', this.closeHandler);
                if (this.focusOnOpen) {
                    this.menu.focusFirstElement();
                }
                if (this.hookToCanvas) {
                    const canvas = document.getElementById('canvas');
                    if (canvas) {
                        canvas.addEventListener('touchstart', this.canvasCloseHandler);
                        canvas.addEventListener('mousedown', this.canvasCloseHandler);
                    }
                }
            });
        }
    }
    close() {
        if (this.isOpen) {
            this.isOpen = false;
            this.isOpenChange.emit(false);
            this.menu.close();
            if (this.focusOnClose && this.dropdownToggle) {
                this.dropdownToggle.focus();
            }
            document.removeEventListener('click', this.closeHandler);
            document.removeEventListener('keydown', this.closeHandler);
            if (this.hookToCanvas) {
                const canvas = document.getElementById('canvas');
                if (canvas) {
                    canvas.removeEventListener('touchstart', this.canvasCloseHandler);
                    canvas.removeEventListener('mousedown', this.canvasCloseHandler);
                }
            }
        }
    }
    toggle() {
        if (this.isOpen) {
            this.close();
        }
        else {
            this.open();
        }
    }
};
tslib_1.__decorate([
    core_1.ContentChild(DropdownMenu, { static: false }),
    tslib_1.__metadata("design:type", DropdownMenu)
], Dropdown.prototype, "menu", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], Dropdown.prototype, "autoClose", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], Dropdown.prototype, "preventAutoCloseOnOutlet", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], Dropdown.prototype, "hookToCanvas", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], Dropdown.prototype, "focusOnOpen", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], Dropdown.prototype, "focusOnClose", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], Dropdown.prototype, "useOutlet", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], Dropdown.prototype, "isOpen", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], Dropdown.prototype, "isOpenChange", void 0);
Dropdown = tslib_1.__decorate([
    core_1.Directive({
        selector: '[dropdown]',
        exportAs: 'ag-dropdown',
        host: {
            '[class.show]': 'isOpen',
        },
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.ElementRef, DropdownOutletService])
], Dropdown);
exports.Dropdown = Dropdown;
let DropdownToggle = class DropdownToggle {
    constructor(element, dropdown) {
        this.element = element;
        this.dropdown = dropdown;
        dropdown.dropdownToggle = this;
    }
    click() {
        this.dropdown.toggle();
    }
    checkTarget(e) {
        return this.element.nativeElement.contains(e.target);
    }
    focus() {
        this.element.nativeElement.focus();
    }
};
tslib_1.__decorate([
    core_1.HostListener('click'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], DropdownToggle.prototype, "click", null);
DropdownToggle = tslib_1.__decorate([
    core_1.Directive({
        selector: '[dropdownToggle]',
        host: {
            'aria-haspopup': 'true',
            '[attr.aria-expanded]': 'dropdown.isOpen',
            '[attr.aria-controls]': 'dropdown.isOpen ? dropdown.menuId : undefined',
        },
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.ElementRef, Dropdown])
], DropdownToggle);
exports.DropdownToggle = DropdownToggle;
exports.dropdownDirectives = [Dropdown, DropdownToggle, DropdownMenu, DropdownOutlet];
//# sourceMappingURL=dropdown.js.map