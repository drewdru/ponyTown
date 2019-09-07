"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
let KeysPipe = class KeysPipe {
    transform(value) {
        return value ? Object.keys(value) : value;
    }
};
KeysPipe = tslib_1.__decorate([
    core_1.Pipe({
        name: 'keys',
    })
], KeysPipe);
exports.KeysPipe = KeysPipe;
//# sourceMappingURL=keysPipe.js.map