import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
// import { range, sample } from 'lodash';
// import { PonyState, Palette, Sprite } from '../../../common/interfaces';
// import { startGameLoop } from '../../../client/gameLoop';
// import { defaultPonyState } from '../../../client/ponyHelpers';
// import { SpriteBatch } from '../../../graphics/spriteBatch';
// import { loadSpriteSheets, loadAndInitSpriteSheets } from '../../../client/spriteUtils';
// import { Key } from '../../../client/input/input';
// import { trot } from '../../../client/ponyAnimations';
// import { createTexturesForSpriteSheets } from '../../../graphics/spriteSheetUtils';
// import { PaletteManager, releasePalette } from '../../../graphics/paletteManager';
// import { getWebGLContext, createViewMatrix2 } from '../../../graphics/webgl/webglUtils';
// import * as sprites from '../../../generated/sprites';
// import { SpriteBatch2 } from '../../../graphics/spriteBatch2';
// import { loadImage, createCanvas } from '../../../client/canvasUtils';
// import { WHITE, ORANGE, RED, BLUE } from '../../../common/colors';
// import { PaletteSpriteBatch } from '../../../graphics/paletteSpriteBatch';
// import { PaletteSpriteBatch2 } from '../../../graphics/paletteSpriteBatch2';
// import { PaletteSpriteBatch3 } from '../../../graphics/paletteSpriteBatch3';
// import { createFrameBuffer, bindFrameBuffer } from '../../../graphics/webgl/glFbo';
// import { createTexture, Texture2D } from '../../../graphics/webgl/texture2d';
// import { times } from '../../../common/utils';
// import { createShader } from '../../../graphics/webgl/shader-new';
// import {
// 	lightShader, spriteShader, sprite2Shader, paletteDepthShader, paletteLayersShader, paletteLayersInstancedShader
// } from '../../../generated/shaders';

@Component({
	selector: 'tools-webgl',
	templateUrl: 'tools-webgl.pug',
})
export class ToolsWebgl implements OnInit {
	@ViewChild('canvas', { static: true }) canvasElement!: ElementRef;
	@ViewChild('canvas2', { static: true }) canvasElement2!: ElementRef;
	ngOnInit() {
		// testSpriteBatch(this.canvasElement.nativeElement);
	}
}

// export function testLightsShader(canvas: HTMLCanvasElement) {
// 	const gl = getWebGLContext(canvas);
// 	const shader = createShader(gl, lightShader);
// 	const batch = new SpriteBatch(gl);
// 	const fps = document.getElementById('fps')!;

// 	const handle = startGameLoop({
// 		fps: 0,
// 		load() {
// 			return loadAndInitSpriteSheets();
// 		},
// 		init() {
// 			createTexturesForSpriteSheets(gl, sprites.spriteSheets);
// 		},
// 		update(_delta: number) {
// 		},
// 		draw() {
// 			const scale = 2;
// 			const width = Math.ceil(window.innerWidth / scale);
// 			const height = Math.ceil(window.innerHeight / scale);

// 			gl.canvas.width = width;
// 			gl.canvas.height = height;
// 			gl.canvas.style.width = (width * scale) + 'px';
// 			gl.canvas.style.height = (height * scale) + 'px';

// 			gl.clearColor(0.13, 0.5, 0.5, 1.0);
// 			gl.clear(gl.COLOR_BUFFER_BIT);
// 			gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
// 			gl.disable(gl.DEPTH_TEST);
// 			gl.depthFunc(gl.LEQUAL);
// 			gl.enable(gl.BLEND);
// 			gl.blendEquation(gl.FUNC_ADD);
// 			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

// 			const transformMatrix = mat4.ortho(mat4.create(), 0, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, 0, 1000);

// 			batch.begin(shader, {} as any);

// 			gl.uniformMatrix4fv(shader.uniforms.transfrom, false, transformMatrix);
// 			gl.uniform4f(shader.uniforms.lighting, 1, 1, 1, 1);

// 			batch.drawImage(ORANGE, -1, -1, 2, 2, 100, 100, 300, 200);

// 			batch.end();
// 		},
// 	});

// 	window.addEventListener('keyup', e => {
// 		if (e.keyCode === Key.KEY_Q) {
// 			handle.cancel();
// 			fps.textContent = `off`;
// 		}
// 	});
// }

// export function testSpriteBatch(canvas: HTMLCanvasElement) {
// 	const gl = getWebGLContext(canvas);
// 	const shader = createShader(gl, paletteLayersShader);
// 	const batch = new PaletteSpriteBatch3(gl);
// 	const paletteManager = new PaletteManager();
// 	const defaultPalette = paletteManager.addArray(sprites.defaultPalette);
// 	// const applePalette = paletteManager.addArray(sprites.apple_1.palettes![0]);
// 	const fps = document.getElementById('fps')!;

// 	const handle = startGameLoop({
// 		fps: 0,
// 		load() {
// 			return loadAndInitSpriteSheets();
// 		},
// 		init() {
// 			createTexturesForSpriteSheets(gl, sprites.spriteSheets);
// 		},
// 		update(_delta: number) {
// 		},
// 		draw() {
// 			const scale = 2;
// 			const width = Math.ceil(window.innerWidth / scale);
// 			const height = Math.ceil(window.innerHeight / scale);

