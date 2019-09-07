"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const http_1 = require("@angular/common/http");
const lodash_1 = require("lodash");
const color_1 = require("../../../common/color");
const colors_1 = require("../../../common/colors");
const ponyInfo_1 = require("../../../common/ponyInfo");
const compressPony_1 = require("../../../common/compressPony");
const icons_1 = require("../../../client/icons");
const paletteManager_1 = require("../../../graphics/paletteManager");
const swears_1 = require("../../../common/swears");
const bitUtils_1 = require("../../../common/bitUtils");
const utils_1 = require("../../../common/utils");
const methods_1 = require("./methods");
let ToolsPerf = class ToolsPerf {
    constructor(http, zone) {
        this.zone = zone;
        this.homeIcon = icons_1.faHome;
        this.output = '';
        this.ponies = [];
        this.messages = [];
        this.tests = [];
        http.get('/tests/ponies.json').subscribe(data => this.ponies = data);
        http.get('/tests/messages.json').subscribe(data => this.messages = data);
        this.output = compressPony_1.createPostDecompressPony().toString();
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
    runTest(test) {
        this.zone.runOutsideAngular(() => setTimeout(test, 20));
    }
};
ToolsPerf = tslib_1.__decorate([
    core_1.Component({
        selector: 'tools-perf',
        templateUrl: 'tools-perf.pug',
    }),
    tslib_1.__metadata("design:paramtypes", [http_1.HttpClient, core_1.NgZone])
], ToolsPerf);
exports.ToolsPerf = ToolsPerf;
function measure(name, iterations, func) {
    if (!iterations)
        return;
    const start = performance.now();
    let v;
    for (let i = 0; i < iterations; i++) {
        v = func(i);
    }
    const end = performance.now();
    const diff = end - start;
    console.log(`${name}: ${diff.toFixed(0)}ms, ${(diff / iterations).toFixed(3)}ms per iteration // ${!!v}`);
}
function compressColorsTest() {
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
    const oldMethod = bitUtils_1.bitWriter(write => colors.forEach(x => write(x >> 8, 24)));
    const truncated = colors.map(c => (c >>> 8) & 0xffffff);
    truncated.sort((a, b) => a > b ? 1 : (a < b ? -1 : 0));
    console.log(truncated);
    console.log(truncated.slice(1).map((c, i) => (c - truncated[i]).toString(16)));
    const newMethod = bitUtils_1.bitWriter(write => truncated.forEach(x => write(x, 24)));
    console.log('old', oldMethod.byteLength);
    console.log('new', newMethod.byteLength);
}
exports.compressColorsTest = compressColorsTest;
exports.results = [];
function parseColorTest() {
    const iterations = 100000;
    function parseColorExperimental(value) {
        return (parseInt(value, 16) << 8) | 0xff;
    }
    measure('COLOR parseColorWithAlpha', iterations, () => {
        return color_1.parseColorWithAlpha('ff4354', 1);
    });
    measure('COLOR parseColorFast', iterations, () => {
        return color_1.parseColorFast('ff4354');
    });
    measure('COLOR parseColorExperimental', iterations, () => {
        return parseColorExperimental('ff4354');
    });
}
exports.parseColorTest = parseColorTest;
function compareArrays() {
    const iterations = 100000;
    const a = [2423, 534534, 546124, 23412, 54364, 67756, 234234];
    const b = [564, 867867, 65645, 567567, 34534, 32453, 867867];
    const c = [2423, 534534, 546124, 23412, 54364, 67756, 234234];
    const d = [2423, 534534, 546124, 23412, 54364, 67756];
    let t;
    function compareArrays(a, b) {
        if (a.length !== b.length)
            return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i])
                return false;
        }
        return true;
    }
    measure('ARRAY _.isEqual', iterations, () => {
        t = lodash_1.isEqual(a, b);
        t = lodash_1.isEqual(a, c) || t;
        t = lodash_1.isEqual(a, d) || t;
        exports.results.push(t);
    });
    measure('ARRAY compareArrays', iterations, () => {
        t = compareArrays(a, b);
        t = compareArrays(a, c) || t;
        t = compareArrays(a, d) || t;
        exports.results.push(t);
    });
}
exports.compareArrays = compareArrays;
function decode(data) {
    let manager = new paletteManager_1.PaletteManager();
    // manager = ({ addArray: (x: any) => x } as any);
    measure('DECODE 1', 10000, i => {
        exports.results.push(compressPony_1.decodePonyInfo(data[i % data.length], manager));
    });
    // console.log(((manager as any).palettes as any[]).map(x => x.length).join(', '));
}
exports.decode = decode;
function utfTest(messages) {
    const iterations = 300000;
    measure('old', iterations, i => {
        exports.results.push(methods_1.encodeString(messages[i % messages.length]));
    });
    measure('new', iterations, i => {
        exports.results.push(methods_1.encodeStringNew(messages[i % messages.length]));
    });
    const encoder = new window.TextEncoder('utf8');
    measure('native', iterations, i => {
        exports.results.push(encoder.encode(messages[i % messages.length]));
    });
}
exports.utfTest = utfTest;
function arrayTest() {
    const iterations = 10000;
    const length = 100;
    const size = 24;
    const typed = new Int32Array(length * size);
    const typed2 = new Uint16Array(length * size);
    for (let i = 0; i < typed.length; i++) {
        typed2[i] = typed[i] = Math.random() * 0xffff;
    }
    const objects = lodash_1.times(length, i => ({
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
    const indexes = lodash_1.times(length, () => (Math.random() * length) | 0);
    measure('typed', iterations, index => {
        let sum = 0;
        for (let i = 0; i < length; i++) {
            const offset = (indexes[(i + index) % length]) * 24;
            for (let j = 0; j < size; j++) {
                sum += typed[offset + j];
            }
        }
        exports.results.push(sum);
    });
    measure('typed2', iterations, index => {
        let sum = 0;
        for (let i = 0; i < length; i++) {
            const offset = (indexes[(i + index) % length]) * 24;
            for (let j = 0; j < size; j++) {
                sum += typed2[offset + j];
            }
        }
        exports.results.push(sum);
    });
    measure('objects', iterations, index => {
        let sum = 0;
        for (let i = 0; i < length; i++) {
            const offset = indexes[(i + index) % length];
            const o = objects[offset];
            sum += o.a + o.b + o.c + o.d + o.e + o.f + o.g + o.h + o.i + o.j + o.k + o.l +
                o.m + o.n + o.o + o.p + o.q + o.r + o.s + o.t + o.u + o.v + o.w + o.x;
        }
        exports.results.push(sum);
    });
}
exports.arrayTest = arrayTest;
function fillToOutlineTest() {
    const iterations = 100000;
    function fillToOutlineFast(color) {
        return color_1.colorToHexRGB(color_1.parseColorFast(color));
    }
    measure('FILL-TO-OUTLINE fillToOutline', iterations, () => {
        colors_1.fillToOutline('32cd32');
    });
    measure('FILL-TO-OUTLINE fillToOutlineFast', iterations, () => {
        fillToOutlineFast('32cd32');
    });
}
exports.fillToOutlineTest = fillToOutlineTest;
function includeTest() {
    const iterations = 100000;
    const array = lodash_1.range(1000).map(() => lodash_1.random(0, 1000));
    let t = 0;
    // measure('INCLUDE _.includes', iterations, () => {
    // 	t += includes(array, array[random(0, 1000)]) as any | 0;
    // 	t += includes(array, array[random(0, 1000)]) as any | 0;
    // 	t += includes(array, array[random(0, 1000)]) as any | 0;
    // });
    measure('INCLUDE includes', iterations, () => {
        t += utils_1.includes(array, array[lodash_1.random(0, 1000)]);
        t += utils_1.includes(array, array[lodash_1.random(0, 1000)]);
        t += utils_1.includes(array, array[lodash_1.random(0, 1000)]);
    });
    measure('INCLUDE indexOf !== -1', iterations, () => {
        t += (array.indexOf(array[lodash_1.random(0, 1000)]) !== -1);
        t += (array.indexOf(array[lodash_1.random(0, 1000)]) !== -1);
        t += (array.indexOf(array[lodash_1.random(0, 1000)]) !== -1);
    });
    exports.results.push(t);
}
exports.includeTest = includeTest;
function toColorListTest() {
    function toColorList2Old(colors) {
        return [0, ...colors.map(c => c || 0xff)];
    }
    const iterations = 100000;
    let t = [];
    measure('TOCOLORLIST2 old', iterations, () => {
        t.push(toColorList2Old([1, 2, Date.now(), Date.now(), 5, 6]));
    });
    measure('TOCOLORLIST2 new', iterations, () => {
        t.push(ponyInfo_1.toColorListNumber([1, 2, Date.now(), Date.now(), 5, 6]));
    });
    exports.results.push(t);
}
exports.toColorListTest = toColorListTest;
function copyTest() {
    const iterations = 10000;
    let t = [];
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
    exports.results.push(t);
}
exports.copyTest = copyTest;
function regexTest(testStrings) {
    const iterations = 1000000;
    const t = [];
    measure('WITH_GROUPS', iterations, iteration => {
        const test = testStrings[iteration % testStrings.length];
        t.push(test.replace(/(a|b)(.)(.)(.)(.)(.)/, 'X'));
    });
    measure('WITHOUT_GROUPS', iterations, iteration => {
        const test = testStrings[iteration % testStrings.length];
        t.push(test.replace(/(?:a|b)(?:.)(?:.)(?:.)(?:.)(?:.)/, 'X'));
    });
    exports.results.push(t);
}
exports.regexTest = regexTest;
function swearTest(testStrings) {
    const iterations = 10000;
    const t = [];
    measure('TEST', iterations, iteration => {
        const test = testStrings[iteration % testStrings.length];
        t.push(swears_1.filterBadWords(test));
    });
    exports.results.push(t);
}
exports.swearTest = swearTest;
function swearEntryTest(testStrings, onResult) {
    const iterations = 2000;
    const output = [];
    const entries = swears_1.createMatchEntries();
    for (const e of entries) {
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
            const test = testStrings[i % testStrings.length];
            exports.results.push(test.replace(e.regex, '*****'));
        }
        const diff = performance.now() - start;
        output.push({ e, diff });
    }
    onResult(output
        .sort((a, b) => b.diff - a.diff)
        .map(x => `${x.diff.toFixed(2).padStart(6)} "${x.e.line}"`)
        .join('\n'));
}
exports.swearEntryTest = swearEntryTest;
window.__results = exports.results;
//# sourceMappingURL=tools-perf.js.map