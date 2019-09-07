"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
exports.root = path.join(__dirname, '..', '..', '..');
exports.store = path.join(exports.root, 'store');
function pathTo(...parts) {
    return path.join(exports.root, ...parts);
}
exports.pathTo = pathTo;
//# sourceMappingURL=paths.js.map