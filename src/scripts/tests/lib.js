"use strict";
/// <reference path="../../typings/my.d.ts" />
Object.defineProperty(exports, "__esModule", { value: true });
require("../server/boot");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const del = require("del");
const lodash_1 = require("lodash");
const child_process_1 = require("child_process");
const sinon_1 = require("sinon");
const spriteUtils_1 = require("../client/spriteUtils");
require("../server/canvasUtilsNode");
const mixins_1 = require("../common/mixins");
const ponyInfo_1 = require("../common/ponyInfo");
const sprites_1 = require("../generated/sprites");
const paths_1 = require("../server/paths");
const canvasUtilsNode_1 = require("../server/canvasUtilsNode");
require('chai').use(require('chai-as-promised'));
mongoose.models = {};
mongoose.modelSchemas = {};
global.TESTS = true;
global.TOOLS = true;
global.performance = Date;
mixins_1.setPaletteManager(ponyInfo_1.mockPaletteManager);
function loadImageServer(src) {
    return canvasUtilsNode_1.loadImage(paths_1.pathTo('assets', src));
}
exports.loadImageServer = loadImageServer;
exports.loadSprites = lodash_1.once(() => spriteUtils_1.loadAndInitSheets(sprites_1.spriteSheets, loadImageServer));
function loadImageAsCanvas(filePath) {
    try {
        const image = canvasUtilsNode_1.loadImageSync(filePath);
        const expected = canvasUtilsNode_1.createCanvas(image.width, image.height);
        expected.getContext('2d').drawImage(image, 0, 0);
        return expected;
    }
    catch (e) {
        console.error(e);
    }
    return canvasUtilsNode_1.createCanvas(0, 0);
}
exports.loadImageAsCanvas = loadImageAsCanvas;
function generateDiff(expectedPath, actualPath) {
    child_process_1.spawnSync('magick', ['compare', actualPath, expectedPath, actualPath.replace(/\.png$/, '-diff.png')], { encoding: 'utf8' });
}
exports.generateDiff = generateDiff;
async function clearCompareResults(group) {
    await del([paths_1.pathTo('tools', 'temp', group, '*.png').replace(/\\/g, '/')]);
}
exports.clearCompareResults = clearCompareResults;
function compareCanvases(expected, actual, filePath, group, diff = true) {
    try {
        if (expected === actual)
            return;
        if (!expected)
            throw new Error(`Expected canvas is null`);
        if (!actual)
            throw new Error(`Actual canvas is null`);
        if (expected.width !== actual.width || expected.height !== actual.height)
            throw new Error(`Canvas size is different than expected`);
        const expectedData = expected.getContext('2d').getImageData(0, 0, expected.width, expected.height);
        const actualData = actual.getContext('2d').getImageData(0, 0, actual.width, actual.height);
        const length = expectedData.width * expectedData.height * 4;
        for (let i = 0; i < length; i++) {
            if (expectedData.data[i] !== actualData.data[i]) {
                const x = Math.floor(i / 4) % actualData.width;
                const y = Math.floor((i / 4) / actualData.width);
                throw new Error(`Actual canvas different than expected at (${x}, ${y})`);
            }
        }
    }
    catch (e) {
        if (actual && diff) {
            const tempRoot = paths_1.pathTo('tools', 'temp', group);
            const tempPath = path.join(tempRoot, filePath ? path.basename(filePath) : `${Date.now()}-failed-test.png`);
            fs.writeFileSync(tempPath, actual.toBuffer());
            if (filePath) {
                generateDiff(filePath, tempPath);
            }
        }
        throw e;
    }
}
exports.compareCanvases = compareCanvases;
const testsPath = paths_1.pathTo('src', 'tests', 'filters');
function readTestsFile(fileName) {
    const lines = fs.readFileSync(path.join(testsPath, fileName), 'utf8')
        .split(/\r?\n/g)
        .map(x => x.trim())
        .filter(x => !!x);
    for (let i = lines.length - 1; i > 0; i--) {
        if (lines.indexOf(lines[i]) < i) {
            console.error(`Duplicate line "${lines[i]}" in ${fileName}`);
        }
    }
    return lines;
}
exports.readTestsFile = readTestsFile;
function createFunctionWithPromiseHandler(ctor, ...deps) {
    return (...args) => {
        let result;
        const func = ctor(...deps, (promise, handleError) => result = promise.catch(handleError));
        func(...args);
        return result;
    };
}
exports.createFunctionWithPromiseHandler = createFunctionWithPromiseHandler;
function stubClass(ctor) {
    return sinon_1.createStubInstance(ctor);
}
exports.stubClass = stubClass;
function stubFromInstance(instance) {
    return lodash_1.mapValues(instance, () => sinon_1.stub());
}
exports.stubFromInstance = stubFromInstance;
function resetStubMethods(stub, ...methods) {
    methods.forEach(method => {
        stub[method].resetBehavior();
        stub[method].reset();
    });
}
exports.resetStubMethods = resetStubMethods;
//# sourceMappingURL=lib.js.map