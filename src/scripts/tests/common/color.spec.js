"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const color_1 = require("../../common/color");
describe('color', () => {
    describe('getR()', () => {
        it('returns red color value', () => {
            chai_1.expect(color_1.getR(0x12345678)).equals(0x12);
        });
    });
    describe('getG()', () => {
        it('returns green color value', () => {
            chai_1.expect(color_1.getG(0x12345678)).equals(0x34);
        });
    });
    describe('getB()', () => {
        it('returns blue color value', () => {
            chai_1.expect(color_1.getB(0x12345678)).equals(0x56);
        });
    });
    describe('getAlpha()', () => {
        it('returns alpha color value', () => {
            chai_1.expect(color_1.getAlpha(0x12345678)).equals(0x78);
        });
    });
    describe('colorToRGBA()', () => {
        it('splits color into r, g, b, a values', () => {
            chai_1.expect(color_1.colorToRGBA(0x12345678)).eql({
                r: 0x12,
                g: 0x34,
                b: 0x56,
                a: 0x78,
            });
        });
    });
    describe('colorToHSVA()', () => {
        it('converts color to HSV values', () => {
            chai_1.expect(color_1.colorToHSVA(0xffd500ff)).eql({
                h: 50.11764705882353,
                s: 1,
                v: 1,
                a: 1,
            });
        });
    });
    describe('colorToCSS()', () => {
        it('converts opaque color to hex code', () => {
            chai_1.expect(color_1.colorToCSS(0x123456ff)).equal('#123456');
        });
        it('converts transparent color to rgba(...) code', () => {
            chai_1.expect(color_1.colorToCSS(0x123456cc)).equal('rgba(18,52,86,0.8)');
        });
    });
    describe('colorToHexRGB()', () => {
        it('returns RGB hex code', () => {
            chai_1.expect(color_1.colorToHexRGB(0x123456ff)).equal('123456');
        });
    });
    describe('colorToFloatArray()', () => {
        it('returns values of r, g, b, a as array of floats', () => {
            chai_1.expect(Array.from(color_1.colorToFloatArray(0x123456ff)))
                .eql([0.07058823853731155, 0.20392157137393951, 0.33725491166114807, 1]);
        });
    });
    describe('colorToFloat()', () => {
        it('returns float value of color', () => {
            chai_1.expect(color_1.colorToFloat(0x123456ff)).equal(-7.118128890449717e+37);
        });
    });
    describe('colorToFloatAlpha()', () => {
        it('returns float value of color', () => {
            chai_1.expect(color_1.colorToFloatAlpha(0x123456ff, 1)).equal(-7.118128890449717e+37);
        });
        it('returns float value of color with alpha channel', () => {
            chai_1.expect(color_1.colorToFloatAlpha(0x123456ff, 0)).equal(7.916531978116694e-39);
        });
    });
    describe('colorFromRGBA()', () => {
        it('creates color from r, g, b, a values', () => {
            chai_1.expect(color_1.colorFromRGBA(0x12, 0x34, 0x56, 0xff)).equal(0x123456ff);
        });
    });
    describe('colorFromHSVA()', () => {
        it('creates color from h, s, v, a values', () => {
            chai_1.expect(color_1.colorFromHSVA(50.11764705882353, 1, 1, 1)).equal(0xffd500ff);
        });
    });
    describe('colorFromHSVAObject()', () => {
        it('creates color from h, s, v, a values', () => {
            chai_1.expect(color_1.colorFromHSVAObject({ h: 50.11764705882353, s: 1, v: 1, a: 1 })).equal(0xffd500ff);
        });
    });
    describe('parseColorFast()', () => {
        it('returns transparent for invalid type', () => {
            chai_1.expect(color_1.parseColorFast(1)).equal(0);
            chai_1.expect(color_1.parseColorFast(null)).equal(0);
            chai_1.expect(color_1.parseColorFast({})).equal(0);
            chai_1.expect(color_1.parseColorFast(undefined)).equal(0);
        });
        it('parses hex code', () => {
            chai_1.expect(color_1.parseColorFast('123456')).equal(0x123456ff);
        });
        it('parses any other color format as opaque color', () => {
            chai_1.expect(color_1.parseColorFast('rgba(255, 0, 1, 0.5)')).equal(0xff0001ff);
        });
    });
    describe('parseColor()', () => {
        it('returns transparent for invalid type', () => {
            chai_1.expect(color_1.parseColor(1)).equal(0);
            chai_1.expect(color_1.parseColor(null)).equal(0);
            chai_1.expect(color_1.parseColor({})).equal(0);
            chai_1.expect(color_1.parseColor(undefined)).equal(0);
        });
        it('returns transparent for empty string, none and transparent', () => {
            chai_1.expect(color_1.parseColor('')).equal(0);
            chai_1.expect(color_1.parseColor('none')).equal(0);
            chai_1.expect(color_1.parseColor('transparent')).equal(0);
        });
        it('parses short form hex code', () => {
            chai_1.expect(color_1.parseColor('#123')).equal(0x112233ff);
        });
        it('parses hex code', () => {
            chai_1.expect(color_1.parseColor('#123456')).equal(0x123456ff);
        });
        it('parses hex code with alpha', () => {
            chai_1.expect(color_1.parseColor('#12345678')).equal(0x12345678);
        });
        it('parses rgb(...) format', () => {
            chai_1.expect(color_1.parseColor('rgb(255, 0, 1)')).equal(0xff0001ff);
        });
        it('parses rgba(...) format', () => {
            chai_1.expect(color_1.parseColor('rgba(255, 0, 1, 0.5)')).equal(0xff00017f);
        });
        it('parses named color', () => {
            chai_1.expect(color_1.parseColor('red')).equal(0xff0000ff);
        });
        it('return black for invalid color', () => {
            chai_1.expect(color_1.parseColor('*$^@&')).equal(0xff);
        });
    });
    describe('parseColorWithAlpha()', () => {
        it('parses color with given alpha', () => {
            chai_1.expect(color_1.parseColorWithAlpha('#12345678', 0.5)).equal(0x1234567f);
        });
    });
    describe('withAlpha()', () => {
        it('returns color with given alpha', () => {
            chai_1.expect(color_1.withAlpha(0x12345678, 127)).equal(0x1234567f);
        });
    });
    describe('withAlphaFloat()', () => {
        it('returns color with given alpha', () => {
            chai_1.expect(color_1.withAlphaFloat(0x12345678, 0.5)).equal(0x1234567f);
        });
    });
    describe('makeTransparent()', () => {
        it('adjust transparency', () => {
            chai_1.expect(color_1.makeTransparent(0x1234567f, 0.5)).equal(0x1234563f);
        });
    });
    describe('multiplyColor()', () => {
        it('multiplies r, g, b values', () => {
            chai_1.expect(color_1.multiplyColor(0x0a0a0aff, 0.5)).equal(0x050505ff);
        });
        it('clamps r, g, b values', () => {
            chai_1.expect(color_1.multiplyColor(0x0a0a0aff, 100)).equal(0xffffffff);
        });
    });
    describe('lerpColors()', () => {
        it('returns inbetween color', () => {
            chai_1.expect(color_1.lerpColors(0xff00ff00, 0x00ff00ff, 0.5)).equal(0x7f7f7f7f);
        });
    });
    describe('rgb2hsv()', function () {
        it('returns HSVA representation of RGBA values #1', function () {
            chai_1.expect(color_1.rgb2hsv(255, 0, 0, 0.5)).eql({ h: 0, s: 1, v: 1, a: 0.5 });
        });
        it('returns HSVA representation of RGBA values #2', function () {
            chai_1.expect(color_1.rgb2hsv(0, 255, 0, 0.5)).eql({ h: 120, s: 1, v: 1, a: 0.5 });
        });
        it('returns HSVA representation of RGBA values #3', function () {
            chai_1.expect(color_1.rgb2hsv(0, 0, 255, 0.5)).eql({ h: 240, s: 1, v: 1, a: 0.5 });
        });
        it('returns HSVA representation of RGBA values #4', function () {
            chai_1.expect(color_1.rgb2hsv(255, 0, 255, 0.5)).eql({ h: 300, s: 1, v: 1, a: 0.5 });
        });
        it('returns HSVA representation of RGBA values with retained hue', function () {
            chai_1.expect(color_1.rgb2hsv(0, 0, 0, 0.5, 100)).eql({ h: 100, s: 0, v: 0, a: 0.5 });
        });
    });
    describe('hsv2rgb()', function () {
        it('returns correct RGBA values', function () {
            chai_1.expect(color_1.hsv2rgb(0, 1, 1)).eql({ r: 255, g: 0, b: 0 });
            chai_1.expect(color_1.hsv2rgb(60, 1, 1)).eql({ r: 255, g: 255, b: 0 });
            chai_1.expect(color_1.hsv2rgb(120, 1, 1)).eql({ r: 0, g: 255, b: 0 });
            chai_1.expect(color_1.hsv2rgb(240, 1, 1)).eql({ r: 0, g: 0, b: 255 });
            chai_1.expect(color_1.hsv2rgb(180, 1, 1)).eql({ r: 0, g: 255, b: 255 });
            chai_1.expect(color_1.hsv2rgb(300, 1, 1)).eql({ r: 255, g: 0, b: 255 });
            chai_1.expect(color_1.hsv2rgb(360, 1, 1)).eql({ r: 255, g: 0, b: 0 });
        });
    });
    describe('h2rgb()', function () {
        it('returns correct RGB values', function () {
            chai_1.expect(color_1.h2rgb(0)).eql({ r: 255, g: 0, b: 0 });
            chai_1.expect(color_1.h2rgb(60)).eql({ r: 255, g: 255, b: 0 });
            chai_1.expect(color_1.h2rgb(120)).eql({ r: 0, g: 255, b: 0 });
            chai_1.expect(color_1.h2rgb(240)).eql({ r: 0, g: 0, b: 255 });
            chai_1.expect(color_1.h2rgb(180)).eql({ r: 0, g: 255, b: 255 });
            chai_1.expect(color_1.h2rgb(300)).eql({ r: 255, g: 0, b: 255 });
            chai_1.expect(color_1.h2rgb(360)).eql({ r: 255, g: 0, b: 255 });
        });
    });
});
//# sourceMappingURL=color.spec.js.map