// 			gl.canvas.width = width;
// 			gl.canvas.height = height;
// 			gl.canvas.style.width = (width * scale) + 'px';
// 			gl.canvas.style.height = (height * scale) + 'px';

// 			paletteManager.commit(gl);

// 			batch.palette = paletteManager.texture;
// 			batch.rectSprite = sprites.pixel2;
// 			batch.defaultPalette = defaultPalette;

// 			gl.clearColor(0.13, 0.5, 0.5, 1.0);
// 			gl.clear(gl.COLOR_BUFFER_BIT);
// 			gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
// 			gl.disable(gl.DEPTH_TEST);
// 			gl.depthFunc(gl.LEQUAL);
// 			gl.enable(gl.BLEND);
// 			gl.blendEquation(gl.FUNC_ADD);
// 			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

// 			const transformMatrix = mat4.ortho(mat4.create(), 0, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, 0, 1000);

// 			batch.begin(shader, {} as any);

// 			gl.uniformMatrix4fv(shader.uniforms.transfrom, false, transformMatrix);
// 			gl.uniform4f(shader.uniforms.lighting, 1, 1, 1, 1);
// 			gl.uniform1f(shader.uniforms.pixelSize, paletteManager.pixelSize);

// 			// batch.drawSprite(sprites.apple_1.color, WHITE, applePalette, 100, 100);
// 			batch.drawRect(ORANGE, 200, 200, 300, 150);

// 			batch.end();
// 		},
// 	});

// 	window.addEventListener('keyup', e => {
// 		if (e.keyCode === Key.KEY_Q) {
// 			handle.cancel();
// 			fps.textContent = `off`;
// 		}
// 	});
// }

// export function testInstancedSprites(canvas: HTMLCanvasElement) {
// 	const gl = getWebGLContext(canvas);
// 	const shader = createShader(gl, paletteLayersShader);
// 	const shader2 = createShader(gl, paletteLayersInstancedShader);
// 	const batch = new PaletteSpriteBatch3(gl);
// 	const batch2 = new InstancedPaletteSpriteBatch(gl);
// 	const paletteManager = new PaletteManager();
// 	const defaultPalette = paletteManager.addArray(sprites.defaultPalette);
// 	const fps = document.getElementById('fps')!;
// 	const randomSprites = [
// 		sprites.pumpkin_default,
// 		sprites.box_lanterns,
// 		sprites.flower_patch5,
// 		sprites.leafpile_medium,
// 	];

// 	const width = 600;
// 	const height = 500;
// 	const itemCount = 100000;
// 	const items = times(itemCount, () => {
// 		const sprite = sample(randomSprites)!;

// 		return {
// 			sprite: sprite.color,
// 			palette: paletteManager.addArray(sprite.palettes![0]),
// 			x: width * Math.random(),
// 			y: height * Math.random(),
// 		};
// 	});

// 	let mode = 'instanced';

// 	const handle = startGameLoop({
// 		fps: 0,
// 		load() {
// 			return loadAndInitSpriteSheets();
// 		},
// 		init() {
// 			createTexturesForSpriteSheets(gl, sprites.spriteSheets);
// 		},
// 		update(_delta: number) {
// 		},
// 		draw() {
// 			const scale = 2;
// 			const width = Math.ceil(window.innerWidth / scale);
// 			const height = Math.ceil(window.innerHeight / scale);

// 			gl.canvas.width = width;
// 			gl.canvas.height = height;
// 			gl.canvas.style.width = (width * scale) + 'px';
// 			gl.canvas.style.height = (height * scale) + 'px';

// 			paletteManager.commit(gl);

// 			batch.palette = paletteManager.texture;
// 			batch.rectSprite = sprites.pixelRect2;
// 			batch.defaultPalette = defaultPalette;

// 			batch2.palette = paletteManager.texture;
// 			batch2.rectSprite = sprites.pixelRect2;
// 			batch2.defaultPalette = defaultPalette;

// 			gl.clearColor(0.13, 0.5, 0.5, 1.0);
// 			gl.clear(gl.COLOR_BUFFER_BIT);
// 			gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
// 			gl.disable(gl.DEPTH_TEST);
// 			gl.depthFunc(gl.LEQUAL);
// 			gl.enable(gl.BLEND);
// 			gl.blendEquation(gl.FUNC_ADD);
// 			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

// 			const transformMatrix = mat4.ortho(mat4.create(), 0, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, 0, 1000);

// 			if (mode === 'regular') {
// 				batch.begin(shader, {} as any);
// 				gl.uniformMatrix4fv(shader.uniforms.transfrom, false, transformMatrix);
// 				gl.uniform4f(shader.uniforms.lighting, 1, 1, 1, 1);
// 				gl.uniform1f(shader.uniforms.pixelSize, paletteManager.pixelSize);

// 				for (const item of items) {
// 					batch.drawSprite(item.sprite, WHITE, item.palette, item.x, item.y);
// 				}

