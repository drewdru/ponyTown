import { Sprite, Batch, SpriteBatchBase, SpriteSheet } from '../common/interfaces';
import { WHITE } from '../common/colors';
import { colorToFloat, colorToFloatAlpha } from '../common/color';
import { BaseStateBatch } from './baseStateBatch';
import { VAO, createVAO } from './webgl/glVao';
import { VAOAttributeDefinition, getVAOAttributesSize, createVAOAttributes } from './webgl/vaoAttributes';
import { timeStart, timeEnd } from '../client/timing';
import { isIdentity } from '../common/mat2d';

// const BATCH_BUFFER_SIZE = 2048; // 8kb
// const BATCH_BUFFER_POOL_SIZE = 5;

// const pool: ArrayBuffer[] = [];

// function aquireBuffer(size: number): Float32Array | undefined {
// 	if (size <= BATCH_BUFFER_SIZE) {
// 		if (!pool.length) console.log('alloc');
// 		const buffer = pool.pop() || new ArrayBuffer(BATCH_BUFFER_SIZE);
// 		return new Float32Array(buffer, 0, size);
// 	} else {
// 		DEVELOPMENT && console.warn(`Failed to aquire buffer of size: ${size}`);
// 		return undefined;
// 	}
// }

// function releaseBuffer(buffer: Float32Array) {
// 	if (pool.length < BATCH_BUFFER_POOL_SIZE) {
// 		pool.push(buffer.buffer);
// 	} else {
// 		console.log('delete');
// 	}
// }

const WHITE_FLOAT = colorToFloat(WHITE);

export function getColorFloat(color: number, alpha: number) {
	return (color === WHITE && alpha === 1) ? WHITE_FLOAT : colorToFloatAlpha(color, alpha);
}

export abstract class BaseSpriteBatch extends BaseStateBatch implements SpriteBatchBase {
	tris = 0;
	flushes = 0;
	index = 0;
	spritesCount = 0;
	vertices!: Float32Array;
	verticesUint32!: Uint32Array;
	vao: VAO | undefined = undefined;
	rectSprite: Sprite | undefined = undefined;
	vertexBuffer: WebGLBuffer | undefined = undefined;
	indexBuffer: WebGLBuffer | undefined = undefined;
	spriteSheet: SpriteSheet | undefined = undefined;
	floatsPerSprite: number;
	batching = false;
	private startBatchIndex = 0;
	private startBatchSprites = 0;
	constructor(
		public gl: WebGLRenderingContext,
		public capacity: number,
		buffer: ArrayBuffer,
		vertexBuffer: WebGLBuffer,
		indexBuffer: WebGLBuffer,
		public attributes: VAOAttributeDefinition[],
	) {
		super();
		this.floatsPerSprite = getVAOAttributesSize(gl, attributes);
		this.vertices = new Float32Array(buffer, 0, capacity * this.floatsPerSprite);
		this.verticesUint32 = new Uint32Array(buffer, 0, capacity * this.floatsPerSprite);
		this.vertexBuffer = vertexBuffer;
		this.indexBuffer = indexBuffer;
		this.vao = createVAO(gl, createVAOAttributes(gl, attributes, vertexBuffer), indexBuffer);
	}
	dispose() {
		disposeBuffers(this.gl, this);
	}
	begin() {
		if (!this.vao) {
			throw new Error('Disposed');
		}

		this.batching = false;
		this.vao.bind();
	}
	end() {
		if (!this.vao) {
			throw new Error('Disposed');
		}

		this.flush();
		this.vao.unbind();
	}
	drawBatch(batch: Batch) {
		if (DEVELOPMENT && !isIdentity(this.transform)) {
			throw new Error('Cannot transform batch');
		}

		const batchSpriteCount = (batch.length / this.floatsPerSprite) | 0;

		if (this.capacity < (this.spritesCount + batchSpriteCount)) {
			this.flush();
		}

		this.vertices.set(batch, this.index);
		this.index += batch.length;
		this.spritesCount += batchSpriteCount;
		this.tris += batchSpriteCount * 2;
	}
	startBatch() {
		if (this.batching) {
			throw new Error('Cannot start new batch');
		}

		this.startBatchIndex = this.index;
		this.startBatchSprites = this.spritesCount;
		this.batching = true;
	}
	finishBatch(): Batch | undefined {
		if (!this.batching) {
			throw new Error('Cannot finish batch');
		}

		this.batching = false;

		try {
			// const batch = aquireBuffer(this.index - this.startBatchIndex);

			// if (batch) {
			// 	batch.set(this.vertices.subarray(this.startBatchIndex, this.index));
			// }

			// return batch;
			return this.vertices.slice(this.startBatchIndex, this.index);
		} catch {
			return undefined;
		}
	}
	releaseBatch(_batch: Batch) {
		// releaseBuffer(batch);
	}
	flush() {
		if (this.index === 0)
			return;

		if (!this.vao || !this.vertexBuffer) {
			throw new Error('Disposed');
		}

		const gl = this.gl;

		if (this.batching) {
			TIMING && timeStart('bufferSubData');
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices.subarray(0, this.startBatchIndex));
			TIMING && timeEnd();

			TIMING && timeStart('vao.draw');
			this.vao.draw(this.gl.TRIANGLES, this.startBatchSprites * 6, 0);
			TIMING && timeEnd();

			this.spritesCount -= this.startBatchSprites;
			this.index -= this.startBatchIndex;
			this.vertices.copyWithin(0, this.startBatchIndex, this.startBatchIndex + this.index);
			this.startBatchIndex = 0;
			this.startBatchSprites = 0;
		} else {
			TIMING && timeStart('bufferSubData');
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices.subarray(0, this.index));
			TIMING && timeEnd();

			TIMING && timeStart('vao.draw');
			this.vao.draw(this.gl.TRIANGLES, this.spritesCount * 6, 0);
			TIMING && timeEnd();

			this.spritesCount = 0;
			this.index = 0;
		}

		this.flushes++;
	}
}

function disposeBuffers(gl: WebGLRenderingContext, batch: BaseSpriteBatch) {
	try {
		if (batch.vao) {
			batch.vao.dispose();
		}

		if (batch.vertexBuffer) {
			gl.deleteBuffer(batch.vertexBuffer);
		}

		if (batch.indexBuffer) {
			gl.deleteBuffer(batch.indexBuffer);
		}
	} catch (e) {
		DEVELOPMENT && console.error(e);
	}

	batch.vao = undefined;
	batch.vertexBuffer = undefined;
	batch.indexBuffer = undefined;
}
