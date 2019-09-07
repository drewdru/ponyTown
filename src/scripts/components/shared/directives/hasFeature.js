"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const clientUtils_1 = require("../../../client/clientUtils");
const model_1 = require("../../services/model");
let HasFeature = class HasFeature {
    constructor(templateRef, viewContainer, model) {
        this.templateRef = templateRef;
        this.viewContainer = viewContainer;
        this.model = model;
        this.subscriptions = [];
        this.showing = false;
        this._flag = undefined;
        this._orMod = false;
        this._alsoIf = true;
    }
    ngAfterViewInit() {
        this.subscriptions.push(clientUtils_1.featureFlagsChanged.subscribe(() => this.update()));
        this.subscriptions.push(this.model.accountChanged.subscribe(() => this.update()));
    }
    ngOnDestroy() {
        this.subscriptions.forEach(s => s.unsubscribe());
    }
    set hasFeature(value) {
        if (this._flag !== value) {
            this._flag = value;
            this.update();
        }
    }
    set hasFeatureOrMod(value) {
        if (this._orMod !== value) {
            this._orMod = value;
            this.update();
        }
    }
    set hasFeatureAlso(value) {
        if (this._alsoIf !== value) {
            this._alsoIf = value;
            this.update();
        }
    }
    update() {
        const show = this._alsoIf && (clientUtils_1.hasFeatureFlag(this._flag) || (this._orMod && this.model.isMod));
        if (this.showing !== show) {
            this.showing = show;
            if (show) {
                this.ref = this.ref || this.viewContainer.createEmbeddedView(this.templateRef);
            }
            else {
                this.viewContainer.clear();
                this.ref = undefined;
            }
        }
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], HasFeature.prototype, "hasFeature", null);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Boolean),
    tslib_1.__metadata("design:paramtypes", [Boolean])
], HasFeature.prototype, "hasFeatureOrMod", null);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Boolean),
    tslib_1.__metadata("design:paramtypes", [Boolean])
], HasFeature.prototype, "hasFeatureAlso", null);
HasFeature = tslib_1.__decorate([
    core_1.Directive({
        selector: '[hasFeature]',
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.TemplateRef, core_1.ViewContainerRef, model_1.Model])
], HasFeature);
exports.HasFeature = HasFeature;
//# sourceMappingURL=hasFeature.js.map