// 				batch.end();
// 			} else if (mode === 'instanced') {
// 				batch2.begin(shader2);
// 				gl.uniformMatrix4fv(shader.uniforms.transfrom, false, transformMatrix);
// 				gl.uniform4f(shader.uniforms.lighting, 1, 1, 1, 1);
// 				gl.uniform1f(shader.uniforms.pixelSize, paletteManager.pixelSize);

// 				for (const item of items) {
// 					batch2.drawSprite(item.sprite, WHITE, item.palette, item.x, item.y);
// 				}

// 				batch2.end();
// 			}

// 			fps.textContent = `${this.fps.toFixed(0)} fps (${mode})`;
// 		},
// 	});

// 	window.addEventListener('keyup', e => {
// 		if (e.keyCode === Key.KEY_Q) {
// 			handle.cancel();
// 			fps.textContent = `off`;
// 		}

// 		if (e.keyCode === Key.KEY_M) {
// 			mode = mode === 'regular' ? 'instanced' : 'regular';
// 		}
// 	});
// }

// export function testLayeredSprites(canvas: HTMLCanvasElement, canvas2: HTMLCanvasElement) {
// 	function transferPixels(src: HTMLCanvasElement, dst: HTMLCanvasElement, srcChannel: number, dstChannel: number) {
// 		const srcContext = src.getContext('2d')!;
// 		const dstContext = dst.getContext('2d')!;
// 		const srcData = srcContext.getImageData(0, 0, src.width, src.height);
// 		const dstData = dstContext.getImageData(0, 0, dst.width, dst.height);

// 		for (let y = 0; y < dstData.height; y++) {
// 			for (let x = 0; x < dstData.width; x++) {
// 				const offset = (x + y * dstData.width) * 4;
// 				dstData.data[offset + dstChannel] = srcData.data[offset + srcChannel];
// 			}
// 		}

// 		dstContext.putImageData(dstData, 0, 0);
// 	}

// 	function transferPixels2(src: HTMLCanvasElement, dstData: ImageData, srcChannel: number, dstChannel: number) {
// 		const srcContext = src.getContext('2d')!;
// 		const srcData = srcContext.getImageData(0, 0, src.width, src.height);

// 		for (let y = 0; y < srcData.height; y++) {
// 			for (let x = 0; x < srcData.width; x++) {
// 				const offset = (x + y * srcData.width) * 4;
// 				dstData.data[offset + dstChannel] = srcData.data[offset + srcChannel];
// 			}
// 		}
// 	}

// 	const gl = getWebGLContext(canvas);
// 	const shader = createShader(gl, paletteLayersShader);
// 	const batch = new PaletteSpriteBatch3(gl);
// 	const paletteManager = new PaletteManager();
// 	const defaultPalette = paletteManager.addArray(sprites.defaultPalette);
// 	const palettes = [
// 		paletteManager.addArray(sprites.pumpkin_default.palettes![0]),
// 		paletteManager.addArray(sprites.rock.palettes![0]),
// 		paletteManager.addArray(sprites.sign_1.palettes![0]),
// 		paletteManager.addArray(sprites.box_lanterns.palettes![0]),
// 	];

// 	const theSprites: Sprite[] = [];

// 	const handle = startGameLoop({
// 		fps: 0,
// 		load() {
// 			return loadAndInitSpriteSheets();
// 		},
// 		init() {
// 			const canvas = canvas2;
// 			canvas2.style.display = 'block';
// 			canvas.width = 256;
// 			canvas.height = 256;
// 			const context = canvas.getContext('2d')!;
// 			context.fillStyle = 'white';
// 			context.globalAlpha = 200 / 0xff;
// 			context.fillRect(0, 0, 256, 256);
// 			context.globalAlpha = 1;
// 			const sheetData = (sprites.spriteSheets[1] as any).data;
// 			const sheetImage = createCanvas(sheetData.width, sheetData.height);
// 			sheetImage.getContext('2d')!.putImageData(sheetData, 0, 0);
// 			const sheetCanvas = createCanvas(256, 256);
// 			const sheetContext = sheetCanvas.getContext('2d')!;

// 			const pixels = sheetContext.createImageData(256, 256); // new Uint8Array(256 * 256 * 4);

// 			for (let i = 0; i < pixels.width * pixels.height * 4; i++) {
// 				pixels.data[i] = 255;
// 			}

// 			const pumpkin = sprites.pumpkin_default.color;
// 			sheetContext.clearRect(0, 0, 256, 256);
// 			sheetContext.drawImage(sheetImage, pumpkin.x, pumpkin.y, pumpkin.w, pumpkin.h, 0, 0, pumpkin.w, pumpkin.h);
// 			transferPixels(sheetCanvas, canvas, 0, 0);
// 			transferPixels2(sheetCanvas, pixels, 0, 0);

// 			const rock = sprites.rock.color;
// 			sheetContext.clearRect(0, 0, 256, 256);
// 			sheetContext.drawImage(sheetImage, rock.x, rock.y, rock.w, rock.h, 0, 0, rock.w, rock.h);
// 			transferPixels(sheetCanvas, canvas, 0, 1);
// 			transferPixels2(sheetCanvas, pixels, 0, 1);

