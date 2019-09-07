import { Directive, Input, TemplateRef, ViewContainerRef, OnDestroy, EmbeddedViewRef, AfterViewInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { hasFeatureFlag, featureFlagsChanged } from '../../../client/clientUtils';
import { Model } from '../../services/model';

@Directive({
	selector: '[hasFeature]',
})
export class HasFeature implements AfterViewInit, OnDestroy {
	private subscriptions: Subscription[] = [];
	private showing = false;
	private _flag: string | undefined = undefined;
	private _orMod = false;
	private _alsoIf = true;
	private ref?: EmbeddedViewRef<any>;
	constructor(private templateRef: TemplateRef<any>, private viewContainer: ViewContainerRef, private model: Model) {
	}
	ngAfterViewInit() {
		this.subscriptions.push(featureFlagsChanged.subscribe(() => this.update()));
		this.subscriptions.push(this.model.accountChanged.subscribe(() => this.update()));
	}
	ngOnDestroy() {
		this.subscriptions.forEach(s => s.unsubscribe());
	}
	@Input()
	set hasFeature(value: string | undefined) {
		if (this._flag !== value) {
			this._flag = value;
			this.update();
		}
	}
	@Input()
	set hasFeatureOrMod(value: boolean) {
		if (this._orMod !== value) {
			this._orMod = value;
			this.update();
		}
	}
	@Input()
	set hasFeatureAlso(value: boolean) {
		if (this._alsoIf !== value) {
			this._alsoIf = value;
			this.update();
		}
	}
	private update() {
		const show = this._alsoIf && (hasFeatureFlag(this._flag as any) || (this._orMod && this.model.isMod));

		if (this.showing !== show) {
			this.showing = show;

			if (show) {
				this.ref = this.ref || this.viewContainer.createEmbeddedView(this.templateRef);
			} else {
				this.viewContainer.clear();
				this.ref = undefined;
			}
		}
	}
}
