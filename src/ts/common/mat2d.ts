import { Matrix2D } from './interfaces';

export function createMat2D(): Matrix2D {
	const out = new Float32Array(6);
	out[0] = 1;
	out[3] = 1;
	return out;
}

export function identityMat2D(out: Matrix2D) {
	out[0] = 1;
	out[1] = 0;
	out[2] = 0;
	out[3] = 1;
	out[4] = 0;
	out[5] = 0;
	return out;
}

export function copyMat2D(out: Matrix2D, a: Matrix2D) {
	out.set(a);
	return out;
}

export function setMat2D(out: Matrix2D, a: number, b: number, c: number, d: number, tx: number, ty: number) {
	out[0] = a;
	out[1] = b;
	out[2] = c;
	out[3] = d;
	out[4] = tx;
	out[5] = ty;
	return out;
}

export function mulMat2D(out: Matrix2D, a: Matrix2D, b: Matrix2D) {
	const a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5];
	const b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5];
	out[0] = a0 * b0 + a2 * b1;
	out[1] = a1 * b0 + a3 * b1;
	out[2] = a0 * b2 + a2 * b3;
	out[3] = a1 * b2 + a3 * b3;
	out[4] = a0 * b4 + a2 * b5 + a4;
	out[5] = a1 * b4 + a3 * b5 + a5;
	return out;
}

export function translateMat2D(out: Matrix2D, a: Matrix2D, x: number, y: number) {
	const a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5];
	out[0] = a0;
	out[1] = a1;
	out[2] = a2;
	out[3] = a3;
	out[4] = a0 * x + a2 * y + a4;
	out[5] = a1 * x + a3 * y + a5;
	return out;
}

export function rotateMat2D(out: Matrix2D, a: Matrix2D, rad: number) {
	const a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5];
	const s = Math.sin(rad);
	const c = Math.cos(rad);
	out[0] = a0 * c + a2 * s;
	out[1] = a1 * c + a3 * s;
	out[2] = a0 * -s + a2 * c;
	out[3] = a1 * -s + a3 * c;
	out[4] = a4;
	out[5] = a5;
	return out;
}

export function scaleMat2D(out: Matrix2D, a: Matrix2D, x: number, y: number) {
	const a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5];
	out[0] = a0 * x;
	out[1] = a1 * x;
	out[2] = a2 * y;
	out[3] = a3 * y;
	out[4] = a4;
	out[5] = a5;
	return out;
}

const temp = createMat2D();

export function skewX(out: Matrix2D, a: Matrix2D, angle: number): Matrix2D {
	setMat2D(temp, 1, 0, Math.tan(angle), 1, 0, 0);
	mulMat2D(out, a, temp);
	return out;
}

export function skewY(out: Matrix2D, a: Matrix2D, angle: number): Matrix2D {
	setMat2D(temp, 1, Math.tan(angle), 0, 1, 0, 0);
	mulMat2D(out, a, temp);
	return out;
}

const tempMatrix = createMat2D();

export function skewTransform(base: Matrix2D | undefined, skew: number, ox: number, oy: number, x: number, y: number): Matrix2D {
	identityMat2D(tempMatrix);

	if (skew) {
		translateMat2D(tempMatrix, tempMatrix, ox + x, oy + y);
		skewY(tempMatrix, tempMatrix, skew);
		translateMat2D(tempMatrix, tempMatrix, -ox, -oy);
	} else {
		translateMat2D(tempMatrix, tempMatrix, x, y);
	}

	if (base !== undefined) {
		mulMat2D(tempMatrix, base, tempMatrix);
	}

	return tempMatrix;
}

export function isIdentity(m: Matrix2D) {
	return m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0;
}

export function isTranslation(m: Matrix2D) {
	return m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1;
}
