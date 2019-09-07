"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const ag_psd_1 = require("ag-psd");
const canvas_utils_1 = require("./canvas-utils");
const common_1 = require("./common");
ag_psd_1.initializeCanvas((width, height) => canvas_utils_1.createExtCanvas(width, height, 'loaded from psd'));
function openPsd(filePath) {
    try {
        const buffer = fs.readFileSync(filePath);
        const name = path.basename(filePath, '.psd');
        const dir = path.basename(path.dirname(filePath));
        const psd = ag_psd_1.readPsd(buffer, {
            skipCompositeImageData: true,
            skipThumbnail: true,
            throwForMissingFeatures: true,
            logMissingFeatures: true,
        });
        return toPsd(psd, name, dir);
    }
    catch (e) {
        console.error(`Failed to load: ${filePath}: ${e.message}`);
        throw e;
    }
}
exports.openPsd = openPsd;
function toPsd({ width, height, children }, name, dir) {
    const info = `${dir}/${name}`;
    return {
        dir, name, width, height, info, children: (children || []).map(c => toLayer(c, width, height, info)),
    };
}
function toLayer({ name, canvas, left, top, children }, width, height, parentInfo) {
    const info = `${parentInfo}/${name}`;
    return {
        name: name || '<noname>',
        info,
        canvas: fixCanvas(canvas, width, height, left || 0, top || 0, info),
        children: (children || []).map(c => toLayer(c, width, height, info)),
    };
}
function fixCanvas(canvas, width, height, left, top, info) {
    if (!canvas)
        return undefined;
    const result = canvas_utils_1.createExtCanvas(width, height, info);
    result.getContext('2d').drawImage(canvas, left, top);
    return result;
}
const isPsd = common_1.matcher(/\.psd$/);
exports.getPsds = (directory) => fs.readdirSync(directory).filter(isPsd);
function openPsdFiles(directory, match) {
    return exports.getPsds(directory)
        .filter(f => match ? match.test(f) : true)
        .sort((a, b) => common_1.parseWithNumber(a) - common_1.parseWithNumber(b))
        .map(f => path.join(directory, f))
        .map(openPsd);
}
exports.openPsdFiles = openPsdFiles;
//# sourceMappingURL=psd-utils.js.map