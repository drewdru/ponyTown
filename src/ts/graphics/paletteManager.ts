import { Palette, PaletteManager as IPaletteManager } from '../common/interfaces';
import { Texture2D, resizeTexture, disposeTexture, createEmptyTexture } from './webgl/texture2d';
import { times, flatten, computeCRC } from '../common/utils';

const INITIAL_SIZE = 512;
const MAX_SIZE = 2048;

export function createPalette(colors: Uint32Array): Palette {
	return { x: 0, y: 0, u: 0, v: 0, refs: 1, colors };
}

export function releasePalette(palette: Palette | undefined) {
	if (palette && palette.refs) {
		palette.refs--;
	}
}

export function colorsEqual(a: Uint32Array, b: Uint32Array): boolean {
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

function isInUse(palette: Palette) {
	return palette.refs > 0;
}

export class PaletteManager implements IPaletteManager {
	private paletteTexture?: Texture2D;
	private palettes = times<Palette[]>(512, () => []);
	private dirty: Palette[] = [];
	private dirtyMinY = 0;
	private dirtyMaxY = -1;
	private lastX = 0;
	private lastY = 0;
	private initialized = true;
	deduplicate = true;
	constructor(private size = INITIAL_SIZE) {
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
	add(colorValues: number[]): Palette {
		const colors = new Uint32Array(colorValues.length);

		for (let i = 0; i < colorValues.length; i++) {
			colors[i] = colorValues[i] >>> 0;
		}

		return this.addArray(colors);
	}
	addArray(colors: Uint32Array): Palette {
		const hash = computeCRC(colors) & 0x1ff;
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
	commit(gl: WebGLRenderingContext): boolean {
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
					} else {
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
	init(gl: WebGLRenderingContext) {
		this.initialized = true;
		this.paletteTexture = undefined;
		this.initializeTexture(gl, this.size);
	}
	dispose(gl: WebGLRenderingContext | undefined) {
		this.paletteTexture = disposeTexture(gl, this.paletteTexture);

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
	private resetPalettes() {
		this.dirty = flatten(this.palettes);
		this.lastX = 0;
		this.lastY = 0;
	}
	private cleanupPalettes() {
		const palettes = this.palettes;

		for (let i = 0; i < palettes.length; i++) {
			if (palettes[i].length > 0) {
				palettes[i] = palettes[i].filter(isInUse);
			}
		}

		this.resetPalettes();
	}
	private initializeTexture(gl: WebGLRenderingContext, size: number) {
		try {
			if (!this.paletteTexture) {
				this.paletteTexture = createEmptyTexture(gl, size, size, gl.RGBA, gl.UNSIGNED_BYTE);
			} else if (this.paletteTexture.width !== size) {
				resizeTexture(gl, this.paletteTexture, size, size);
			}
		} catch (e) {
			throw new Error(`Failed to create/resize texture (${size}) ${e.stack}`);
		}

		this.size = size;
		this.resetPalettes();
	}
	private arrange(palettes: Palette[]) {
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
	private updateTexture(gl: WebGLRenderingContext) {
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
