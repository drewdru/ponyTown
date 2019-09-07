export interface Psd {
	dir: string;
	name: string;
	info: string;
	width: number;
	height: number;
	children: Layer[];
}

export interface Layer {
	name: string;
	info: string;
	children: Layer[];
	canvas?: ExtCanvas;
}

export interface ExtCanvas extends HTMLCanvasElement {
	info: string;
}

export interface Sprite extends Rect {
	ox: number;
	oy: number;
	image: HTMLCanvasElement;
	shade?: boolean;
	layer?: number;
}

export interface Result {
	objects: any;
	objects2: any;
	images: HTMLCanvasElement[];
	sprites: Sprite[];
	// palettes: number[][];
}

export interface ColorShadow {
	color: number;
	shadow: number;
}

export interface Nose {
	mouth: number;
	muzzle: number;
	fangs: number;
}

export interface Eye {
	base: number;
	irises: number[];
	shadow: number;
	shine: number;
}

export interface Point {
	x: number;
	y: number;
}

export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface Tree {
	stump: number;
	trunk: number;
	crown: number;
	stumpShadow: number;
	shadow: number;
	palette: number[];
}

export interface Animation {
	frames: number[];
	palette: number[];
	shadow?: number;
}

export interface ColorExtra {
	color: number;
	colors: number;
	extra?: number;
	palette?: number[];
	palettes?: number[][];
}

export interface TileSprites {
	sprites: number[];
	palettes: number[][];
}

export interface Button {
	border: number;
	topLeft: number;
	top: number;
	topRight: number;
	left: number;
	bg: number;
	right: number;
	bottomLeft: number;
	bottom: number;
	bottomRight: number;
	palette?: number[];
}

export interface Emote {
	name: string;
	sprite: number;
}
