import { dropRightWhile, mapValues } from 'lodash';
import { BaseValues } from '../common/adminInterfaces';
import { IEvent } from './db';

export interface BaseTimes {
	updatedAt: number;
	createdAt: number;
	lastVisit: number;
}

export function getBaseDate<T>(items: T[], get: (item: T) => Date): string {
	return items.reduce((min, i) => {
		const date = get(i);
		return date && min.getTime() > date.getTime() ? date : min;
	}, new Date(0)).toISOString();
}

export function getBaseTimes(base: BaseValues): BaseTimes {
	return mapValues(base, (x: string) => (new Date(x)).getTime()) as any;
}

function trimValues(values: any[]): any[] {
	return dropRightWhile(values, x => !x || (Array.isArray(x) && x.length === 0));
}

function encodeDate(date: Date | undefined, baseValue: number): number {
	return date ? (date.getTime() - baseValue) : 0;
}

// NOTE: update eventFields
export function encodeEvent(event: IEvent, base: BaseTimes): any[] {
	return trimValues([
		event._id,
		encodeDate(event.updatedAt, base.updatedAt),
		encodeDate(event.createdAt, base.createdAt),
		event.type,
		event.server,
		event.message,
		event.desc,
		event.count,
		event.origin ? { ip: event.origin.ip, country: event.origin.country } : null,
		event.account,
		event.pony && event.pony.toString(),
	]);
}
