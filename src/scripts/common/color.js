"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const utils_1 = require("./utils");
exports.colorNames = {
    aliceblue: 'f0f8ff',
    antiquewhite: 'faebd7',
    aqua: '00ffff',
    aquamarine: '7fffd4',
    azure: 'f0ffff',
    beige: 'f5f5dc',
    bisque: 'ffe4c4',
    black: '000000',
    blanchedalmond: 'ffebcd',
    blue: '0000ff',
    blueviolet: '8a2be2',
    brown: 'a52a2a',
    burlywood: 'deb887',
    cadetblue: '5f9ea0',
    chartreuse: '7fff00',
    chocolate: 'd2691e',
    coral: 'ff7f50',
    cornflowerblue: '6495ed',
    cornsilk: 'fff8dc',
    crimson: 'dc143c',
    cyan: '00ffff',
    darkblue: '00008b',
    darkcyan: '008b8b',
    darkgoldenrod: 'b8860b',
    darkgray: 'a9a9a9',
    darkgreen: '006400',
    darkkhaki: 'bdb76b',
    darkmagenta: '8b008b',
    darkolivegreen: '556b2f',
    darkorange: 'ff8c00',
    darkorchid: '9932cc',
    darkred: '8b0000',
    darksalmon: 'e9967a',
    darkseagreen: '8fbc8f',
    darkslateblue: '483d8b',
    darkslategray: '2f4f4f',
    darkturquoise: '00ced1',
    darkviolet: '9400d3',
    deeppink: 'ff1493',
    deepskyblue: '00bfff',
    dimgray: '696969',
    dodgerblue: '1e90ff',
    feldspar: 'd19275',
    firebrick: 'b22222',
    floralwhite: 'fffaf0',
    forestgreen: '228b22',
    fuchsia: 'ff00ff',
    gainsboro: 'dcdcdc',
    ghostwhite: 'f8f8ff',
    gold: 'ffd700',
    goldenrod: 'daa520',
    gray: '808080',
    green: '008000',
    greenyellow: 'adff2f',
    honeydew: 'f0fff0',
    hotpink: 'ff69b4',
    indianred: 'cd5c5c',
    indigo: '4b0082',
    ivory: 'fffff0',
    khaki: 'f0e68c',
    lavender: 'e6e6fa',
    lavenderblush: 'fff0f5',
    lawngreen: '7cfc00',
    lemonchiffon: 'fffacd',
    lightblue: 'add8e6',
    lightcoral: 'f08080',
    lightcyan: 'e0ffff',
    lightgoldenrodyellow: 'fafad2',
    lightgrey: 'd3d3d3',
    lightgreen: '90ee90',
    lightpink: 'ffb6c1',
    lightsalmon: 'ffa07a',
    lightseagreen: '20b2aa',
    lightskyblue: '87cefa',
    lightslateblue: '8470ff',
    lightslategray: '778899',
    lightsteelblue: 'b0c4de',
    lightyellow: 'ffffe0',
    lime: '00ff00',
    limegreen: '32cd32',
    linen: 'faf0e6',
    magenta: 'ff00ff',
    maroon: '800000',
    mediumaquamarine: '66cdaa',
    mediumblue: '0000cd',
    mediumorchid: 'ba55d3',
    mediumpurple: '9370d8',
    mediumseagreen: '3cb371',
    mediumslateblue: '7b68ee',
    mediumspringgreen: '00fa9a',
    mediumturquoise: '48d1cc',
    mediumvioletred: 'c71585',
    midnightblue: '191970',
    mintcream: 'f5fffa',
    mistyrose: 'ffe4e1',
    moccasin: 'ffe4b5',
    navajowhite: 'ffdead',
    navy: '000080',
    oldlace: 'fdf5e6',
    olive: '808000',
    olivedrab: '6b8e23',
    orange: 'ffa500',
    orangered: 'ff4500',
    orchid: 'da70d6',
    palegoldenrod: 'eee8aa',
    palegreen: '98fb98',
    paleturquoise: 'afeeee',
    palevioletred: 'd87093',
    papayawhip: 'ffefd5',
    peachpuff: 'ffdab9',
    peru: 'cd853f',
    pink: 'ffc0cb',
    plum: 'dda0dd',
    powderblue: 'b0e0e6',
    purple: '800080',
    red: 'ff0000',
    rosybrown: 'bc8f8f',
    royalblue: '4169e1',
    saddlebrown: '8b4513',
    salmon: 'fa8072',
    sandybrown: 'f4a460',
    seagreen: '2e8b57',
    seashell: 'fff5ee',
    sienna: 'a0522d',
    silver: 'c0c0c0',
    skyblue: '87ceeb',
    slateblue: '6a5acd',
    slategray: '708090',
    snow: 'fffafa',
    springgreen: '00ff7f',
    steelblue: '4682b4',
    tan: 'd2b48c',
    teal: '008080',
    thistle: 'd8bfd8',
    tomato: 'ff6347',
    turquoise: '40e0d0',
    violet: 'ee82ee',
    violetred: 'd02090',
    wheat: 'f5deb3',
    white: 'ffffff',
    whitesmoke: 'f5f5f5',
    yellow: 'ffff00',
    yellowgreen: '9acd32'
};
const TRANSPARENT = 0x00000000 >>> 0;
const BLACK = 0x000000ff >>> 0;
function getR(color) {
    return (color >> 24) & 0xff;
}
exports.getR = getR;
function getG(color) {
    return (color >> 16) & 0xff;
}
exports.getG = getG;
function getB(color) {
    return (color >> 8) & 0xff;
}
exports.getB = getB;
function getAlpha(color) {
    return color & 0xff;
}
exports.getAlpha = getAlpha;
function withAlpha(color, alpha) {
    return (color & 0xffffff00) | (alpha & 0xff);
}
exports.withAlpha = withAlpha;
function withAlphaFloat(color, alpha) {
    return (color & 0xffffff00) | ((alpha * 255) & 0xff);
}
exports.withAlphaFloat = withAlphaFloat;
// to
function colorToRGBA(color) {
    return {
        r: getR(color),
        g: getG(color),
        b: getB(color),
        a: getAlpha(color),
    };
}
exports.colorToRGBA = colorToRGBA;
function colorToHSVA(color, h) {
    return rgb2hsv(getR(color), getG(color), getB(color), getAlpha(color) / 255, h);
}
exports.colorToHSVA = colorToHSVA;
function colorToCSS(color) {
    const alpha = getAlpha(color);
    if (alpha === 0xff) {
        return `#${colorToHexRGB(color)}`;
    }
    else {
        return `rgba(${getR(color)},${getG(color)},${getB(color)},${alpha / 255})`;
    }
}
exports.colorToCSS = colorToCSS;
function toHex(value, length) {
    return value.toString(16).padStart(length, '0');
}
function colorToHexRGB(color) {
    return toHex(color >>> 8, 6);
}
exports.colorToHexRGB = colorToHexRGB;
function colorToFloatArray(color) {
    const result = new Float32Array(4);
    colorToExistingFloatArray(result, color);
    return result;
}
exports.colorToFloatArray = colorToFloatArray;
function colorToExistingFloatArray(array, color) {
    array[0] = getR(color) / 255;
    array[1] = getG(color) / 255;
    array[2] = getB(color) / 255;
    array[3] = getAlpha(color) / 255;
}
exports.colorToExistingFloatArray = colorToExistingFloatArray;
const int8 = new Int8Array(4);
const int32 = new Int32Array(int8.buffer, 0, 1);
const float32 = new Float32Array(int8.buffer, 0, 1);
function colorToFloat(color) {
    const int = (getAlpha(color) << 24) | (getB(color) << 16) | (getG(color) << 8) | getR(color);
    int32[0] = int & 0xfeffffff;
    return float32[0];
}
exports.colorToFloat = colorToFloat;
function colorToFloatAlpha(color, alpha /* 0-1 */) {
    const int = (((getAlpha(color) * alpha) & 0xff) << 24) | (getB(color) << 16) | (getG(color) << 8) | getR(color);
    int32[0] = int & 0xfeffffff;
    return float32[0];
}
exports.colorToFloatAlpha = colorToFloatAlpha;
// from
function colorFromRGBA(r, g, b, a /* 0-255 */) {
    return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
}
exports.colorFromRGBA = colorFromRGBA;
function colorFromHSVA(h, s, v, a /* 0-1 */) {
    const { r, g, b } = hsv2rgb(h, s, v);
    return colorFromRGBA(r, g, b, a * 255);
}
exports.colorFromHSVA = colorFromHSVA;
function colorFromHSVAObject({ h, s, v, a }) {
    return colorFromHSVA(h, s, v, a);
}
exports.colorFromHSVAObject = colorFromHSVAObject;
// parse
function parseColorFast(str) {
    if (!lodash_1.isString(str))
        return TRANSPARENT;
    const int = parseInt(str, 16);
    if (str.length !== 6 || isNaN(int) || int < 0) {
        return parseColorWithAlpha(str, 1);
    }
    else {
        return (((int << 8) | 0xff) >>> 0);
    }
}
exports.parseColorFast = parseColorFast;
function parseColor(str) {
    if (!lodash_1.isString(str))
        return TRANSPARENT;
    str = str.trim().toLowerCase();
    if (str === '' || str === 'none' || str === 'transparent')
        return TRANSPARENT;
    str = exports.colorNames[str] || str;
    const m = /(\d+)[ ,]+(\d+)[ ,]+(\d+)(?:[ ,]+(\d*\.?\d+))?/.exec(str);
    if (m) {
        return colorFromRGBA(parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10), m[4] ? parseFloat(m[4]) * 255 : 255);
    }
    const n = /[0-9a-f]+/i.exec(str);
    if (n) {
        const s = n[0];
        if (s.length === 3) {
            return colorFromRGBA(parseInt(s.charAt(0), 16) * 0x11, parseInt(s.charAt(1), 16) * 0x11, parseInt(s.charAt(2), 16) * 0x11, 255);
        }
        else {
            return colorFromRGBA(parseInt(s.substr(0, 2), 16), parseInt(s.substr(2, 2), 16), parseInt(s.substr(4, 2), 16), s.length >= 8 ? parseInt(s.substr(6, 2), 16) : 255);
        }
    }
    return BLACK;
}
exports.parseColor = parseColor;
function parseColorWithAlpha(str, alpha /* 0-1 */) {
    return ((parseColor(str) & 0xffffff00) | ((alpha * 255) & 0xff)) >>> 0;
}
exports.parseColorWithAlpha = parseColorWithAlpha;
// utils
function toGrayscale(color) {
    const c = Math.round(utils_1.clamp(getR(color) * 0.2126 + getG(color) * 0.7152 + getB(color) * 0.0722, 0, 255)) | 0;
    const a = getAlpha(color);
    return colorFromRGBA(c, c, c, a);
}
exports.toGrayscale = toGrayscale;
function makeTransparent(color, factor /* 0-1 */) {
    return ((color & 0xffffff00) | ((getAlpha(color) * factor) & 0xff)) >>> 0;
}
exports.makeTransparent = makeTransparent;
function multiplyColor(color, factor /* 0-1 */) {
    return colorFromRGBA(utils_1.clamp(getR(color) * factor, 0, 255), utils_1.clamp(getG(color) * factor, 0, 255), utils_1.clamp(getB(color) * factor, 0, 255), getAlpha(color));
}
exports.multiplyColor = multiplyColor;
function lerpColors(a, b, factor) {
    const f = factor;
    const t = 1 - factor;
    return colorFromRGBA(getR(a) * t + getR(b) * f, getG(a) * t + getG(b) * f, getB(a) * t + getB(b) * f, getAlpha(a) * t + getAlpha(b) * f);
}
exports.lerpColors = lerpColors;
/// r, g, b = <0, 255>, a = <0, 1>
function rgb2hsv(r, g, b, a /* 0-1 */, h = 0) {
    r = r / 255;
    g = g / 255;
    b = b / 255;
    h = h / 360;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const v = max;
    const d = max - min;
    const s = max === 0 ? 0 : d / max;
    if (max !== min) {
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }
    return { h: h * 360, s, v, a };
}
exports.rgb2hsv = rgb2hsv;
/// h = <0, 360>; s, v = <0, 1>
function hsv2rgb(h, s, v) {
    h = Math.max(0, Math.min(360, h === 360 ? 0 : h));
    s = Math.max(0, Math.min(1, s));
    v = Math.max(0, Math.min(1, v));
    let r = v;
    let g = v;
    let b = v;
    if (s !== 0) {
        h /= 60;
        const i = Math.floor(h);
        const f = h - i;
        const p = v * (1 - s);
        const q = v * (1 - s * f);
        const t = v * (1 - s * (1 - f));
        switch (i) {
            case 0:
                r = v;
                g = t;
                b = p;
                break;
            case 1:
                r = q;
                g = v;
                b = p;
                break;
            case 2:
                r = p;
                g = v;
                b = t;
                break;
            case 3:
                r = p;
                g = q;
                b = v;
                break;
            case 4:
                r = t;
                g = p;
                b = v;
                break;
            default:
                r = v;
                g = p;
                b = q;
        }
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
    };
}
exports.hsv2rgb = hsv2rgb;
function h2rgb(h) {
    h /= 60;
    let r = 0, g = 0, b = 0;
    const i = Math.floor(h);
    const f = h - i;
    const q = (1 - f);
    const t = (1 - (1 - f));
    switch (i) {
        case 0:
            r = 1;
            g = t;
            break;
        case 1:
            r = q;
            g = 1;
            break;
        case 2:
            g = 1;
            b = t;
            break;
        case 3:
            g = q;
            b = 1;
            break;
        case 4:
            r = t;
            b = 1;
            break;
        default:
            r = 1;
            b = q;
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}
exports.h2rgb = h2rgb;
//# sourceMappingURL=color.js.map