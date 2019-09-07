"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rev_1 = require("../generated/rev");
/* istanbul ignore next */
function getUrl(name) {
    if (DEVELOPMENT)
        return `/assets/${name}`;
    if (!rev_1.REV[name])
        throw new Error(`Cannot find file url (${name})`);
    return `/assets/${name.replace(/(\.\S+)$/, `-${rev_1.REV[name]}$1`)}`;
}
exports.getUrl = getUrl;
//# sourceMappingURL=rev.js.map