import '../lib';
import { expect } from 'chai';
import { spy, assert, SinonFakeTimers, useFakeTimers } from 'sinon';
import {
	arraysEqual, removeItem, removeById, dispose, fromNow, clamp, normalize,
	toInt, hasFlag, setFlag, at, findById, distance, contains, maxDate, minDate,
	flatten, includes, isCommand, processCommand, collidersIntersect, formatDuration, att
} from '../../common/utils';
import { rect } from '../../common/rect';

describe('utils', () => {
	describe('fromNow()', () => {
		let clock: SinonFakeTimers;

		beforeEach(() => {
			clock = useFakeTimers();
		});

		afterEach(() => {
			clock.restore();
		});

		it('returns date object', () => {
			expect(fromNow(0)).instanceof(Date);
		});

		it('returns current time for 0 offset', () => {
			clock.setSystemTime(123);

			expect(fromNow(0).getTime()).equal(123);
		});

		it('returns current time offset by given amount', () => {
			clock.setSystemTime(123);

			expect(fromNow(100).getTime()).equal(223);
		});
	});

	describe('maxDate()', () => {
		it('returns larger of two dates', () => {
			expect(maxDate(new Date(123), new Date(122))!.getTime()).equal(123);
		});

		it('returns larger of two dates (2)', () => {
			expect(maxDate(new Date(123), new Date(124))!.getTime()).equal(124);
		});

		it('returns non-undefined date', () => {
			expect(maxDate(new Date(123), undefined)!.getTime()).equal(123);
		});

		it('returns non-undefined date (2)', () => {
			expect(maxDate(undefined, new Date(123))!.getTime()).equal(123);
		});

		it('returns undefined if both dates are undefined', () => {
			expect(maxDate(undefined, undefined)).undefined;
		});
	});

	describe('minDate()', () => {
		it('returns smaller of two dates', () => {
			expect(minDate(new Date(123), new Date(122))!.getTime()).equal(122);
		});

		it('returns smaller of two dates (2)', () => {
			expect(minDate(new Date(123), new Date(124))!.getTime()).equal(123);
		});

		it('returns non-undefined date', () => {
			expect(minDate(new Date(123), undefined)!.getTime()).equal(123);
		});

		it('returns non-undefined date (2)', () => {
			expect(minDate(undefined, new Date(123))!.getTime()).equal(123);
		});

		it('returns undefined if both dates are undefined', () => {
			expect(minDate(undefined, undefined)).undefined;
		});
	});

	describe('formatDuration()', () => {
		it('returns 0s for 0 duration', () => {
			expect(formatDuration(0)).equal('0s');
		});

		it('returns duration seconds', () => {
			expect(formatDuration(15000)).equal('15s');
		});

		it('returns duration minutes and seconds', () => {
			expect(formatDuration(15 * 60 * 1000 + 6 * 1000)).equal('15m 6s');
		});

		it('returns duration hours and minutes', () => {
			expect(formatDuration(15 * 3600 * 1000 + 13 * 60 * 1000 + 6 * 1000)).equal('15h 13m');
		});

		it('returns days and hours', () => {
			expect(formatDuration((10 + 24 * 2) * 3600 * 1000 + 13 * 60 * 1000 + 6 * 1000)).equal('2d 10h');
		});
	});

	describe('clamp()', () => {
		it('returns given value if within range', () => {
			expect(clamp(2, 1, 3)).equal(2);
		});

		it('returns minimum for value below minimum', () => {
			expect(clamp(0, 1, 3)).equal(1);
		});

		it('returns maximum for value above maximum', () => {
			expect(clamp(5, 1, 3)).equal(3);
		});

		it('returns minimum for NaN', () => {
			expect(clamp(NaN, 1, 3)).equal(1);
		});
	});

	describe('normalize()', () => {
		it('returns given values as vector', () => {
			expect(normalize(1, 0)).eql({ x: 1, y: 0 });
		});

		it('returns normalized vector', () => {
			expect(normalize(0, -5)).eql({ x: 0, y: -1 });
		});
	});

	describe('toInt()', () => {
		it('returns given integer value', () => {
			expect(toInt(1)).equal(1);
			expect(toInt(-5)).equal(-5);
		});

		it('converts float number to integer value', () => {
			expect(toInt(1.5)).eql(1);
			expect(toInt(0.15)).eql(0);
			expect(toInt(123.9)).eql(123);
		});

		it('converts string to integer value', () => {
			expect(toInt('1.5')).eql(1);
			expect(toInt('5')).eql(5);
		});

		it('converts null or undefined to 0', () => {
			expect(toInt(null)).eql(0);
			expect(toInt(undefined)).eql(0);
		});

		it('converts any object or array to 0', () => {
			expect(toInt([])).eql(0);
			expect(toInt({})).eql(0);
		});
	});

	describe('hasFlag()', () => {
		enum Foo {
			Aaa = 1,
			Bbb = 2,
		}

		it('returns true if flag is set', () => {
			expect(hasFlag(Foo.Aaa, Foo.Aaa)).true;
		});

		it('returns true if flag is also set', () => {
			expect(hasFlag(Foo.Aaa | Foo.Bbb, Foo.Aaa)).true;
		});

		it('returns false if flag is not set', () => {
			expect(hasFlag(Foo.Bbb, Foo.Aaa)).false;
		});
	});

	describe('setFlag()', () => {
		enum Foo {
			Aaa = 1,
			Bbb = 2,
		}

		it('sets flag', () => {
			expect(setFlag(0, Foo.Aaa, true)).equal(Foo.Aaa);
		});

		it('unsets flag', () => {
			expect(setFlag(Foo.Aaa, Foo.Aaa, false)).equal(0);
		});

		it('does nothing if already set', () => {
			expect(setFlag(Foo.Aaa, Foo.Aaa, true)).equal(Foo.Aaa);
		});

		it('does nothing if already unset', () => {
			expect(setFlag(0, Foo.Aaa, false)).equal(0);
		});

		it('sets with another flag', () => {
			expect(setFlag(Foo.Bbb, Foo.Aaa, true)).equal(Foo.Aaa | Foo.Bbb);
		});

		it('unsets flag with another flag', () => {
			expect(setFlag(Foo.Bbb | Foo.Aaa, Foo.Aaa, false)).equal(Foo.Bbb);
		});
	});

	describe('includes()', () => {
		it('returns true if array includes given element', () => {
			expect(includes(['a', 'b', 'c'], 'b')).true;
		});

		it('returns false if array does not include given element', () => {
			expect(includes(['a', 'b', 'c'], 'd')).false;
		});

		it('returns false if array is undefined', () => {
			expect(includes(undefined, 'b')).false;
		});
	});

	describe('flatten()', () => {
		it('returns empty array for ampty array', () => {
			expect(flatten([])).eql([]);
		});

		it('flattens single array', () => {
			expect(flatten([[1, 2, 3]])).eql([1, 2, 3]);
		});

		it('flattens multiple arrays', () => {
			expect(flatten([[1, 2, 3], [4, 5]])).eql([1, 2, 3, 4, 5]);
		});
	});

	describe('at()', () => {
		it('returns item at given index', () => {
			expect(at(['a', 'b', 'c'], 1)).equal('b');
		});

		it('clamps index to array length', () => {
			expect(at(['a', 'b', 'c'], 4)).equal('c');
		});

		it('clamps index to 0', () => {
			expect(at(['a', 'b', 'c'], -1)).equal('a');
		});

		it('converts index to integer', () => {
			expect(at(['a', 'b', 'c'], '1.3')).equal('b');
		});

		it('returns undefined for empty items list', () => {
			expect(at([], 0)).undefined;
		});
	});

	describe('att()', () => {
		it('returns item at given index', () => {
			expect(att(['a', 'b', 'c'], 1)).equal('b');
		});

		it('clamps index to array length', () => {
			expect(att(['a', 'b', 'c'], 4)).equal('c');
		});

		it('clamps index to 0', () => {
			expect(att(['a', 'b', 'c'], -1)).equal('a');
		});

		it('converts index to integer', () => {
			expect(att(['a', 'b', 'c'], '1.3')).equal('b');
		});

		it('returns undefined for undefined items list', () => {
			expect(att(undefined, 0)).undefined;
		});

		it('returns undefined for null items list', () => {
			expect(att(null, 0)).undefined;
		});

		it('returns undefined for empty items list', () => {
			expect(att([], 0)).undefined;
		});
	});

	describe('findById()', () => {
		it('returns item with given ID', () => {
			expect(findById([{ id: 'a' }, { id: 'b' }, { id: 'c' }], 'b')).eql({ id: 'b' });
		});

		it('returns undefined if not found', () => {
			expect(findById([{ id: 'a' }, { id: 'b' }, { id: 'c' }], 'd')).undefined;
		});
	});

	describe('arraysEqual()', () => {
		it('returns false for identical arrays', () => {
			expect(arraysEqual([1, 2], [1, 2])).true;
		});

		it('returns false for different size arrays', () => {
			expect(arraysEqual([1], [1, 2])).false;
		});

		it('returns false for different values in arrays', () => {
			expect(arraysEqual([1, 3], [1, 2])).false;
		});
	});

	describe('removeItem()', () => {
		it('removes given item', () => {
			const array = [1, 2, 3];
			expect(removeItem(array, 2)).true;
			expect(array).eql([1, 3]);
		});

		it('removes only first instance of element', () => {
			const array = [1, 2, 3, 2];
			expect(removeItem(array, 2)).true;
			expect(array).eql([1, 3, 2]);
		});

		it('does nothing for empty array', () => {
			const array: any[] = [];
			expect(removeItem(array, 2)).false;
			expect(array).eql([]);
		});

		it('does nothing if iten does not exist', () => {
			const array = [1, 2, 3];
			expect(removeItem(array, 5)).false;
			expect(array).eql([1, 2, 3]);
		});
	});

	describe('removeById()', () => {
		it('removes item with given ID', () => {
			const x = { id: 2 };
			const array = [{ id: 1 }, x, { id: 3 }];
			expect(removeById(array, 2)).equal(x);
			expect(array).eql([{ id: 1 }, { id: 3 }]);
		});

		it('removes only first instance of element', () => {
			const array = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 2 }];
			removeById(array, 2);
			expect(array).eql([{ id: 1 }, { id: 3 }, { id: 2 }]);
		});

		it('does nothing for empty array', () => {
			const array: any[] = [];
			expect(removeById(array, 2)).undefined;
			expect(array).eql([]);
		});

		it('does nothing if iten does not exist', () => {
			const array = [{ id: 1 }, { id: 2 }, { id: 3 }];
			expect(removeById(array, 5)).undefined;
			expect(array).eql([{ id: 1 }, { id: 2 }, { id: 3 }]);
		});
	});

	describe('dispose()', () => {
		it('calls dispose method on give object', () => {
			const disp = spy();
			dispose({ dispose: disp });
			assert.called(disp);
		});

		it('returns undefined', () => {
			expect(dispose({ dispose() { return 5; } })).undefined;
		});

		it('does nothing for undefined', () => {
			dispose(undefined);
		});
	});

	describe('distance()', () => {
		it('returns distance between points', () => {
			expect(distance({ x: 10, y: 0 }, { x: 20, y: 0 })).equal(10);
		});
	});

	describe('contains()', () => {
		it('returns true if point is inside moved bounds', () => {
			expect(contains(10, 10, { x: 0, y: 0, w: 100, h: 100 }, { x: 12, y: 12 })).true;
		});

		it('returns false if point is not inside moved bounds', () => {
			expect(contains(10, 10, { x: 0, y: 0, w: 100, h: 100 }, { x: 0, y: 0 })).false;
		});
	});

	describe('collidersIntersect()', () => {
		it('returns true if two colliders intersect', () => {
			expect(collidersIntersect(0, 0, rect(10, 10, 20, 20), 0, 0, rect(15, 15, 20, 20))).true;
		});

		it('returns true if two colliders intersect when moved', () => {
			expect(collidersIntersect(15, 15, rect(10, 10, 10, 10), 0, 0, rect(30, 30, 10, 10))).true;
			expect(collidersIntersect(0, 0, rect(10, 10, 10, 10), -15, -15, rect(30, 30, 10, 10))).true;
		});

		it('returns true if two colliders do not intersect', () => {
			expect(collidersIntersect(0, 0, rect(10, 10, 20, 20), 0, 0, rect(50, 50, 20, 20))).false;
		});

		it('returns true if two colliders touch edges', () => {
			expect(collidersIntersect(0, 0, rect(10, 10, 10, 10), 0, 0, rect(20, 10, 20, 10))).false;
			expect(collidersIntersect(0, 0, rect(10, 10, 10, 10), 0, 0, rect(10, 20, 10, 20))).false;
		});

		it('returns false if two colliders do not intersect when moved', () => {
			expect(collidersIntersect(0, 0, rect(10, 10, 20, 20), 20, 20, rect(15, 15, 20, 20))).false;
		});
	});

	describe('isCommand()', () => {
		it('returns false for regular text', () => {
			expect(isCommand('hello')).false;
		});

		it('returns true for text starting with /', () => {
			expect(isCommand('/test')).true;
		});

		it('returns true for "/"', () => {
			expect(isCommand('/')).true;
		});
	});

	describe('processCommand()', () => {
		it('returns command and args', () => {
			expect(processCommand('/foo bar')).eql({ command: 'foo', args: 'bar' });
		});

		it('parses command without args', () => {
			expect(processCommand('/foo')).eql({ command: 'foo', args: '' });
		});

		it('trims command name', () => {
			expect(processCommand('/foo ')).eql({ command: 'foo', args: '' });
		});

		it('trims args', () => {
			expect(processCommand('/foo bar ')).eql({ command: 'foo', args: 'bar' });
		});
	});
});
