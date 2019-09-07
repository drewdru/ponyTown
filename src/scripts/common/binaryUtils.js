"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const browser_1 = require("ag-sockets/dist/browser");
function writeBinary(write) {
    const writer = browser_1.createBinaryWriter();
    do {
        try {
            write(writer);
            break;
        }
        catch (e) {
            if (e instanceof RangeError || /DataView/.test(e.message)) {
                browser_1.resizeWriter(writer);
            }
            else {
                throw e;
            }
        }
    } while (true);
    return browser_1.getWriterBuffer(writer);
}
exports.writeBinary = writeBinary;
//# sourceMappingURL=binaryUtils.js.map