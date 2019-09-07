"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shaders_1 = require("../generated/shaders");
const frameBuffer_1 = require("../graphics/webgl/frameBuffer");
const shader_1 = require("../graphics/webgl/shader");
const paletteSpriteBatch_1 = require("../graphics/paletteSpriteBatch");
const webglUtils_1 = require("../graphics/webgl/webglUtils");
const graphicsUtils_1 = require("../graphics/graphicsUtils");
const spriteSheetUtils_1 = require("../graphics/spriteSheetUtils");
const sprites = require("../generated/sprites");
const spriteBatch_1 = require("../graphics/spriteBatch");
const constants_1 = require("../common/constants");
const spriteShaderSource = shaders_1.spriteShader;
const paletteShaderSource = shaders_1.paletteLayersShader;
const lightShaderSource = shaders_1.lightShader;
function createIndices(capacity) {
    const numIndices = (capacity * 6) | 0;
    const indices = new Uint16Array(numIndices);
    for (let i = 0, j = 0; i < numIndices; j = (j + 4) | 0) {
        indices[i++] = (j + 0) | 0;
        indices[i++] = (j + 1) | 0;
        indices[i++] = (j + 2) | 0;
        indices[i++] = (j + 0) | 0;
        indices[i++] = (j + 2) | 0;
        indices[i++] = (j + 3) | 0;
    }
    return indices;
}
function initWebGL(canvas, paletteManager, camera) {
    const gl = webglUtils_1.getWebGLContext(canvas);
    return initWebGLResources(gl, paletteManager, camera);
}
exports.initWebGL = initWebGL;
function initWebGLResources(gl, paletteManager, camera) {
    let renderer = '';
    let failedFBO = false;
    let frameBuffer;
    let frameBufferSheet = { texture: undefined, sprites: [], palette: false };
    try {
        const size = webglUtils_1.getRenderTargetSize(camera.w, camera.h);
        frameBuffer = frameBuffer_1.createFrameBuffer(gl, size, size);
        frameBufferSheet.texture = frameBuffer.texture;
    }
    catch (e) {
        DEVELOPMENT && console.warn(e);
        failedFBO = true;
    }
    spriteSheetUtils_1.createTexturesForSpriteSheets(gl, sprites.spriteSheets);
    const palettes = graphicsUtils_1.createCommonPalettes(paletteManager);
    const paletteShader = shader_1.createShader(gl, paletteShaderSource);
    const spriteShader = shader_1.createShader(gl, spriteShaderSource);
    const lightShader = shader_1.createShader(gl, lightShaderSource);
    const VERTICES_PER_SPRITE = 4;
    const buffer = new ArrayBuffer(constants_1.BATCH_SIZE_MAX * VERTICES_PER_SPRITE * paletteSpriteBatch_1.PALETTE_BATCH_BYTES_PER_VERTEX);
    const vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        throw new Error(`Failed to allocate vertex buffer`);
    }
    const indexBuffer = gl.createBuffer();
    if (!indexBuffer) {
        throw new Error(`Failed to allocate index buffer`);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, createIndices(constants_1.BATCH_SIZE_MAX), gl.STATIC_DRAW);
    const vertexBuffer2 = gl.createBuffer();
    if (!vertexBuffer2) {
        throw new Error(`Failed to allocate vertex buffer (2)`);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer2);
    gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);
    const spriteBatch = new spriteBatch_1.SpriteBatch(gl, constants_1.BATCH_SIZE_MAX, buffer, vertexBuffer2, indexBuffer);
    const paletteBatch = new paletteSpriteBatch_1.PaletteSpriteBatch(gl, constants_1.BATCH_SIZE_MAX, buffer, vertexBuffer, indexBuffer);
    spriteBatch.rectSprite = sprites.pixel;
    paletteBatch.rectSprite = sprites.pixel2;
    paletteBatch.defaultPalette = palettes.defaultPalette;
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    paletteManager.init(gl);
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
        renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    }
    return {
        gl, paletteShader, spriteShader, lightShader, spriteBatch, paletteBatch,
        frameBuffer, frameBufferSheet, palettes, failedFBO, renderer,
    };
}
exports.initWebGLResources = initWebGLResources;
function disposeWebGL(webgl) {
    const { gl } = webgl;
    webglUtils_1.unbindAllTexturesAndBuffers(gl);
    spriteSheetUtils_1.disposeTexturesForSpriteSheets(gl, sprites.spriteSheets);
    frameBuffer_1.disposeFrameBuffer(gl, webgl.frameBuffer);
    shader_1.disposeShader(gl, webgl.lightShader);
    shader_1.disposeShader(gl, webgl.spriteShader);
    shader_1.disposeShader(gl, webgl.paletteShader);
    webgl.spriteBatch.dispose();
    webgl.paletteBatch.dispose();
}
exports.disposeWebGL = disposeWebGL;
//# sourceMappingURL=webgl.js.map