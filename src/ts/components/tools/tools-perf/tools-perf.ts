import { Component, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isEqual, range, random, times } from 'lodash';
import { parseColorWithAlpha, parseColorFast, colorToHexRGB } from '../../../common/color';
import { fillToOutline } from '../../../common/colors';
import { toColorListNumber } from '../../../common/ponyInfo';
import { decodePonyInfo, createPostDecompressPony } from '../../../common/compressPony';
import { faHome } from '../../../client/icons';
import { PaletteManager } from '../../../graphics/paletteManager';
import { filterBadWords, createMatchEntries } from '../../../common/swears';
import { bitWriter } from '../../../common/bitUtils';
import { includes as utilsIncludes } from '../../../common/utils';
import { encodeString, encodeStringNew } from './methods';

@Component({
	selector: 'tools-perf',
	templateUrl: 'tools-perf.pug',
})
export class ToolsPerf {
	readonly homeIcon = faHome;
	output = '';
	ponies: string[] = [];
	messages: string[] = [];
	tests: { name: string; func: () => void; }[] = [];
	constructor(http: HttpClient, private zone: NgZone) {
		http.get<string[]>('/tests/ponies.json').subscribe(data => this.ponies = data);
		http.get<string[]>('/tests/messages.json').subscribe(data => this.messages = data);
		this.output = createPostDecompressPony().toString();
		this.tests.push({ name: 'arrays', func: () => this.runTest(arrayTest) });
		this.tests.push({ name: 'compress colors', func: () => this.runTest(compressColorsTest) });
		this.tests.push({ name: 'parse color', func: () => this.runTest(parseColorTest) });
		this.tests.push({ name: 'compare arrays', func: () => this.runTest(compareArrays) });
		this.tests.push({ name: 'utf', func: () => this.runTest(() => utfTest(this.messages)) });
		this.tests.push({ name: 'includes', func: () => this.runTest(includeTest) });
	}
	run() {
		this.runTest(() => utfTest(this.messages));
	}
	stats() {
		swearEntryTest(this.messages, x => this.output = x);
	}
	private runTest(test: () => void) {
		this.zone.runOutsideAngular(() => setTimeout(test, 20));
	}
}

function measure(name: string, iterations: number, func: (i: number) => void) {
	if (!iterations)
		return;

	const start = performance.now();
	let v: any;

	for (let i = 0; i < iterations; i++) {
		v = func(i);
	}

	const end = performance.now();
	const diff = end - start;

	console.log(`${name}: ${diff.toFixed(0)}ms, ${(diff / iterations).toFixed(3)}ms per iteration // ${!!v}`);
}

export function compressColorsTest() {
	const colors = [
		3553475327, 2592097791, 3662487807, 545184511, 2744818431, 1658462463, 16764927, 7864319,
		4278253055, 2492366335, 10033407, 11763711, 6730751, 3003165951, 2997456127, 1447512063,
		1936281087, 874586623, 3713423103, 2099652351, 4293220607, 512819199, 852308735, 3664828159,
		3692313855, 2147472639, 2861699071, 5944319, 42992383, 2570622463, 2583699455, 1051954175,
		3013286911, 2762969343, 1400052223, 1991223551, 1049483775, 611346431, 272724223, 1392443647,
		1589395455, 3201321215, 2679322623, 3233857791, 1280068863, 2560137471, 437918463, 3908210943,
		3602601215, 4001558271, 2806294527, 2508550143, 1732985855, 1330597887, 1381126911, 1750746879,
		1211049983, 926365695, 960051711, 2659530751, 3597364223, 777334527, 2201321727, 2120247039,
		2441106175, 2354205439, 1844342271, 3613774847, 1967148031, 4289003775, 3600494335, 3164100095,
		2845275903, 3098517247, 1463486719, 1699355647, 1834628607, 1936084991, 2307095039, 857933311,
		740297471, 807801599, 740629247, 656811007, 3587560959, 2998055679, 2425393407, 1869574143,
		4294967295, 4294238719, 4293575679, 4292051711, 4291190527
	].map(x => x >>> 0);

	const oldMethod = bitWriter(write => colors.forEach(x => write(x >> 8, 24)));

	const truncated = colors.map(c => (c >>> 8) & 0xffffff);
	truncated.sort((a, b) => a > b ? 1 : (a < b ? -1 : 0));

	console.log(truncated);
	console.log(truncated.slice(1).map((c, i) => (c - truncated[i]).toString(16)));

	const newMethod = bitWriter(write => truncated.forEach(x => write(x, 24)));

	console.log('old', oldMethod.byteLength);
	console.log('new', newMethod.byteLength);
}

