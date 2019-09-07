import * as path from 'path';

export const root = path.join(__dirname, '..', '..', '..');
export const store = path.join(root, 'store');

export function pathTo(...parts: string[]) {
	return path.join(root, ...parts);
}
