import { ObjectCache } from '../common/utils';
import { Matrix2D, Rect } from '../common/interfaces';
import { createMat2D, copyMat2D, mulMat2D, rotateMat2D, scaleMat2D, translateMat2D } from '../common/mat2d';
import { rect, copyRect } from '../common/rect';

interface SavedState {
	globalAlpha: number;
	transform: Matrix2D;
	hasCrop: boolean;
	cropRect: Rect;
}

function createEmptyState(): SavedState {
	return {
		transform: createMat2D(),
		globalAlpha: 1,
		hasCrop: false,
		cropRect: rect(0, 0, 0, 0),
	};
}

const stateCache = new ObjectCache<SavedState>(10, createEmptyState);

export abstract class BaseStateBatch {
	globalAlpha = 1;
	transform = createMat2D();
	private savedStates: SavedState[] = [];
	protected hasCrop = false;
	protected cropRect = rect(0, 0, 0, 0);
	crop(x: number, y: number, w: number, h: number) {
		// console.error('Crop not supported');
		this.hasCrop = true;
		this.cropRect.x = x;
		this.cropRect.y = y;
		this.cropRect.w = w;
		this.cropRect.h = h;
	}
	clearCrop() {
		this.hasCrop = false;
	}
	save() {
		const state = stateCache.get();
		state.globalAlpha = this.globalAlpha;
		state.hasCrop = this.hasCrop;
		copyMat2D(state.transform, this.transform);
		copyRect(state.cropRect, this.cropRect);
		this.savedStates.push(state);

		if (DEVELOPMENT && this.savedStates.length > 100) {
			console.error('More than 100 save states');
		}
	}
	restore() {
		const state = this.savedStates.pop();

		if (state !== undefined) {
			this.globalAlpha = state.globalAlpha;
			this.hasCrop = state.hasCrop;
			copyMat2D(this.transform, state.transform);
			copyRect(this.cropRect, state.cropRect);
			stateCache.put(state);
		}
	}
	translate(x: number, y: number) {
		translateMat2D(this.transform, this.transform, x, y);
	}
	scale(x: number, y: number) {
		scaleMat2D(this.transform, this.transform, x, y);
	}
	rotate(angle: number) {
		rotateMat2D(this.transform, this.transform, angle);
	}
	multiplyTransform(mat: Matrix2D) {
		mulMat2D(this.transform, this.transform, mat);
	}
}