// 			const sign = sprites.sign_1.color;
// 			sheetContext.clearRect(0, 0, 256, 256);
// 			sheetContext.drawImage(sheetImage, sign.x, sign.y, sign.w, sign.h, 0, 0, sign.w, sign.h);
// 			transferPixels(sheetCanvas, canvas, 0, 2);
// 			transferPixels2(sheetCanvas, pixels, 0, 2);

// 			const box = sprites.box_lanterns.color;
// 			sheetContext.clearRect(0, 0, 256, 256);
// 			sheetContext.drawImage(sheetImage, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
// 			// transferPixels(sheetCanvas, canvas, 0, 3);
// 			transferPixels2(sheetCanvas, pixels, 0, 3);

// 			const texture = createTexture(gl, pixels);
// 			// texture.bind(0);
// 			// gl.texImage2D(gl.TEXTURE_2D, 0, texture.format, 256, 256, 0, texture.format, texture.type, pixels);

// 			const spr = {
// 				x: 0,
// 				y: 0,
// 				w: 50,
// 				h: 50,
// 				ox: 0,
// 				oy: 0,
// 				tex: texture,
// 			};

// 			theSprites.push({ ...spr, type: 3 });
// 			theSprites.push({ ...spr, type: 4 });
// 			theSprites.push({ ...spr, type: 5 });
// 			theSprites.push({ ...spr, type: 6 });

// 			createTexturesForSpriteSheets(gl, sprites.spriteSheets);
// 		},
// 		update(_delta: number) {
// 		},
// 		draw() {
// 			const scale = 4;
// 			const width = Math.ceil(window.innerWidth / scale);
// 			const height = Math.ceil(window.innerHeight / scale);

// 			gl.canvas.width = width;
// 			gl.canvas.height = height;
// 			gl.canvas.style.width = (width * scale) + 'px';
// 			gl.canvas.style.height = (height * scale) + 'px';

// 			paletteManager.commit(gl);
// 			batch.palette = paletteManager.texture;
// 			batch.rectSprite = sprites.pixelRect2;
// 			batch.defaultPalette = defaultPalette;

// 			gl.clearColor(0.13, 0.5, 0.5, 1.0);
// 			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
// 			gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
// 			gl.enable(gl.DEPTH_TEST);
// 			gl.depthFunc(gl.LEQUAL);
// 			gl.enable(gl.BLEND);
// 			gl.blendEquation(gl.FUNC_ADD);
// 			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

// 			const transformMatrix = mat4.ortho(mat4.create(), 0, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, 0, 1000);

// 			batch.begin(shader, {} as any);
// 			gl.uniformMatrix4fv(shader.uniforms.transfrom, false, transformMatrix);
// 			gl.uniform4f(shader.uniforms.lighting, 1, 1, 1, 1);
// 			gl.uniform1f(shader.uniforms.pixelSize, paletteManager.pixelSize);
// 			batch.drawSprite(sprites.pumpkin_default.color, WHITE, palettes[0], 50, 50);
// 			batch.drawSprite(theSprites[0], WHITE, palettes[0], 50, 120);
// 			batch.drawSprite(theSprites[1], WHITE, palettes[1], 100, 120);
// 			batch.drawSprite(theSprites[2], WHITE, palettes[2], 150, 120);
// 			batch.drawSprite(theSprites[3], WHITE, palettes[3], 200, 120);
// 			batch.end();
// 		},
// 	});

// 	window.addEventListener('keyup', e => {
// 		if (e.keyCode === Key.KEY_Q) {
// 			handle.cancel();
// 		}
// 	});
// }

// export function test3DMap(canvas: HTMLCanvasElement) {
// 	const gl = getWebGLContext(canvas);
// 	const paletteShader = createShader(gl, paletteDepthShader);
// 	const paletteSpriteBatch = new PaletteSpriteBatch2(gl);
// 	const paletteManager = new PaletteManager();
// 	// const treePalette = paletteManager.add(sprites.tree_6Crown0_0.palettes![0]);
// 	const grassPalette = paletteManager.addArray(sprites.grass_tile.palettes![0]);
// 	// const wallPalette = paletteManager.add(sprites.stone_wall_6.palettes![0]);
// 	const defaultPalette = paletteManager.addArray(sprites.defaultPalette);

// 	const camera = {
// 		x: -2,
// 		y: -2,
// 		w: 100,
// 		h: 100,
// 	};

// 	let redZ = 2;
// 	let blueZ = -2;

// 	const handle = startGameLoop({
// 		fps: 0,
// 		load() {
// 			return loadAndInitSpriteSheets();
// 		},
// 		init() {
// 			createTexturesForSpriteSheets(gl, sprites.spriteSheets);
// 		},
// 		update(_delta: number) {
// 		},
// 		draw() {
// 			const scale = 4;
// 			const width = Math.ceil(window.innerWidth / scale);
// 			const height = Math.ceil(window.innerHeight / scale);

// 			camera.w = width / 32;
// 			camera.h = height / 32;

// 			gl.canvas.width = width;
// 			gl.canvas.height = height;
// 			gl.canvas.style.width = (width * scale) + 'px';
// 			gl.canvas.style.height = (height * scale) + 'px';

