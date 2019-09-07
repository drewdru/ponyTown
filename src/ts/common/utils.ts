import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Point, Rect, Entity, Dict } from './interfaces';
import { tileWidth, tileHeight, SECOND, MINUTE, HOUR, DAY } from './constants';
import { ACCESS_ERROR, NOT_FOUND_ERROR, OFFLINE_ERROR, PROTECTION_ERROR } from './errors';

// enum

export function invalidEnum(value: never) {
	if (DEVELOPMENT) {
		throw new Error(`Invalid enum value: ${value}`);
	}
}

export function invalidEnumReturn<T>(value: never, ret: T): T {
	if (DEVELOPMENT && !TESTS) {
		throw new Error(`Invalid enum value: ${value}`);
	}

	return ret;
}

// date

export function fromDate(date: Date, duration: number): Date {
	date.setTime(date.getTime() + duration);
	return date;
}

export function fromNow(duration: number): Date {
	return fromDate(new Date(), duration);
}

export function compareDates(a?: Date, b?: Date) {
	return a ? (b ? a.getTime() - b.getTime() : 1) : (b ? -1 : 0);
}

export function maxDate(a?: Date, b?: Date) {
	return (compareDates(a, b) > 0 ? a : b) || a || b;
}

export function minDate(a?: Date, b?: Date) {
	return (compareDates(a, b) < 0 ? a : b) || a || b;
}

export function formatDuration(duration: number) {
	const s = Math.floor(duration / SECOND) % 60;
	const m = Math.floor(duration / MINUTE) % 60;
	const h = Math.floor(duration / HOUR) % 24;
	const d = Math.floor(duration / DAY);

	if (d > 0) {
		return h ? `${d}d ${h}h` : `${d}d`;
	} else if (h > 0) {
		return m ? `${h}h ${m}m` : `${h}h`;
	} else if (m > 0) {
		return s ? `${m}m ${s}s` : `${m}m`;
	} else {
		return `${s}s`;
	}
}

export function formatISODate(date: Date) {
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export function parseISODate(value: string) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	let day = 0;
	let month = 0;
	let year = 0;

	if (match) {
		year = parseInt(match[1], 10);
		month = parseInt(match[2], 10);
		day = parseInt(match[3], 10);
	}

	return { day, month, year };
}

export function createValidBirthDate(day: number, month: number, year: number) {
	const date = new Date(0);
	const currentYear = (new Date()).getFullYear();
	date.setFullYear(year, month - 1, day);

	if (
		date.getFullYear() === year && date.getMonth() === (month - 1) && date.getDate() === day &&
		year >= (currentYear - 120) && year < currentYear
	) {
		return date;
	} else {
		return undefined;
	}
}

// color

export function parseSpriteColor(str: string): number {
	return str === '0' ? 0 : (str.length === 6 ? (((parseInt(str, 16) << 8) | 0xff) >>> 0) : (parseInt(str, 16) >>> 0));
}

// numbers

export function clamp(value: number, min: number, max: number): number {
	return value > min ? (value < max ? value : max) : min;
}

export function lerp(a: number, b: number, t: number) {
	return a + t * (b - a);
}

export function normalize(x: number, y: number): Point {
	const d = Math.sqrt(x * x + y * y);
	return { x: x / d, y: y / d };
}

export function computeCRC(colors: Uint32Array): number {
	let crc = 0;

	for (let i = 0; i < colors.length; i++) {
		crc ^= colors[i];

		for (let j = 0; j < 8; j++) {
			crc = (crc & 1) ? ((crc >>> 1) ^ 0x82f63b78) : (crc >>> 1);
		}
	}

	return crc >>> 0;
}

export function computeFriendsCRC(friends: string[]) {
	if (!friends.length) {
		return 0;
	}

	friends.sort();
	const data = new Uint32Array(friends.length * 3);

	for (let i = 0; i < friends.length; i++) {
		const id = friends[i];
		data[i * 3] = parseInt(id.substr(0, 8), 16);
		data[i * 3 + 1] = parseInt(id.substr(8, 8), 16);
		data[i * 3 + 2] = parseInt(id.substr(16, 8), 16);
	}

	return computeCRC(data);
}

export function lerpColor(a: number[] | Float32Array, b: number[] | Float32Array, t: number) {
	a[0] = t * b[0] + (1 - t) * a[0];
	a[1] = t * b[1] + (1 - t) * a[1];
	a[2] = t * b[2] + (1 - t) * a[2];
	a[3] = t * b[3] + (1 - t) * a[3];
}

// common

export function toInt(value: any): number {
	return value | 0;
}

export function dispose<T extends { dispose(): void; }>(obj: T | undefined): undefined {
	obj && obj.dispose();
	return undefined;
}

export function cloneDeep<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}

// enums

export function hasFlag(value: number | undefined, flag: number): boolean {
	return (value! & flag) === flag;
}

export function setFlag(value: number | undefined, flag: number, on: boolean): number {
	return (value! & ~flag) | (on ? flag : 0);
}

