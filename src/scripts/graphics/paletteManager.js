"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const texture2d_1 = require("./webgl/texture2d");
const utils_1 = require("../common/utils");
const INITIAL_SIZE = 512;
const MAX_SIZE = 2048;
function createPalette(colors) {
    return { x: 0, y: 0, u: 0, v: 0, refs: 1, colors };
}
exports.createPalette = createPalette;
function releasePalette(palette) {
    if (palette && palette.refs) {
        palette.refs--;
    }
}
exports.releasePalette = releasePalette;
function colorsEqual(a, b) {
    if (a === b) {
        return true;
    }
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}
exports.colorsEqual = colorsEqual;
function isInUse(palette) {
    return palette.refs > 0;
}
class PaletteManager {
    constructor(size = INITIAL_SIZE) {
        this.size = size;
        this.palettes = utils_1.times(512, () => []);
        this.dirty = [];
        this.dirtyMinY = 0;
        this.dirtyMaxY = -1;
        this.lastX = 0;
        this.lastY = 0;
        this.initialized = true;
        this.deduplicate = true;
    }
    get texture() {
        return this.paletteTexture;
    }
    get textureSize() {
        return this.size;
    }
    get pixelSize() {
        return 256 / this.size;
    }
    activePalettes() {
        return this.palettes.reduce((sum, p) => sum + p.reduce((sum, p) => sum + (p.refs > 0 ? 1 : 0), 0), 0);
    }
    add(colorValues) {
        const colors = new Uint32Array(colorValues.length);
        for (let i = 0; i < colorValues.length; i++) {
            colors[i] = colorValues[i] >>> 0;
        }
        return this.addArray(colors);
    }
    addArray(colors) {
        const hash = utils_1.computeCRC(colors) & 0x1ff;
        const palettes = this.palettes[hash];
        if (this.deduplicate) {
            for (let i = 0; i < palettes.length; i++) {
                const existing = palettes[i];
                if (colorsEqual(existing.colors, colors)) {
                    existing.refs = (existing.refs + 1) | 0;
                    return existing;
                }
            }
        }
        const palette = createPalette(colors);
        palettes.push(palette);
        this.dirty.push(palette);
        return palette;
    }
    commit(gl) {
        let changed = this.initialized;
        if (!this.paletteTexture) {
            this.initializeTexture(gl, this.size);
            changed = true;
        }
        if (this.dirty.length) {
            if (!this.arrange(this.dirty)) {
                this.cleanupPalettes();
                changed = true;
                while (!this.arrange(this.dirty)) {
                    if (this.size < MAX_SIZE) {
                        this.initializeTexture(gl, this.size * 2);
                    }
                    else {
                        throw new Error('Exceeded maximum palettes limit');
                    }
                }
            }
            this.updateTexture(gl);
            this.dirty = [];
        }
        this.initialized = false;
        return changed;
    }
    init(gl) {
        this.initialized = true;
        this.paletteTexture = undefined;
        this.initializeTexture(gl, this.size);
    }
    dispose(gl) {
        this.paletteTexture = texture2d_1.disposeTexture(gl, this.paletteTexture);
        for (let i = 0; i < this.palettes.length; i++) {
            if (this.palettes[i].length > 0) {
                this.palettes[i] = [];
            }
        }
        this.size = INITIAL_SIZE;
        this.resetPalettes();
    }
    cleanup() {
        this.cleanupPalettes();
    }
    resetPalettes() {
        this.dirty = utils_1.flatten(this.palettes);
        this.lastX = 0;
        this.lastY = 0;
    }
    cleanupPalettes() {
        const palettes = this.palettes;
        for (let i = 0; i < palettes.length; i++) {
            if (palettes[i].length > 0) {
                palettes[i] = palettes[i].filter(isInUse);
            }
        }
        this.resetPalettes();
    }
    initializeTexture(gl, size) {
        try {
            if (!this.paletteTexture) {
                this.paletteTexture = texture2d_1.createEmptyTexture(gl, size, size, gl.RGBA, gl.UNSIGNED_BYTE);
            }
            else if (this.paletteTexture.width !== size) {
                texture2d_1.resizeTexture(gl, this.paletteTexture, size, size);
            }
        }
        catch (e) {
            throw new Error(`Failed to create/resize texture (${size}) ${e.stack}`);
        }
        this.size = size;
        this.resetPalettes();
    }
    arrange(palettes) {
        if (!palettes.length) {
            return true;
        }
        const size = this.size | 0;
        let x = this.lastX | 0;
        let y = this.lastY | 0;
        let minY = -1;
        let maxY = -1;
        for (let i = 0; i < palettes.length; i++) {
            const p = palettes[i];
            const colorCount = p.colors.length | 0;
            if ((size - x) < colorCount) {
                x = 0;
                y++;
                if (y >= size) {
                    return false;
                }
            }
            p.x = x;
            p.y = y;
            p.u = (x + 0.5) / size;
            p.v = (y + 0.5) / size;
            x = (x + colorCount) | 0;
            minY = minY === -1 ? y : minY;
            maxY = Math.max(maxY, y);
        }
        this.lastX = x;
        this.lastY = y;
        this.dirtyMinY = minY;
        this.dirtyMaxY = maxY;
        return true;
    }
    updateTexture(gl) {
        if (!this.paletteTexture || this.dirtyMinY > this.dirtyMaxY)
            return;
        const width = this.size;
        const height = (this.dirtyMaxY - this.dirtyMinY) + 1;
        const data = new Uint8Array(width * height * 4);
        for (let k = 0; k < this.palettes.length; k++) {
            const palettes = this.palettes[k];
            for (let i = 0; i < palettes.length; i++) {
                const { x, y, colors } = palettes[i];
                if (y < this.dirtyMinY || y > this.dirtyMaxY)
                    continue;
                let offset = (x + (y - this.dirtyMinY) * width) << 2;
                for (let j = 0; j < colors.length; j++) {
                    const c = colors[j];
                    data[offset++] = (c >>> 24) & 0xff;
                    data[offset++] = (c >>> 16) & 0xff;
                    data[offset++] = (c >>> 8) & 0xff;
                    data[offset++] = (c >>> 0) & 0xff;
                }
            }
        }
        gl.bindTexture(gl.TEXTURE_2D, this.paletteTexture.handle);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, this.dirtyMinY, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);
        this.dirtyMinY = 0;
        this.dirtyMaxY = -1;
    }
}
exports.PaletteManager = PaletteManager;
//# sourceMappingURL=paletteManager.js.map