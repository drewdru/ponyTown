import {
	Directive, DoCheck, Input, ViewContainerRef, TemplateRef, IterableDiffers, IterableDiffer,
	EmbeddedViewRef, Component, ElementRef, ViewChild, NgZone, OnDestroy, ChangeDetectorRef, AfterViewInit
} from '@angular/core';

interface Context<T> {
	$implicit: T;
	index: number;
	count: number;
	_currentIndex: number;
}

@Component({
	selector: 'virtual-list',
	template: '<div #padStart></div><ng-content></ng-content><div #padEnd></div>',
	styleUrls: ['virtual-list.scss'],
	host: {
		'tabindex': '0',
	},
})
export class VirtualList {
	@Input() itemSize = 50;
	@ViewChild('padStart', { static: true }) padStart!: ElementRef;
	@ViewChild('padEnd', { static: true }) padEnd!: ElementRef;
	constructor(public element: ElementRef) {
	}
}

@Directive({
	selector: '[virtualFor][virtualForOf]',
})
export class VirtualFor<T> implements DoCheck, OnDestroy, AfterViewInit {
	@Input()
	set virtualForOf(forOf: T[]) {
		this.forOf = forOf;
		this.forOfDirty = true;
	}
	private forOf!: T[];
	private forOfDirty: boolean = true;
	private differ: IterableDiffer<T> | null = null;
	private first = 0;
	private last = 0;
	constructor(
		private viewContainer: ViewContainerRef,
		private template: TemplateRef<Context<T>>,
		private differs: IterableDiffers,
		private list: VirtualList,
		private changeDetector: ChangeDetectorRef,
		zone: NgZone,
	) {
		zone.runOutsideAngular(() => {
			list.element.nativeElement.addEventListener('scroll', this.detect);
			window.addEventListener('resize', this.detect);
		});
	}
	private detect = () => this.changeDetector.detectChanges();
	@Input()
	set virtualForTemplate(value: TemplateRef<Context<T>>) {
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
	ngDoCheck(): void {
		if (this.forOfDirty) {
			this.forOfDirty = false;
			const value = this.forOf;

			if (!this.differ && value) {
				try {
					this.differ = this.differs.find(value).create();
				} catch {
					throw new Error(`Cannot find a differ`);
				}
			}
		}

		const changes = this.differ && this.differ.diff(this.forOf);
		const element = this.list.element.nativeElement as HTMLElement;
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
	private applyChanges() {
		const viewContainer = this.viewContainer;
		const first = this.first;
		const last = this.last;
		const forOf = this.forOf;
		const actualLast = Math.min(last, forOf.length - 1);

		type Ref = EmbeddedViewRef<Context<T>>;
		const insertTuples: { item: T; view: Ref; }[] = [];
		const views: Ref[] = [];

		for (let i = viewContainer.length - 1; i >= 0; i--) {
			const ref = viewContainer.get(i) as Ref;

			if (ref.context._currentIndex < first || ref.context._currentIndex > actualLast) {
				viewContainer.detach(i);
				views.push(ref);
			}
		}

		for (let index = first, i = 0; index <= actualLast; index++ , i++) {
			if (viewContainer.length <= i || (viewContainer.get(i) as Ref).context._currentIndex !== index) {
				let view = views.pop();

				if (view) {
					view.context.$implicit = null!;
					view.context._currentIndex = index;
					viewContainer.insert(view, i);
				} else {
					const context: Context<T> = { $implicit: null!, index: -1, count: -1, _currentIndex: index };
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
			const viewRef = viewContainer.get(i) as Ref;
			viewRef.context.$implicit = forOf[first + i];
			viewRef.context.index = first + i;
			viewRef.context.count = count;
		}

		const itemSize = this.list.itemSize;
		this.list.padStart.nativeElement.style.height = `${first * itemSize}px`;
		this.list.padEnd.nativeElement.style.height = `${(forOf.length - actualLast - 1) * itemSize}px`;
	}
}

export const virtualListDirectives = [VirtualFor];
