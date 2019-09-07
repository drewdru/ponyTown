import {
	Directive, HostListener, Input, Output, EventEmitter, TemplateRef, ViewContainerRef, ContentChild,
	Renderer2, ElementRef, EmbeddedViewRef, Component, Injectable
} from '@angular/core';
import { uniqueId } from 'lodash';
import { focusFirstElement } from '../../../client/htmlUtils';

@Injectable({ providedIn: 'root' })
export class DropdownOutletService {
	viewContainer?: ViewContainerRef;
	rootElement?: HTMLElement;
}

@Component({
	selector: 'dropdown-outlet',
	template: `<ng-template></ng-template>`,
})
export class DropdownOutlet {
	constructor(service: DropdownOutletService, viewContainer: ViewContainerRef, element: ElementRef) {
		service.viewContainer = viewContainer;
		service.rootElement = element.nativeElement.parentElement;
	}
}

@Directive({
	selector: '[dropdownMenu]',
})
export class DropdownMenu {
	ref?: EmbeddedViewRef<any>;
	id = uniqueId('dropdown-menu-');
	private onClose?: () => void;
	constructor(
		private templateRef: TemplateRef<any>,
		private viewContainer: ViewContainerRef,
		private renderer: Renderer2,
		private service: DropdownOutletService,
	) {
	}
	private get root(): HTMLElement {
		return this.ref && this.ref.rootNodes[0];
	}
	open(useOutlet: boolean, rootElement: HTMLElement) {
		if (!this.ref) {
			if (useOutlet) {
				this.ref = this.service.viewContainer!.createEmbeddedView(this.templateRef);
			} else {
				this.ref = this.viewContainer.createEmbeddedView(this.templateRef);
			}

			const { renderer, root } = this;

			renderer.addClass(root, 'show');
			renderer.setAttribute(root, 'id', this.id);

			if (useOutlet) {
				const positionMenu = () => {
					const rect = rootElement.getBoundingClientRect();
					const menuRect = root.getBoundingClientRect();
					let transform: string;

					if ((rect.bottom + menuRect.height) > window.innerHeight) {
						transform = `translate3d(${Math.round(rect.left)}px, ${Math.round(rect.top - menuRect.height)}px, 0)`;
						renderer.addClass(root, 'dropdown-menu-up');
					} else {
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
	checkTarget(e: Event) {
		return this.root && this.root.contains(e.target as any);
	}
	focusFirstElement() {
		if (this.root) {
			focusFirstElement(this.root);
		}
	}
}

@Directive({
	selector: '[dropdown]',
	exportAs: 'ag-dropdown',
	host: {
		'[class.show]': 'isOpen',
	},
})
export class Dropdown {
	dropdownToggle?: DropdownToggle;
	@ContentChild(DropdownMenu, { static: false }) menu!: DropdownMenu;
	@Input() autoClose: boolean | 'outsideClick' = true;
	@Input() preventAutoCloseOnOutlet = false;
	@Input() hookToCanvas = false;
	@Input() focusOnOpen = true;
	@Input() focusOnClose = true;
	@Input() useOutlet = false;
	@Input() isOpen = false;
	@Output() isOpenChange = new EventEmitter<boolean>();
	get menuId() {
		return this.isOpen ? this.menu.id : '';
	}
	constructor(private element: ElementRef, private service: DropdownOutletService) {
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
		} else {
			this.open();
		}
	}
	private closeHandler: any = (e: KeyboardEvent) => {
		if (
			!e.keyCode
			&& (this.autoClose || (this.dropdownToggle && this.dropdownToggle.checkTarget(e)))
			&& !(this.preventAutoCloseOnOutlet && this.service.rootElement && this.service.rootElement.contains(e.target as any))
			&& !(this.autoClose === 'outsideClick' && this.menu.checkTarget(e))
		) {
			this.close();
		} else if (this.autoClose && e.keyCode === 27) { // esc
			this.close();
		}
	}
	private canvasCloseHandler: any = () => this.close();
}

@Directive({
	selector: '[dropdownToggle]',
	host: {
		'aria-haspopup': 'true',
		'[attr.aria-expanded]': 'dropdown.isOpen',
		'[attr.aria-controls]': 'dropdown.isOpen ? dropdown.menuId : undefined',
	},
})
export class DropdownToggle {
	constructor(private element: ElementRef, public dropdown: Dropdown) {
		dropdown.dropdownToggle = this;
	}
	@HostListener('click')
	click() {
		this.dropdown.toggle();
	}
	checkTarget(e: Event) {
		return this.element.nativeElement.contains(e.target);
	}
	focus() {
		this.element.nativeElement.focus();
	}
}

export const dropdownDirectives = [Dropdown, DropdownToggle, DropdownMenu, DropdownOutlet];
