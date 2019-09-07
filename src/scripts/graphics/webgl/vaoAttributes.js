"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getVAOAttributesSize(gl, attributes) {
    return attributes.reduce((sum, a) => sum + a.size * sizeOfType(gl, a.type), 0);
}
exports.getVAOAttributesSize = getVAOAttributesSize;
function createVAOAttributes(gl, attributes, buffer) {
    const result = [];
    const stride = getVAOAttributesSize(gl, attributes);
    let offset = 0;
    for (const a of attributes) {
        result.push(Object.assign({}, a, { stride, buffer, offset }));
        offset += a.size * sizeOfType(gl, a.type);
    }
    return result;
}
exports.createVAOAttributes = createVAOAttributes;
function sizeOfType(gl, type) {
    switch (type) {
        case gl.BYTE:
        case gl.UNSIGNED_BYTE:
            return 1;
        case gl.SHORT:
        case gl.UNSIGNED_SHORT:
            return 2;
        case gl.FLOAT:
        case undefined:
            return 4;
        default:
            throw new Error(`Invalid attribute type (${type})`);
    }
}
//# sourceMappingURL=vaoAttributes.js.map