export function flagsToString(value: number, flags: { value: number; name: string; }[], none = 'None') {
	return flags
		.filter(flag => hasFlag(value, flag.value))
		.map(flag => flag.name).join(' | ') || none;
}

// collections

export function includes<T>(array: T[] | undefined, item: T): boolean {
	return array !== undefined && array.indexOf(item) !== -1;
}

export function array<T>(size: number, defaultValue: T) {
	const result: T[] = [];

	for (let i = 0; i < size; i++) {
		result.push(defaultValue);
	}

	return result;
}

export function repeat<T>(count: number, ...values: T[]): T[] {
	const result: T[] = [];

	for (let i = 0; i < count; i++) {
		result.push(...values);
	}

	return result;
}

export function times<T>(count: number, action: (index: number) => T) {
	const result: T[] = [];

	for (let i = 0; i < count; i++) {
		result.push(action(i));
	}

	return result;
}

export function last<T>(array: T[]): T | undefined {
	return array.length > 0 ? array[array.length - 1] : undefined;
}

export function flatten<T>(arrays: T[][]): T[] {
	return ([] as T[]).concat(...arrays);
}

export function at<T>(items: T[], index: any): T | undefined {
	return items[clamp(index | 0, 0, items.length - 1)];
}

export function att<T>(items: T[] | null | undefined, index: any): T | undefined {
	return items ? items[clamp(index | 0, 0, items.length - 1)] : undefined;
}

export function findById<U, T extends { id: U }>(items: T[], id: U): T | undefined {
	for (let i = 0; i < items.length; i++) {
		if (items[i].id === id) {
			return items[i];
		}
	}

	return undefined;
}

export function findIndexById<U, T extends { id: U }>(items: T[], id: U): number {
	for (let i = 0; i < items.length; i++) {
		if (items[i].id === id) {
			return i;
		}
	}

	return -1;
}

export function removeItem<T>(items: T[], item: T): boolean {
	const index = items.indexOf(item);

	if (index !== -1) {
		items.splice(index, 1);
		return true;
	} else {
		return false;
	}
}

export function removeItemFast<T>(items: T[], item: T): boolean {
	const index = items.indexOf(item);

	if (index !== -1) {
		items[index] = items[items.length - 1];
		items.pop();
		return true;
	} else {
		return false;
	}
}

export function removeById<U, T extends { id: U }>(items: T[], id: U): T | undefined {
	const index = findIndexById(items, id);

	if (index !== -1) {
		const item = items[index];
		items.splice(index, 1);
		return item;
	} else {
		return undefined;
	}
}

export function arraysEqual<T>(a: T[], b: T[]): boolean {
	if (a.length !== b.length) {
		return false;
	}

	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) {
			return false;
		}
	}

	return true;
}

export function pushUniq<T>(array: T[], item: T) {
	const index = array.indexOf(item);

	if (index === -1) {
		array.push(item);
		return array.length;
	} else {
		return index + 1;
	}
}

export function createPlainMap<T>(values: Dict<T>): Dict<T> {
	return Object.keys(values).reduce((obj: Dict<T>, key: string) => (obj[key] = values[key], obj), Object.create(null));
}

// rects / points

export function point(x: number, y: number): Point {
	return { x, y };
}

export function contains(x: number, y: number, bounds: Rect, point: Point): boolean {
	const bx = bounds.x / tileWidth + x;
	const by = bounds.y / tileHeight + y;
	const bw = bounds.w / tileWidth;
	const bh = bounds.h / tileHeight;
	return point.x > bx && point.x < bx + bw && point.y > by && point.y < by + bh;
}

export function containsPoint(dx: number, dy: number, rect: Rect, px: number, py: number): boolean {
	return pointInXYWH(px, py, rect.x + dx, rect.y + dy, rect.w, rect.h);
}

export function containsPointWitBorder(dx: number, dy: number, rect: Rect, px: number, py: number, border: number): boolean {
	return pointInXYWH(px, py, rect.x + dx - border, rect.y + dy - border, rect.w + border * 2, rect.h + border * 2);
}

export function pointInRect(x: number, y: number, rect: Rect) {
	return x > rect.x && x < rect.x + rect.w && y > rect.y && y < rect.y + rect.h;
}

export function pointInXYWH(px: number, py: number, rx: number, ry: number, rw: number, rh: number) {
	return px > rx && px < rx + rw && py > ry && py < ry + rh;
}

export function randomPoint({ x, y, w, h }: Rect): Point {
	return {
		x: x + w * Math.random(),
		y: y + h * Math.random(),
	};
}

export function lengthOfXY(dx: number, dy: number): number {
	return Math.sqrt(dx * dx + dy * dy);
}

export function distanceXY(ax: number, ay: number, bx: number, by: number): number {
	return lengthOfXY(ax - bx, ay - by);
}

export function distanceSquaredXY(ax: number, ay: number, bx: number, by: number): number {
	const dx = ax - bx;
	const dy = ay - by;
	return dx * dx + dy * dy;
}

export function distance(a: Point, b: Point): number {
	return distanceXY(a.x, a.y, b.x, b.y);
}

