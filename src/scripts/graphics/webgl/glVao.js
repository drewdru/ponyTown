"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const timing_1 = require("../../client/timing");
function extensionShim(gl) {
    return {
        bindVertexArrayOES: gl.bindVertexArray.bind(gl),
        createVertexArrayOES: gl.createVertexArray.bind(gl),
        deleteVertexArrayOES: gl.deleteVertexArray.bind(gl),
    };
}
function createVAO(gl, attributes, elements, elementsType) {
    const ext = gl.createVertexArray ? extensionShim(gl) : gl.getExtension('OES_vertex_array_object');
    const handle = ext && ext.createVertexArrayOES();
    const vao = (ext && handle) ? new VAONative(gl, ext, handle) : new VAOEmulated(gl);
    vao.update(attributes, elements, elementsType);
    return vao;
}
exports.createVAO = createVAO;
class VAONative {
    constructor(gl, ext, handle) {
        this.gl = gl;
        this.ext = ext;
        this.handle = handle;
        this.useElements = false;
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
    update(attributes, elements, elementsType) {
        this.bind();
        bindAttribs(this.gl, elements, attributes, this.maxAttribs);
        this.unbind();
        this.useElements = !!elements;
        this.elementsType = elementsType || this.gl.UNSIGNED_SHORT;
    }
    draw(mode, count, offset = 0) {
        TIMING && timing_1.timeStart('VAONative.draw');
        if (this.useElements) {
            this.gl.drawElements(mode, count, this.elementsType, offset);
        }
        else {
            this.gl.drawArrays(mode, offset, count);
        }
        TIMING && timing_1.timeEnd();
    }
}
class VAOEmulated {
    constructor(gl) {
        this.gl = gl;
        this.elements = null;
        this.attributes = null;
        this.elementsType = gl.UNSIGNED_SHORT;
        this.maxAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
    }
    bind() {
        bindAttribs(this.gl, this.elements, this.attributes, this.maxAttribs);
    }
    update(attributes, elements, elementsType) {
        this.elements = elements;
        this.attributes = attributes;
        this.elementsType = elementsType || this.gl.UNSIGNED_SHORT;
    }
    dispose() {
    }
    unbind() {
    }
    draw(mode, count, offset = 0) {
        TIMING && timing_1.timeStart('VAOEmulated.draw');
        if (this.elements) {
            this.gl.drawElements(mode, count, this.elementsType, offset);
        }
        else {
            this.gl.drawArrays(mode, offset, count);
        }
        TIMING && timing_1.timeEnd();
    }
}
function bindAttribs(gl, elements, attributes, maxAttribs) {
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
                gl.vertexAttribDivisor(i, attrib.divisor);
            }
        }
        for (; i < maxAttribs; ++i) {
            gl.disableVertexAttribArray(i);
        }
    }
    else {
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        for (let i = 0; i < maxAttribs; ++i) {
            gl.disableVertexAttribArray(i);
        }
    }
}
//# sourceMappingURL=glVao.js.map