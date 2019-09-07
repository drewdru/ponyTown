import { WEBGL_CREATION_ERROR } from '../../common/errors';

export function getRenderTargetSize(width: number, height: number) {
	const max = Math.max(width, height);
	let pow = 256;

	while (pow < max) {
		pow *= 2;
	}

	return pow;
}

export function getWebGLContext(canvas: HTMLCanvasElement): WebGLRenderingContext {
	const options: WebGLContextAttributes = {
		alpha: false,
		premultipliedAlpha: false,
		antialias: false,
	};

	const gl = canvas.getContext('webgl2', options)
		|| canvas.getContext('webgl', options)
		|| canvas.getContext('experimental-webgl', options);

	if (!gl) {
		throw new Error(WEBGL_CREATION_ERROR);
	}

	return gl;
}

export function isWebGL2(gl: WebGLRenderingContext | undefined) {
	return !!(gl && gl.MAX_ELEMENT_INDEX);
}

export function getWebGLError(gl: WebGLRenderingContext) {
	const error = gl.getError();

	switch (error) {
		case gl.NO_ERROR: return 'NO_ERROR';
		case gl.INVALID_ENUM: return 'INVALID_ENUM';
		case gl.INVALID_VALUE: return 'INVALID_VALUE';
		case gl.INVALID_OPERATION: return 'INVALID_OPERATION';
		case gl.INVALID_FRAMEBUFFER_OPERATION: return 'INVALID_FRAMEBUFFER_OPERATION';
		case gl.OUT_OF_MEMORY: return 'OUT_OF_MEMORY';
		case gl.CONTEXT_LOST_WEBGL: return 'CONTEXT_LOST_WEBGL';
		default: return `${error}`;
	}
}

export function unbindAllTexturesAndBuffers(gl: WebGLRenderingContext) {
	try {
		const numTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) | 0;

		for (let i = 0; i < numTextureUnits; i++) {
			gl.activeTexture(gl.TEXTURE0 + i);
			gl.bindTexture(gl.TEXTURE_2D, null);
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	} catch (e) {
		DEVELOPMENT && console.error(e);
	}
}
