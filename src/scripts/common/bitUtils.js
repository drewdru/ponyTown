"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function numberToBitCount(value) {
    value = value >>> 0;
    for (let mask = 0xffffffff >>> 0, bits = 0; mask; mask = (mask << 1) >>> 0, bits++) {
        if ((value & mask) === 0) {
            return bits;
        }
    }
    return 32;
}
exports.numberToBitCount = numberToBitCount;
function countBits(value) {
    value = value >>> 0;
    let bits = 0;
    while (value) {
        bits += value & 1;
        value = value >>> 1;
    }
    return bits;
}
exports.countBits = countBits;
function bitWriter(writes) {
    let buffer = new Uint8Array(16);
    let length = 0;
    let byte = 0;
    let byteBits = 0;
    function writeByte(value) {
        if (buffer.length <= length) {
            const newBuffer = new Uint8Array(buffer.length * 2);
            newBuffer.set(buffer);
            buffer = newBuffer;
        }
        buffer[length] = value;
        length++;
    }
    writes((value, bits) => {
        if (bits < 0 || bits > 32) {
            throw new Error('Invalid bit count');
        }
        while (bits) {
            const revByteBits = 8 - byteBits;
            const writeBits = revByteBits < bits ? revByteBits : bits;
            const write = (value >> (bits - writeBits)) & (0xff >> (8 - writeBits));
            byte |= write << (revByteBits - writeBits);
            byteBits += writeBits;
            bits -= writeBits;
            if (byteBits === 8) {
                writeByte(byte);
                byte = 0;
                byteBits = 0;
            }
        }
    });
    if (byteBits) {
        writeByte(byte);
        byteBits = 0;
        byte = 0;
    }
    return buffer.subarray(0, length);
}
exports.bitWriter = bitWriter;
function bitReader(buffer) {
    let offset = 0;
    return bitReaderCustom(() => {
        if (buffer.length <= offset) {
            throw new Error('Reading past end');
        }
        return buffer[offset++];
    });
}
exports.bitReader = bitReader;
function bitReaderCustom(readByte) {
    let byte = 0;
    let byteBits = 0;
    return bits => {
        if (bits < 0 || bits > 32) {
            throw new Error('Invalid bit count');
        }
        let result = 0;
        while (bits) {
            if (!byteBits) {
                byte = readByte();
                byteBits = 8;
            }
            const readBits = byteBits < bits ? byteBits : bits;
            const read = (byte >> (byteBits - readBits)) & (0xff >> (8 - readBits));
            result = (result << readBits) | read;
            bits -= readBits;
            byteBits -= readBits;
        }
        return result >>> 0;
    };
}
exports.bitReaderCustom = bitReaderCustom;
//# sourceMappingURL=bitUtils.js.map