// 			paletteManager.commit(gl);
// 			paletteSpriteBatch.palette = paletteManager.texture;
// 			paletteSpriteBatch.rectSprite = sprites.pixelRect2;
// 			paletteSpriteBatch.defaultPalette = defaultPalette;

// 			gl.clearColor(0.13, 0.5, 0.5, 1.0);
// 			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

// 			gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

// 			gl.enable(gl.DEPTH_TEST);
// 			gl.depthFunc(gl.LEQUAL);

// 			gl.enable(gl.BLEND);
// 			gl.blendEquation(gl.FUNC_ADD);
// 			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

// 			const viewMatrix = mat4.lookAt(mat4.create(), [0, 1, 1], [0, 0, 0], [0, 0, -1]);
// 			const projMatrix = mat4.ortho(mat4.create(), camera.x, camera.x + camera.w, camera.y + camera.h, camera.y, -1000, 1000);
// 			const transformMatrix = mat4.mul(mat4.create(), projMatrix, viewMatrix);

// 			paletteSpriteBatch.begin(paletteShader, sprites.paletteSpriteSheet);
// 			gl.uniformMatrix4fv(paletteShader.uniforms.transfrom, false, transformMatrix);
// 			gl.uniform4f(paletteShader.uniforms.lighting, 1, 1, 1, 1);
// 			gl.uniform1f(paletteShader.uniforms.pixelSize, paletteManager.pixelSize);

// 			// for (let y = 0; y < 15; y++) {
// 			// 	for (let x = 0; x < 10; x++) {
// 			// 		paletteSpriteBatch.drawSprite(sprites.grass_tile.color, WHITE, grassPalette, x * 32, y * 24);
// 			// 	}
// 			// }

// 			// paletteSpriteBatch.drawSprite(sprites.stone_wall_6.color!, WHITE, wallPalette, 60, 40);
// 			// paletteSpriteBatch.drawSprite(sprites.tree_6Crown0_0.color!, WHITE, treePalette, 120, 10);

// 			const sprite = sprites.grass_tile.color;

// 			function drawHTileAt(x: number, y: number, z: number, color: number) {
// 				paletteSpriteBatch.drawQuad(color, grassPalette,
// 					x + 0, y + 0, z,
// 					x + 1, y + 0, z,
// 					x + 1, y + 1, z,
// 					x + 0, y + 1, z,
// 					sprite.x, sprite.y, sprite.w, sprite.h);
// 			}

// 			drawHTileAt(0.5, 0, redZ, RED);
// 			drawHTileAt(0, 0, 0, WHITE);
// 			drawHTileAt(0.5, 0, 0, ORANGE);

// 			paletteSpriteBatch.drawQuad(BLUE, grassPalette,
// 				0, 0, blueZ,
// 				1, 0, blueZ,
// 				1, 1, blueZ - 1,
// 				0, 1, blueZ - 1,
// 				sprite.x, sprite.y, sprite.w, sprite.h);

// 			paletteSpriteBatch.end();
// 		},
// 	});

// 	window.addEventListener('keyup', e => {
// 		if (e.keyCode === Key.KEY_Q) {
// 			handle.cancel();
// 		}
// 	});

// 	window.addEventListener('keydown', e => {
// 		if (e.keyCode === Key.LEFT) {
// 			camera.x -= 1;
// 		} else if (e.keyCode === Key.RIGHT) {
// 			camera.x += 1;
// 		} else if (e.keyCode === Key.UP) {
// 			camera.y -= 1;
// 		} else if (e.keyCode === Key.DOWN) {
// 			camera.y += 1;
// 		}

// 		if (e.keyCode === Key.KEY_A) {
// 			camera.x -= 1;
// 		} else if (e.keyCode === Key.KEY_D) {
// 			camera.x += 1;
// 		} else if (e.keyCode === Key.KEY_W) {
// 			camera.y -= 1;
// 		} else if (e.keyCode === Key.KEY_S) {
// 			camera.y += 1;
// 		}

// 		if (e.keyCode === Key.KEY_R) {
// 			redZ -= 0.1;
// 		} else if (e.keyCode === Key.KEY_T) {
// 			redZ += 0.1;
// 		}

// 		if (e.keyCode === Key.KEY_F) {
// 			blueZ -= 0.1;
// 		} else if (e.keyCode === Key.KEY_G) {
// 			blueZ += 0.1;
// 		}
// 	});
// }

// export function oldTests(canvas: HTMLCanvasElement) {
// 	let skewTime = 0;
// 	let animationTime = 0;
// 	let lightTexture: Texture2D;
// 	// let tilesTexture: Texture2D;

// 	const gl = getWebGLContext(canvas);
// 	const spriteShaderInstance = createShader(gl, spriteShader);
// 	const paletteShader = createShader(gl, paletteDepthShader);
// 	const lightShader = createShader(gl, sprite2Shader);
// 	const spriteBatch = new SpriteBatch(gl);
// 	const spriteBatch2 = new SpriteBatch2(gl);
// 	const paletteSpriteBatch2 = new PaletteSpriteBatch2(gl);
// 	const paletteSpriteBatch = new PaletteSpriteBatch(gl);
// 	const paletteManager = new PaletteManager();
// 	const palettes: Palette[] = [];
// 	const fbo = createFrameBuffer(gl, 1024, 1024, { depth: false });
// 	//const light = createFBO(gl, 1024, 1024, { depth: true });