export const results: any[] = [];

export function parseColorTest() {
	const iterations = 100000;

	function parseColorExperimental(value: string) {
		return (parseInt(value, 16) << 8) | 0xff;
	}

	measure('COLOR parseColorWithAlpha', iterations, () => {
		return parseColorWithAlpha('ff4354', 1);
	});

	measure('COLOR parseColorFast', iterations, () => {
		return parseColorFast('ff4354');
	});

	measure('COLOR parseColorExperimental', iterations, () => {
		return parseColorExperimental('ff4354');
	});
}

export function compareArrays() {
	const iterations = 100000;
	const a = [2423, 534534, 546124, 23412, 54364, 67756, 234234];
	const b = [564, 867867, 65645, 567567, 34534, 32453, 867867];
	const c = [2423, 534534, 546124, 23412, 54364, 67756, 234234];
	const d = [2423, 534534, 546124, 23412, 54364, 67756];
	let t: any;

	function compareArrays(a: number[], b: number[]) {
		if (a.length !== b.length)
			return false;

		for (let i = 0; i < a.length; i++) {
			if (a[i] !== b[i])
				return false;
		}

		return true;
	}

	measure('ARRAY _.isEqual', iterations, () => {
		t = isEqual(a, b);
		t = isEqual(a, c) || t;
		t = isEqual(a, d) || t;
		results.push(t);
	});

	measure('ARRAY compareArrays', iterations, () => {
		t = compareArrays(a, b);
		t = compareArrays(a, c) || t;
		t = compareArrays(a, d) || t;
		results.push(t);
	});
}

export function decode(data: string[]) {
	let manager = new PaletteManager();
	// manager = ({ addArray: (x: any) => x } as any);

	measure('DECODE 1', 10000, i => {
		results.push(decodePonyInfo(data[i % data.length], manager));
	});

	// console.log(((manager as any).palettes as any[]).map(x => x.length).join(', '));
}

export function utfTest(messages: string[]) {
	const iterations = 300000;

	measure('old', iterations, i => {
		results.push(encodeString(messages[i % messages.length]));
	});

	measure('new', iterations, i => {
		results.push(encodeStringNew(messages[i % messages.length]));
	});

	const encoder = new (window as any).TextEncoder('utf8');

	measure('native', iterations, i => {
		results.push(encoder.encode(messages[i % messages.length]));
	});
}

export function arrayTest() {
	const iterations = 10000;
	const length = 100;
	const size = 24;
	const typed = new Int32Array(length * size);
	const typed2 = new Uint16Array(length * size);

	for (let i = 0; i < typed.length; i++) {
		typed2[i] = typed[i] = Math.random() * 0xffff;
	}

	const objects = times(length, i => ({
		a: typed[i * size + 0],
		b: typed[i * size + 1],
		c: typed[i * size + 2],
		d: typed[i * size + 3],
		e: typed[i * size + 4],
		f: typed[i * size + 5],
		g: typed[i * size + 6],
		h: typed[i * size + 7],
		i: typed[i * size + 8],
		j: typed[i * size + 9],
		k: typed[i * size + 10],
		l: typed[i * size + 11],
		m: typed[i * size + 12],
		n: typed[i * size + 13],
		o: typed[i * size + 14],
		p: typed[i * size + 15],
		q: typed[i * size + 16],
		r: typed[i * size + 17],
		s: typed[i * size + 18],
		t: typed[i * size + 19],
		u: typed[i * size + 20],
		v: typed[i * size + 21],
		w: typed[i * size + 22],
		x: typed[i * size + 23],
	}));

	const indexes = times(length, () => (Math.random() * length) | 0);

	measure('typed', iterations, index => {
		let sum = 0;
		for (let i = 0; i < length; i++) {
			const offset = (indexes[(i + index) % length]) * 24;

			for (let j = 0; j < size; j++) {
				sum += typed[offset + j];
			}
		}
		results.push(sum);
	});

	measure('typed2', iterations, index => {
		let sum = 0;
		for (let i = 0; i < length; i++) {
			const offset = (indexes[(i + index) % length]) * 24;

			for (let j = 0; j < size; j++) {
				sum += typed2[offset + j];
			}
		}
		results.push(sum);
	});

	measure('objects', iterations, index => {
		let sum = 0;
		for (let i = 0; i < length; i++) {
			const offset = indexes[(i + index) % length];
			const o = objects[offset];
			sum += o.a + o.b + o.c + o.d + o.e + o.f + o.g + o.h + o.i + o.j + o.k + o.l +
				o.m + o.n + o.o + o.p + o.q + o.r + o.s + o.t + o.u + o.v + o.w + o.x;
		}
		results.push(sum);
	});
}

