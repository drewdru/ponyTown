"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
let OrderByPipe = class OrderByPipe {
    transform(value, compare) {
        return value && value.slice().sort(compare);
    }
};
OrderByPipe = tslib_1.__decorate([
    core_1.Pipe({
        name: 'orderBy',
    })
], OrderByPipe);
exports.OrderByPipe = OrderByPipe;
//# sourceMappingURL=orderByPipe.js.map