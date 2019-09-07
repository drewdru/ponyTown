"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const router_1 = require("@angular/router");
const forms_1 = require("@angular/forms");
const http_1 = require("@angular/common/http");
const platform_browser_1 = require("@angular/platform-browser");
const angular_fontawesome_1 = require("@fortawesome/angular-fontawesome");
const popover_1 = require("ngx-bootstrap/popover");
const buttons_1 = require("ngx-bootstrap/buttons");
const tooltip_1 = require("ngx-bootstrap/tooltip");
const shared_module_1 = require("../shared/shared.module");
const app_1 = require("./app");
const home_1 = require("./home/home");
const help_1 = require("./help/help");
const about_1 = require("./about/about");
const account_1 = require("./account/account");
const character_1 = require("./character/character");
const editor_box_1 = require("./editor-box/editor-box");
const authGuard_1 = require("../services/authGuard");
const rollbarErrorHandler_1 = require("../services/rollbarErrorHandler");
const errorReporter_1 = require("../services/errorReporter");
const rollbarErrorReporter_1 = require("../services/rollbarErrorReporter");
exports.routes = [
    { path: '', component: home_1.Home },
    { path: 'help', component: help_1.Help },
    { path: 'about', component: about_1.About },
    { path: 'account', component: account_1.Account, canActivate: [authGuard_1.AuthGuard] },
    { path: 'character', component: character_1.Character, canActivate: [authGuard_1.AuthGuard] },
    { path: '**', redirectTo: '/', pathMatch: 'full' },
];
let AppModule = class AppModule {
};
AppModule = tslib_1.__decorate([
    core_1.NgModule({
        imports: [
            platform_browser_1.BrowserModule,
            router_1.RouterModule,
            forms_1.FormsModule,
            http_1.HttpClientModule,
            popover_1.PopoverModule.forRoot(),
            buttons_1.ButtonsModule.forRoot(),
            tooltip_1.TooltipModule.forRoot(),
            // TypeaheadModule.forRoot(),
            shared_module_1.SharedModule,
            router_1.RouterModule.forRoot(exports.routes),
            angular_fontawesome_1.FontAwesomeModule,
        ],
        declarations: [
            app_1.App,
            home_1.Home,
            help_1.Help,
            about_1.About,
            account_1.Account,
            character_1.Character,
            editor_box_1.EditorBox,
        ],
        providers: [
            { provide: rollbarErrorHandler_1.RollbarService, useFactory: rollbarErrorHandler_1.rollbarFactory },
            { provide: core_1.ErrorHandler, useClass: rollbarErrorHandler_1.RollbarErrorHandler },
            { provide: errorReporter_1.ErrorReporter, useClass: rollbarErrorReporter_1.RollbarErrorReporter },
        ],
        bootstrap: [app_1.App],
    })
], AppModule);
exports.AppModule = AppModule;
//# sourceMappingURL=app.module.js.map