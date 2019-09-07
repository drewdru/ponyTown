"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const tabset_1 = require("../tabset/tabset");
const storageService_1 = require("../../services/storageService");
let SaveActiveTab = class SaveActiveTab {
    constructor(tabset, storage) {
        this.tabset = tabset;
        this.storage = storage;
    }
    ngOnInit() {
        // this.tabset.activeIndex = parseInt(this.storage.getItem(this.key) || '0', 10);
        this.tabset.select(parseInt(this.storage.getItem(this.key) || '0', 10));
        this.subscription = this.tabset.activeIndexChange.subscribe((i) => {
            this.storage.setItem(this.key, i.toString());
        });
    }
    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
};
tslib_1.__decorate([
    core_1.Input('saveActiveTab'),
    tslib_1.__metadata("design:type", String)
], SaveActiveTab.prototype, "key", void 0);
SaveActiveTab = tslib_1.__decorate([
    core_1.Directive({
        selector: '[saveActiveTab]',
    }),
    tslib_1.__param(0, core_1.Host()),
    tslib_1.__metadata("design:paramtypes", [tabset_1.Tabset, storageService_1.StorageService])
], SaveActiveTab);
exports.SaveActiveTab = SaveActiveTab;
//# sourceMappingURL=saveActiveTab.js.map