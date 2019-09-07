"use strict";
/* tslint:disable */
Object.defineProperty(exports, "__esModule", { value: true });
require('source-map-support').install();
global.BETA = false;
const fs = require("fs");
const path = require("path");
const lodash_1 = require("lodash");
const common_1 = require("./common");
const sprite_sheet_1 = require("./sprite-sheet");
const convert_tiles_1 = require("./convert-tiles");
const create_font_1 = require("./create-font");
const canvas_utils_1 = require("./canvas-utils");
const psd_utils_1 = require("./psd-utils");
const sheets_1 = require("../common/sheets");
const color_1 = require("../common/color");
const bitUtils_1 = require("../common/bitUtils");
const head0Indices = [0, 1, 2, 4, 7, 8, 9, 10, 12, 13, 14, 16, 18, 19]; // regular
const head1Indices = [0, 1, 3, 5, 6, 8, 9, 11, 12, 13, 15, 17, 18, 19]; // clipped
const MAX_PALETTE_SIZE = 128;
const { assetsPath } = require('../../../config.json');
const rootPath = path.join(__dirname, '..', '..', '..');
const sourcePath = path.join(assetsPath);
const generatedPath = path.join(rootPath, 'src', 'ts', 'generated');
const outputPath = path.join(rootPath, 'tools', 'output');
const destPath = path.join(rootPath, 'tools', 'output', 'images');
const ponyPath = path.join(sourcePath, 'pony');
const shadowPalette = [common_1.TRANSPARENT, common_1.BLACK];
const isPng = common_1.matcher(/\.png$/);
const getPngs = (directory) => fs.readdirSync(directory).filter(isPng);
const getFrames = (layers) => layers.filter(common_1.nameMatches(/^frame/)).sort(common_1.compareLayers);
const ponyPsd = (name) => psd_utils_1.openPsd(path.join(ponyPath, name));
function openPng(fileName) {
    return canvas_utils_1.imageToCanvas(canvas_utils_1.loadImage(fileName));
}
function createPaletteFromList(canvases) {
    return canvases.reduce((pal, can) => createPalette(can, pal), []);
}
function createPaletteFromLayers(layers) {
    return createPaletteFromList(layers.map(common_1.getCanvasSafe));
}
function addCMSprite(sprites, flip, ox = 43, oy = 49) {
    const canvas = canvas_utils_1.createExtCanvas(5, 5, 'cm');
    const context = canvas.getContext('2d');
    const imageData = context.getImageData(0, 0, 5, 5);
    for (let i = 0, y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
            imageData.data[i++] = flip ? (y * 5 + (4 - x)) : (y * 5 + x);
            imageData.data[i++] = 255;
            imageData.data[i++] = 0;
            imageData.data[i++] = 255;
        }
    }
    context.putImageData(imageData, 0, 0);
    sprites.push(common_1.createSprite(sprites.length, canvas_utils_1.padCanvas(canvas, ox, oy), { x: ox, y: oy, w: 5, h: 5 }));
    return sprites.length - 1;
}
function createPalette(canvas, palette = []) {
    canvas_utils_1.forEachPixel(canvas, c => {
        if (!lodash_1.includes(palette, c)) {
            palette.push(c);
        }
    });
    if (palette.length > MAX_PALETTE_SIZE) {
        throw new Error(`Exceeded max palette size ${palette.length}/${MAX_PALETTE_SIZE} (${canvas.info})`);
    }
    return palette.sort((a, b) => a - b);
}
function splitButton(canvas, border) {
    return {
        topLeft: canvas_utils_1.cropCanvas(canvas, 0, 0, border, border),
        top: canvas_utils_1.cropCanvas(canvas, border, 0, canvas.width - border * 2, border),
        topRight: canvas_utils_1.cropCanvas(canvas, canvas.width - border, 0, border, border),
        left: canvas_utils_1.cropCanvas(canvas, 0, border, border, canvas.height - border * 2),
        bg: canvas_utils_1.cropCanvas(canvas, border, border, canvas.width - border * 2, canvas.height - border * 2),
        right: canvas_utils_1.cropCanvas(canvas, canvas.width - border, border, border, canvas.height - border * 2),
        bottomLeft: canvas_utils_1.cropCanvas(canvas, 0, canvas.height - border, border, border),
        bottom: canvas_utils_1.cropCanvas(canvas, border, canvas.height - border, canvas.width - border * 2, border),
        bottomRight: canvas_utils_1.cropCanvas(canvas, canvas.width - border, canvas.height - border, border, border),
    };
}
// main methods
function getEyesFromPsd({ objects2, sprites }, eyesPsd, irisesPsd) {
    const eyeCount = 24;
    const left = 20;
    const top = 20;
    const rightEyeWidth = 12;
    const perLine = 10;
    const h = 30, dx = 30, dy = 30;
    const irisesCount = 8;
    const irises = canvas_utils_1.colorCanvas(common_1.getLayerCanvasSafe('irises', irisesPsd), 'white');
    const whites = common_1.getLayerCanvasSafe('whites', eyesPsd);
    const lineart = common_1.getLayerCanvasSafe('lineart', eyesPsd);
    const eyeshadow = common_1.getLayerCanvasSafe('eyeshadow', eyesPsd);
    const bases = [canvas_utils_1.mergeCanvases(whites, lineart), ...common_1.findLayerSafe('eyelashes', eyesPsd).children
            .sort(common_1.compareLayers)
            .map(common_1.getCanvas)
            .map(c => canvas_utils_1.mergeCanvases(whites, lineart, c))];
    const shadow = canvas_utils_1.colorCanvas(eyeshadow, 'white');
    const shine = canvas_utils_1.mapColors(eyeshadow, c => c === 0xffffffff ? c : 0);
    const getRightEye = canvas_utils_1.cropAndPadByColRow(left, top, rightEyeWidth, h, dx, dy, left, top);
    const getLeftEye = canvas_utils_1.cropAndPadByColRow(left + rightEyeWidth, top, 30 - rightEyeWidth, h, dx, dy, left + rightEyeWidth, top);
    const getRight = canvas_utils_1.cropByIndex(getRightEye, perLine);
    const getLeft = canvas_utils_1.cropByIndex(getLeftEye, perLine);
    // const mirrored = (get: ByIndexGetter): ByIndexGetter => (canvas, index) => mirrorCanvas(get(canvas, index), -15);
    const palette = [0, common_1.WHITE, common_1.BLACK]; // 
    const getEye = (get) => (i) => bases.map(base => {
        const s = common_1.addSprite(sprites, get(shadow, i), undefined, palette);
        return {
            base: common_1.addSprite(sprites, get(base, i), undefined, palette),
            irises: lodash_1.range(0, irisesCount)
                .map(j => canvas_utils_1.maskCanvas(get(irises, j), get(whites, i)))
                .map(canvas => common_1.addSprite(sprites, canvas, undefined, palette)),
            shadow: s ? s : common_1.addSprite(sprites, get(shadow, 0), undefined, palette),
            shine: s ? common_1.addSprite(sprites, get(shine, i), undefined, palette) : common_1.addSprite(sprites, get(shine, 0), undefined, palette),
        };
    });
    objects2['eyeRight: PonyEyes'] = [null, ...lodash_1.range(0, eyeCount).map(getEye(getRight))];
    objects2['eyeLeft: PonyEyes'] = [null, ...lodash_1.range(0, eyeCount).map(getEye(getLeft))];
    // objects2['eyeRight2: PonyEyes'] = [null, ...range(0, eyeCount).map(getEye(mirrored(getLeft)))];
}
function getBlushFromPsd({ sprites, objects2 }, psd) {
    objects2.blush = common_1.addSprite(sprites, common_1.getLayerCanvasSafe('color', psd));
}
function getPonyShadowsAndSelection({ sprites, objects2 }, psd) {
    const count = 5;
    const shadow = canvas_utils_1.colorCanvas(common_1.getLayerCanvasSafe('shadow', psd), 'white');
    const selection = common_1.getLayerCanvasSafe('selection', psd);
    const crop = canvas_utils_1.cropAndPadByColRow(0, 0, psd.width, 10, 0, 10);
    objects2.ponyShadows = lodash_1.times(count, i => crop(shadow, 0, i)).map(c => common_1.addSprite(sprites, c));
    objects2.ponySelections = lodash_1.times(count, i => crop(selection, 0, i)).map(c => common_1.addSprite(sprites, c));
}
function splitMuzzleMouth(canvas) {
    const muzzleCanvas = canvas_utils_1.mapColors(canvas, c => (c === common_1.WHITE || c === common_1.OUTLINE_COLOR || c === common_1.SHADE_COLOR) ? c : 0);
    const mouthCanvas = canvas_utils_1.mapColors(canvas, c => {
        if (c === common_1.MOUTH_COLOR || c === common_1.TONGUE_COLOR) {
            return c;
        }
        else if (c === common_1.TEETH_COLOR) {
            return common_1.WHITE;
        }
        else if (c === common_1.TEETH_SHADE_COLOR) {
            return common_1.LIGHT_SHADE_COLOR;
        }
        else {
            return 0;
        }
    });
    return { mouthCanvas, muzzleCanvas };
}
function getMuzzlesFromPsd({ sprites, objects2 }, psd) {
    const columns = 5;
    const typeCount = 2;
    const expressionsPerLine = 5;
    const expressionList = [
        0, 1, 24, 4, 9,
        5, 2, 3, 8, 10,
        11, 12, 13, 14, 15,
        17, 18, 19, 20, 21,
        22, 23, 30, 32, 6,
        33,
    ];
    const { mouthCanvas, muzzleCanvas } = splitMuzzleMouth(common_1.getLayerCanvasSafe('muzzle', psd));
    const fangsCanvas = canvas_utils_1.colorCanvas(common_1.getLayerCanvasSafe('fangs', psd), 'white');
    const noseCanvas = canvas_utils_1.colorCanvas(common_1.getLayerCanvasSafe('nose', psd), 'white');
    const noseMuzzleCanvas = muzzleCanvas; // mergeCanvases(muzzleCanvas, noseCanvas);
    const nosePatternCanvas = canvas_utils_1.mergeCanvases(canvas_utils_1.colorCanvas(muzzleCanvas, 'red'), canvas_utils_1.colorCanvas(noseCanvas, '#00ff00'));
    const getImage = canvas_utils_1.cropAndPadByColRow(20, 20, 30, 30, 30, 30, 20, 20);
    const muzzleIndices = [...lodash_1.range(0, typeCount), -1];
    canvas_utils_1.saveCanvas(path.join(outputPath, 'noseMuzzleCanvas.png'), noseMuzzleCanvas);
    canvas_utils_1.saveCanvas(path.join(outputPath, 'nosePatternCanvas.png'), nosePatternCanvas);
    // [expression][type][pattern]
    objects2['noses: PonyNose[][][]'] = expressionList.map(expression => muzzleIndices.map(type => {
        const x = expression % expressionsPerLine + (type > 0 ? type : 0) * columns;
        const y = Math.floor(expression / expressionsPerLine);
        const fangs = common_1.addSprite(sprites, getImage(fangsCanvas, x, y)) || 0;
        const mouth = common_1.addSprite(sprites, getImage(mouthCanvas, x, y), undefined, common_1.defaultPalette);
        if (type < 0) {
            const color = getImage(noseMuzzleCanvas, x, y);
            const pattern = getImage(nosePatternCanvas, x, y);
            return [Object.assign({}, common_1.addSpriteWithColors(sprites, color, pattern), { mouth, fangs })];
        }
        else {
            return [{ color: common_1.addSprite(sprites, getImage(muzzleCanvas, x, y)), colors: 3, mouth, fangs }];
        }
    }));
}
function getSetNameLayer(sheet) {
    const layersWithSets = sheet.layers.filter(l => l.set);
    return [
        ...layersWithSets.map(l => ({
            name: l.set,
            layerName: l.name
        })),
        ...layersWithSets.filter(l => !!l.importMirrored).map(l => ({
            name: l.importMirrored.fieldName,
            layerName: l.name,
            mirror: true,
            mirrorOffsetX: l.importMirrored.offsetX,
        })),
    ];
}
function importSprites({ sprites, objects2 }, sheet) {
    const psd = ponyPsd(`${sheet.file}.psd`);
    const { width, height, offset, offsetY = 0, padLeft = 0, padTop = 20, wrap = 0, importOffsets } = sheet;
    const setsWithEmpties = sheet.setsWithEmpties;
    let frameCount = Math.floor(psd.width / offset);
    let typeCount = Math.floor(psd.height / height);
    let getImage = canvas_utils_1.cropAndPadByColRow(padLeft, 0, width, height, offset, height, 10 + padLeft, padTop - offsetY);
    let hasExtra = false;
    if (wrap) {
        typeCount = typeCount * frameCount;
        frameCount = 1;
        const oldGet = getImage;
        getImage = (canvas, _, type) => oldGet(canvas, type % wrap, Math.floor(type / wrap));
    }
    else if (sheet.single) {
        typeCount = typeCount * frameCount;
        frameCount = 1;
        const oldGet = getImage;
        getImage = (canvas, _, type) => oldGet(canvas, type, 0);
    }
    const sets = [
        ...getSetNameLayer(sheet),
        ...(sheet.masks || []),
    ];
    const maskFiles = {};
    if (sheet.masks) {
        lodash_1.compact(sheet.masks.map(m => m.maskFile))
            .forEach(file => maskFiles[file] = psd_utils_1.openPsd(path.join(ponyPath, file + '.psd')));
    }
    const animations = sets.map(({ layerName, name, mask, reverse, maskFile, mirror, mirrorOffsetX }) => {
        const layer = common_1.findLayerSafe(layerName, psd);
        let color = common_1.getLayerCanvasSafe('color', layer);
        const extraCanvas = sheet.extra ? common_1.getLayerCanvas('extra', layer) : undefined;
        const patterns = common_1.getPatternCanvases(layer);
        if (mask) {
            const maskColor = common_1.getLayerCanvasSafe(mask, maskFiles[maskFile || ''] || psd);
            const maskRepeated = canvas_utils_1.createExtCanvas(psd.width, psd.height, `${maskColor.info} repeated`);
            const maskContext = maskRepeated.getContext('2d');
            for (let i = 0; i < typeCount; i++) {
                maskContext.drawImage(maskColor, 0, i * (height + offsetY));
            }
            color = canvas_utils_1.maskCanvas(color, reverse ? canvas_utils_1.reverseMaskCanvas(maskRepeated) : maskRepeated);
        }
        // [frame][type][pattern]
        const frames = common_1.trimRight(lodash_1.range(0, frameCount).map(frame => {
            return common_1.trimRight(lodash_1.range(0, typeCount).map(type => {
                const { x, y } = importOffsets && importOffsets[frame] || { x: 0, y: 0 };
                const getAndPadBase = (canvas) => canvas_utils_1.padCanvas(getImage(canvas, frame, type), -x, -y);
                const getAndPad = mirror ? (canvas) => canvas_utils_1.mirrorCanvas(getAndPadBase(canvas), mirrorOffsetX) : getAndPadBase;
                const accessoryFrame = getAndPad(color);
                const extraFrame = extraCanvas && getAndPad(extraCanvas);
                if (canvas_utils_1.isCanvasEmpty(accessoryFrame)) {
                    return null;
                }
                else {
                    let extraProps = {};
                    if (extraFrame) {
                        const palette = createPalette(extraFrame);
                        const extra = common_1.addSprite(sprites, extraFrame, undefined, palette);
                        extraProps = { extra, palette };
                        hasExtra = true;
                    }
                    const patternCanvases = patterns
                        .map(getAndPad)
                        .map(pattern => common_1.clipPattern(accessoryFrame, pattern));
                    return lodash_1.dropRightWhile(patternCanvases, canvas_utils_1.isCanvasEmpty)
                        .map(patternFrame => (Object.assign({}, common_1.addSpriteWithColors(sprites, accessoryFrame, patternFrame), extraProps)));
                }
            }));
        }));
        return { name, frames };
    });
    // fill-in missing types
    if (animations.length > 1) {
        animations.forEach(({ frames }) => {
            frames.forEach((types, i) => {
                const typeCount = lodash_1.max(animations.map(({ frames }) => frames[i] ? frames[i].length : 0));
                while (types && types.length < typeCount) {
                    types.push([]);
                }
            });
        });
    }
    // fix pattern color counts
    if (sheet.single) {
        const groups = sheet.groups || [animations.map(a => a.name)];
        const colorCounts = groups.map(() => []); // [group][type][pattern]
        animations.forEach(({ name, frames }) => {
            const gi = groups.findIndex(g => lodash_1.includes(g, name));
            const groupColorCounts = colorCounts[gi];
            frames.forEach(types => {
                (types || []).forEach((patterns, ti) => {
                    groupColorCounts[ti] = groupColorCounts[ti] || [];
                    (patterns || []).forEach((pattern, pi) => {
                        if (pattern) {
                            groupColorCounts[ti][pi] = Math.max(pattern.colors, groupColorCounts[ti][pi] || 0);
                        }
                    });
                });
            });
        });
        animations.forEach(({ name, frames }) => {
            const gi = groups.findIndex(g => lodash_1.includes(g, name));
            const groupColorCounts = colorCounts[gi];
            frames.forEach(types => {
                (types || []).forEach((patterns, ti) => {
                    (patterns || []).forEach((pattern, pi) => {
                        if (pattern) {
                            pattern.colors = groupColorCounts[ti] && groupColorCounts[ti][pi] || 0;
                        }
                    });
                });
            });
        });
    }
    animations.map(({ name, frames }) => {
        if (sheet.empties && setsWithEmpties && lodash_1.includes(setsWithEmpties, name)) {
            for (let i = 0; i < frames.length; i++) {
                frames[i] = frames[i] && frames[i].filter((_, j) => !lodash_1.includes(sheet.empties, j));
            }
        }
        if (sheet.single) {
            objects2[`${name}: StaticSprites${hasExtra ? 'Extra' : ''}`] = frames[0];
        }
        else {
            objects2[`${name}: AnimatedSprites`] = frames;
        }
    });
}
function getTreesFromPsd({ sprites, objects2 }, psd, name, palettes) {
    const groups = psd.children.filter(c => c.children && c.children.length).sort(common_1.compareLayers);
    const width = psd.width / groups.length;
    const spr = (name, index, palette, parent) => {
        const canvas = common_1.getLayerCanvasSafe(name, parent);
        const cropped = canvas_utils_1.cropCanvas(canvas, width * index, 0, width, canvas.height);
        return common_1.addSprite(sprites, cropped, undefined, palette);
    };
    const children = lodash_1.flatten(groups.map(c => c.children));
    const trunkPalettes = palettes || [createPaletteFromLayers(children.filter(l => /^(stump|trunk)$/.test(l.name)))];
    const crownPalettes = palettes || [createPaletteFromLayers(children.filter(l => /crown/.test(l.name)))];
    const hasStumpWinter = children.some(l => /stump winter/.test(l.name));
    const stumpWinterPalettes = hasStumpWinter ? [createPaletteFromLayers(children.filter(l => /stump winter/.test(l.name)))] : [];
    groups.forEach((group, index) => {
        objects2[`${name}Stump${index}`] = {
            color: spr('stump', index, trunkPalettes[0], group),
            //shadow: spr('stump shadow', index, shadowPalette, group),
            palettes: trunkPalettes,
        };
        if (hasStumpWinter) {
            objects2[`${name}StumpWinter${index}`] = {
                color: spr('stump winter', index, stumpWinterPalettes[0], group),
                //shadow: spr('stump shadow', index, shadowPalette, group),
                palettes: stumpWinterPalettes,
            };
        }
        if (common_1.findLayer('trunk', group)) {
            objects2[`${name}Trunk${index}`] = {
                color: spr('trunk', index, trunkPalettes[0], group),
                palettes: trunkPalettes,
            };
        }
        const crown = spr('crown', index, crownPalettes[0], group);
        for (let i = 0; i < groups.length; i++) {
            objects2[`${name}Crown${index}_${i}`] = {
                color: crown,
                shadow: spr(`shadow ${index + 1}`, i, shadowPalette, groups[i]),
                palettes: crownPalettes,
            };
        }
    });
}
function getTreesOrObjectFromPsd(result, psd, name, palettes) {
    if (common_1.findLayer('color', psd)) {
        const color = common_1.getLayerCanvas('color', psd);
        const shadow = common_1.getLayerCanvas('shadow', psd);
        addColorShadow(result, name, color, shadow, palettes);
    }
    else {
        getTreesFromPsd(result, psd, name, palettes);
    }
}
function getTreeStagesFromPsds(result, psds, name) {
    const groups = lodash_1.range(1, 3).map(i => `tree ${i}`);
    const layers = ['crown', 'trunk', 'stump'];
    const palettes = createPalettes(psds, ['color', ...common_1.cartesian(groups, layers).map(([a, b]) => `${a}/${b}`)]);
    psds
        .filter(psd => !isPalettePsd(psd))
        .forEach(psd => getTreesOrObjectFromPsd(result, psd, `${name}_${psd.name}`, palettes));
}
function getTreesFromPsds(result, directory) {
    common_1.getDirectories(directory)
        .filter(dir => !/^_/.test(path.basename(dir)))
        .forEach(dir => getTreeStagesFromPsds(result, psd_utils_1.openPsdFiles(dir, /\d+\.psd$/), path.basename(dir)));
}
function addColorShadow({ sprites, objects2 }, name, color, shadow, palettes) {
    objects2[name] = {
        color: common_1.addSprite(sprites, color, undefined, palettes && palettes[0]),
        shadow: common_1.addSprite(sprites, shadow, undefined, shadowPalette),
        palettes,
    };
}
function getObjectFromPsd(result, psd, name) {
    const color = common_1.getLayerCanvas('color', psd);
    const shadow = common_1.getLayerCanvas('shadow', psd);
    const palettes = color ? [createPalette(color)] : undefined;
    addColorShadow(result, name, color, shadow, palettes);
}
function createOtherPalette(basePalette, base, color, palette) {
    canvas_utils_1.forEachPixelOf2Canvases(base, color, (b, c) => {
        if (b !== c) {
            const index = basePalette.indexOf(b);
            if (index === -1) {
                throw new Error(`cannot find color in palette`);
            }
            palette[index] = c;
        }
    });
    return palette;
}
function otherPaletteFromPsd(basePalette, basePsd, palettePsd, palette, layers) {
    return layers.reduce((palette, layer) => {
        const base = common_1.getLayerCanvas(layer, basePsd);
        const pal = common_1.getLayerCanvas(layer, palettePsd);
        return base && pal ? createOtherPalette(basePalette, base, pal, palette) : palette;
    }, palette);
}
function isPalettePsd(psd) {
    return /^palette_/.test(psd.name);
}
function getLayerCanvases(names, psd) {
    return lodash_1.compact(names.map(name => common_1.getLayerCanvas(name, psd)));
}
function createPalettes(psds, layers) {
    const main = psds.filter(psd => !isPalettePsd(psd));
    const canvases = lodash_1.flatten(main.map(psd => getLayerCanvases(layers, psd)));
    const palette = createPaletteFromList(canvases);
    const otherPalettes = psds
        .filter(isPalettePsd)
        .map(psd => {
        const [, index, name] = psd.name.split('_');
        return { index: +index, name, psd };
    });
    const paletteCount = lodash_1.max(otherPalettes.map(p => p.index)) || 0;
    const other = lodash_1.range(1, paletteCount + 1)
        .map(i => otherPalettes.filter(p => p.index === i))
        .filter(x => x.length)
        .map(x => x.map(({ name, psd }) => ({ base: main.find(x => x.name === name), psd })))
        .map(x => x.reduce((pal, { base, psd }) => otherPaletteFromPsd(palette, base, psd, pal, layers), palette.slice()));
    return [palette, ...other];
}
function getObjectGroupFromPsd(result, psds, dir) {
    const palettes = createPalettes(psds, ['color']);
    psds
        .filter(psd => !isPalettePsd(psd))
        .forEach(psd => {
        const color = common_1.getLayerCanvas('color', psd);
        const shadow = common_1.getLayerCanvas('shadow', psd);
        addColorShadow(result, `${dir}_${psd.name}`, color, shadow, palettes);
    });
}
function getObjectsFromPsds(result, directory) {
    psd_utils_1.openPsdFiles(directory, /psd$/)
        .forEach(psd => getObjectFromPsd(result, psd, psd.name));
    common_1.getDirectories(directory)
        .filter(dir => !/^_/.test(path.basename(dir)))
        .forEach(dir => {
        const files = psd_utils_1.openPsdFiles(dir, /psd$/)
            .filter(psd => !/^_/.test(path.basename(psd.name)));
        getObjectGroupFromPsd(result, files, path.basename(dir));
    });
}
function createOtherSprites({ objects, images }, directory) {
    getPngs(directory).forEach(f => {
        const canvas = openPng(path.join(directory, f));
        const name = path.basename(f, '.png');
        objects[name] = common_1.addImage(images, canvas);
    });
}
function createOtherSpritesPalette({ objects2, sprites }, directory) {
    getPngs(directory).forEach(f => {
        const canvas = openPng(path.join(directory, f));
        const name = path.basename(f, '.png');
        const palette = createPalette(canvas);
        const color = common_1.addSprite(sprites, canvas, undefined, palette);
        objects2[name + '_2'] = { color, palette };
    });
}
function createIcons({ objects2, sprites }, directory) {
    getPngs(directory).forEach(f => {
        const canvas = openPng(path.join(directory, f));
        const name = path.basename(f, '.png');
        objects2[name] = common_1.addSprite(sprites, canvas, undefined, common_1.defaultPalette);
    });
}
function createOtherSpritesAnimations({ objects, images }, directory) {
    psd_utils_1.openPsdFiles(directory).forEach(psd => {
        const canvases = getFrames(psd.children).map(common_1.getCanvas);
        const frames = canvases.map(c => c ? common_1.addImage(images, c) : 0);
        objects[psd.name] = { frames };
    });
}
function createButtons({ objects, objects2, images, sprites }, directory) {
    getPngs(directory).forEach(f => {
        const [, name, borderText] = /^(.+)-(\d+)$/.exec(path.basename(f, '.png'));
        const border = +borderText;
        const canvas = openPng(path.join(directory, f));
        const canvases = splitButton(canvas, border);
        objects[name] = Object.assign({ border }, lodash_1.mapValues(canvases, c => common_1.addImage(images, c)));
        const palette = createPalette(canvas);
        objects2[name + '_2'] = Object.assign({ border, palette }, lodash_1.mapValues(canvases, c => common_1.addSprite(sprites, c, undefined, palette)));
    });
}
const lightsPad = 4;
function createLights({ objects, images }, directory) {
    return getPngs(directory).map(f => {
        const canvas = openPng(path.join(directory, f));
        const name = path.basename(f, '.png');
        return objects[name] = common_1.addImage(images, canvas_utils_1.padCanvas(canvas, lightsPad, lightsPad, lightsPad, lightsPad, 'black'));
    });
}
function createAnimations({ objects2, sprites }, directory) {
    getPngs(directory).forEach(f => {
        const [, name, w, h] = /^(.+)-(\d+)x(\d+)\.png$/.exec(f);
        const canvas = canvas_utils_1.imageToCanvas(canvas_utils_1.loadImage(path.join(directory, f)));
        const spriteWidth = canvas.width / +w;
        const spriteHeight = canvas.height / +h;
        const palette = createPalette(canvas);
        const frames = common_1.cartesian(lodash_1.range(+w), lodash_1.range(+h))
            .map(([x, y]) => canvas_utils_1.cropCanvas(canvas, x * spriteWidth, y * spriteHeight, spriteWidth, spriteHeight))
            .map(bitmap => common_1.addSprite(sprites, bitmap, undefined, palette));
        objects2[name] = { frames, palette };
    });
    psd_utils_1.openPsdFiles(directory).forEach(psd => {
        const canvases = getFrames(psd.children).map(common_1.getCanvas);
        const palette = createPaletteFromList(lodash_1.compact(canvases));
        const frames = canvases.map(c => common_1.addSprite(sprites, c, undefined, palette));
        const shadowLayer = common_1.findLayer('shadow', psd);
        const shadow = shadowLayer ? common_1.addSprite(sprites, common_1.getCanvas(shadowLayer), undefined, shadowPalette) : undefined;
        objects2[psd.name] = { frames, palette, shadow };
    });
    common_1.getDirectories(directory)
        .filter(dir => !/^_/.test(path.basename(dir)))
        .forEach(dir => {
        const psds = psd_utils_1.openPsdFiles(dir);
        const dirName = path.basename(dir);
        const canvases = lodash_1.flatten(psds.map(psd => lodash_1.compact(psd.children.filter(x => /^frame/i.test(x.name)).map(x => common_1.getCanvas(x)))));
        const palette = createPaletteFromList(canvases);
        for (const psd of psds) {
            const canvases = getFrames(psd.children).map(common_1.getCanvas);
            const frames = canvases.map(c => common_1.addSprite(sprites, c, undefined, palette));
            const shadowLayer = common_1.findLayer('shadow', psd);
            const shadow = shadowLayer ? common_1.addSprite(sprites, common_1.getCanvas(shadowLayer), undefined, shadowPalette) : undefined;
            objects2[`${dirName}_${psd.name}`] = { frames, palette, shadow };
        }
    });
}
function createEmoteAnimations({ objects2, sprites }, directory) {
    psd_utils_1.openPsdFiles(directory).forEach(psd => {
        const frames = getFrames(psd.children)
            .map(common_1.getCanvasSafe)
            .map(c => common_1.addSprite(sprites, c, undefined, common_1.defaultPalette));
        objects2[psd.name] = { frames, palette: [] };
    });
}
// .ts file generation
const palettes = [common_1.defaultPalette];
function createObject(name, value) {
    if (!/^[a-z_][a-z0-9_]*(: [a-z]+(\[\])*)?$/i.test(name)) {
        throw new Error(`Invalid sprite name (${name})`);
    }
    return `export const ${name} = ${obj(value, name, true)};\n`;
}
function encodeArray(items) {
    return `[${items.join(', ')}]`;
}
function addPalette(palette) {
    const index = palettes.findIndex(p => lodash_1.isEqual(p, palette));
    const paletteIndex = index === -1 ? (palettes.push(palette) - 1) : index;
    return paletteIndex;
}
function addPalettes(palettes) {
    return `[${palettes.map(addPalette).join(', ')}]`;
}
function obj(value, name, indent = false) {
    if (value == null) {
        return 'undefined';
    }
    else if (typeof value === 'string') {
        return value;
    }
    else if (typeof value === 'number') {
        return `sprites[${value.toString()}]`;
    }
    else if (Array.isArray(value)) {
        if (/: StaticSprites(Extra)?$/.test(name)) {
            // [type][pattern]
            const types = value;
            const key = name.replace(/: StaticSprites(Extra)?/, '');
            const lines = [];
            // const typeCount = types.length;
            // const patternCounts = types.map(type => type ? type.length : 0);
            // const patternCountMax = max(patternCounts)!;
            // const emptyLine = times(patternCountMax, () => 0);
            // const colorsCounts = types.map(type => {
            // 	type = type || [];
            // 	// console.log(type);
            // 	return [...type.map(p => p!.colors), ...emptyLine.slice(0, patternCountMax - type.length)];
            // });
            // lines.push(`/* NEW */ export const ${key}SpritesArray = mapSprites2([\n${
            // 	types.map(patterns => `  ${
            // 		padArray(patterns, patternCountMax, { color: 0, colors: 0 }).map(x => x!.color).join(', ')
            // 		},`).join('\n')
            // 	}\n]);`);
            // lines.push(`/* NEW */ export const ${key}TypeCount = ${typeCount};`);
            // lines.push(`/* NEW */ export const ${key}PatternCounts = [${patternCounts.join(', ')}];`);
            // lines.push(`/* NEW */ export const ${key}PatternCountsMax = ${patternCountMax};`);
            // lines.push(`/* NEW */ export const ${key}PatternColorCounts = [\n` +
            // 	`${colorsCounts.map(counts => `  ${counts.join(', ')},`).join('\n')}` +
            // 	`\n];`);
            if (/Extra$/.test(name)) {
                lines.push(`export const ${key}Extra: StaticSprites = [\n${types.map(patterns => patterns ?
                    `\t[${patterns.map(x => x.extra ?
                        `createColorPalette(${x.extra}, [${addPalette(x.palette)}])` :
                        'emptyColorPalette()').join(', ')}],` :
                    '\tundefined,').join('\n')}\n];`);
            }
            const items = `\n${value.map((x, i) => '\t' + obj(x, `${name}[${i}]`)).join(',\n')}\n`;
            return `[${indent ? items : items.replace(/\t/g, '').replace(/\n/g, ' ').trim()}];` +
                '\n' + lines.join('\n') + '\n';
        }
        else {
            const items = `\n${value.map((x, i) => '\t' + obj(x, `${name}[${i}]`)).join(',\n')}\n`;
            return `[${indent ? items : items.replace(/\t/g, '').replace(/\n/g, ' ').trim()}]`;
        }
    }
    else {
        return createObj(value, name);
    }
}
function encodeColor(value) {
    const alpha = value & 0xff;
    if (alpha === 0) {
        return '0';
    }
    else if (alpha !== 0xff) {
        return value.toString(16).padStart(8, '0');
    }
    else {
        return (value >>> 8).toString(16).padStart(6, '0');
    }
}
function createObj(s, name) {
    if (s.frames && s.palette && s.shadow) {
        return `createAnimationShadow(${encodeArray(s.frames)}, ${s.shadow}, ${addPalette(s.palette)})`;
    }
    else if (s.frames && s.palette) {
        return `createAnimationPalette(${encodeArray(s.frames)}, ${addPalette(s.palette)})`;
    }
    else if (s.frames) {
        return `createAnimation(${encodeArray(s.frames)})`;
    }
    else if (s.fangs != null) {
        return `createNose(${s.color}, ${s.colors}, ${s.mouth}, ${s.fangs})`;
    }
    else if (s.color && s.colors && s.extra && s.palette) {
        return `createColorExtraPal(${s.color}, ${s.colors}, ${s.extra}, [${addPalette(s.palette)}])`;
    }
    else if (s.color && s.colors) {
        return `colorPal${s.colors}(${s.color})`;
    }
    else if (s.base && s.irises != null) {
        return `createEye(${s.base}, ${encodeArray(s.irises)}, ${s.shadow}, ${s.shine})`;
    }
    else if (s.color && s.shadow && s.palettes) {
        return `createColorShadowPalette(${s.color}, ${s.shadow}, ${addPalettes(s.palettes)})`;
    }
    else if (s.color && s.palettes) {
        return `createColorPalette(${s.color}, ${addPalettes(s.palettes)})`;
    }
    else if (s.sprites && s.palettes) {
        return `createSpritesPalette(${encodeArray(s.sprites)}, ${addPalettes(s.palettes)})`;
    }
    else if (s.color && s.palette) {
        return `/* no palettes */ createColorPalette(${s.color}, [${addPalette(s.palette)}])`;
    }
    else if (s.color && s.shadow) {
        return `createColorShadow(${s.color}, ${s.shadow})`;
    }
    else if (s.color) {
        return `createColor(${s.color})`;
    }
    else if (s.shadow) {
        return `createShadow(${s.shadow})`;
    }
    else if (s.topLeft) {
        return `createButton(${s.border}, ${s.topLeft}, ${s.top}, ${s.topRight}, ${s.left}, ${s.bg},`
            + ` ${s.right}, ${s.bottomLeft}, ${s.bottom}, ${s.bottomRight})`;
    }
    else if (s.name && s.sprite) {
        return `createEmote('${s.name}', ${s.sprite})`;
    }
    else {
        throw new Error(`Failed '${name}' createSprite(${JSON.stringify(s)})`);
    }
}
function spriteType({ shade, layer }) {
    return shade ? (layer ? layer - 1 : (layer || 0)) : (3 + (layer || 0));
}
let minOX = 0, minOY = 0;
let maxOX = 0, maxOY = 0;
let maxW = 0, maxH = 0;
function toHex(value) {
    const result = value.toString(16);
    return result.length === 1 ? `0${result}` : result;
}
function encodeSprite(s) {
    if (s.x > 0xfff || s.y > 0xfff || s.ox > 0xff || s.oy > 0xff || s.w > 0x1ff || s.h > 0x1ff || spriteType(s) > 0x3f) {
        throw new Error(`Invalid sprite (${s})`);
    }
    const buffer = bitUtils_1.bitWriter(write => {
        write(s.x, 12);
        write(s.y, 12);
        write(s.w, 9);
        write(s.h, 9);
        write(s.ox, 8);
        write(s.oy, 8);
        write(spriteType(s), 6);
    });
    if (buffer.length !== 8) {
        throw new Error(`Invalid encoded sprite length (${buffer.length} !== 8)`);
    }
    let result = '';
    for (let i = 0; i < buffer.length; i++) {
        result += toHex(buffer[i]);
    }
    return result;
}
function toSpritesArray(sprites) {
    const index = sprites.findIndex((s, i) => !!i && (!s || !s.w || !s.h));
    if (index !== -1) {
        console.error(`Invalid sprite at ${index}`, sprites[index]);
        throw new Error(`Invalid sprite at ${index}`);
    }
    return lodash_1.compact(sprites)
        .filter(s => s.w && s.h)
        .map(s => {
        maxW = Math.max(maxW, s.w);
        maxH = Math.max(maxH, s.h);
        minOX = Math.min(minOX, s.ox);
        maxOX = Math.max(maxOX, s.ox);
        minOY = Math.min(minOY, s.oy);
        maxOY = Math.max(maxOY, s.oy);
        return encodeSprite(s); // `\t${s.x}, ${s.y}, ${s.w}, ${s.h}, ${s.ox}, ${s.oy}, ${spriteType(s)},\n`;
    })
        .join('')
        .trim();
}
function groupFont(fontSprites, maxWaste) {
    const groups = [];
    let group = undefined;
    for (const codeSprite of fontSprites) {
        if (!group || (codeSprite.code - group.lastCode) > maxWaste) {
            group = { firstCode: codeSprite.code, lastCode: codeSprite.code, sprites: [] };
            groups.push(group);
        }
        while ((codeSprite.code - group.lastCode) > 1) {
            group.sprites.push({ sprite: 0, code: 0 });
            group.lastCode++;
        }
        group.sprites.push(codeSprite);
        group.lastCode = codeSprite.code;
    }
    return groups;
}
function createFontCode(name, fontSprites, sprites) {
    const groups = groupFont(fontSprites, 5);
    return `export const ${name} = createFont(${sprites}, [\n` +
        `${groups.map(g => `  [${g.firstCode}, [${g.sprites.map(s => s.sprite).join(', ')}]],`).join('\n')}\n]);`;
}
function createSpritesTS(dest, config) {
    const { objects, objects2 } = config.result;
    let ts = fs.readFileSync(path.join(rootPath, 'src', 'ts', 'tools', 'sprites-template.ts'), 'utf8');
    ts = ts.replace(/export \{.+?\r\n/, '');
    ts = ts.replace('/*SPRITE_SHEET*/', `images/${config.spriteFileName}`);
    ts = ts.replace('/*SPRITE_SHEET_PALETTE*/', `images/${config.paletteFileName}`);
    ts = ts.replace('/*SPRITE_SHEET_PALETTE_ALPHA*/', `images/${config.paletteAlphaFileName}`);
    ts = ts.replace('/*SPRITES*/', toSpritesArray(config.sprites));
    ts = ts.replace('/*SPRITES_PALETTE*/', toSpritesArray(config.paletteSprites));
    ts = ts.replace('/*FONTS*/', [
        Object.keys(config.fonts).map(key => createFontCode(key, config.fonts[key], 'sprites')).join('\n\n'),
        Object.keys(config.fontsPal).map(key => createFontCode(key, config.fontsPal[key], 'sprites2')).join('\n\n'),
    ].join('\n\n'));
    ts += Object.keys(objects).map(key => createObject(key, objects[key])).join('');
    ts += Object.keys(objects2).map(key => createObject(key, objects2[key])).join('').replace(/sprites/g, 'sprites2');
    const colors = lodash_1.uniq(lodash_1.flatten(config.palettes)).sort((a, b) => a - b);
    const palettesCode = config.palettes
        .map(p => p.map(c => colors.indexOf(c)).join(', '))
        .map(p => `\t[${p}]`)
        .join(',\n')
        .trim();
    ts = ts.replace('/*COLORS*/', colors.map(encodeColor).join(' '));
    ts = ts.replace('/*PALETTES*/', palettesCode);
    ts = ts.replace('/*NAMED_PALETTES*/', lodash_1.toPairs(config.namedPalettes)
        .map(([key, value]) => `export const ${key} = palettes[${value}];`).join('\n'));
    ts = ts.replace('/*NAMED_SPRITES*/', `export const emptySprite = sprites[0];\nexport const emptySprite2 = sprites2[0];`);
    ts += `
export const head0 = [
	undefined,
	[[${head0Indices.join(', ')}].map(i => head[1]![0]![i])],
];

export const head1 = [
	undefined,
	[[${head1Indices.join(', ')}].map(i => head[1]![0]![i])],
];
	`;
    fs.writeFileSync(dest, ts.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n'), 'utf8');
}
function fixPixelRect(sprites, objects, srcName, dstName) {
    const r = sprites[objects[srcName]];
    sprites.push({ x: r.x + 1, y: r.y + 1, w: 1, h: 1, ox: 0, oy: 0, layer: r.layer, image: null });
    objects[dstName] = sprites.length - 1;
}
function getFramesFromPSD({ sprites }, psd, padY = 5) {
    return common_1.findLayerSafe('frames', psd).children
        .slice()
        .sort(common_1.compareLayers)
        .map(common_1.getCanvasSafe)
        .map(canvas => {
        const cropped = canvas_utils_1.padCanvas(canvas, 0, padY);
        const pattern = common_1.clipPattern(cropped, canvas_utils_1.colorCanvas(cropped, 'red'));
        return common_1.addSpriteWithColors(sprites, cropped, pattern);
    });
}
exports.getFramesFromPSD = getFramesFromPSD;
// main
function createResult() {
    return {
        objects: {},
        objects2: {},
        images: [canvas_utils_1.createExtCanvas(1, 1, 'empty')],
        sprites: [{ image: canvas_utils_1.createExtCanvas(1, 1, 'empty'), x: 0, y: 0, w: 0, h: 0, ox: 0, oy: 0 }],
    };
}
function createPonySprites(result) {
    getEyesFromPsd(result, ponyPsd('eyes.psd'), ponyPsd('irises.psd'));
    getMuzzlesFromPsd(result, ponyPsd('muzzles.psd'));
    getBlushFromPsd(result, ponyPsd('blush.psd'));
    getPonyShadowsAndSelection(result, ponyPsd('shadows.psd'));
    result.objects2.cms = addCMSprite(result.sprites, false);
    result.objects2.cmsFlip = addCMSprite(result.sprites, true);
    sheets_1.sheets
        .filter(s => 'name' in s && !!s.file && !s.skipImport)
        .forEach(s => importSprites(result, s));
    // const bug = getFramesFromPSD(result, ponyPsd('fly-bug.psd'));
    // result.objects2['wings: AnimatedSprites'].slice(3)
    // 	.forEach((frame: any, i: number) => frame[1] = [pegasus[i]]);
    getTreesFromPsds(result, path.join(sourcePath, 'trees'));
    getObjectsFromPsds(result, path.join(sourcePath, 'objects'));
    createButtons(result, path.join(sourcePath, 'buttons'));
    createAnimations(result, path.join(sourcePath, 'animations'));
    createOtherSprites(result, path.join(sourcePath, 'sprites'));
    createOtherSpritesPalette(result, path.join(sourcePath, 'sprites-palette'));
    createIcons(result, path.join(sourcePath, 'icons'));
    createOtherSpritesAnimations(result, path.join(sourcePath, 'sprites-animations'));
    createEmoteAnimations(result, path.join(sourcePath, 'emotes'));
    createWalls(result, path.join(sourcePath, 'walls'));
    common_1.createPixelSprites(result);
}
function createWalls(result, rootPath) {
    createWall(result, 'wall_wood', psd_utils_1.openPsd(path.join(rootPath, 'wood.psd')), {
        thickness: 8, fullHeight: 85, halfHeight: 22, fullHeightVertical: 97, halfHeightVertical: 34,
    });
    createWall(result, 'wall_stone', psd_utils_1.openPsd(path.join(rootPath, 'stone.psd')), {
        thickness: 8, fullHeight: 85, halfHeight: 22, fullHeightVertical: 97, halfHeightVertical: 34,
    });
}
function createWall(result, name, psd, config) {
    const full = common_1.getCanvasSafe(common_1.findLayerSafe('full', psd));
    const half = common_1.getCanvasSafe(common_1.findLayerSafe('half', psd));
    const palette = createPaletteFromList([full, half]);
    const h0wall = 16;
    const v0wall = 17;
    const lcut = 18;
    const rcut = 19;
    const thickness = config.thickness;
    const map = [];
    let offset = 0;
    function push(index, w, vertical = false) {
        if (map[index]) {
            throw new Error('Already taken');
        }
        map[index] = { x: offset, w, vertical };
        offset += w;
    }
    function gap() {
        offset++;
    }
    function createSprites(canvas, y, height, verticalHeight) {
        return map
            .map(({ x, w, vertical }) => canvas_utils_1.cropCanvas(canvas, x, y, w, vertical ? verticalHeight : height))
            .map(part => ({ palette, color: common_1.addSprite(result.sprites, part, undefined, palette) }));
    }
    // 0b	top right bottom left
    push(0b0100, thickness);
    push(h0wall, 32 - thickness);
    push(0b0101, thickness);
    push(0b0001, thickness);
    gap();
    push(0b0000, thickness);
    gap();
    push(0b0010, thickness);
    gap();
    push(0b1000, thickness);
    gap();
    push(0b1100, thickness);
    push(0b1101, thickness);
    push(0b1001, thickness);
    gap();
    push(0b0110, thickness);
    push(0b0111, thickness);
    push(0b0011, thickness);
    gap();
    push(0b1010, thickness);
    gap();
    push(0b1110, thickness);
    push(0b1111, thickness);
    push(0b1011, thickness);
    gap();
    push(v0wall, thickness, true);
    gap();
    push(lcut, 32 - thickness);
    push(rcut, 32 - thickness);
    result.objects2[`${name}_full`] = createSprites(full, 0, config.fullHeight, config.fullHeightVertical);
    map.pop();
    map.pop();
    result.objects2[`${name}_half`] = createSprites(half, config.fullHeight - config.halfHeight, config.halfHeight, config.halfHeightVertical);
}
function createTileSprites({ sprites, objects2 }) {
    const basePath = path.join(sourcePath, 'tiles');
    const types = [
        { name: 'grassTiles', file: 'dirt-grass.png', space: 1, alts: ['dirt-grass-autumn.png'] },
        { name: 'snowTiles', file: 'dirt-snow.png', space: 1, alts: [] },
        { name: 'woodTiles', file: 'wood-tiles.png', space: 1, alts: [] },
        { name: 'stoneTiles', file: 'stone-tiles.png', space: 1, alts: [] },
        { name: 'stone2Tiles', file: 'stone2-tiles.png', space: 1, alts: [] },
        {
            name: 'waterTiles1', file: 'dirt-water-1.png', space: 1,
            alts: ['dirt-water-1-autumn.png', 'dirt-water-1-winter.png', 'dirt-water-1-cave.png']
        },
        { name: 'waterTiles2', file: 'dirt-water-2.png', space: 1, alts: [] },
        { name: 'waterTiles3', file: 'dirt-water-3.png', space: 1, alts: [] },
        { name: 'waterTiles4', file: 'dirt-water-4.png', space: 1, alts: [] },
        { name: 'iceTiles', file: 'dirt-ice.png', space: 0, alts: ['dirt-ice-autumn.png', 'dirt-ice-winter.png'] },
        { name: 'grassTilesNew', file: 'grass.png', space: 1, alts: [] },
        { name: 'snowOnIceTiles', file: 'ice-snow.png', space: 1, alts: [] },
        { name: 'caveTiles', file: 'dirt-stone-cave.png', space: 1, alts: [] },
    ];
    types.forEach(({ name, file, alts, space }) => {
        const tileSprites = convert_tiles_1.tilesToSprites(openPng(path.join(basePath, file)), space, space);
        const palette = createPaletteFromList(tileSprites);
        const palettes = [palette, ...alts.map(altFile => {
                const altSprites = convert_tiles_1.tilesToSprites(openPng(path.join(basePath, altFile)), space, space);
                const altPalette = palette.slice();
                return altSprites.reduce((pal, s, i) => createOtherPalette(palette, tileSprites[i], s, pal), altPalette);
            })];
        objects2[name] = {
            palettes,
            sprites: tileSprites.map(s => common_1.addSprite(sprites, s, undefined, palette)),
        };
    });
    const otherTiles = [];
    otherTiles.forEach(tile => {
        const image = openPng(path.join(basePath, `${tile}.png`));
        const palette = createPaletteFromList([image]);
        objects2[`${tile}Tiles`] = {
            palettes: [palette],
            sprites: [common_1.addSprite(sprites, image, undefined, palette)],
        };
    });
    const cliffs = openPng(path.join(sourcePath, 'tiles', 'cliffs-grass.png'));
    const cliffsAutumn = openPng(path.join(sourcePath, 'tiles', 'cliffs-grass-autumn.png'));
    const cliffsWinter = openPng(path.join(sourcePath, 'tiles', 'cliffs-grass-winter.png'));
    const cliffsPalette = createPaletteFromList([cliffs]);
    const cliffsPaletteAutumn = createOtherPalette(cliffsPalette, cliffs, cliffsAutumn, [...cliffsPalette]);
    const cliffsPaletteWinter = createOtherPalette(cliffsPalette, cliffs, cliffsWinter, [...cliffsPalette]);
    const cave = openPng(path.join(sourcePath, 'tiles', 'cave-walls.png'));
    const cavePalette = createPaletteFromList([cave]);
    createCliffs('cliffs_grass', cliffs, [cliffsPalette, cliffsPaletteAutumn, cliffsPaletteWinter]);
    createCliffs('cave_walls', cave, [cavePalette]);
    function createCliffs(baseName, canvas, palettes) {
        function addCliffSprite(name, x, y, w = 1, h = 1) {
            const color = common_1.addSprite(sprites, canvas_utils_1.cropCanvas(canvas, 32 * x, 24 * y, 32 * w, 24 * h), undefined, palettes[0]);
            objects2[`${baseName}_${name}`] = { color, palettes };
        }
        addCliffSprite('decal_1', 3, 1);
        addCliffSprite('decal_2', 3, 2);
        addCliffSprite('decal_3', 4, 2);
        addCliffSprite('decal_l', 4, 0);
        addCliffSprite('decal_r', 4, 1);
        addCliffSprite('top_nw', 1, 0);
        addCliffSprite('top_n', 3, 0);
        addCliffSprite('top_ne', 5, 0);
        addCliffSprite('top_w', 1, 1);
        addCliffSprite('top_e', 5, 1);
        addCliffSprite('top_sw', 1, 2);
        addCliffSprite('top_se', 5, 2);
        addCliffSprite('top_s1', 2, 3);
        addCliffSprite('top_s2', 3, 3);
        addCliffSprite('top_s3', 4, 3);
        addCliffSprite('mid_sw1', 1, 4);
        addCliffSprite('mid_sw2', 1, 3);
        addCliffSprite('mid_s1', 2, 4);
        addCliffSprite('mid_s2', 3, 4);
        addCliffSprite('mid_s3', 4, 4);
        addCliffSprite('mid_se1', 5, 4);
        addCliffSprite('mid_se2', 5, 3);
        addCliffSprite('bot_sw', 1, 5);
        addCliffSprite('bot_s1', 2, 5);
        addCliffSprite('bot_s2', 3, 5);
        addCliffSprite('bot_s3', 4, 5);
        addCliffSprite('bot_se', 5, 5);
        addCliffSprite('top_sb', 2, 0);
        addCliffSprite('mid_sb', 2, 1);
        addCliffSprite('bot_sb', 2, 2);
        addCliffSprite('top_trim_left', 0, 1);
        addCliffSprite('mid_trim_left', 0, 2);
        addCliffSprite('bot_trim_left', 0, 4);
        addCliffSprite('top_trim_right', 6, 1);
        addCliffSprite('mid_trim_right', 6, 2);
        addCliffSprite('bot_trim_right', 6, 4);
        // combined sections
        addCliffSprite('sw', 1, 2, 1, 4);
        addCliffSprite('s1', 2, 3, 1, 3);
        addCliffSprite('s2', 3, 3, 1, 3);
        addCliffSprite('s3', 4, 3, 1, 3);
        addCliffSprite('sb', 2, 0, 1, 3);
        addCliffSprite('se', 5, 2, 1, 4);
    }
}
function fontCanvas(name) {
    const filePath = path.join(sourcePath, 'fonts', name);
    const file = psd_utils_1.openPsd(filePath);
    return common_1.getLayerCanvasSafe('color', file);
}
function createStripedCanvas(canvas, colors) {
    const stripes = canvas_utils_1.createExtCanvas(canvas.width, canvas.height, `${canvas.info} (stripes)`);
    const context = stripes.getContext('2d');
    for (let y = 0; y < canvas.height; y++) {
        context.fillStyle = color_1.colorToCSS(colors[y % colors.length]);
        context.fillRect(0, y, canvas.width, 1);
    }
    context.globalCompositeOperation = 'destination-in';
    context.drawImage(canvas, 0, 0);
    return stripes;
}
function bandedPalette(colors, bands) {
    return lodash_1.flatten(bands.map((t, i) => lodash_1.times(t, () => colors[i] >>> 0)));
}
function bandedTextPalette(colors) {
    return bandedPalette(colors, [3, 2, 3, 2]);
}
function bandedTinyPalette(colors) {
    return bandedPalette(colors, [2, 2, 2, 3]);
}
const SUPPORTER1 = 0xf86754ff;
const SUPPORTER2_BANDS = [0xffdfc1ff, 0xffcd99ff, 0xff9f3bff, 0xd97e09ff];
const SUPPORTER3_BANDS = [0xffffffff, 0xfffda4ff, 0xffea3bff, 0xfdbb0bff];
function createSprites(log) {
    common_1.mkdir(destPath);
    common_1.mkdir(generatedPath);
    const result = createResult();
    createPonySprites(result);
    createTileSprites(result);
    const mainFont = fontCanvas('main.psd');
    const mainEmoji = fontCanvas('emoji.psd');
    const tinyFont = fontCanvas('tiny.psd');
    const monoFont = fontCanvas('mono.psd');
    const emojiPalette = createPalette(mainEmoji);
    const mainFontPalette = [common_1.TRANSPARENT, ...lodash_1.times(10, i => 0xff + i * 256)];
    const stripedMainFont = createStripedCanvas(mainFont, mainFontPalette.slice(1));
    const smallFontPalette = [common_1.TRANSPARENT, ...lodash_1.times(9, i => 0xff + i * 256)];
    const stripedSmallFont = createStripedCanvas(tinyFont, smallFontPalette.slice(1));
    const stripedMonoFont = createStripedCanvas(monoFont, smallFontPalette.slice(1));
    const fontSprites = create_font_1.createFont(mainFont, 10, 10, canvas => common_1.addImage(result.images, canvas), { noChinese: true });
    const emojiSprites = create_font_1.createEmojis(mainEmoji, 10, 10, canvas => common_1.addImage(result.images, canvas));
    const smallFontSprites = create_font_1.createFont(tinyFont, 8, 9, canvas => common_1.addImage(result.images, canvas), { noChinese: true });
    const monoFontSprites = create_font_1.createFont(monoFont, 8, 9, canvas => common_1.addImage(result.images, canvas), { noChinese: true, mono: 4, onlyBase: true });
    const fontSpritesPal = create_font_1.createFont(stripedMainFont, 10, 10, canvas => common_1.addSprite(result.sprites, canvas, undefined, mainFontPalette));
    const emojiSpritesPal = create_font_1.createEmojis(mainEmoji, 10, 10, canvas => common_1.addSprite(result.sprites, canvas, undefined, emojiPalette));
    const smallFontSpritesPal = create_font_1.createFont(stripedSmallFont, 8, 9, canvas => common_1.addSprite(result.sprites, canvas, undefined, smallFontPalette), { noChinese: true });
    const monoFontSpritesPal = create_font_1.createFont(stripedMonoFont, 8, 9, canvas => common_1.addSprite(result.sprites, canvas, undefined, smallFontPalette), { noChinese: true, mono: 4, onlyBase: true });
    const lights = createLights(result, path.join(sourcePath, 'lights'));
    const ponySheet = sprite_sheet_1.createSpriteSheet('ponySheet', result.images.map(sprite_sheet_1.imageToSprite), log, 1024);
    const ponySheet2 = sprite_sheet_1.createSpriteSheet('ponySheet2', result.sprites, log, 1024, 'black', true);
    fixPixelRect(ponySheet.sprites, result.objects, 'pixelRect', 'pixel');
    fixPixelRect(ponySheet2.sprites, result.objects2, 'pixelRect2', 'pixel2');
    lights.map(i => ponySheet.sprites[i]).forEach(s => {
        if (s) {
            s.x += lightsPad;
            s.y += lightsPad;
            s.w -= lightsPad * 2;
            s.h -= lightsPad * 2;
        }
    });
    sprite_sheet_1.saveSpriteSheetAsBinary(path.join(generatedPath, 'pony.bin'), ponySheet.image);
    const spritesConfig = {
        spriteFileName: sprite_sheet_1.saveSpriteSheet(path.join(destPath, 'pony.png'), ponySheet.image),
        paletteFileName: sprite_sheet_1.saveSpriteSheet(path.join(destPath, 'pony2.png'), ponySheet2.image),
        paletteAlphaFileName: sprite_sheet_1.saveSpriteSheet(path.join(destPath, 'pony2a.png'), ponySheet2.alpha),
        sprites: ponySheet.sprites,
        paletteSprites: ponySheet2.sprites,
        result,
        palettes,
        fonts: {
            font: fontSprites,
            emoji: emojiSprites,
            fontSmall: smallFontSprites,
            fontMono: monoFontSprites,
        },
        fontsPal: {
            fontPal: fontSpritesPal,
            emojiPal: emojiSpritesPal,
            fontSmallPal: smallFontSpritesPal,
            fontMonoPal: monoFontSpritesPal,
        },
        namedPalettes: {
            defaultPalette: 0,
            emojiPalette: addPalette(emojiPalette),
            // main
            fontPalette: addPalette([common_1.TRANSPARENT, ...lodash_1.times(10, () => common_1.WHITE)]),
            fontSupporter1Palette: addPalette([common_1.TRANSPARENT, ...lodash_1.times(10, () => SUPPORTER1)]),
            fontSupporter2Palette: addPalette([common_1.TRANSPARENT, ...bandedTextPalette(SUPPORTER2_BANDS)]),
            fontSupporter3Palette: addPalette([common_1.TRANSPARENT, ...bandedTextPalette(SUPPORTER3_BANDS)]),
            // small
            fontSmallPalette: addPalette([common_1.TRANSPARENT, ...lodash_1.times(9, () => common_1.WHITE)]),
            fontSmallSupporter1Palette: addPalette([common_1.TRANSPARENT, ...lodash_1.times(9, () => SUPPORTER1)]),
            fontSmallSupporter2Palette: addPalette([common_1.TRANSPARENT, ...bandedTinyPalette(SUPPORTER2_BANDS)]),
            fontSmallSupporter3Palette: addPalette([common_1.TRANSPARENT, ...bandedTinyPalette(SUPPORTER3_BANDS)]),
        },
    };
    createSpritesTS(path.join(generatedPath, 'sprites.ts'), spritesConfig);
    // Other exports
    sprite_sheet_1.saveCanvasAsRaw(path.join(outputPath, 'pony2.raw'), ponySheet2.image);
}
exports.createSprites = createSprites;
if (require.main === module) {
    const start = Date.now();
    createSprites(true);
    const time = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`[sprites] done: ${time}s, stats: { w: ${0}-${maxW} h: ${0}-${maxH} ox: ${minOX}-${maxOX} oy: ${minOY}-${maxOY} }`);
}
//# sourceMappingURL=create-sprites.js.map