// 	// const INFO = createDefaultPony();

// 	const STATE: PonyState = {
// 		...defaultPonyState(),
// 		animation: trot,
// 		animationFrame: 0,
// 		headAnimation: undefined,
// 		headAnimationFrame: 0,
// 		blinkFrame: 2,
// 	};

// 	const scale = 4;
// 	// const ponyInfo = toPalette(INFO, paletteManager);
// 	const treePalette = paletteManager.addArray(sprites.tree_6Crown0_0.palettes![0]);
// 	const rockPalette = paletteManager.addArray(sprites.rock.palettes![0]);
// 	const grassPalette = paletteManager.addArray(sprites.grass_2.palettes![0]);

// 	let mouseX = 0, mouseY = 0;

// 	// font.lineSpacing = 5;

// 	canvas.addEventListener('mousemove', e => {
// 		mouseX = e.pageX / scale;
// 		mouseY = e.pageY / scale;
// 	});

// 	const handle = startGameLoop({
// 		load() {
// 			return Promise.all([
// 				//loadImage('/assets/images/pony2.png').then(img => pony2 = createTexture(gl, img, gl.RGBA, gl.UNSIGNED_BYTE)),
// 				// loadImage('/assets/images/tiles.png').then(img => tilesTexture = createTexture(gl, img)),
// 				loadImage('/images/light2.png').then(img => lightTexture = createTexture(gl, img)),
// 				loadSpriteSheets(sprites.spriteSheets, loadImage),
// 			]).then(() => {
// 				createTexturesForSpriteSheets(gl, sprites.spriteSheets);
// 			});
// 		},
// 		init() {
// 		},
// 		update(delta: number) {
// 			skewTime += delta * 2; // * 0.5;

// 			while (skewTime > 1) {
// 				skewTime -= 1;
// 			}

// 			STATE.animationFrame = Math.floor(animationTime * 24) % STATE.animation!.frames.length;
// 		},
// 		draw() {
// 			gl.canvas.width = document.body.clientWidth;
// 			gl.canvas.height = document.body.clientHeight;
// 			gl.canvas.style.width = document.body.clientWidth + 'px';
// 			gl.canvas.style.height = document.body.clientHeight + 'px';

// 			paletteManager.commit(gl);
// 			paletteSpriteBatch.palette = paletteManager.texture;

// 			const width = Math.ceil(gl.canvas.width / scale);
// 			const height = Math.ceil(gl.canvas.height / scale);

// 			// render color

// 			bindFrameBuffer(fbo);

// 			gl.viewport(0, 0, width, height);
// 			gl.clearColor(0.13, 0.5, 0.5, 1.0);
// 			gl.clear(gl.COLOR_BUFFER_BIT);

// 			gl.disable(gl.DEPTH_TEST);
// 			gl.enable(gl.BLEND);
// 			gl.blendEquation(gl.FUNC_ADD);
// 			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

// 			const viewMatrix = mat4.ortho(mat4.create(), 0, width, height, 0, 0, 1000);

// 			paletteSpriteBatch.begin(paletteShader, {} as any);

// 			gl.uniformMatrix4fv(paletteShader.uniforms.transfrom, false, viewMatrix);
// 			gl.uniform4f(paletteShader.uniforms.lighting, 1, 1, 1, 1);
// 			gl.uniform1f(paletteShader.uniforms.pixelSize, paletteManager.pixelSize);

// 			for (let y = 0; y < 15; y++) {
// 				for (let x = 0; x < 10; x++) {
// 					paletteSpriteBatch.drawSprite(sprites.grass_2.color, WHITE, grassPalette, x * 32, y * 24);
// 				}
// 			}

// 			paletteSpriteBatch.drawSprite(sprites.tree_6Crown0_0.color!, WHITE, treePalette, 120, 10);
// 			paletteSpriteBatch.end();

// 			// render frame buffer (color)

// 			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
// 			gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
// 			gl.clearColor(0.13, 0.5, 0.5, 1.0);
// 			gl.clear(gl.COLOR_BUFFER_BIT);
// 			gl.disable(gl.DEPTH_TEST);
// 			gl.disable(gl.BLEND);

// 			const fboMatrix = mat4.ortho(mat4.create(), 0, width, height, 0, 0, 1000);

// 			spriteBatch.begin(spriteShaderInstance, { texture: fbo.depth } as any);

// 			gl.uniformMatrix4fv(spriteShaderInstance.uniforms.transfrom, false, fboMatrix);
// 			gl.uniform4f(spriteShaderInstance.uniforms.lighting, 1, 1, 1, 1);
// 			spriteBatch.drawImage(WHITE, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
// 			spriteBatch.end();
// 		},
// 		draw2() {
// 			gl.canvas.width = document.body.clientWidth;
// 			gl.canvas.height = document.body.clientHeight;
// 			gl.canvas.style.width = document.body.clientWidth + 'px';
// 			gl.canvas.style.height = document.body.clientHeight + 'px';

// 			paletteManager.commit(gl);
// 			paletteSpriteBatch2.palette = paletteManager.texture;

