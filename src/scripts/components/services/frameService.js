"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
let FrameService = class FrameService {
    constructor(zone) {
        this.zone = zone;
    }
    create(frame) {
        const zone = this.zone;
        let ref = 0;
        let last = 0;
        function tick(now) {
            ref = requestAnimationFrame(tick);
            frame((now - last) / 1000);
            last = now;
        }
        return {
            init() {
                if (!ref) {
                    last = performance.now();
                    zone.runOutsideAngular(() => ref = requestAnimationFrame(tick));
                }
            },
            destroy() {
                cancelAnimationFrame(ref);
                ref = 0;
            }
        };
    }
};
FrameService = tslib_1.__decorate([
    core_1.Injectable({
        providedIn: 'root',
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.NgZone])
], FrameService);
exports.FrameService = FrameService;
//# sourceMappingURL=frameService.js.map