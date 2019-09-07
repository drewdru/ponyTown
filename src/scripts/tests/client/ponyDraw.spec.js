"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable:max-line-length */
const lib_1 = require("../lib");
const path = require("path");
const colors_1 = require("../../common/colors");
const ponyHelpers_1 = require("../../client/ponyHelpers");
const ponyInfo_1 = require("../../common/ponyInfo");
const ponyAnimations_1 = require("../../client/ponyAnimations");
const contextSpriteBatch_1 = require("../../graphics/contextSpriteBatch");
const expressionUtils_1 = require("../../common/expressionUtils");
const compressPony_1 = require("../../common/compressPony");
const entities_1 = require("../../common/entities");
const sprites_1 = require("../../generated/sprites");
const ponyDraw_1 = require("../../client/ponyDraw");
const paths_1 = require("../../server/paths");
const canvasUtilsNode_1 = require("../../server/canvasUtilsNode");
const baseFilePath = paths_1.pathTo('src', 'tests', 'pony');
function createTests() {
    const state = ponyHelpers_1.defaultPonyState();
    const sitting = Object.assign({}, state, { animation: ponyAnimations_1.sit, animationFrame: 0 });
    const sittingDown = Object.assign({}, state, { animation: ponyAnimations_1.sitDown, animationFrame: 0 });
    const wingOpen = Object.assign({}, state, { animation: ponyAnimations_1.fly, animationFrame: 0 });
    // const lying: PonyState = { ...state, animation: lie, animationFrame: 0 };
    const trotting = Object.assign({}, state, { animation: ponyAnimations_1.trot, animationFrame: 10 });
    const blushing = Object.assign({}, state, { expression: expressionUtils_1.parseExpression('o//o') });
    //const turned: PonyState = { ...defaultState, headTurned: true };
    const holding = Object.assign({}, state, { holding: entities_1.apple(0, 0) });
    const holdingLantern = Object.assign({}, state, { holding: entities_1.jackoLanternOn(0, 0) });
    const holdingLetter = Object.assign({}, state, { holding: entities_1.letter(0, 0) });
    const laughing = Object.assign({}, state, { headAnimation: ponyAnimations_1.laugh });
    const blinking = Object.assign({}, state, { blinkFrame: 4 });
    const blinkingAngry = Object.assign({}, state, { expression: expressionUtils_1.parseExpression('|B)'), blinkFrame: 5 });
    const blinkingSkip = Object.assign({}, state, { expression: expressionUtils_1.parseExpression('|B)'), blinkFrame: 2 });
    const faceExtra = Object.assign({}, state, { drawFaceExtra: batch => batch.drawSprite(sprites_1.candy.color, colors_1.WHITE, ponyInfo_1.mockPaletteManager.addArray(sprites_1.candy.palettes[0]), 25, 40) });
    const faceExtraHoldingLetter = Object.assign({}, faceExtra, { holding: entities_1.letter(0, 0) });
    const options = Object.assign({}, ponyHelpers_1.defaultDrawPonyOptions(), { shadow: true });
    const flipped = Object.assign({}, options, { flipped: true });
    const selected = Object.assign({}, options, { selected: true });
    const extra = Object.assign({}, options, { extra: true });
    const base = 'CAP////apSDaICA2QAJpDhAvAAwAIA==';
    const baseWing = 'CAP////apSDaICA2QAJpIhAvAAwAIQgIAA==';
    const whitePetal = 'CAiidXWCfnZaUERMTEzb29vl5eXj4diysrI2oIIAAhiBVgCfgAYAGoAOEBpAYQFCAJCAkwAoQgDIgB4AG4AgACQgJAQgJCAAIA==';
    const cmSocks = 'CAdZp7LapSBFjaJtZDXm5uZWVlb85VlWsACAAIE5CADhAE/AAwAOgBIQGIBhAQCEaBdddn8f8AcDgcAf8fg=';
    const griffon = 'CAamno3apSD/1wDdrljp6ellX1I2QCZkJcAQKbcIBJAG8AtoDiBDUYBowLIgGEBA';
    return [
        ['none.png', state, options, ''],
        ['base.png', state, options, base],
        ['selected.png', state, selected, base],
        ['offline.png', state, options, 'CAKVlZUvLy82QIxomgCfgAYAGIAoQGEBwAEERFEUEA=='],
        ['deer.png', state, options, 'CA18ZlPTh1Gfj3ofGRiqaUe9f12wnWHIw7Q0NDTcxl+ccU7S0YX///82wQIAAgTiBAAHWAJ+ICpCAwjVFZmiGquzYEgJnQAQhAJhAQiElWEQpZsA3vamBgAAAGBgAAAGBg=='],
        ['all.png', state, options, 'CFTTzbqagEXaTSAgftqjmpqYj4Bi2iAA/88Ad///APWUjn0AmRgAs38AZrOzAKyyqYxWR0dzaU00ISHdVlZ9Jib/5VgekP8yzTLacNbcFDx//9Sqkg8AWrMCkAKZOJWaAB8+s4uzmxukr5BTcxl2r6g+jdkkcGcQQXBS/wBevD++0EifszfAwMBMTEyYmJgaGhro8pDWu1Tugu6nRKeVhW9nS0NPT09SUlJoWkZILyc3Nzc5OTn/pQDWmy68mFWpl3a4r55XOwhlShttWjVzZk+Jg3kzIwUsIAowJhIsJRonJiPV1dWysrKQkJBvb2//////9OH/6sP/04L/xl54bAkEgihOBBAwgAKGrAEABDiBIoAsYNHD4gIQIhInAAFBWpqAWLmDJo2AcOnj6BDENALFzBk0bAOHTx9AhpaALFzBk0BEdPH0EIAjJIgIlTCdRCAKSqEAVlkgoFi5gIjp6gqAtLmFxo2AvOnmCBDMMAxLmDJoDI6ePoJQIALgA7GdAZlzBk0bAaHTx9AhhGgMy5gyaNgNDp4+gQwjQGZcwZNGwGh08fQIYioDMuYMmjYDQ6ePoEMIMGrZu4By6dvIygGZcwZNAaHTx9BANAZlzBk0bAaHTx9Ahy9fP4EGFDiRY0eRJlS5k2dPb0KNKnUA'],
        ['dragon.png', state, options, 'CAeokpLapSBgYGBSUlJqamqAcHBEREQ2oAIAIhkJEAT8ADAA3gDsAcgQMqICbgA='],
        ['paws.png', state, options, 'CAa8q3/apiDapSD/1wCIXCjc0K82oCYAApkJUAQLkkADCA2gFtAbwIaRAGiAQA=='],
        ['paws-socks.png', state, options, 'CAe8q3/apiDapSD/1wCIXCjc0K9GRkZWqAmAAKZChAEC5JAAwgNoBbQG8CGkQBogEIQDwgHA'],
        ['glasses.png', state, options, 'CAPW0bTapSBZQSw2QAJpOgCfgAYAGIA4QGEBASAAAA=='],
        ['griffon.png', state, options, griffon],
        ['griffon-lantern.png', holdingLantern, options, griffon],
        ['griffon-socks.png', state, options, 'CAemno3apSD/1wDdrljp6elf/8ZlX1JWkAmZChAECm3CASQBvQl1oDiiBuRgHjAsiAYQESgGhAMA'],
        ['sit.png', sitting, options, base],
        ['sit-wing.png', sitting, options, baseWing],
        ['sit-socks.png', sitting, options, cmSocks],
        ['sit-socks-cm.png', Object.assign({}, sittingDown, { animationFrame: 8 }), options, cmSocks],
        ['sit-fetlocks.png', sitting, options, whitePetal],
        ['sit-paws.png', sitting, options, 'CAmmno3apSD/1wDdrljp6ellX1JQODDb29v///82QCZiBVgCBIzOEASQBvAFtAcQIKowBowKkQDCAgEQoPEQDdZgAA=='],
        ['sit-sword.png', sitting, options, 'CAf////apSDaICCVhW9nS0NPT09SUlI2QAJkKcIFcADAAgACIGEu4A=='],
        ['sit-neck-accessory.png', sitting, options, 'CAeH5o7VplTH8K4yvVL/36cbGxtXV1c2wIIAIALkIAN8AT8ADAA1AEhAcgQLkIChAHCAMIhIq/DbYb5DZA=='],
        ['trot.png', trotting, options, whitePetal],
        ['holding.png', holding, options, whitePetal],
        ['laughing.png', laughing, options, whitePetal],
        ['blinking.png', blinking, options, whitePetal],
        ['blinking-angry.png', blinkingAngry, options, whitePetal],
        ['blinking-skip.png', blinkingSkip, options, whitePetal],
        ['face-extra.png', faceExtra, options, whitePetal],
        ['face-extra-holding-letter.png', faceExtraHoldingLetter, options, whitePetal],
        ['cm-flip.png', state, flipped, 'CAeCQpnapSD/1wD////ugu7/pQD/4at2pAAmQoQBPwAMADEAOEBhAQEIBEI16y43AA3AA3A3A3A='],
        ['freckles-flip.png', state, flipped, 'CA3/AADapSAnJyf/1wCK8f/////u7u5U3OkyzTKVhW9nS0NPT09SUlI2wAIAAAbiBAAHOAJ+ABgAYgBIQGEBAJhIrEQoPExgwq80AA=='],
        //['head-turned.png', turned, options, whitePetal],
        ['extra.png', state, extra, 'CAWVlZW5ubn///9SUlIvLy82QIxkI0IEcgAYAGIAsIDCA4AAFAoootFFoFA='],
        ['blush.png', blushing, options, base],
        ['hat-horns.png', state, options, 'CAfMoYvPWVnapSD/1wA8PDzj0M3uVVU2QAJkJkAQLkkADAA8AFhAYQGcAwTAHAA='],
        ['hat-bald.png', state, options, 'CAbi38/PWVnapSD/1wBwZmbuVVU2oJoAApkJkAQLkkQFsACcABBEAYA='],
        ['holding-letter.png', holdingLetter, options, 'CAPHY2MghtoA/202QAJpLgCfgAYAGIA7QGEBCIBA'],
        ['mustache.png', state, options, 'CATexazapSD/1wC8UCw2QAJkJcAQKbcADAAwAEAjAQA='],
        ['hair-in-front-of-wing.png', state, options, 'CAOMx+LapSD04HY2QAJpIgCfgAYAGIA6AGEBQgIA'],
        ['hair-behind-neck-accessory.png', state, options, 'CAb///9xcXHaICDbQEBra2t+fn42oAIAAhkJ8IFcADAA5AEqAcgQNgBYAYA='],
        // TEMP: gryphon wing pattern ['lie.png', lying, options, 'CAb///9xcXHaICDHx8eqqqq9vb02QAJkJEIFcADAAwgEnAcgQNiMS4A='],
        ['no-body.png', state, Object.assign({}, options, { no: 32 /* Body */ }), baseWing],
        ['wing-open.png', wingOpen, options, griffon],
        ['sitting-with-skirt-and-socks.png', sitting, options, 'DAb////CwsL/pQAjVdk9ySPugu42QAJkKsAT8ADAAnAASAAcICBCASIAqIA0ACA='],
        ['cape.png', state, options, 'DASmlJTX19fHwJxbVVU2QAJkKkAT8ADAAxADhAYQEABCAQA='],
    ];
}
function createOtherTests() {
    const state = ponyHelpers_1.defaultPonyState();
    const options = Object.assign({}, ponyHelpers_1.defaultDrawPonyOptions(), { shadow: true });
    return [
        ['eyes-0.png', `doesn't allow 0 value for eyes`, { eyeOpennessLeft: 0, eyeOpennessRight: 0, lockEyes: false }, state, options],
    ];
}
describe('ponyUtils', () => {
    before(lib_1.loadSprites);
    before(() => lib_1.clearCompareResults('pony'));
    describe('drawPony()', () => {
        createTests().forEach(([file, state, options, data]) => it(`correct for ${file}`, () => {
            const filePath = path.join(baseFilePath, file);
            const expected = lib_1.loadImageAsCanvas(filePath);
            const info = compressPony_1.decodePonyInfo(data, ponyInfo_1.mockPaletteManager);
            const actual = drawPonyCanvas(colors_1.TRANSPARENT, info, state, options);
            lib_1.compareCanvases(expected, actual, filePath, 'pony');
        }));
        createOtherTests().forEach(([file, name, data, state, options]) => it(name, () => {
            const filePath = path.join(baseFilePath, file);
            const expected = lib_1.loadImageAsCanvas(filePath);
            const ponyInfo = Object.assign({}, ponyInfo_1.createDefaultPony(), data);
            const compressed = compressPony_1.compressPonyString(ponyInfo);
            const info = compressPony_1.decodePonyInfo(compressed, ponyInfo_1.mockPaletteManager);
            const actual = drawPonyCanvas(colors_1.TRANSPARENT, info, state, options);
            lib_1.compareCanvases(expected, actual, filePath, 'pony');
        }));
    });
});
function drawPonyCanvas(bg, info, state, options) {
    state.blushColor = colors_1.blushColor(info.coatPalette.colors[1]);
    const canvas = contextSpriteBatch_1.drawCanvas(80, 80, sprites_1.paletteSpriteSheet, bg, batch => ponyDraw_1.drawPony(batch, info, state, 40, 70, options));
    if (options.flipped) {
        const flipped = canvasUtilsNode_1.createCanvas(canvas.width, canvas.height);
        const context = flipped.getContext('2d');
        context.scale(-1, 1);
        context.drawImage(canvas, -canvas.width, 0);
        return flipped;
    }
    else {
        return canvas;
    }
}
//# sourceMappingURL=ponyDraw.spec.js.map