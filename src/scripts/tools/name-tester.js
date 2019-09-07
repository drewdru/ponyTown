"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const create_font_1 = require("./create-font");
const existing = new Set();
const missing = new Map();
const missingNames = [];
const rootPath = path.join(__dirname, '..', '..', '..', 'tools');
const items = JSON.parse(fs.readFileSync(path.join(rootPath, 'names.json'), 'utf8'));
function isNonPrintableCharacter(code) {
    return code >= 0xfe00 && code <= 0xfe0f;
}
function ignore(code) {
    return (code >= 0x0180 && code <= 0x024F) // Latin Extended-B
        || (code >= 0x0600 && code <= 0x06FF) // Arabic
        || (code >= 0x2719 && code <= 0x2721) // crosses
        || (code >= 0x0300 && code <= 0x036F) // Combining Diacritical Marks
        || (code >= 0x2200 && code <= 0x22FF) // Mathematical Operators
        || (code >= 0x0E00 && code <= 0x0E7F) // Thai
        || (code >= 0x0250 && code <= 0x02AF) // IPA Extensions
        || (code >= 0x2460 && code <= 0x24FF) // Enclosed Alphanumerics
        || (code >= 0x2300 && code <= 0x23FF) // Miscellaneous Technical
    ;
}
create_font_1.charsToCodes(create_font_1.CHARS + create_font_1.ROMAJI + create_font_1.EMOJI).forEach(code => existing.add(code));
items.forEach(({ name }) => {
    const codes = create_font_1.charsToCodes(name);
    const missingChars = codes.reduce((count, code) => {
        if (existing.has(code) || isNonPrintableCharacter(code))
            return count;
        const current = missing.get(code) || 0;
        missing.set(code, current + 1);
        return count + 1;
    }, 0);
    if (missingChars) {
        missingNames.push(name);
    }
});
const missingChars = [];
missing.forEach((value, key) => missingChars.push([value, String.fromCodePoint(key), key]));
missingChars.sort(([a], [b]) => b - a);
fs.writeFileSync(path.join(rootPath, 'output', 'missing-names.txt'), missingNames.join('\n'), 'utf8');
fs.writeFileSync(path.join(rootPath, 'output', 'missing-chars.txt'), missingChars
    .map(([a, b, c]) => `${a}: "${b}" (${c}) [U+${c.toString(16)}]${ignore(c) ? '  (ignore)' : ''}`).join('\n'), 'utf8');
//# sourceMappingURL=name-tester.js.map