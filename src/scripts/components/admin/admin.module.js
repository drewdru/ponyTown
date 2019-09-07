"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const router_1 = require("@angular/router");
const forms_1 = require("@angular/forms");
const platform_browser_1 = require("@angular/platform-browser");
const http_1 = require("@angular/common/http");
const angular_fontawesome_1 = require("@fortawesome/angular-fontawesome");
const tooltip_1 = require("ngx-bootstrap/tooltip");
const popover_1 = require("ngx-bootstrap/popover");
const pagination_1 = require("ngx-bootstrap/pagination");
const buttons_1 = require("ngx-bootstrap/buttons");
const modal_1 = require("ngx-bootstrap/modal");
const shared_module_1 = require("../shared/shared.module");
const keysPipe_1 = require("./pipes/keysPipe");
const orderByPipe_1 = require("./pipes/orderByPipe");
const translitPipe_1 = require("./pipes/translitPipe");
const events_table_1 = require("./shared/events-table/events-table");
const account_info_1 = require("./shared/account-info/account-info");
const account_info_remote_1 = require("./shared/account-info-remote/account-info-remote");
const account_status_1 = require("./shared/account-status/account-status");
const account_tooltip_1 = require("./shared/account-tooltip/account-tooltip");
const origin_info_1 = require("./shared/origin-info/origin-info");
const origin_info_remote_1 = require("./shared/origin-info-remote/origin-info-remote");
const origin_list_remote_1 = require("./shared/origin-list-remote/origin-list-remote");
const pony_info_1 = require("./shared/pony-info/pony-info");
const pony_info_remote_1 = require("./shared/pony-info-remote/pony-info-remote");
const pony_list_remote_1 = require("./shared/pony-list-remote/pony-list-remote");
const auth_info_1 = require("./shared/auth-info/auth-info");
const auth_info_remote_1 = require("./shared/auth-info-remote/auth-info-remote");
const auth_info_edit_1 = require("./shared/auth-info-edit/auth-info-edit");
const auth_list_1 = require("./shared/auth-list/auth-list");
const auth_list_remote_1 = require("./shared/auth-list-remote/auth-list-remote");
const on_off_switch_1 = require("./shared/on-off-switch/on-off-switch");
const admin_chat_log_1 = require("./shared/admin-chat-log/admin-chat-log");
const ban_icon_1 = require("./shared/ban-icon/ban-icon");
const email_list_1 = require("./shared/email-list/email-list");
const from_now_1 = require("./shared/from-now");
const time_field_1 = require("./shared/time-field/time-field");
const ua_info_1 = require("./shared/ua-info/ua-info");
const admin_state_1 = require("./admin-state/admin-state");
const admin_events_1 = require("./admin-events/admin-events");
const admin_other_1 = require("./admin-other/admin-other");
const admin_accounts_1 = require("./admin-accounts/admin-accounts");
const admin_account_details_1 = require("./admin-account-details/admin-account-details");
const admin_ponies_1 = require("./admin-ponies/admin-ponies");
const admin_reports_1 = require("./admin-reports/admin-reports");
const admin_reports_perf_1 = require("./admin-reports/admin-reports-perf/admin-reports-perf");
const admin_origins_1 = require("./admin-origins/admin-origins");
const admin_origin_details_1 = require("./admin-origin-details/admin-origin-details");
const admin_sign_in_1 = require("./admin-sign-in/admin-sign-in");
const admin_1 = require("./admin");
const errorReporter_1 = require("../services/errorReporter");
exports.routes = [
    { path: '', component: admin_state_1.AdminState },
    { path: 'sign-in', component: admin_sign_in_1.AdminSignIn },
    { path: 'events', component: admin_events_1.AdminEvents },
    { path: 'accounts', component: admin_accounts_1.AdminAccounts },
    { path: 'accounts/:id', component: admin_account_details_1.AdminAccountDetails },
    { path: 'ponies', component: admin_ponies_1.AdminPonies },
    { path: 'origins', component: admin_origins_1.AdminOrigins },
    { path: 'origins/:ip/:country', component: admin_origin_details_1.AdminOriginDetails },
    {
        path: 'reports',
        component: admin_reports_1.AdminReports,
        children: [
            { path: '', redirectTo: 'perf', pathMatch: 'full' },
            { path: 'perf', component: admin_reports_perf_1.AdminReportsPerf },
        ],
    },
    { path: 'other', component: admin_other_1.AdminOther },
];
let AdminAppModule = class AdminAppModule {
};
AdminAppModule = tslib_1.__decorate([
    core_1.NgModule({
        imports: [
            platform_browser_1.BrowserModule,
            router_1.RouterModule,
            forms_1.FormsModule,
            http_1.HttpClientModule,
            popover_1.PopoverModule.forRoot(),
            pagination_1.PaginationModule.forRoot(),
            buttons_1.ButtonsModule.forRoot(),
            modal_1.ModalModule,
            tooltip_1.TooltipModule,
            shared_module_1.SharedModule,
            router_1.RouterModule.forRoot(exports.routes),
            angular_fontawesome_1.FontAwesomeModule,
        ],
        declarations: [
            keysPipe_1.KeysPipe,
            orderByPipe_1.OrderByPipe,
            translitPipe_1.TranslitPipe,
            events_table_1.EventsTable,
            account_info_1.AccountInfo,
            account_info_remote_1.AccountInfoRemote,
            account_status_1.AccountStatus,
            account_tooltip_1.AccountTooltip,
            origin_info_1.OriginInfo,
            origin_info_remote_1.OriginInfoRemote,
            origin_list_remote_1.OriginListRemote,
            pony_info_1.PonyInfo,
            pony_info_remote_1.PonyInfoRemote,
            pony_list_remote_1.PonyListRemote,
            auth_info_1.AuthInfo,
            auth_info_remote_1.AuthInfoRemote,
            auth_info_edit_1.AuthInfoEdit,
            auth_list_1.AuthList,
            auth_list_remote_1.AuthListRemote,
            on_off_switch_1.OnOffSwitch,
            admin_chat_log_1.AdminChatLog,
            ban_icon_1.BanIcon,
            email_list_1.EmailList,
            from_now_1.FromNow,
            time_field_1.TimeField,
            ua_info_1.UAInfo,
            admin_state_1.AdminState,
            admin_events_1.AdminEvents,
            admin_other_1.AdminOther,
            admin_accounts_1.AdminAccounts,
            admin_account_details_1.AdminAccountDetails,
            admin_ponies_1.AdminPonies,
            admin_reports_1.AdminReports,
            admin_reports_perf_1.AdminReportsPerf,
            admin_origins_1.AdminOrigins,
            admin_origin_details_1.AdminOriginDetails,
            admin_sign_in_1.AdminSignIn,
            admin_1.AdminApp,
        ],
        providers: [
            errorReporter_1.ErrorReporter,
        ],
        bootstrap: [admin_1.AdminApp],
    })
], AdminAppModule);
exports.AdminAppModule = AdminAppModule;
//# sourceMappingURL=admin.module.js.map