"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const utils_1 = require("../../common/utils");
let IntervalUpdateService = class IntervalUpdateService {
    constructor(zone) {
        this.zone = zone;
        this.actions = [];
    }
    subscribe(action) {
        this.actions.push(action);
        if (!this.interval) {
            this.zone.runOutsideAngular(() => {
                this.interval = setInterval(() => {
                    this.actions.forEach(a => a());
                }, 1000 * 10);
            });
        }
        return () => {
            utils_1.removeItem(this.actions, action);
            if (this.actions.length === 0) {
                clearInterval(this.interval);
                this.interval = undefined;
            }
        };
    }
    toggle(action) {
        let unsubscribe;
        return (on) => {
            if (on && !unsubscribe) {
                unsubscribe = this.subscribe(action);
            }
            else if (!on && unsubscribe) {
                unsubscribe();
                unsubscribe = undefined;
            }
        };
    }
};
IntervalUpdateService = tslib_1.__decorate([
    core_1.Injectable({
        providedIn: 'root',
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.NgZone])
], IntervalUpdateService);
exports.IntervalUpdateService = IntervalUpdateService;
//# sourceMappingURL=intervalUpdateService.js.map