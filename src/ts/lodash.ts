type List<T> = ArrayLike<T>;
type PartialDeep<T> = {
	[P in keyof T]?: PartialDeep<T[P]>;
};
interface Dictionary<T> {
	[index: string]: T;
}
interface NumericDictionary<T> {
	[index: number]: T;
}
type NotVoid = {} | null | undefined;
type ListIteratee<T> = ListIterator<T, NotVoid> | string | [string, any] | PartialDeep<T>;
type ListIterator<T, TResult> = (value: T, index: number, collection: List<T>) => TResult;
type ListIterateeCustom<T, TResult> = ListIterator<T, TResult> | string | [string, any] | PartialDeep<T>;
type ObjectIterator<TObject, TResult> = (value: TObject[keyof TObject], key: string, collection: TObject) => TResult;
type Many<T> = T | T[];

interface FlatMap {
	<T>(
		collection: List<Many<T>> | Dictionary<Many<T>> | NumericDictionary<Many<T>> | null | undefined
	): T[];

	(
		collection: object | null | undefined
	): any[];

	<T, TResult>(
		collection: List<T> | null | undefined,
		iteratee: ListIterator<T, Many<TResult>>
	): TResult[];

	<T extends object, TResult>(
		collection: T | null | undefined,
		iteratee: ObjectIterator<T, Many<TResult>>
	): TResult[];

	(
		collection: object | null | undefined,
		iteratee: string
	): any[];

	(
		collection: object | null | undefined,
		iteratee: object
	): boolean[];
}

type PropertyName = string | number | symbol;
type IterateeShorthand<T> = PropertyName | [PropertyName, any] | PartialDeep<T>;
type ValueIteratee<T> = ((value: T) => NotVoid) | IterateeShorthand<T>;

export const noop: () => void = require('lodash/noop');
export const forOwn = require('lodash/forOwn');
export const escapeRegExp: (string?: string) => string = require('lodash/escapeRegExp');
export const escape: (string?: string) => string = require('lodash/escape');
export const sample = require('lodash/sample');
export const findLastIndex:
	<T>(array: List<T> | null | undefined, predicate?: ListIterateeCustom<T, boolean>, fromIndex?: number) => number =
	require('lodash/findLastIndex');
export const times: <TResult>(n: number, iteratee: (num: number) => TResult) => TResult[] = require('lodash/times');
export const isNumber: (value?: any) => value is number = require('lodash/isNumber');
export const isString: (value?: any) => value is string = require('lodash/isString');
export const isBoolean: (value?: any) => value is boolean = require('lodash/isBoolean');
export const isFunction: (value?: any) => value is (...args: any[]) => any = require('lodash/isFunction');
export const clamp: (number: number, lower: number, upper: number) => number = require('lodash/clamp');
export const merge: <TObject, TSource>(object: TObject, source: TSource) => TObject & TSource = require('lodash/merge');
export const mapValues: <T extends object, TResult>(obj: T | null | undefined, callback: ObjectIterator<T, TResult>) =>
	{ [P in keyof T]: TResult } = require('lodash/mapValues');
export const zip: <T>(...arrays: (List<T> | null | undefined)[]) => (T | undefined)[][] = require('lodash/zip');
export const assignWith = require('lodash/assignWith');
export const isMatchWith = require('lodash/isMatchWith');
export const once: <T extends (...args: any[]) => any>(func: T) => T = require('lodash/once');
export const range: (start: number, end?: number, step?: number) => number[] = require('lodash/range');
export const flatten: <T>(array: List<Many<T>> | null | undefined) => T[] = require('lodash/flatten');
export const sum = require('lodash/sum');
export const remove: <T>(array: List<T>, predicate?: ListIteratee<T>) => T[] = require('lodash/remove');
export const debounce = require('lodash/debounce');
export const dropRight: <T>(array: List<T> | null | undefined, n?: number) => T[] = require('lodash/dropRight');
export const padStart: (string?: string, length?: number, chars?: string) => string = require('lodash/padStart');
export const fill = require('lodash/fill');
export const includes = require('lodash/includes');
export const random = require('lodash/random');
export const max: <T>(collection: List<T> | null | undefined) => T | undefined = require('lodash/max');
export const uniqueId = require('lodash/uniqueId');
export const startsWith: (string?: string, target?: string, position?: number) => boolean = require('lodash/startsWith');
export const repeat: (string?: string, n?: number) => string = require('lodash/repeat');
export const uniq: <T>(array: List<T> | null | undefined) => T[] = require('lodash/uniq');
export const flatMap: FlatMap = require('lodash/flatMap');
export const without: <T>(array: List<T> | null | undefined, ...values: T[]) => T[] = require('lodash/without');
export const compact: <T>(array: List<T | null | undefined | false | '' | 0> | null | undefined) => T[] =
	require('lodash/compact');
export const isEqual = require('lodash/isEqual');
export const dropRightWhile: <T>(array: List<T> | null | undefined, predicate?: ListIteratee<T>) => T[] =
	require('lodash/dropRightWhile');
export const fromPairs = require('lodash/fromPairs');
export const camelCase = require('lodash/camelCase');
export const truncate = require('lodash/truncate');
export const findIndex = require('lodash/findIndex');
export const last = require('lodash/last');
export const toPairs: <T>(object?: Dictionary<T> | NumericDictionary<T>) => [string, T][] = require('lodash/toPairs');
export const groupBy: <T>(collection: List<T> | null | undefined, iteratee?: ValueIteratee<T>) => Dictionary<T[]> =
	require('lodash/groupBy');
