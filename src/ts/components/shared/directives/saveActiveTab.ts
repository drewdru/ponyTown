import { Directive, Input, Host, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Tabset } from '../tabset/tabset';
import { StorageService } from '../../services/storageService';

@Directive({
	selector: '[saveActiveTab]',
})
export class SaveActiveTab implements OnInit, OnDestroy {
	@Input('saveActiveTab') key!: string;
	private subscription?: Subscription;
	constructor(@Host() private tabset: Tabset, private storage: StorageService) {
	}
	ngOnInit() {
		// this.tabset.activeIndex = parseInt(this.storage.getItem(this.key) || '0', 10);
		this.tabset.select(parseInt(this.storage.getItem(this.key) || '0', 10));
		this.subscription = this.tabset.activeIndexChange.subscribe((i: number) => {
			this.storage.setItem(this.key, i.toString());
		});
	}
	ngOnDestroy() {
		if (this.subscription) {
			this.subscription.unsubscribe();
		}
	}
}
