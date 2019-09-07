import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { PopoverModule } from 'ngx-bootstrap/popover';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { ModalModule } from 'ngx-bootstrap/modal';

import { SharedModule } from '../shared/shared.module';

import { KeysPipe } from './pipes/keysPipe';
import { OrderByPipe } from './pipes/orderByPipe';
import { TranslitPipe } from './pipes/translitPipe';

import { EventsTable } from './shared/events-table/events-table';
import { AccountInfo } from './shared/account-info/account-info';
import { AccountInfoRemote } from './shared/account-info-remote/account-info-remote';
import { AccountStatus } from './shared/account-status/account-status';
import { AccountTooltip } from './shared/account-tooltip/account-tooltip';
import { OriginInfo } from './shared/origin-info/origin-info';
import { OriginInfoRemote } from './shared/origin-info-remote/origin-info-remote';
import { OriginListRemote } from './shared/origin-list-remote/origin-list-remote';
import { PonyInfo } from './shared/pony-info/pony-info';
import { PonyInfoRemote } from './shared/pony-info-remote/pony-info-remote';
import { PonyListRemote } from './shared/pony-list-remote/pony-list-remote';
import { AuthInfo } from './shared/auth-info/auth-info';
import { AuthInfoRemote } from './shared/auth-info-remote/auth-info-remote';
import { AuthInfoEdit } from './shared/auth-info-edit/auth-info-edit';
import { AuthList } from './shared/auth-list/auth-list';
import { AuthListRemote } from './shared/auth-list-remote/auth-list-remote';
import { OnOffSwitch } from './shared/on-off-switch/on-off-switch';
import { AdminChatLog } from './shared/admin-chat-log/admin-chat-log';
import { BanIcon } from './shared/ban-icon/ban-icon';
import { EmailList } from './shared/email-list/email-list';
import { FromNow } from './shared/from-now';
import { TimeField } from './shared/time-field/time-field';
import { UAInfo } from './shared/ua-info/ua-info';

import { AdminState } from './admin-state/admin-state';
import { AdminEvents } from './admin-events/admin-events';
import { AdminOther } from './admin-other/admin-other';
import { AdminAccounts } from './admin-accounts/admin-accounts';
import { AdminAccountDetails } from './admin-account-details/admin-account-details';
import { AdminPonies } from './admin-ponies/admin-ponies';
import { AdminReports } from './admin-reports/admin-reports';
import { AdminReportsPerf } from './admin-reports/admin-reports-perf/admin-reports-perf';
import { AdminOrigins } from './admin-origins/admin-origins';
import { AdminOriginDetails } from './admin-origin-details/admin-origin-details';
import { AdminSignIn } from './admin-sign-in/admin-sign-in';
import { AdminApp } from './admin';

import { ErrorReporter } from '../services/errorReporter';

export const routes: Routes = [
	{ path: '', component: AdminState },
	{ path: 'sign-in', component: AdminSignIn },
	{ path: 'events', component: AdminEvents },
	{ path: 'accounts', component: AdminAccounts },
	{ path: 'accounts/:id', component: AdminAccountDetails },
	{ path: 'ponies', component: AdminPonies },
	{ path: 'origins', component: AdminOrigins },
	{ path: 'origins/:ip/:country', component: AdminOriginDetails },
	{
		path: 'reports',
		component: AdminReports,
		children: [
			{ path: '', redirectTo: 'perf', pathMatch: 'full' },
			{ path: 'perf', component: AdminReportsPerf },
		],
	},
	{ path: 'other', component: AdminOther },
];

@NgModule({
	imports: [
		BrowserModule,
		RouterModule,
		FormsModule,
		HttpClientModule,
		PopoverModule.forRoot(),
		PaginationModule.forRoot(),
		ButtonsModule.forRoot(),
		ModalModule,
		TooltipModule,
		SharedModule,
		RouterModule.forRoot(routes),
		FontAwesomeModule,
	],
	declarations: [
		KeysPipe,
		OrderByPipe,
		TranslitPipe,
		EventsTable,
		AccountInfo,
		AccountInfoRemote,
		AccountStatus,
		AccountTooltip,
		OriginInfo,
		OriginInfoRemote,
		OriginListRemote,
		PonyInfo,
		PonyInfoRemote,
		PonyListRemote,
		AuthInfo,
		AuthInfoRemote,
		AuthInfoEdit,
		AuthList,
		AuthListRemote,
		OnOffSwitch,
		AdminChatLog,
		BanIcon,
		EmailList,
		FromNow,
		TimeField,
		UAInfo,
		AdminState,
		AdminEvents,
		AdminOther,
		AdminAccounts,
		AdminAccountDetails,
		AdminPonies,
		AdminReports,
		AdminReportsPerf,
		AdminOrigins,
		AdminOriginDetails,
		AdminSignIn,
		AdminApp,
	],
	providers: [
		ErrorReporter,
	],
	bootstrap: [AdminApp],
})
export class AdminAppModule {
}
