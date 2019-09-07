"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function createEmptyTexture(gl, width, height, format, type) {
    if (format === undefined) {
        format = gl.RGBA;
    }
    if (type === undefined) {
        type = gl.UNSIGNED_BYTE;
    }
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (maxTextureSize != null && (width < 0 || width > maxTextureSize || height < 0 || height > maxTextureSize)) {
        throw new Error('Invalid texture shape');
    }
    if (type === gl.FLOAT && !gl.getExtension('OES_texture_float')) {
        throw new Error('Floating point textures not supported on this platform');
    }
    const handle = createTextureHandle(gl);
    gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, type, null);
    return { handle, width, height, format, type };
}
exports.createEmptyTexture = createEmptyTexture;
function createTexture(gl, data, format, type) {
    if (format === undefined) {
        format = gl.RGBA;
    }
    if (type === undefined) {
        type = gl.UNSIGNED_BYTE;
    }
    const handle = createTextureHandle(gl);
    gl.texImage2D(gl.TEXTURE_2D, 0, format, format, type, data);
    return { handle, width: data.width, height: data.height, format, type };
}
exports.createTexture = createTexture;
function disposeTexture(gl, texture) {
    try {
        if (gl && texture) {
            gl.deleteTexture(texture.handle);
        }
    }
    catch (e) {
        DEVELOPMENT && console.error(e);
    }
    return undefined;
}
exports.disposeTexture = disposeTexture;
function bindTexture(gl, unit, texture) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture ? texture.handle : null);
}
exports.bindTexture = bindTexture;
function resizeTexture(gl, texture, width, height) {
    width = width | 0;
    height = height | 0;
    const { format, type } = texture;
    const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (maxSize != null && (width < 0 || width > maxSize || height < 0 || height > maxSize)) {
        throw new Error('Invalid texture size');
    }
    texture.width = width;
    texture.height = height;
    gl.bindTexture(gl.TEXTURE_2D, texture.handle);
    gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, type, null);
}
exports.resizeTexture = resizeTexture;
function createTextureHandle(gl) {
    const texture = gl.createTexture();
    if (!texture) {
        throw new Error('Failed to create texture');
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
}
//# sourceMappingURL=texture2d.js.map