export function entitiesIntersect(a: Entity, b: Entity): boolean {
	const aBounds = a.bounds;
	const bBounds = b.bounds;

	if (!aBounds || !bBounds) {
		return false;
	}

	const ax = a.x * tileWidth + aBounds.x;
	const ay = a.y * tileHeight + aBounds.y;
	const bx = b.x * tileWidth + bBounds.x;
	const by = b.y * tileHeight + bBounds.y;

	return intersect(ax, ay, aBounds.w, aBounds.h, bx, by, bBounds.w, bBounds.h);
}

export function collidersIntersect(ax: number, ay: number, a: Rect, bx: number, by: number, b: Rect): boolean {
	const axmin = Math.floor((ax + a.x) * tileWidth) | 0;
	const axmax = Math.ceil((ax + a.x + a.w) * tileWidth) | 0;
	const aymin = Math.floor((ay + a.y) * tileHeight) | 0;
	const aymax = Math.ceil((ay + a.y + a.h) * tileHeight) | 0;

	const bxmin = Math.floor((bx + b.x) * tileWidth) | 0;
	const bxmax = Math.ceil((bx + b.x + b.w) * tileWidth) | 0;
	const bymin = Math.floor((by + b.y) * tileHeight) | 0;
	const bymax = Math.ceil((by + b.y + b.h) * tileHeight) | 0;

	return axmin < bxmax && axmax > bxmin && aymin < bymax && aymax > bymin;
}

export function boundsIntersect(
	ax: number, ay: number, a: Rect | undefined, bx: number, by: number, b: Rect | undefined
): boolean {
	return !!(a && b && intersect(
		ax * tileWidth + a.x, ay * tileHeight + a.y, a.w, a.h,
		bx * tileWidth + b.x, by * tileHeight + b.y, b.w, b.h));
}

export function intersect(
	ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number
): boolean {
	return ax <= (bx + bw) && (ax + aw) >= bx && ay <= (by + bh) && (ay + ah) >= by;
}

// requests

export type RequestError = Error & { status?: number; text?: string; };

export function createError(status: number, data: string | { error: string; }): Error {
	if (status > 500 && status < 600) {
		return new Error(PROTECTION_ERROR);
		// } else if (status === 400) {
		// 	return new Error('Bad Request');
	} else if (status === 403) {
		return new Error(ACCESS_ERROR);
	} else if (status === 404) {
		return new Error(NOT_FOUND_ERROR);
	} else if (typeof data === 'string') {
		return new Error(data || OFFLINE_ERROR);
	} else {
		return new Error((data && data.error) || OFFLINE_ERROR);
	}
}

export function delay(timeout: number) {
	return new Promise<void>(resolve => setTimeout(resolve, timeout));
}

export function observableToPromise<T>(observable: Observable<T>) {
	return observable.toPromise()
		.catch(({ status, error }: HttpErrorResponse) => {
			const text = error && error.text;

			try {
				error = JSON.parse(error);
			} catch { }

			const e: RequestError = createError(status || 0, error);
			e.status = status;
			e.text = text;
			throw e;
		});
}

// other

function setTransformDefault(element: HTMLElement | undefined, transform: string) {
	if (element) {
		element.style.transform = transform;
	}
}

function setTransformSafari(element: HTMLElement | undefined, transform: string) {
	if (element) {
		(element.style as any).webkitTransform = transform;
	}
}

export const setTransform = (typeof document !== 'undefined' && 'transform' in document.body.style) ?
	setTransformDefault : setTransformSafari;

export class ObjectCache<T> {
	private cache: T[] = [];
	constructor(private limit: number, private ctor: () => T) {
	}
	get(): T {
		return this.cache.pop() || this.ctor();
	}
	put(item: T) {
		if (this.cache.length < this.limit) {
			this.cache.push(item);
		}
	}
}

export function bitmask(data: Uint8Array, key: number) {
	if (key) {
		for (let i = 0; i < data.length; i++) {
			data[i] = data[i] ^ key;
		}
	}

	return data;
}

export function isCommand(text: string) {
	return /^\//.test(text);
}

export function processCommand(text: string) {
	text = text.substr(1);
	const space = text.indexOf(' ');
	const command = (space === -1 ? text : text.substr(0, space)).trim() as string | undefined;
	const args = space === -1 ? '' : text.substr(space + 1).trim();
	return { command, args };
}

// events

export type AnyEvent = MouseEvent | PointerEvent | TouchEvent;

export function isTouch(e: AnyEvent): e is TouchEvent {
	return /^touch/i.test(e.type);
}

export function getButton(e: AnyEvent): number {
	return ('button' in e) ? (e.button || 0) : 0;
}

export function getX(e: AnyEvent): number {
	return ('touches' in e && e.touches.length > 0) ? e.touches[0].pageX : (e as any).pageX;
}

export function getY(e: AnyEvent): number {
	return ('touches' in e && e.touches.length > 0) ? e.touches[0].pageY : (e as any).pageY;
}

export function isKeyEventInvalid(e: KeyboardEvent) {
	return e.target && /^(input|textarea|select)$/i.test((<any>e.target).tagName);
}