export function fillToOutlineTest() {
	const iterations = 100000;

	function fillToOutlineFast(color: string) {
		return colorToHexRGB(parseColorFast(color));
	}

	measure('FILL-TO-OUTLINE fillToOutline', iterations, () => {
		fillToOutline('32cd32');
	});

	measure('FILL-TO-OUTLINE fillToOutlineFast', iterations, () => {
		fillToOutlineFast('32cd32');
	});
}

export function includeTest() {
	const iterations = 100000;
	const array = range(1000).map(() => random(0, 1000));
	let t = 0;

	// measure('INCLUDE _.includes', iterations, () => {
	// 	t += includes(array, array[random(0, 1000)]) as any | 0;
	// 	t += includes(array, array[random(0, 1000)]) as any | 0;
	// 	t += includes(array, array[random(0, 1000)]) as any | 0;
	// });

	measure('INCLUDE includes', iterations, () => {
		t += utilsIncludes(array, array[random(0, 1000)]) as any | 0;
		t += utilsIncludes(array, array[random(0, 1000)]) as any | 0;
		t += utilsIncludes(array, array[random(0, 1000)]) as any | 0;
	});

	measure('INCLUDE indexOf !== -1', iterations, () => {
		t += (array.indexOf(array[random(0, 1000)]) !== -1) as any | 0;
		t += (array.indexOf(array[random(0, 1000)]) !== -1) as any | 0;
		t += (array.indexOf(array[random(0, 1000)]) !== -1) as any | 0;
	});

	results.push(t);
}

export function toColorListTest() {
	function toColorList2Old(colors: number[]) {
		return [0, ...colors.map(c => c || 0xff)];
	}

	const iterations = 100000;
	let t: any[] = [];

	measure('TOCOLORLIST2 old', iterations, () => {
		t.push(toColorList2Old([1, 2, Date.now(), Date.now(), 5, 6]));
	});

	measure('TOCOLORLIST2 new', iterations, () => {
		t.push(toColorListNumber([1, 2, Date.now(), Date.now(), 5, 6]));
	});

	results.push(t);
}

export function copyTest() {
	const iterations = 10000;
	let t: any[] = [];
	const src = new Uint32Array(1000);
	const dst = new Uint32Array(10000);

	for (let i = 0; i < src.length; i++) {
		src[i] = Math.random() * 10000;
	}

	for (let i = 0; i < dst.length; i++) {
		dst[i] = Math.random() * 10000;
	}

	measure('ONE_BY_ONE', iterations, iteration => {
		for (let i = 0; i < 10; i++) {
			for (let j = 0; j < src.length; j++) {
				dst[1000 * i + j] = src[j];
			}
		}

		t.push(dst, iteration);
	});

	measure('COPY_BUFFER', iterations, iteration => {
		for (let i = 0; i < 10; i++) {
			dst.set(src, 1000 * i);
		}

		t.push(dst, iteration);
	});

	results.push(t);
}

export function regexTest(testStrings: string[]) {
	const iterations = 1000000;
	const t: any[] = [];

	measure('WITH_GROUPS', iterations, iteration => {
		const test = testStrings[iteration % testStrings.length];
		t.push(test.replace(/(a|b)(.)(.)(.)(.)(.)/, 'X'));
	});

	measure('WITHOUT_GROUPS', iterations, iteration => {
		const test = testStrings[iteration % testStrings.length];
		t.push(test.replace(/(?:a|b)(?:.)(?:.)(?:.)(?:.)(?:.)/, 'X'));
	});

	results.push(t);
}

export function swearTest(testStrings: string[]) {
	const iterations = 10000;
	const t: any[] = [];

	measure('TEST', iterations, iteration => {
		const test = testStrings[iteration % testStrings.length];
		t.push(filterBadWords(test));
	});

	results.push(t);
}

export function swearEntryTest(testStrings: string[], onResult: (output: string) => void) {
	const iterations = 2000;
	const output: any[] = [];
	const entries = createMatchEntries();

	for (const e of entries) {
		const start = performance.now();

		for (let i = 0; i < iterations; i++) {
			const test = testStrings[i % testStrings.length];
			results.push(test.replace(e.regex, '*****'));
		}

		const diff = performance.now() - start;
		output.push({ e, diff });
	}

	onResult(output
		.sort((a, b) => b.diff - a.diff)
		.map(x => `${x.diff.toFixed(2).padStart(6)} "${x.e.line}"`)
		.join('\n'));
}

(window as any).__results = results;
