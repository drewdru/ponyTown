import { NgModule, ErrorHandler } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PopoverModule } from 'ngx-bootstrap/popover';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { TooltipModule } from 'ngx-bootstrap/tooltip';

import { SharedModule } from '../shared/shared.module';

import { App } from './app';
import { Home } from './home/home';
import { Help } from './help/help';
import { About } from './about/about';
import { Account } from './account/account';
import { Character } from './character/character';
import { EditorBox } from './editor-box/editor-box';

import { AuthGuard } from '../services/authGuard';
import { RollbarService, rollbarFactory, RollbarErrorHandler } from '../services/rollbarErrorHandler';
import { ErrorReporter } from '../services/errorReporter';
import { RollbarErrorReporter } from '../services/rollbarErrorReporter';

export const routes: Routes = [
	{ path: '', component: Home },
	{ path: 'help', component: Help },
	{ path: 'about', component: About },
	{ path: 'account', component: Account, canActivate: [AuthGuard] },
	{ path: 'character', component: Character, canActivate: [AuthGuard] },
	{ path: '**', redirectTo: '/', pathMatch: 'full' },
];

@NgModule({
	imports: [
		BrowserModule,
		RouterModule,
		FormsModule,
		HttpClientModule,
		PopoverModule.forRoot(),
		ButtonsModule.forRoot(),
		TooltipModule.forRoot(),
		// TypeaheadModule.forRoot(),
		SharedModule,
		RouterModule.forRoot(routes),
		FontAwesomeModule,
	],
	declarations: [
		App,
		Home,
		Help,
		About,
		Account,
		Character,
		EditorBox,
	],
	providers: [
		{ provide: RollbarService, useFactory: rollbarFactory },
		{ provide: ErrorHandler, useClass: RollbarErrorHandler },
		{ provide: ErrorReporter, useClass: RollbarErrorReporter },
	],
	bootstrap: [App],
})
export class AppModule {
}
