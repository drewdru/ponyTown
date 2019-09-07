"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const texture2d_1 = require("./texture2d");
function createFrameBuffer(gl, width, height) {
    const handle = gl.createFramebuffer();
    if (!handle) {
        throw new Error('Failed to create frame buffer');
    }
    const texture = texture2d_1.createEmptyTexture(gl, width, height, gl.RGB);
    return { handle, texture, width, height };
}
exports.createFrameBuffer = createFrameBuffer;
function disposeFrameBuffer(gl, buffer) {
    try {
        if (gl && buffer) {
            gl.deleteFramebuffer(buffer.handle);
            gl.deleteTexture(buffer.texture.handle);
        }
    }
    catch (e) {
        DEVELOPMENT && console.error(e);
    }
    return undefined;
}
exports.disposeFrameBuffer = disposeFrameBuffer;
function resizeFrameBuffer(gl, frameBuffer, width, height) {
    texture2d_1.resizeTexture(gl, frameBuffer.texture, width, height);
    frameBuffer.width = width;
    frameBuffer.height = height;
}
exports.resizeFrameBuffer = resizeFrameBuffer;
function bindFrameBuffer(gl, { handle, texture }) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, handle);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.handle, 0);
}
exports.bindFrameBuffer = bindFrameBuffer;
function unbindFrameBuffer(gl) {
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
exports.unbindFrameBuffer = unbindFrameBuffer;
//# sourceMappingURL=frameBuffer.js.map