import { spriteShader, paletteLayersShader, lightShader } from '../generated/shaders';
import { FrameBuffer, createFrameBuffer, disposeFrameBuffer } from '../graphics/webgl/frameBuffer';
import { SpriteSheet, CommonPalettes, PaletteManager, Camera } from '../common/interfaces';
import { Shader, createShader, disposeShader } from '../graphics/webgl/shader';
import { PaletteSpriteBatch, PALETTE_BATCH_BYTES_PER_VERTEX } from '../graphics/paletteSpriteBatch';
import { getWebGLContext, getRenderTargetSize, unbindAllTexturesAndBuffers } from '../graphics/webgl/webglUtils';
import { createCommonPalettes } from '../graphics/graphicsUtils';
import { createTexturesForSpriteSheets, disposeTexturesForSpriteSheets } from '../graphics/spriteSheetUtils';
import * as sprites from '../generated/sprites';
import { SpriteBatch } from '../graphics/spriteBatch';
import { BATCH_SIZE_MAX } from '../common/constants';

export interface WebGL {
	gl: WebGLRenderingContext;
	frameBuffer: FrameBuffer | undefined;
	frameBufferSheet: SpriteSheet;
	spriteShader: Shader;
	lightShader: Shader;
	paletteShader: Shader;
	spriteBatch: SpriteBatch;
	paletteBatch: PaletteSpriteBatch;
	palettes: CommonPalettes;
	failedFBO: boolean;
	renderer: string;
}

const spriteShaderSource = spriteShader;
const paletteShaderSource = paletteLayersShader;
const lightShaderSource = lightShader;

function createIndices(capacity: number) {
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

export function initWebGL(canvas: HTMLCanvasElement, paletteManager: PaletteManager, camera: Camera): WebGL {
	const gl = getWebGLContext(canvas);
	return initWebGLResources(gl, paletteManager, camera);
}

export function initWebGLResources(gl: WebGLRenderingContext, paletteManager: PaletteManager, camera: Camera): WebGL {
	let renderer = '';
	let failedFBO = false;
	let frameBuffer: FrameBuffer | undefined;
	let frameBufferSheet: SpriteSheet = { texture: undefined, sprites: [], palette: false };

	try {
		const size = getRenderTargetSize(camera.w, camera.h);
		frameBuffer = createFrameBuffer(gl, size, size);
		frameBufferSheet.texture = frameBuffer.texture;
	} catch (e) {
		DEVELOPMENT && console.warn(e);
		failedFBO = true;
	}

	createTexturesForSpriteSheets(gl, sprites.spriteSheets);
	const palettes = createCommonPalettes(paletteManager);

	const paletteShader = createShader(gl, paletteShaderSource);
	const spriteShader = createShader(gl, spriteShaderSource);
	const lightShader = createShader(gl, lightShaderSource);

	const VERTICES_PER_SPRITE = 4;
	const buffer = new ArrayBuffer(BATCH_SIZE_MAX * VERTICES_PER_SPRITE * PALETTE_BATCH_BYTES_PER_VERTEX);
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
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, createIndices(BATCH_SIZE_MAX), gl.STATIC_DRAW);

	const vertexBuffer2 = gl.createBuffer();

	if (!vertexBuffer2) {
		throw new Error(`Failed to allocate vertex buffer (2)`);
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer2);
	gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);

	const spriteBatch = new SpriteBatch(gl, BATCH_SIZE_MAX, buffer, vertexBuffer2, indexBuffer);
	const paletteBatch = new PaletteSpriteBatch(gl, BATCH_SIZE_MAX, buffer, vertexBuffer, indexBuffer);
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

export function disposeWebGL(webgl: WebGL) {
	const { gl } = webgl;

	unbindAllTexturesAndBuffers(gl);
	disposeTexturesForSpriteSheets(gl, sprites.spriteSheets);
	disposeFrameBuffer(gl, webgl.frameBuffer);
	disposeShader(gl, webgl.lightShader);
	disposeShader(gl, webgl.spriteShader);
	disposeShader(gl, webgl.paletteShader);
	webgl.spriteBatch.dispose();
	webgl.paletteBatch.dispose();
}
