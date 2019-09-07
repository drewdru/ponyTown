import { Rect, Point } from './interfaces';
import { intersect } from './utils';

export function rect(x: number, y: number, w: number, h: number): Rect {
	return { x, y, w, h };
}

export function centerPoint(rect: Rect): Point {
	return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

export function copyRect(dst: Rect, src: Rect) {
	dst.x = src.x;
	dst.y = src.y;
	dst.w = src.w;
	dst.h = src.h;
}

export function withBorder({ x, y, w, h }: Rect, border: number) {
	return rect(x - border, y - border, w + border * 2, h + border * 2);
}

export function withPadding({ x, y, w, h }: Rect, top: number, right: number, bottom: number, left: number) {
	return rect(x - top, y - left, w + left + right, h + top + bottom);
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
	return intersect(a.x, a.y, a.w, a.h, b.x, b.y, b.w, b.h);
}

export function addRect(a: Rect, b: Rect) {
	const x = Math.min(a.x, b.x);
	const y = Math.min(a.y, b.y);

	a.w = Math.max(a.x + a.w, b.x + b.w) - x;
	a.h = Math.max(a.y + a.h, b.y + b.h) - y;
	a.x = x;
	a.y = y;
}

export function addRects(a: Rect, b: Rect): Rect {
	const x = Math.min(a.x, b.x);
	const y = Math.min(a.y, b.y);

	return {
		x, y,
		w: Math.max(a.x + a.w, b.x + b.w) - x,
		h: Math.max(a.y + a.h, b.y + b.h) - y,
	};
}
