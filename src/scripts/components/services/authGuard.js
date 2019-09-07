"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const router_1 = require("@angular/router");
const model_1 = require("./model");
let AuthGuard = class AuthGuard {
    constructor(router, model) {
        this.router = router;
        this.model = model;
    }
    canActivate() {
        return this.model.accountPromise
            .then(account => {
            if (account) {
                return true;
            }
            else {
                this.router.navigate(['/']);
                return false;
            }
        });
    }
};
AuthGuard = tslib_1.__decorate([
    core_1.Injectable({
        providedIn: 'root',
    }),
    tslib_1.__metadata("design:paramtypes", [router_1.Router, model_1.Model])
], AuthGuard);
exports.AuthGuard = AuthGuard;
//# sourceMappingURL=authGuard.js.map