"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const browser_1 = require("ag-sockets/dist/browser");
class ClientAdminActions {
    constructor(model) {
        this.model = model;
    }
    connected() {
        this.model.initialize(true);
        this.model.connectedToSocket();
    }
    disconnected() {
        this.model.updateTitle();
    }
    updates(updates) {
        for (const { type, id, update } of updates) {
            const model = this.model[type];
            if (model) {
                model.update(id, update);
            }
            else {
                console.error(`Invalid model type "${type}"`);
            }
        }
    }
}
tslib_1.__decorate([
    browser_1.Method(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Array]),
    tslib_1.__metadata("design:returntype", void 0)
], ClientAdminActions.prototype, "updates", null);
exports.ClientAdminActions = ClientAdminActions;
//# sourceMappingURL=clientAdminActions.js.map