// 			const width = Math.ceil(gl.canvas.width / scale);
// 			const height = Math.ceil(gl.canvas.height / scale);

// 			// render color

// 			bindFrameBuffer(fbo);

// 			gl.viewport(0, 0, width, height);
// 			gl.clearColor(0.13, 0.5, 0.5, 1.0);
// 			gl.clearDepth(1000); //gl.DEPTH_CLEAR_VALUE);
// 			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

// 			gl.enable(gl.DEPTH_TEST);
// 			//gl.depthMask(true);
// 			gl.depthFunc(gl.LEQUAL);
// 			//gl.depthRange(0, 1000);

// 			gl.enable(gl.BLEND);
// 			gl.blendEquation(gl.FUNC_ADD);
// 			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

// 			//const mat = createViewMatrix(mat4.create(), width, height, 1);

// 			const tst = mat4.create();
// 			mat4.identity(tst);
// 			mat4.translate(tst, tst, vec3.fromValues(-1, 1, 0));
// 			mat4.scale(tst, tst, vec3.fromValues(2 / width, -2 / height, 1));
// 			mat4.scale(tst, tst, vec3.fromValues(1, 1, 0.005));
// 			//mat4.translate(tst, tst, vec3.fromValues(0, 0, 0));

// 			const tst2 = mat4.ortho(mat4.create(), 0, width, height, 0, 0, 100);

// 			//const viewMatrix = mat4.ortho(this.viewMatrix, camera.x, camera.x + camera.w, camera.y, camera.y + camera.h, 0, 100);
// 			//const fboMatrix = mat4.ortho(
// 			//  this.fboMatrix, 0, this.canvas.width / actualScale, this.canvas.height / actualScale, 0, 0, 100);

// 			//console.log(mat4.str(tst));
// 			//console.log(mat4.str(tst2));
// 			//handle.cancel();

// 			//spriteBatch.begin(spriteShader);
// 			//spriteShader.uniforms.transform = mat;
// 			//spriteShader.uniforms.lighting = [1, 1, s1, 1];
// 			//spriteBatch.drawRect(GRAY, 10, 140, SIZE, SIZE);
// 			//spriteBatch.end();

// 			paletteSpriteBatch2.begin(paletteShader, {} as any);

// 			gl.uniformMatrix4fv(paletteShader.uniforms.transfrom, false, tst2);
// 			gl.uniform4f(paletteShader.uniforms.lighting, 1, 1, 1, 1);
// 			gl.uniform1f(paletteShader.uniforms.pixelSize, paletteManager.pixelSize);

// 			paletteSpriteBatch2.depth = -100;

// 			for (let y = 0; y < 15; y++) {
// 				for (let x = 0; x < 10; x++) {
// 					paletteSpriteBatch2.drawSprite(sprites.grass_2.color, WHITE, grassPalette, x * 32, y * 24);
// 				}
// 			}

// 			paletteSpriteBatch2.depth = -90;
// 			paletteSpriteBatch2.drawSprite(sprites.rock.color, WHITE, rockPalette, 65, 70);

// 			paletteSpriteBatch2.depth = -80;
// 			// drawPony(paletteSpriteBatch2, ponyInfo, STATE, 100, 100, defaultDrawPonyOptions());

// 			//const tail = mat2d.create();
// 			//mat2d.identity(tail);
// 			//mat2d.translate(tail, tail, vec2.fromValues(10, 60));
// 			//skewY(tail, tail, (skewTime > 0.5 ? (1 - skewTime) : skewTime) * 0.4);
// 			//mat2d.translate(tail, tail, vec2.fromValues(-46, -44));
// 			//
// 			//paletteSpriteBatch.transform = tail;
// 			//paletteSpriteBatch.drawSprite(sprites.ponTails[1][1].color, null, ponyInfo.tail.palette, 0, 0);
// 			//paletteSpriteBatch.transform = null;

// 			paletteSpriteBatch2.depth = -60;
// 			paletteSpriteBatch2.drawSprite(sprites.tree_6Crown0_0.color, WHITE, treePalette, 120, 10);

// 			//gl.depthMask(false);

// 			paletteSpriteBatch2.end();

// 			//spriteBatch.begin(spriteShader);
// 			//spriteShader.uniforms.transform = mat;
// 			//spriteShader.uniforms.lighting = [1, 1, 1, 1];
// 			//spriteBatch.drawRect(GRAY, 10, 140, paletteManager.textureSize, paletteManager.textureSize);
// 			//spriteBatch.drawImage(
// 			//	paletteManager.texture, null, 0, 0, paletteManager.textureSize, paletteManager.textureSize,
// 			//  10, 140, paletteManager.textureSize, paletteManager.textureSize);
// 			//spriteBatch.drawImage(lightTexture, null, 0, 0, 64, 64, 50, 50, 64, 64);
// 			//spriteBatch.end();

// 			// render lighting test

// 			//		gl.blendEquation(gl.FUNC_ADD);
// 			//		gl.blendFunc(gl.ONE, gl.ONE);
// 			//
// 			//		spriteBatch2.begin(lightShader);
// 			//		lightShader.uniforms.transform = tst;
// 			//		spriteBatch2.defaultDepth = 70;
// 			//		spriteBatch2.drawImage(lightTexture, null, 0, 0, 128, 128, mouseX - 64, mouseY - 64, 128, 128);
// 			//		spriteBatch2.end();

