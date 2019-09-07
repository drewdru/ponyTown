import { VAOAttributes } from './glVao';

export interface VAOAttributeDefinition {
	name: string;
	size: number;
	type?: number;
	normalized?: boolean;
	divisor?: number;
}

export function getVAOAttributesSize(gl: WebGLRenderingContext, attributes: VAOAttributeDefinition[]) {
	return attributes.reduce((sum, a) => sum + a.size * sizeOfType(gl, a.type), 0);
}

export function createVAOAttributes(
	gl: WebGLRenderingContext, attributes: VAOAttributeDefinition[], buffer: WebGLBuffer
): VAOAttributes[] {
	const result: VAOAttributes[] = [];
	const stride = getVAOAttributesSize(gl, attributes);
	let offset = 0;

	for (const a of attributes) {
		result.push({ ...a, stride, buffer, offset });
		offset += a.size * sizeOfType(gl, a.type);
	}

	return result;
}

function sizeOfType(gl: WebGLRenderingContext, type: number | undefined) {
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
