"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base64_js_1 = require("base64-js");
const bitUtils_1 = require("./bitUtils");
const constants_1 = require("./constants");
function getBitsForNumber(value) {
    let bits = 0;
    let max = value - 1;
    while (max > 0) {
        bits++;
        max >>= 1;
    }
    return bits;
}
function compressTiles(tiles) {
    const types = [];
    for (let i = 0; i < tiles.length; i++) {
        const tile = tiles[i];
        if (types.indexOf(tile) === -1) {
            types.push(tile);
        }
    }
    const bitsPerTile = getBitsForNumber(types.length);
    const bitsPerRun = 4;
    return bitUtils_1.bitWriter(write => {
        write(types.length, 8);
        for (const type of types) {
            write(type, 8);
        }
        if (types.length > 1) {
            for (let i = 0; i < tiles.length; i++) {
                const value = tiles[i];
                let count = 1;
                if (i === (tiles.length - 1)) {
                    write(count | 0b1000, bitsPerRun);
                    write(types.indexOf(value), bitsPerTile);
                }
                else {
                    i++;
                    if (value === tiles[i]) {
                        while (i < tiles.length && count < 0b111 && tiles[i] === value) {
                            i++;
                            count++;
                        }
                        i--;
                        write(count, bitsPerRun);
                        write(types.indexOf(value), bitsPerTile);
                    }
                    else {
                        let last = tiles[i];
                        let last2 = last;
                        let pushLast = true;
                        const values = [value];
                        count++;
                        for (i++; i < tiles.length; i++) {
                            last2 = tiles[i];
                            if (last2 === last) {
                                i -= 2;
                                count--;
                                pushLast = false;
                                break;
                            }
                            else if (count === 0b111) {
                                i -= 1;
                                break;
                            }
                            else {
                                values.push(last);
                                count++;
                                last = last2;
                            }
                        }
                        write(count | 0b1000, bitsPerRun);
                        for (const v of values) {
                            write(types.indexOf(v), bitsPerTile);
                        }
                        if (pushLast) {
                            write(types.indexOf(last), bitsPerTile);
                        }
                    }
                }
            }
        }
    });
}
exports.compressTiles = compressTiles;
function decompressTiles(data) {
    const size = constants_1.REGION_SIZE * constants_1.REGION_SIZE;
    const result = new Uint8Array(size);
    const read = bitUtils_1.bitReader(data);
    const typesCount = read(8);
    const types = [];
    for (let i = 0; i < typesCount; i++) {
        types.push(read(8));
    }
    if (types.length === 1) {
        result.fill(types[0]);
    }
    else {
        const bitsPerTile = getBitsForNumber(typesCount);
        const bitsPerRun = 4;
        for (let i = 0; i < size;) {
            const value = read(bitsPerRun);
            if ((value & 0b1000) === 0) {
                const count = value;
                const entry = read(bitsPerTile);
                for (let j = 0; j < count; j++) {
                    result[i] = types[entry];
                    i++;
                }
            }
            else {
                const count = value & 0b0111;
                for (let j = 0; j < count; j++) {
                    result[i] = types[read(bitsPerTile)];
                    i++;
                }
            }
        }
    }
    return result;
}
exports.decompressTiles = decompressTiles;
function deserializeTiles(tiles) {
    const decodedTiles = base64_js_1.toByteArray(tiles);
    const result = [];
    for (let i = 0; i < decodedTiles.length; i += 2) {
        let count = decodedTiles[i];
        const tile = decodedTiles[i + 1];
        while (count > 0) {
            result.push(tile);
            count--;
        }
    }
    return result;
}
exports.deserializeTiles = deserializeTiles;
//# sourceMappingURL=compress.js.map