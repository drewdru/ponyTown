import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { Model } from './model';

@Injectable({
	providedIn: 'root',
})
export class AuthGuard implements CanActivate {
	constructor(private router: Router, private model: Model) {
	}
	canActivate() {
		return this.model.accountPromise
			.then(account => {
				if (account) {
					return true;
				} else {
					this.router.navigate(['/']);
					return false;
				}
			}) as any;
	}
}
