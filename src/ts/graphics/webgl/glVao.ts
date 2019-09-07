import { timeStart, timeEnd } from '../../client/timing';

export interface VAOAttributes {
	name: string;
	buffer: WebGLBuffer;
	size?: number;
	type?: number;
	normalized?: boolean;
	stride?: number;
	offset?: number;
	divisor?: number;
}

export interface VAO {
	gl: WebGLRenderingContext;
	bind(): void;
	unbind(): void;
	dispose(): void;
	update(attributes: VAOAttributes[], elements: WebGLBuffer, elementsType?: number): void;
	draw(mode: number, count: number, offset?: number): void;
}

interface WebGL extends WebGLRenderingContext {
	bindVertexArray?: any;
	createVertexArray?: any;
	deleteVertexArray?: any;
}

function extensionShim(gl: WebGL): OES_vertex_array_object {
	return {
		bindVertexArrayOES: gl.bindVertexArray.bind(gl),
		createVertexArrayOES: gl.createVertexArray.bind(gl),
		deleteVertexArrayOES: gl.deleteVertexArray.bind(gl),
	} as any;
}

export function createVAO(gl: WebGL, attributes: VAOAttributes[], elements: WebGLBuffer, elementsType?: number): VAO {
	const ext = gl.createVertexArray ? extensionShim(gl) : gl.getExtension('OES_vertex_array_object');
	const handle = ext && ext.createVertexArrayOES();
	const vao = (ext && handle) ? new VAONative(gl, ext, handle) : new VAOEmulated(gl);
	vao.update(attributes, elements, elementsType);
	return vao;
}

class VAONative implements VAO {
	private useElements = false;
	private elementsType: number;
	private maxAttribs: number;
	constructor(
		public gl: WebGLRenderingContext,
		private ext: OES_vertex_array_object,
		public handle: WebGLVertexArrayObjectOES,
	) {
		this.elementsType = gl.UNSIGNED_SHORT;
		this.maxAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
	}
	bind() {
		this.ext.bindVertexArrayOES(this.handle);
	}
	unbind() {
		this.ext.bindVertexArrayOES(null);
	}
	dispose() {
		this.ext.deleteVertexArrayOES(this.handle);
	}
	update(attributes: VAOAttributes[], elements: WebGLBuffer | null, elementsType?: number) {
		this.bind();
		bindAttribs(this.gl, elements, attributes, this.maxAttribs);
		this.unbind();
		this.useElements = !!elements;
		this.elementsType = elementsType || this.gl.UNSIGNED_SHORT;
	}
	draw(mode: number, count: number, offset = 0) {
		TIMING && timeStart('VAONative.draw');
		if (this.useElements) {
			this.gl.drawElements(mode, count, this.elementsType, offset);
		} else {
			this.gl.drawArrays(mode, offset, count);
		}
		TIMING && timeEnd();
	}
}

class VAOEmulated implements VAO {
	private elements: WebGLBuffer | null = null;
	private attributes: VAOAttributes[] | null = null;
	private elementsType: number;
	private maxAttribs: number;
	constructor(public gl: WebGLRenderingContext) {
		this.elementsType = gl.UNSIGNED_SHORT;
		this.maxAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
	}
	bind() {
		bindAttribs(this.gl, this.elements, this.attributes, this.maxAttribs);
	}
	update(attributes: VAOAttributes[], elements: WebGLBuffer | null, elementsType?: number) {
		this.elements = elements;
		this.attributes = attributes;
		this.elementsType = elementsType || this.gl.UNSIGNED_SHORT;
	}
	dispose() {
	}
	unbind() {
	}
	draw(mode: number, count: number, offset = 0) {
		TIMING && timeStart('VAOEmulated.draw');
		if (this.elements) {
			this.gl.drawElements(mode, count, this.elementsType, offset);
		} else {
			this.gl.drawArrays(mode, offset, count);
		}
		TIMING && timeEnd();
	}
}

function bindAttribs(
	gl: WebGLRenderingContext, elements: WebGLBuffer | null, attributes: VAOAttributes[] | null, maxAttribs: number
) {
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elements);

	if (attributes) {
		if (maxAttribs != null && attributes.length > maxAttribs) {
			throw new Error(`Too many vertex attributes ${attributes.length}/${maxAttribs}`);
		}

		let i = 0;

		for (; i < attributes.length; ++i) {
			const attrib = attributes[i];
			const buffer = attrib.buffer;
			const size = attrib.size || 4;
			const type = attrib.type || gl.FLOAT;
			const normalized = !!attrib.normalized;
			const stride = attrib.stride || 0;
			const offset = attrib.offset || 0;
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			gl.enableVertexAttribArray(i);
			gl.vertexAttribPointer(i, size, type, normalized, stride, offset);

			if (attrib.divisor !== undefined) {
				(gl as any).vertexAttribDivisor(i, attrib.divisor);
			}
		}

		for (; i < maxAttribs; ++i) {
			gl.disableVertexAttribArray(i);
		}
	} else {
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		for (let i = 0; i < maxAttribs; ++i) {
			gl.disableVertexAttribArray(i);
		}
	}
}
