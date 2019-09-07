"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const file_saver_1 = require("file-saver");
const ag_psd_1 = require("ag-psd");
const utils_1 = require("../../common/utils");
const ponyInfo_1 = require("../../common/ponyInfo");
const ponyHelpers_1 = require("../../client/ponyHelpers");
const canvasUtils_1 = require("../../client/canvasUtils");
const contextSpriteBatch_1 = require("../../graphics/contextSpriteBatch");
const colors_1 = require("../../common/colors");
const color_1 = require("../../common/color");
const compressPony_1 = require("../../common/compressPony");
const ponyDraw_1 = require("../../client/ponyDraw");
const sprites = require("../../generated/sprites");
const graphicsUtils_1 = require("../../graphics/graphicsUtils");
const sheets_1 = require("../../common/sheets");
const ponyAnimations_1 = require("../../client/ponyAnimations");
const PONY_X = 30;
const PONY_Y = 50;
const patternColors = [colors_1.RED, colors_1.GREEN, colors_1.YELLOW, colors_1.BLUE, colors_1.MAGENTA, colors_1.CYAN, colors_1.WHITE, colors_1.BLACK];
const whiteColors = [colors_1.WHITE, colors_1.WHITE, colors_1.WHITE, colors_1.WHITE, colors_1.WHITE, colors_1.WHITE, colors_1.WHITE];
function maxPatterns(sprites) {
    return lodash_1.max(sprites.map(s => s && s.length ? lodash_1.max(s.map(x => x ? x.length : 0)) : 0));
}
const backupSprites = {
    head: [
        undefined,
        [
            [
                {}
            ],
        ],
    ],
};
function getSets(sheet, key, override) {
    const setsKey = override || key || '';
    const sets = backupSprites[setsKey] || sprites[setsKey];
    if (sheet.duplicateFirstFrame !== undefined) {
        return utils_1.times(sheet.duplicateFirstFrame, () => sets[0]);
    }
    else {
        return sheet.single ? [sets] : sets;
    }
}
function getSetsForFirstKey(sheet) {
    const layer = sheet.layers.find(l => !!l.set);
    return layer && getSets(sheet, layer.set);
}
function getCols(sheet) {
    return sheet.state.animation.frames.length;
}
exports.getCols = getCols;
function getRows(sheet) {
    if (sheet.rows !== undefined) {
        return sheet.rows;
    }
    else {
        const sets = getSetsForFirstKey(sheet);
        const maxFrames = sets && lodash_1.max(sets.map(f => f ? f.length : 0));
        return (maxFrames || 0) + 1;
    }
}
exports.getRows = getRows;
function savePsd(psd, name) {
    file_saver_1.saveAs(new Blob([ag_psd_1.writePsd(psd, { generateThumbnail: true })], { type: 'application/octet-stream' }), name);
}
exports.savePsd = savePsd;
function createPsd(sheet, rows, cols) {
    const width = canvasWidth(sheet, rows, cols);
    const height = canvasHeight(sheet, rows, cols);
    return {
        width,
        height,
        children: lodash_1.compact([
            { name: '<bg>', canvas: createBackground(rows, cols, width, height, sheet), transparencyProtected: true },
            ...sheet.layers.map(layer => createPsdLayer(sheet, rows, cols, layer)),
            { name: '<refs>', canvas: createRefsCanvas(width, height, sheet.paletteOffsetY) },
        ]),
    };
}
exports.createPsd = createPsd;
function canvasWidth(sheet, _rows, cols) {
    if (sheet.wrap) {
        cols = sheet.wrap;
    }
    return (sheet.offset * (cols - 1)) + sheet.width;
}
function canvasHeight(sheet, rows, _cols) {
    if (sheet.wrap) {
        rows = Math.ceil(rows / sheet.wrap);
    }
    return sheet.height * rows;
}
function drawPsdLayer(sheet, rows, cols, layer, pattern = -1, extra = false) {
    const { width, height, offset, offsetY = 0, wrap } = sheet;
    const pony = createPony();
    const baseState = Object.assign({}, ponyHelpers_1.defaultPonyState(), sheet.state, { blushColor: colors_1.BLACK });
    const options = Object.assign({}, ponyHelpers_1.defaultDrawPonyOptions(), layer.options);
    const ignoreColor = (layer.drawBlack === undefined ? !!layer.head : layer.drawBlack) ? colors_1.TRANSPARENT : colors_1.BLACK;
    const fieldName = layer.fieldName || sheet.fieldName;
    if (!layer.head) {
        baseState.headAnimation = ponyAnimations_1.createHeadAnimation('', 1, false, [[]]);
        pony.head = sheets_1.ignoreSet();
        pony.nose = sheets_1.ignoreSet();
        pony.ears = sheets_1.ignoreSet();
    }
    else if (layer.noFace) {
        baseState.headAnimation = ponyAnimations_1.createHeadAnimation('', 1, false, [[]]);
        pony.head = sheets_1.ignoreSet();
        pony.nose = sheets_1.ignoreSet();
    }
    if (!layer.body) {
        options.no = utils_1.setFlag(options.no, 64 /* BodyOnly */, true);
    }
    if (!layer.frontLeg) {
        options.no = utils_1.setFlag(options.no, 524288 /* FrontLeg */, true);
    }
    if (!layer.backLeg) {
        options.no = utils_1.setFlag(options.no, 131072 /* BackLeg */, true);
    }
    if (!layer.frontFarLeg) {
        options.no = utils_1.setFlag(options.no, 1048576 /* FrontFarLeg */, true);
    }
    if (!layer.backFarLeg) {
        options.no = utils_1.setFlag(options.no, 262144 /* BackFarLeg */, true);
    }
    layer.setup && layer.setup(pony, baseState);
    ponyInfo_1.syncLockedPonyInfoNumber(pony);
    const actualRows = wrap ? Math.ceil(rows / wrap) : rows;
    const actualCols = wrap ? wrap : cols;
    const empties = sheet.empties && utils_1.includes(sheet.setsWithEmpties, layer.set) ? sheet.empties : [];
    return drawFrames(actualRows, actualCols, width, height, offset, (batch, x, y) => {
        const xIndexBase = (wrap ? actualCols * y + x : x);
        const xIndexOffset = empties.filter(i => i <= xIndexBase).length;
        const xIndex = utils_1.includes(empties, xIndexBase) ? 0 : (xIndexBase - xIndexOffset);
        const yIndex = wrap ? 0 : y;
        const state = utils_1.cloneDeep(baseState);
        sheet.frame && sheet.frame(pony, state, options, xIndex, yIndex, pattern);
        layer.frame && layer.frame(pony, state, options, xIndex, yIndex, pattern);
        state.animationFrame = xIndex;
        if (layer.set && fieldName) {
            const sets = getSets(sheet, layer.set, layer.setOverride);
            if (!sets) {
                throw new Error(`Missing sets for (${layer.set})`);
            }
            const frameIndex = sheet.single ? 0 : xIndex;
            const typeIndex = sheet.single ? xIndex : yIndex;
            const aframe = sets[frameIndex];
            const type = (aframe && typeIndex < aframe.length) ? typeIndex : -1;
            const set = { type };
            if (pattern !== -1) {
                set.fills = patternColors;
                set.outlines = patternColors;
                if (aframe && typeIndex < aframe.length && aframe[typeIndex] && pattern < aframe[typeIndex].length) {
                    set.pattern = pattern;
                }
                else {
                    set.type = -1;
                }
            }
            else {
                set.fills = whiteColors;
                set.outlines = whiteColors;
                if (!(aframe && typeIndex < aframe.length && aframe[typeIndex])) {
                    set.type = -1;
                }
            }
            layer.frameSet && layer.frameSet(set, xIndex, yIndex, pattern);
            pony[fieldName] = set.type === -1 ? sheets_1.ignoreSet() : set;
        }
        batch.disableShading = pattern !== -1;
        batch.ignoreColor = ignoreColor;
        const pal = ponyInfo_1.toPaletteNumber(pony);
        if (layer.extra !== undefined) {
            const set = pal[layer.extra];
            if (extra) {
                set.palette = ponyInfo_1.mockPaletteManager.add([0, colors_1.BLACK, colors_1.BLACK, colors_1.BLACK, colors_1.BLACK, colors_1.BLACK, colors_1.BLACK, colors_1.BLACK, colors_1.BLACK]);
            }
            else {
                set.extraPalette = undefined;
            }
        }
        ponyDraw_1.drawPony(batch, pal, state, PONY_X, PONY_Y + offsetY + utils_1.toInt(layer.shiftY), options);
    });
}
function createPsdPatternLayers(sheet, rows, cols, layer) {
    const sets = getSets(sheet, layer.set, layer.setOverride);
    const patterns = layer.patterns || (sets ? maxPatterns(sets) : 0) || 6;
    return lodash_1.compact([
        layer.extra && {
            name: 'extra',
            canvas: drawPsdLayer(sheet, rows, cols, layer, -1, true),
        },
        {
            name: 'color',
            canvas: drawPsdLayer(sheet, rows, cols, layer),
        },
        ...utils_1.times(patterns, i => ({
            name: `pattern ${i}`,
            canvas: drawPsdLayer(sheet, rows, cols, layer, i),
            hidden: true,
            clipping: true,
            blendMode: 'multiply',
        })),
    ]);
}
function createPsdLayer(sheet, rows, cols, layer) {
    const name = layer.name;
    if (layer.set) {
        return { name, children: createPsdPatternLayers(sheet, rows, cols, layer) };
    }
    else {
        return { name, canvas: drawPsdLayer(sheet, rows, cols, layer) };
    }
}
function drawFrames(rows, cols, w, h, offset, draw) {
    const canvas = canvasUtils_1.createCanvas((offset * (cols - 1)) + w, h * rows);
    const buffer = canvasUtils_1.createCanvas(w, h);
    const batch = new contextSpriteBatch_1.ContextSpriteBatch(buffer);
    const viewContext = canvas.getContext('2d');
    viewContext.save();
    canvasUtils_1.disableImageSmoothing(viewContext);
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            batch.start(sprites.paletteSpriteSheet, 0);
            draw(batch, x, y);
            batch.end();
            viewContext.drawImage(buffer, x * offset, y * h);
        }
    }
    viewContext.restore();
    return canvas;
}
function createBackground(rows, cols, width, height, sheet) {
    const canvas = canvasUtils_1.createCanvas(width, height);
    const context = canvas.getContext('2d');
    if (sheet.wrap) {
        cols = sheet.wrap;
        rows = Math.ceil(rows / sheet.wrap);
    }
    graphicsUtils_1.fillRect(context, 'lightgreen', 0, 0, canvas.width, canvas.height);
    context.globalAlpha = 0.1;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const color = (x + (y % 2)) % 2 ? 'green' : 'blue';
            graphicsUtils_1.fillRect(context, color, x * sheet.offset, y * sheet.height, sheet.width, sheet.height);
        }
    }
    context.globalAlpha = 1;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const gap = sheet.width - sheet.offset;
            const index = sheet.wrap ? (cols * y + x) : x;
            graphicsUtils_1.drawPixelTextOnCanvas(context, x * sheet.offset + gap + 2, y * sheet.height + 2, 0x76c189ff, index.toString());
        }
    }
    return canvas;
}
function createRefsCanvas(width, height, offsetY = 0) {
    const canvas = canvasUtils_1.createCanvas(width, height);
    const context = canvas.getContext('2d');
    const h = 2;
    patternColors.forEach((c, i) => graphicsUtils_1.fillRect(context, color_1.colorToCSS(c), 5, 5 + h * i + offsetY, 10, h));
    graphicsUtils_1.fillRect(context, '#888888', 25, 10 + offsetY, 8, 10);
    graphicsUtils_1.fillRect(context, '#d9d9d9', 27, 12 + offsetY, 4, 4);
    graphicsUtils_1.fillRect(context, '#afafaf', 27, 16 + offsetY, 4, 2);
    graphicsUtils_1.fillRect(context, '#9f9f9f', 20, 5 + offsetY, 8, 10);
    graphicsUtils_1.fillRect(context, '#ffffff', 22, 7 + offsetY, 4, 4);
    graphicsUtils_1.fillRect(context, '#cdcdcd', 22, 11 + offsetY, 4, 2);
    return canvas;
}
function createPony() {
    const pony = compressPony_1.decompressPony(compressPony_1.compressPonyString(ponyInfo_1.createDefaultPony()));
    pony.mane.type = 0;
    pony.backMane.type = 0;
    pony.tail.type = 0;
    pony.coatFill = sheets_1.DEFAULT_COLOR;
    pony.lockCoatOutline = true;
    pony.lockBackLegAccessory = false;
    return ponyInfo_1.syncLockedPonyInfoNumber(pony);
}
function drawPsd(psd, scale, canvas) {
    const buffer = canvas || canvasUtils_1.createCanvas(100, 100);
    buffer.width = psd.width * scale;
    buffer.height = psd.height * scale;
    const context = buffer.getContext('2d');
    context.save();
    context.scale(scale, scale);
    canvasUtils_1.disableImageSmoothing(context);
    drawLayer(psd, context);
    context.restore();
    return buffer;
}
exports.drawPsd = drawPsd;
function drawLayer(layer, context) {
    if (!layer.hidden) {
        layer.canvas && context.drawImage(layer.canvas, 0, 0);
        layer.children && layer.children.forEach(c => drawLayer(c, context));
    }
}
//# sourceMappingURL=sheetExport.js.map