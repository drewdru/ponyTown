"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const constants_1 = require("../../../../common/constants");
const intervalUpdateService_1 = require("../../../services/intervalUpdateService");
const icons_1 = require("../../../../client/icons");
const ICONS = {
    mute: icons_1.faMicrophoneSlash,
    shadow: icons_1.faEyeSlash,
    ban: icons_1.faBan,
};
let BanIcon = class BanIcon {
    constructor(zone, updateService) {
        this.timeouts = constants_1.TIMEOUTS;
        this.clockIcon = icons_1.faClock;
        this.type = 'ban';
        this.value = 0;
        this.toggle = new core_1.EventEmitter();
        this.timedOut = false;
        this.toggleUpdate = updateService.toggle(() => {
            if (this.timedOut !== this.isTimedOut) {
                zone.run(() => this.timedOut = this.isTimedOut);
                this.toggleUpdate(this.isTimedOut);
            }
        });
    }
    get icon() {
        return ICONS[this.type] || ICONS.ban;
    }
    get isPerma() {
        return this.value === -1;
    }
    get isTimedOut() {
        return this.value > Date.now();
    }
    get className() {
        if (this.isPerma) {
            return 'text-banned';
        }
        else if (this.isTimedOut) {
            return 'text-alert';
        }
        else {
            return 'text-muted';
        }
    }
    ngOnInit() {
        this.toggleUpdate(this.isTimedOut);
    }
    ngOnChanges() {
        this.toggleUpdate(this.isTimedOut);
    }
    ngOnDestroy() {
        this.toggleUpdate(false);
    }
    clear() {
        this.setValue(0);
    }
    perma() {
        this.setValue(-1);
    }
    timeout(value) {
        this.setValue(Date.now() + value);
    }
    setValue(value) {
        this.value = value;
        this.toggle.emit(value);
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], BanIcon.prototype, "type", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], BanIcon.prototype, "value", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], BanIcon.prototype, "toggle", void 0);
BanIcon = tslib_1.__decorate([
    core_1.Component({
        selector: 'ban-icon',
        templateUrl: 'ban-icon.pug',
        styleUrls: ['ban-icon.scss'],
        changeDetection: core_1.ChangeDetectionStrategy.OnPush,
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.NgZone, intervalUpdateService_1.IntervalUpdateService])
], BanIcon);
exports.BanIcon = BanIcon;
//# sourceMappingURL=ban-icon.js.map