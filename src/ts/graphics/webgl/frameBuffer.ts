import { Texture2D, createEmptyTexture, resizeTexture } from './texture2d';

export interface FrameBuffer {
	handle: WebGLFramebuffer;
	texture: Texture2D;
	width: number;
	height: number;
}

export function createFrameBuffer(gl: WebGLRenderingContext, width: number, height: number): FrameBuffer {
	const handle = gl.createFramebuffer();

	if (!handle) {
		throw new Error('Failed to create frame buffer');
	}

	const texture = createEmptyTexture(gl, width, height, gl.RGB);
	return { handle, texture, width, height };
}

export function disposeFrameBuffer(gl: WebGLRenderingContext | undefined, buffer: FrameBuffer | undefined) {
	try {
		if (gl && buffer) {
			gl.deleteFramebuffer(buffer.handle);
			gl.deleteTexture(buffer.texture.handle);
		}
	} catch (e) {
		DEVELOPMENT && console.error(e);
	}

	return undefined;
}

export function resizeFrameBuffer(gl: WebGLRenderingContext, frameBuffer: FrameBuffer, width: number, height: number) {
	resizeTexture(gl, frameBuffer.texture, width, height);
	frameBuffer.width = width;
	frameBuffer.height = height;
}

export function bindFrameBuffer(gl: WebGLRenderingContext, { handle, texture }: FrameBuffer) {
	gl.bindFramebuffer(gl.FRAMEBUFFER, handle);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.handle, 0);
}

export function unbindFrameBuffer(gl: WebGLRenderingContext) {
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
