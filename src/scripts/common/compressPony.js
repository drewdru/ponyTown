"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const base64_js_1 = require("base64-js");
const ponyInfo_1 = require("./ponyInfo");
const bitUtils_1 = require("./bitUtils");
const colors_1 = require("./colors");
const utils_1 = require("./utils");
const spriteUtils_1 = require("../client/spriteUtils");
const sprites = require("../generated/sprites");
const color_1 = require("./color");
const ponyUtils_1 = require("../client/ponyUtils");
const constants_1 = require("./constants");
exports.VERSION = 4;
const identity = (x) => x;
const not = (x) => !x;
function emptyOrUnlocked(set) {
    return !set || !set.type || !set.lockFills || set.lockFills.every(x => !x);
}
function emptyOrZeroLocked(set, customOutlines) {
    return !set || (set.type === 0 && set.pattern === 0 && set.lockFills !== undefined && set.lockFills[0] === true &&
        (!customOutlines || (set.lockOutlines !== undefined && set.lockOutlines[0] === true)));
}
function empty(set) {
    return !set || !set.type;
}
function omitMane(info) {
    return empty(info.mane) && emptyOrUnlocked(info.backMane)
        && emptyOrUnlocked(info.tail) && emptyOrUnlocked(info.facialHair);
}
function omitHead(info) {
    return emptyOrZeroLocked(info.head, !!info.customOutlines);
}
function omitSleeves(info) {
    return !info.chestAccessory || !utils_1.includes(ponyUtils_1.SLEEVED_ACCESSORIES, utils_1.toInt(info.chestAccessory.type));
}
function omitFrontHooves(info) {
    return empty(info.frontHooves) && emptyOrUnlocked(info.backHooves);
}
function readTimes(read, count, bitsPerItem) {
    const result = [];
    for (let i = 0; i < count; i++) {
        result[i] = read(bitsPerItem);
    }
    return result;
}
// NOTE: do not reorder or remove
const setFields = [
    { name: 'extraAccessory', sets: ponyUtils_1.mergedExtraAccessories, preserveOnZero: true },
    { name: 'nose', sets: sprites.noses[0], preserveOnZero: true },
    { name: 'ears', sets: sprites.ears, preserveOnZero: true },
    { name: 'mane', sets: ponyUtils_1.mergedManes, preserveOnZero: true, minColors: 1, omit: omitMane },
    { name: 'backMane', sets: ponyUtils_1.mergedBackManes },
    { name: 'tail', sets: sprites.tails[0] },
    { name: 'horn', sets: sprites.horns },
    { name: 'wings', sets: sprites.wings[0] },
    { name: 'frontHooves', sets: ponyUtils_1.frontHooves[1], preserveOnZero: true, minColors: 1, omit: omitFrontHooves },
    { name: 'backHooves', sets: sprites.backLegHooves[1] },
    { name: 'facialHair', sets: ponyUtils_1.mergedFacialHair },
    { name: 'headAccessory', sets: ponyUtils_1.mergedHeadAccessories },
    { name: 'earAccessory', sets: sprites.earAccessories },
    { name: 'faceAccessory', sets: sprites.faceAccessories },
    { name: 'neckAccessory', sets: sprites.neckAccessories[1] },
    { name: 'frontLegAccessory', sets: sprites.frontLegAccessories[1] },
    { name: 'backLegAccessory', sets: sprites.backLegAccessories[1], omit: info => !!info.lockBackLegAccessory },
    { name: 'backAccessory', sets: ponyUtils_1.mergedBackAccessories },
    { name: 'waistAccessory', sets: sprites.waistAccessories[1] },
    { name: 'chestAccessory', sets: sprites.chestAccessories[1] },
    { name: 'sleeveAccessory', sets: sprites.frontLegSleeves[1], preserveOnZero: true, omit: omitSleeves },
    { name: 'head', sets: sprites.head0[1], preserveOnZero: true, omit: omitHead },
    {
        name: 'frontLegAccessoryRight',
        sets: sprites.frontLegAccessories[1],
        omit: info => !info.unlockFrontLegAccessory,
    },
    {
        name: 'backLegAccessoryRight',
        sets: sprites.backLegAccessories[1],
        omit: info => !info.unlockBackLegAccessory || !!info.lockBackLegAccessory,
    },
];
const booleanFields = [
    { name: 'customOutlines' },
    { name: 'lockEyes' },
    { name: 'lockEyeColor' },
    { name: 'lockCoatOutline', omit: info => !info.customOutlines },
    {
        name: 'lockBackLegAccessory', omit: info => empty(info.frontLegAccessory) && empty(info.backLegAccessory) &&
            empty(info.frontLegAccessoryRight) && empty(info.backLegAccessoryRight)
    },
    { name: 'eyeshadow' },
    { name: 'cmFlip', omit: info => info.cm === undefined || info.cm.every(not) },
    { name: 'unlockEyeWhites' },
    { name: 'freeOutlines' },
    { name: 'unlockFrontLegAccessory' },
    { name: 'unlockBackLegAccessory', omit: info => !!info.lockBackLegAccessory },
    { name: 'unlockEyelashColor' },
    { name: 'darkenLockedOutlines', omit: info => !info.freeOutlines },
];
const numberFields = [
    { name: 'eyelashes' },
    { name: 'eyeOpennessRight' },
    { name: 'eyeOpennessLeft', omit: info => !!info.lockEyes },
    { name: 'fangs' },
    { name: 'muzzle' },
    { name: 'freckles', dontSave: true },
];
const colorFields = [
    { name: 'coatFill' },
    { name: 'coatOutline', omit: info => !info.customOutlines || !!info.lockCoatOutline },
    { name: 'eyeColorRight' },
    { name: 'eyeColorLeft', omit: info => !!info.lockEyeColor },
    { name: 'eyeWhites', default: colors_1.WHITE },
    { name: 'eyeshadowColor', omit: info => !info.eyeshadow },
    { name: 'frecklesColor', omit: info => !info.freckles, dontSave: true },
    { name: 'eyeWhitesLeft', default: colors_1.WHITE, omit: info => !info.unlockEyeWhites },
    { name: 'eyelashColor' },
    { name: 'eyelashColorLeft', omit: info => !info.unlockEyelashColor },
    { name: 'magicColor', default: colors_1.WHITE },
];
const omittableFields = [
    ...setFields,
    ...booleanFields,
    ...numberFields,
    ...colorFields,
].filter(f => !!f.omit);
const VERSION_BITS = 6; // max 63
const COLORS_LENGTH_BITS = 10; // max 1024
const BOOLEAN_FIELDS_LENGTH_BITS = 4; // max 15
const NUMBER_FIELDS_LENGTH_BITS = 4; // max 15
const COLOR_FIELDS_LENGTH_BITS = 4; // max 15
const SET_FIELDS_LENGTH_BITS = 6; // max 63
const CM_LENGTH_BITS = 5; // max 31
const NUMBERS_BITS = 6; // max 63
/* istanbul ignore next */
if (DEVELOPMENT) {
    (function () {
        function verifyFields(obj, lengthBits, defs, verify) {
            const missing = Object.keys(obj)
                .filter(key => verify(obj[key]))
                .filter(key => defs.every(d => d.name !== key));
            const unnecessary = defs
                .filter(({ name }) => !verify(obj[name]));
            if (missing.length || unnecessary.length) {
                throw new Error(`Incorrect fields (${missing} / ${unnecessary})`);
            }
            if (lengthBits < bitUtils_1.countBits(defs.length)) {
                throw new Error(`Incorrect field length bits (${lengthBits}/${bitUtils_1.countBits(defs.length)})`);
            }
        }
        const defaultPony = ponyInfo_1.createBasePony();
        verifyFields(defaultPony, SET_FIELDS_LENGTH_BITS, setFields, f => f.type !== undefined);
        verifyFields(defaultPony, COLOR_FIELDS_LENGTH_BITS, colorFields, lodash_1.isString);
        verifyFields(defaultPony, NUMBER_FIELDS_LENGTH_BITS, numberFields, lodash_1.isNumber);
        verifyFields(defaultPony, BOOLEAN_FIELDS_LENGTH_BITS, booleanFields, lodash_1.isBoolean);
        if (setFields.some(f => !f.sets)) {
            throw new Error(`Undefined set in set field (${setFields.find(f => !f.sets).name})`);
        }
    })();
}
function trimRight(items) {
    const index = lodash_1.findLastIndex(items, x => !!x);
    return (index !== (items.length - 1)) ? items.slice(0, index + 1) : items;
}
function precompressCM(cm, addColor) {
    const result = [];
    if (cm) {
        let length = constants_1.CM_SIZE * constants_1.CM_SIZE;
        while (length > 0 && !cm[length - 1]) {
            length--;
        }
        for (let i = 0; i < length; i++) {
            result.push(addColor(cm[i]));
        }
    }
    return result;
}
exports.precompressCM = precompressCM;
// lock sets
function compressLockSet(set, count) {
    const locks = set && set.slice ? set.slice(0, count) : [];
    return locks.reduce((result, l, i) => result | (l ? (1 << i) : 0), 0);
}
exports.compressLockSet = compressLockSet;
function decompressLockSet(set, count, defaultValues) {
    const result = [];
    for (let i = 0; i < MAX_COLORS; i++) {
        result[i] = i < count ? !!(set & (1 << i)) : defaultValues[i];
    }
    return result;
}
exports.decompressLockSet = decompressLockSet;
// colors
function precompressColorSet(set, count, locks, defaultColor, addColor) {
    const result = [];
    if (set) {
        for (let i = 0; i < count; i++) {
            if ((locks & (1 << i)) === 0) {
                const color = set[i];
                result.push(!color || color === defaultColor ? 0 : addColor(color));
            }
        }
    }
    return result;
}
exports.precompressColorSet = precompressColorSet;
function postdecompressColorSet(colors, count, locks, colorList, parseColor) {
    const result = [];
    for (let i = 0, j = 0; i < count; i++) {
        const locked = (locks & (1 << i)) !== 0;
        result.push(parseColor((locked ? 0 : colorList[colors[j++] - 1]) || colors_1.BLACK));
    }
    return result;
}
exports.postdecompressColorSet = postdecompressColorSet;
// set
const MAX_COLORS = 6;
const ALL_UNLOCKED = utils_1.array(MAX_COLORS, false);
const ALL_LOCKED = utils_1.array(MAX_COLORS, true);
function precompressSet(set, def, customOutlines, defaultColor, addColor) {
    if (!set)
        return undefined;
    const type = utils_1.clamp(utils_1.toInt(set.type), 0, def.sets.length - 1);
    if (type === 0 && !def.preserveOnZero)
        return undefined;
    const patterns = utils_1.at(def.sets, type);
    const pattern = utils_1.clamp(utils_1.toInt(set.pattern), 0, patterns ? patterns.length - 1 : 0);
    const sprite = utils_1.att(patterns, pattern);
    const colors = Math.max(spriteUtils_1.getColorCount(sprite), def.minColors || 0);
    /* istanbul ignore next */
    if (type === 0 && pattern === 0 && colors === 0)
        return undefined;
    const fillLocks = compressLockSet(set.lockFills, colors);
    const fills = precompressColorSet(set.fills, colors, fillLocks, defaultColor, addColor);
    const outlineLocks = customOutlines ? compressLockSet(set.lockOutlines, colors) : 0;
    const outlines = customOutlines ? precompressColorSet(set.outlines, colors, outlineLocks, defaultColor, addColor) : [];
    return { type, pattern, colors, fillLocks, fills, outlineLocks, outlines };
}
exports.precompressSet = precompressSet;
function postdecompressSet(set, _def, customOutlines, colorList, parseColor) {
    return {
        type: set.type,
        pattern: set.pattern,
        lockFills: decompressLockSet(set.fillLocks, set.colors, /*def.defaultLockFills ||*/ ALL_UNLOCKED),
        fills: postdecompressColorSet(set.fills, set.colors, set.fillLocks, colorList, parseColor),
        lockOutlines: customOutlines ?
            decompressLockSet(set.outlineLocks, set.colors, /*def.defaultLockOutlines ||*/ ALL_LOCKED) :
            ALL_LOCKED,
        outlines: customOutlines ? postdecompressColorSet(set.outlines, set.colors, set.outlineLocks, colorList, parseColor) : [],
    };
}
exports.postdecompressSet = postdecompressSet;
// helpers
function precompressFields(data, defs, defaultValue, encode) {
    return trimRight(defs.map(def => {
        if (def.dontSave || (def.omit && def.omit(data))) {
            return defaultValue;
        }
        else {
            return encode(data[def.name], def);
        }
    }));
}
function postdecompressFields(result, defs, values, defaultValue, decode) {
    for (let i = 0; i < defs.length; i++) {
        const def = defs[i];
        const value = i >= values.length ? undefined : values[i];
        result[def.name] = decode(value === undefined ? defaultValue : value, def);
    }
}
function precompressPony(info, defaultColor, parseColor) {
    const colors = [];
    const customOutlines = !!info.customOutlines;
    const addColor = (color) => {
        const c = color === undefined ? 0 : parseColor(color);
        return c === 0 ? 0 : utils_1.pushUniq(colors, c);
    };
    return {
        version: exports.VERSION,
        colors,
        booleanFields: precompressFields(info, booleanFields, false, x => !!x),
        numberFields: precompressFields(info, numberFields, 0, utils_1.toInt),
        colorFields: precompressFields(info, colorFields, 0, (x, def) => (x === undefined || parseColor(x) === (def.default || colors_1.BLACK)) ? 0 : addColor(x)),
        setFields: precompressFields(info, setFields, undefined, (x, def) => precompressSet(x, def, customOutlines, defaultColor, addColor)),
        cm: precompressCM(info.cm, addColor),
    };
}
exports.precompressPony = precompressPony;
const frecklesToPattern = [0, 1, 1, 2, 2, 2, 1];
const frecklesToColor = [[], [1], [1, 2], [2], [1], [1, 2], [2]];
function fixVersion(result, data, parseColor) {
    if (data.version < 3) {
        result.head = {
            type: 0,
            pattern: frecklesToPattern[result.freckles || 0] || 0,
            fills: [result.coatFill],
            outlines: [result.coatOutline],
            lockFills: [true, true, true, true, true, true],
            lockOutlines: [true, true, true, true, true, true],
        };
        frecklesToColor[result.freckles || 0].forEach(index => {
            result.head.fills[index] = result.frecklesColor || parseColor(colors_1.BLACK);
            result.head.lockFills[index] = false;
        });
    }
}
function createPostDecompressPony() {
    return new Function('postdecompressSet', 'setFields', 'ommitableFields', 'fixVersion', [
        'function identity(x) { return x; }',
        'function getColor(colors, i) { return (i >= 0 && i < colors.length) ? colors[i] : 0; }',
        'function getCM(cm, colors) {',
        '  var result = [];',
        '  for(var i = 0; i < cm.length; i++) { result.push(getColor(colors, cm[i] - 1) || 0); }',
        '  return result;',
        '}',
        ...omittableFields.map((def, i) => `var omit_${def.name} = ommitableFields[${i}].omit;`),
        'return function (data) {',
        '  var dataColors = data.colors;',
        '  var bools = data.booleanFields;',
        '  var numbers = data.numberFields;',
        '  var colors = data.colorFields;',
        '  var sets = data.setFields;',
        '  var result = {};',
        ...booleanFields.map((def, i) => `  result.${def.name} = bools.length > ${i} ? bools[${i}] : false;`),
        ...numberFields.map((def, i) => `  result.${def.name} = numbers.length > ${i} ? numbers[${i}] : 0;`),
        ...colorFields.map((def, i) => `  result.${def.name} = colors.length > ${i} ? ` +
            `getColor(dataColors, colors[${i}] - 1) || ${def.default || colors_1.BLACK} : ${def.default || colors_1.BLACK};`),
        '  var customOutlines = !!result.customOutlines;',
        ...setFields.map((def, i) => `  result.${def.name} = sets.length > ${i} && sets[${i}] !== undefined ? ` +
            `postdecompressSet(sets[${i}], setFields[${i}], customOutlines, data.colors, identity) : undefined;`),
        `  result.cm = data.cm.length ? getCM(data.cm, dataColors) : undefined;`,
        ...omittableFields.map(def => `  if (omit_${def.name}(result)) result.${def.name} = undefined;`),
        '  fixVersion(result, data, identity);',
        '  return result;',
        '};',
    ].join('\n'));
}
exports.createPostDecompressPony = createPostDecompressPony;
exports.fastPostdecompressPony = createPostDecompressPony()(postdecompressSet, setFields, omittableFields, fixVersion);
function postdecompressPony(data, parseColor) {
    // NOTE: when updating also update createPostDecompressPony()
    const result = {};
    postdecompressFields(result, booleanFields, data.booleanFields, false, identity);
    postdecompressFields(result, numberFields, data.numberFields, 0, identity);
    postdecompressFields(result, colorFields, data.colorFields, 0, (x, def) => parseColor(data.colors[x - 1] || def.default || colors_1.BLACK));
    const customOutlines = !!result.customOutlines;
    postdecompressFields(result, setFields, data.setFields, undefined, (x, def) => x === undefined ? undefined : postdecompressSet(x, def, customOutlines, data.colors, parseColor));
    result.cm = data.cm.length ? data.cm.map(x => parseColor(data.colors[x - 1] || colors_1.TRANSPARENT)) : undefined;
    omittableFields.forEach(def => {
        if (def.omit && def.omit(result)) {
            result[def.name] = undefined;
        }
    });
    fixVersion(result, data, parseColor);
    return result;
}
exports.postdecompressPony = postdecompressPony;
// set
const TYPE_BITS = 5; // max 31
const PATTERN_BITS = 4; // max 15
const COLORS_BITS = 3; // max 7
function writeSet(write, colorBits, customOutlines, set) {
    write(set ? 1 : 0, 1);
    if (set) {
        write(set.type, TYPE_BITS);
        write(set.pattern, PATTERN_BITS);
        write(set.colors - 1, COLORS_BITS);
        write(set.fillLocks, set.colors);
        set.fills.forEach(c => write(c, colorBits));
        if (customOutlines) {
            write(set.outlineLocks, set.colors);
            set.outlines.forEach(c => write(c, colorBits));
        }
    }
}
exports.writeSet = writeSet;
function readSet(read, colorBits, customOutlines) {
    const has = read(1);
    if (has) {
        const type = read(TYPE_BITS);
        const pattern = read(PATTERN_BITS);
        const colors = read(COLORS_BITS) + 1;
        const fillLocks = read(colors);
        const fills = readTimes(read, colors - bitUtils_1.countBits(fillLocks), colorBits);
        const outlineLocks = customOutlines ? read(colors) : 0;
        const outlines = customOutlines ? readTimes(read, colors - bitUtils_1.countBits(outlineLocks), colorBits) : [];
        return { type, pattern, colors, fillLocks, fills, outlineLocks, outlines };
    }
    else {
        return undefined;
    }
}
exports.readSet = readSet;
// helpers
function writeFields(write, lengthBits, fields, writeField) {
    write(fields.length, lengthBits);
    fields.forEach(writeField);
}
function readFields(read, lengthBits, readField) {
    const length = read(lengthBits);
    const result = [];
    for (let i = 0; i < length; i++) {
        result.push(readField(read));
    }
    return result;
}
// pony
function writePony(write, data) {
    const colorBits = Math.max(bitUtils_1.numberToBitCount(data.colors.length), 1);
    const customOutlines = !!data.booleanFields[0];
    write(data.version, VERSION_BITS);
    writeFields(write, COLORS_LENGTH_BITS, data.colors, x => write(x >> 8, 24));
    writeFields(write, BOOLEAN_FIELDS_LENGTH_BITS, data.booleanFields, x => write(x ? 1 : 0, 1));
    writeFields(write, NUMBER_FIELDS_LENGTH_BITS, data.numberFields, x => write(x, NUMBERS_BITS));
    writeFields(write, COLOR_FIELDS_LENGTH_BITS, data.colorFields, x => write(x, colorBits));
    writeFields(write, SET_FIELDS_LENGTH_BITS, data.setFields, x => writeSet(write, colorBits, customOutlines, x));
    writeFields(write, CM_LENGTH_BITS, data.cm, x => write(x, colorBits));
}
exports.writePony = writePony;
const readColorValue = (read) => ((read(24) << 8) | 0xff) >>> 0;
const readBoolean = (read) => !!read(1);
const readBits = (bits) => (read) => read(bits);
const readNumber = readBits(NUMBERS_BITS);
function readPony(read) {
    const version = read(VERSION_BITS);
    if (version > exports.VERSION) {
        throw new Error('Invalid version');
    }
    const colors = readFields(read, COLORS_LENGTH_BITS, readColorValue);
    const colorBits = Math.max(bitUtils_1.numberToBitCount(colors.length), 1);
    const readColor = readBits(colorBits);
    const booleanFields = readFields(read, BOOLEAN_FIELDS_LENGTH_BITS, readBoolean);
    const customOutlines = !!booleanFields[0];
    const numberFields = readFields(read, NUMBER_FIELDS_LENGTH_BITS, readNumber);
    const colorFields = readFields(read, COLOR_FIELDS_LENGTH_BITS, readColor);
    const setFields = readFields(read, version < 4 ? 5 : SET_FIELDS_LENGTH_BITS, read => readSet(read, colorBits, customOutlines));
    const cm = readFields(read, CM_LENGTH_BITS, readColor);
    return { version, colors, booleanFields, numberFields, colorFields, setFields, cm };
}
exports.readPony = readPony;
function writePonyToString(data) {
    return base64_js_1.fromByteArray(bitUtils_1.bitWriter(write => writePony(write, data)));
}
function readPonyFromBuffer(info) {
    return readPony(bitUtils_1.bitReader(info));
}
function readPonyFromString(info) {
    return info ? readPonyFromBuffer(base64_js_1.toByteArray(info)) : {
        version: exports.VERSION,
        colors: [],
        booleanFields: [],
        numberFields: [],
        colorFields: [],
        setFields: [],
        cm: [],
    };
}
// compress
function compressPony(info) {
    return writePonyToString(precompressPony(info, colors_1.BLACK, identity));
}
exports.compressPony = compressPony;
function decompressPony(info) {
    const data = typeof info === 'string' ? readPonyFromString(info) : readPonyFromBuffer(info);
    const pony = exports.fastPostdecompressPony(data); // postdecompressPony(data, identity);
    return ponyInfo_1.syncLockedPonyInfoNumber(pony);
}
exports.decompressPony = decompressPony;
// compress (string)
function parseColorFastSafe(color) {
    return color ? color_1.parseColorFast(color) : colors_1.TRANSPARENT;
}
function colorToString(color) {
    return color ? color_1.colorToHexRGB(color) : '';
}
function compressPonyString(info) {
    return writePonyToString(precompressPony(info, '000000', parseColorFastSafe));
}
exports.compressPonyString = compressPonyString;
function decompressPonyString(info, editable = false) {
    const data = readPonyFromString(info);
    const pony = postdecompressPony(data, colorToString);
    const result = editable ? lodash_1.merge(ponyInfo_1.createBasePony(), pony) : pony;
    return ponyInfo_1.syncLockedPonyInfo(result);
}
exports.decompressPonyString = decompressPonyString;
// decode
function decodePonyInfo(info, paletteManager) {
    return ponyInfo_1.toPaletteNumber(decompressPony(info), paletteManager);
}
exports.decodePonyInfo = decodePonyInfo;
//# sourceMappingURL=compressPony.js.map