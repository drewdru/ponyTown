import { saveAs } from 'file-saver';

/* istanbul ignore next */
export let createCanvas = (width: number, height: number): HTMLCanvasElement => {
	const canvas = document.createElement('canvas');
	canvas.width = width | 0;
	canvas.height = height | 0;
	return canvas;
};

/* istanbul ignore next */
export let loadImage = (src: string): Promise<HTMLImageElement | ImageBitmap> => {
	return new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image();
		img.addEventListener('load', () => resolve(img));
		img.addEventListener('error', () => reject(new Error(`Error loading image (${src})`)));
		img.src = src;
	});
};

/* istanbul ignore next */
function canUseImageBitmap() {
	return typeof fetch === 'function' &&
		typeof createImageBitmap === 'function' &&
		!/yabrowser/i.test(navigator.userAgent); // disabled due to yandex browser bug
}

/* istanbul ignore next */
if (canUseImageBitmap()) {
	loadImage = src => fetch(src)
		.then(response => response.blob())
		.then(createImageBitmap);
}

export function setup(methods: {
	createCanvas(width: number, height: number): HTMLCanvasElement;
	loadImage(src: string): Promise<HTMLImageElement>;
}) {
	createCanvas = methods.createCanvas;
	loadImage = methods.loadImage;
}

/* istanbul ignore next */
export const getPixelRatio = SERVER ? () => 1 : () => window.devicePixelRatio;

export function resizeCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
	if (canvas.width !== width || canvas.height !== height) {
		canvas.width = width;
		canvas.height = height;
	}
}

export function resizeCanvasWithRatio(canvas: HTMLCanvasElement, width: number, height: number, updateStyle = true) {
	const ratio = getPixelRatio();
	const w = Math.round(width * ratio);
	const h = Math.round(height * ratio);
	let resized = false;

	if (canvas.width !== w || canvas.height !== h) {
		canvas.width = w;
		canvas.height = h;
		resized = true;
	}

	if (updateStyle && (canvas.style.width !== width + 'px' || canvas.style.height !== height + 'px')) {
		canvas.style.width = width + 'px';
		canvas.style.height = height + 'px';
		resized = true;
	}

	return resized;
}

/* istanbul ignore next */
export function canvasToSource(canvas: HTMLCanvasElement) {
	return new Promise<string>((resolve, reject) => {
		canvas.toBlob(blob => {
			if (blob) {
				resolve(URL.createObjectURL(blob));
			} else {
				reject(new Error('Failed to convert canvas'));
			}
		});
	});
}

/* istanbul ignore next */
export function saveCanvas(canvas: HTMLCanvasElement, name: string) {
	canvas.toBlob(blob => blob && saveAs(blob, name));
}

/* istanbul ignore next */
export function disableImageSmoothing(context: CanvasRenderingContext2D) {
	if ('imageSmoothingEnabled' in context) {
		context.imageSmoothingEnabled = false;
	} else {
		(context as any).webkitImageSmoothingEnabled = false;
		(context as any).mozImageSmoothingEnabled = false;
		(context as any).msImageSmoothingEnabled = false;
	}
}
