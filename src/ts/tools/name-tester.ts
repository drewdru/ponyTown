import * as fs from 'fs';
import * as path from 'path';
import { CHARS, ROMAJI, EMOJI, charsToCodes } from './create-font';

type Item = { name: string; }[];

const existing = new Set<number>();
const missing = new Map<number, number>();
const missingNames: string[] = [];
const rootPath = path.join(__dirname, '..', '..', '..', 'tools');
const items: Item = JSON.parse(fs.readFileSync(path.join(rootPath, 'names.json'), 'utf8'));

function isNonPrintableCharacter(code: number): boolean {
	return code >= 0xfe00 && code <= 0xfe0f;
}

function ignore(code: number): boolean {
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

charsToCodes(CHARS + ROMAJI + EMOJI).forEach(code => existing.add(code));

items.forEach(({ name }) => {
	const codes = charsToCodes(name);
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

const missingChars: [number, string, number][] = [];
missing.forEach((value, key) => missingChars.push([value, String.fromCodePoint(key), key]));
missingChars.sort(([a], [b]) => b - a);

fs.writeFileSync(path.join(rootPath, 'output', 'missing-names.txt'), missingNames.join('\n'), 'utf8');
fs.writeFileSync(path.join(rootPath, 'output', 'missing-chars.txt'), missingChars
	.map(([a, b, c]) => `${a}: "${b}" (${c}) [U+${c.toString(16)}]${ignore(c) ? '  (ignore)' : ''}`).join('\n'), 'utf8');