// 			// render lighting

// 			//		light.bind();
// 			//
// 			//		gl.viewport(0, 0, width, height);
// 			//		gl.clearColor(0.2, 0, 0, 1.0);
// 			//		gl.clear(gl.COLOR_BUFFER_BIT);
// 			//
// 			//		gl.disable(gl.DEPTH_TEST);
// 			//		gl.enable(gl.BLEND);
// 			//		gl.blendEquation(gl.FUNC_ADD);
// 			//		gl.blendFunc(gl.ONE, gl.ONE);
// 			//
// 			//		spriteBatch.begin(spriteShader);
// 			//		spriteShader.uniforms.transform = mat;
// 			//		spriteShader.uniforms.lighting = [1, 1, 1, 1];
// 			//		spriteBatch.drawImage(lightTexture, null, 0, 0, 128, 128, mouseX - 64, mouseY - 64, 128, 128);
// 			//		spriteBatch.end();

// 			// render frame buffer (color)

// 			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
// 			gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
// 			gl.clearColor(1, 1, 1, 1);
// 			gl.clear(gl.COLOR_BUFFER_BIT);

// 			gl.disable(gl.DEPTH_TEST);
// 			gl.enable(gl.BLEND);
// 			gl.blendEquation(gl.FUNC_ADD);
// 			gl.blendFunc(gl.DST_COLOR, gl.ZERO);

// 			spriteBatch.begin(spriteShaderInstance, { texture: fbo.depth } as any);

// 			const viewMatrix = createViewMatrix2(mat4.create(), canvas.width, canvas.height, scale);
// 			gl.uniformMatrix4fv(spriteShaderInstance.uniforms.transfrom, false, viewMatrix);
// 			gl.uniform4f(spriteShaderInstance.uniforms.lighting, 1, 1, 1, 1);
// 			spriteBatch.drawImage(WHITE, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
// 			//spriteBatch.drawImage(fbo.color[0], WHITE, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
// 			//spriteBatch.drawImage(fbo.color[1], WHITE, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
// 			//spriteBatch.drawImage(light.color[0], WHITE, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
// 			spriteBatch.end();

// 			// render light

// 			bindFrameBuffer(fbo);

// 			gl.viewport(0, 0, width, height);
// 			gl.clearColor(0.13, 0.5, 0.5, 1.0); // ambient light color here
// 			gl.clear(gl.COLOR_BUFFER_BIT);

// 			gl.enable(gl.DEPTH_TEST);
// 			gl.depthFunc(gl.LESS);

// 			gl.blendEquation(gl.FUNC_ADD);
// 			gl.blendFunc(gl.ONE, gl.ONE);

// 			spriteBatch2.begin(lightShader, { texture: lightTexture } as any);
// 			gl.uniformMatrix4fv(lightShader.uniforms.transfrom, false, tst);
// 			spriteBatch2.depth = 70;
// 			spriteBatch2.drawImage(WHITE, 0, 0, 256, 200, mouseX - 128, mouseY - 100, 256, 200);
// 			spriteBatch2.end();

// 			// render frame buffer (light)

// 			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
// 			gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

// 			gl.disable(gl.DEPTH_TEST);
// 			gl.enable(gl.BLEND);
// 			gl.blendEquation(gl.FUNC_ADD);
// 			gl.blendFunc(gl.DST_COLOR, gl.ZERO);

// 			spriteBatch.begin(spriteShaderInstance, { texture: fbo.color[0] } as any);
// 			const mat = createViewMatrix2(mat4.create(), canvas.width, canvas.height, scale);
// 			gl.uniformMatrix4fv(spriteShaderInstance.uniforms.transfrom, false, mat);
// 			gl.uniform4f(spriteShaderInstance.uniforms.lighting, 1, 1, 1, 1);
// 			//spriteBatch.drawImage(fbo.depth, WHITE, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
// 			spriteBatch.drawImage(WHITE, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
// 			//spriteBatch.drawImage(fbo.color[1], WHITE, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
// 			//spriteBatch.drawImage(light.color[0], WHITE, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
// 			spriteBatch.end();
// 		},
// 	} as any);

// 	window.addEventListener('keyup', e => {
// 		if (e.keyCode === Key.KEY_Q) {
// 			handle.cancel();
// 		}
// 	});

// 	window.addEventListener('keydown', e => {
// 		if (e.keyCode === Key.KEY_E) {
// 			animationTime -= 1 / 24;
// 		} else if (e.keyCode === Key.KEY_R) {
// 			animationTime += 1 / 24;
// 		} else if (e.keyCode === Key.KEY_T) {
// 			for (let i = 0; i < 5; i++) {
// 				palettes.push(paletteManager.add(range(0, 40 * Math.random()).map(() => Math.random() * 0xffffffff)));
// 			}
// 		} else if (e.keyCode === Key.KEY_Y) {
// 			palettes.forEach(releasePalette);
// 			palettes.length = 0;
// 		}
// 	});
// }
