"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MB = 1024 * 1024;
class ByteSize {
    constructor(bytes = 0, mbytes = 0) {
        this.bytes = bytes;
        this.mbytes = mbytes;
        this.reduce();
    }
    add({ bytes, mbytes }) {
        this.addBytes(bytes, mbytes);
    }
    addBytes(bytes, mbytes = 0) {
        this.mbytes += mbytes;
        this.bytes += bytes;
        this.reduce();
        return this;
    }
    toString() {
        return this.mbytes ? `${this.mbytes.toString()}${this.bytes.toString().padStart(6, '0')}` : this.bytes.toString();
    }
    toSortableString() {
        return `${this.mbytes.toString().padStart(9, '0')}-${this.bytes.toString().padStart(6, '0')}`;
    }
    toHumanReadable() {
        return this.mbytes >= 1 ?
            `${this.mbytes} mb` :
            (this.bytes >= 2048 ? `${Math.floor(this.bytes / 1024)} kb` : `${this.bytes} b`);
    }
    reduce() {
        this.mbytes += Math.floor(this.bytes / MB);
        this.bytes = this.bytes % MB;
    }
}
exports.ByteSize = ByteSize;
//# sourceMappingURL=byteSize.js.map