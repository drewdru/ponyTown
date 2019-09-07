"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class InternalAdminApi {
    constructor(adminService, endPoints) {
        this.adminService = adminService;
        this.endPoints = endPoints;
    }
    removedDocument(model, id) {
        if (model in this.endPoints) {
            this.endPoints[model].removedItem(id);
        }
        this.adminService.removedItem(model, id);
        return Promise.resolve();
    }
}
exports.InternalAdminApi = InternalAdminApi;
//# sourceMappingURL=internal-admin.js.map