import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { flatMap, dropRightWhile, compact } from 'lodash';
import {
	BodyAnimation as IBodyAnimation,
	BodyAnimationFrame as IBodyAnimationFrame,
	HeadAnimation as IHeadAnimation,
	HeadAnimationFrame as IHeadAnimationFrame,
	ColorExtraSet, PonyInfo, PonyObject, BodyShadow, PonyEye
} from '../../../common/interfaces';
import { removeItem, repeat, isKeyEventInvalid, cloneDeep, array } from '../../../common/utils';
import { toPalette, createDefaultPony, syncLockedPonyInfo } from '../../../common/ponyInfo';
import { Key } from '../../../client/input/input';
import { defaultPonyState, defaultDrawPonyOptions } from '../../../client/ponyHelpers';
import {
	headAnimations, animations, createBodyFrame, createHeadFrame, stand, sit, mergeAnimations,
	sitDown, lieDown, lie, sitUp, standUp
} from '../../../client/ponyAnimations';
import { ContextSpriteBatch } from '../../../graphics/contextSpriteBatch';
import * as sprites from '../../../generated/sprites';
import { createCanvas, disableImageSmoothing, saveCanvas } from '../../../client/canvasUtils';
import { loadAndInitSpriteSheets, createEyeSprite } from '../../../client/spriteUtils';
import { drawPony } from '../../../client/ponyDraw';
import {
	faLock, faHome, faArrowRight, faArrowLeft, faPause, faPlay, faChevronRight, faChevronLeft, faRetweet,
	faClone, faPlus, faAngleDoubleDown, faAngleDoubleUp, faAngleDoubleRight, faAngleDoubleLeft,
	faCode, faShare, faTrash, faCopy, faFile, faStop, faRedo, faSync
} from '../../../client/icons';
import { FrameService, FrameLoop } from '../../services/frameService';
import { StorageService } from '../../services/storageService';
import { decompressPonyString } from '../../../common/compressPony';

const ponyWidth = 80;
const ponyHeight = 80;

type AnimationMode = 'body' | 'head';

interface BaseAnimationFrame {
	duration: number;
}

interface BodyAnimationFrame extends IBodyAnimationFrame, BaseAnimationFrame {
	shadowOffset: number;
	shadowFrame: number;
}

interface HeadAnimationFrame extends IHeadAnimationFrame, BaseAnimationFrame { }

interface BaseAnimation {
	name: string;
	fps: number;
	loop: boolean;
	builtin?: boolean;
}

interface BodyAnimation extends BaseAnimation {
	lockFrontLegs?: boolean;
	lockBackLegs?: boolean;
	frames: BodyAnimationFrame[];
}

interface HeadAnimation extends BaseAnimation {
	lockEyes?: boolean;
	frames: HeadAnimationFrame[];
}

interface AnimationsData {
	active?: string;
	animations?: BodyAnimation[];
	headActive?: string;
	headAnimations?: HeadAnimation[];
}

interface PonyItem {
	name: string;
	info: PonyInfo;
}

const testPony = { name: 'test pony', info: createDefaultPony() };

function eyeSprite(e: PonyEye | undefined) {
	return createEyeSprite(e, 0, sprites.defaultPalette);
}

@Component({
	selector: 'tools-animation',
	templateUrl: 'tools-animation.pug',
	styleUrls: ['tools-animation.scss'],
})
export class ToolsAnimation implements OnInit, OnDestroy {
	readonly lockIcon = faLock;
	readonly homeIcon = faHome;
	readonly rightIcon = faArrowRight;
	readonly leftIcon = faArrowLeft;
	readonly stopIcon = faStop;
	readonly pauseIcon = faPause;
	readonly playIcon = faPlay;
	readonly replayIcon = faRedo;
	readonly prevIcon = faChevronLeft;
	readonly nextIcon = faChevronRight;
	readonly switchIcon = faRetweet;
	readonly fileIcon = faFile;
	readonly copyIcon = faCopy;
	readonly trashIcon = faTrash;
	readonly shareIcon = faShare;
	readonly codeIcon = faCode;
	readonly doubleLeftIcon = faAngleDoubleLeft;
	readonly doubleRightIcon = faAngleDoubleRight;
	readonly doubleUpIcon = faAngleDoubleUp;
	readonly doubleDownIcon = faAngleDoubleDown;
	readonly plusIcon = faPlus;
	readonly cloneIcon = faClone;
	readonly syncIcon = faSync;
	loaded = false;
	pony: PonyItem;
	ponies: PonyItem[] = [testPony];
	scale = 3;
	shareLink?: string;
	shareLinkOpen = false;
	state = defaultPonyState();
	bodyAnimations: BodyAnimation[] = animations.map(fromBodyAnimation);
	bodyAnimation: BodyAnimation;
	headAnimations: HeadAnimation[] = headAnimations.map(fromHeadAnimation);
	headAnimation: HeadAnimation;
	body = sprites.body.map(x => x && x[0] && x[0]![0].color).map(color => ({ color: color!, colors: 2 }));
	wing = sprites.wings.map(types => types![3]![0]!);
	tail = sprites.tails.map(types => types![17]![0]!);
	frontLegs: ColorExtraSet = sprites.frontLegs.map(x => x && x[0] && x[0]![0].color).map(color => ({ color: color!, colors: 2 }));
	backLegs: ColorExtraSet = sprites.backLegs.map(x => x && x[0] && x[0]![0].color).map(color => ({ color: color!, colors: 2 }));
	leftEyes: ColorExtraSet = sprites.eyeLeft.map(e => e && e[0]).map(eyeSprite);
	rightEyes: ColorExtraSet = sprites.eyeRight.map(e => e && e[0]).map(eyeSprite);
	mouths: ColorExtraSet = sprites.noses
		.map(m => m[0][0])
		.map(({ color, colors, mouth }) => ({ color, colors, extra: mouth, palette: sprites.defaultPalette }));
	flip = false;
	switch = false;
	mode: AnimationMode;
	beforeAnimation: BodyAnimation | undefined;
	afterAnimation: BodyAnimation | undefined;
	private _playing = false;
	private _frame = 0;
	private loop: FrameLoop;
	constructor(
		private http: HttpClient,
		private route: ActivatedRoute,
		private storage: StorageService,
		frameService: FrameService
	) {
		this.mode = storage.getItem('tools-animation-mode') as AnimationMode || 'body';
		this.loop = frameService.create(delta => this.tick(delta));

		const data = this.loadAnimations();

		const extraAnimations: IBodyAnimation[] = [
			mergeAnimations('sit-lie-sit', 24, false, [...repeat(12, sit), lieDown, ...repeat(12, lie), sitUp, sit]),
			mergeAnimations('stand-sit-stand', 24, false, [...repeat(12, stand), sitDown, ...repeat(12, sit), standUp, stand]),
			mergeAnimations('stand-to-sit', 24, false, [stand, sitDown, sit]),
			mergeAnimations('sit-to-lie', 24, false, [sit, lieDown, lie]),
			{ ...stand, loop: false, name: 'standing (1s)', frames: array(stand.fps, stand.frames[0]) },
			{ ...sit, loop: false, name: 'sitting (1s)', frames: array(sit.fps, sit.frames[0]) },
			{ ...lie, loop: false, name: 'lying (1s)', frames: array(lie.fps, lie.frames[0]) },
		];

		this.bodyAnimations.push(...extraAnimations.map((a, i) => fromBodyAnimation(a, 90 + i)));
		this.bodyAnimations.push(...(data.animations || []).map(fixBodyAnimation));
		this.headAnimations.push(...(data.headAnimations || []).map(fixHeadAnimation));
		this.bodyAnimation = this.bodyAnimations[0];
		this.headAnimation = this.headAnimations[0];

		this.sortAnimations();
		this.selectBodyAnimation(this.bodyAnimations[parseInt(data.active || '0', 10) | 0] || this.bodyAnimation);
		this.selectHeadAnimation(this.headAnimations[parseInt(data.headActive || '0', 10) | 0] || this.headAnimation);

		this.pony = this.ponies[0];
		this.pony.info.coatFill = '#9f7e7e';
		this.pony.info.mane!.type = 9;
		this.pony.info.mane!.fills![0] = '#e2cf67';
		this.pony.info.lockEyes = false;
		this.pony.info.cm = [
			'orange', 'orange', 'orange', 'orange', 'orange',
			'orange', '', '', '', 'orange',
			'orange', '', '', '', 'orange',
			'orange', '', '', '', 'orange',
			'orange', 'orange', 'orange', 'orange', 'orange',
		];

		syncLockedPonyInfo(this.pony.info);
		this.reloadPonies();
	}
	get info() {
		return this.pony.info;
	}
	get frame() {
		return this._frame;
	}
	set frame(value: number) {
		if (this._frame !== value) {
			this._frame = value % this.frames.length;

			if (!this.playing) {
				if (this.mode === 'body') {
					this.state.animationFrame = this.frame;
				} else {
					this.state.headAnimationFrame = this.frame;
				}
			}
		}
	}
	get activeFrame(): BaseAnimationFrame {
		return this.frames[this.frame] || ({} as any);
	}
	get totalFrames() {
		return this.frames.length;
	}
	get playing() {
		return this._playing;
	}
	set playing(value: boolean) {
		if (this._playing !== value) {
			this._playing = value;
			this.time = 0;
			this.update();

			if (!value) {
				this.frame = this.mode === 'body' ? this.state.animationFrame : this.state.headAnimationFrame;
			}
		}
	}
	get bodyFrames() {
		return this.bodyAnimation.frames;
	}
	get headFrames() {
		return this.headAnimation.frames;
	}
	ngOnInit() {
		this.route.params.subscribe(({ id }) => id && this.fetchAnimation(id));

		return loadAndInitSpriteSheets().then(() => {
			this.loaded = true;
			this.update();
			this.loop.init();
		});
	}
	ngOnDestroy() {
		this.loop.destroy();
	}
	reloadPonies() {
		this.http.get<PonyObject[]>('/api-tools/ponies')
			.subscribe(data => {
				this.ponies = [
					testPony,
					...data
						.map(p => ({ name: p.name, info: decompressPonyString(p.info) }))
						.sort((a, b) => a.name.localeCompare(b.name)),
				];

				const ponyName = this.storage.getItem('tools-animation-pony');

				if (ponyName) {
					this.pony = this.ponies.find(p => p.name === ponyName) || this.pony;
				}
			});
	}
	setPony(pony: PonyItem) {
		this.pony = pony;
		this.update();
		this.storage.setItem('tools-animation-pony', pony.name);
	}
	selectBodyAnimation(animation: BodyAnimation) {
		this.bodyAnimation = animation;
		this.update();
	}
	selectHeadAnimation(animation: HeadAnimation) {
		this.headAnimation = animation;
		this.update();
	}
	setMode(mode: AnimationMode) {
		this.mode = mode;
		this.storage.setItem('tools-animation-mode', mode);
	}
	replay() {
		this.bodyAnimationPlaying = 0;
		this.state.animation = this.bodyAnimationsToPlay[this.bodyAnimationPlaying];
		this.time = 0;
	}
	private fetchAnimation(id: string) {
		return this.http.get<{ type: string, animation: any; }>(`/api-tools/animation/${id}`)
			.subscribe(({ type, animation }) => {
				if (type === 'body') {
					this.bodyAnimations.push(animation);
				} else {
					this.headAnimations.push(animation);
				}

				this.sortAnimations();
				this.selectAnimation(animation);
			});
	}
	private createAnimation(): BodyAnimation | HeadAnimation {
		if (this.mode === 'body') {
			return { name: 'new animation', loop: true, fps: 24, frames: [createDefaultBodyFrame()] };
		} else {
			return { name: 'new animation', loop: true, fps: 24, frames: [createDefaultHeadFrame()] };
		}
	}
	newAnimation() {
		const animation = this.createAnimation();
		const animations = this.animations as any[];
		animations.push(animation);
		this.selectAnimation(animation);
	}
	duplicateAnimation() {
		const animation = cloneDeep(this.animation);
		const animations = this.animations as any[];
		animation.name = animation.name.replace(/# builtin \d+ #/, '').trim() + ' (clone)';
		delete animation.builtin;
		animations.push(animation);
		this.selectAnimation(animation);
	}
	removeAnimation() {
		const animations = this.animations;

		if (animations.length && confirm('are you sure ?')) {
			removeItem(animations, this.animation);
			this.selectAnimation(animations[0]);
		}
	}
	selectAnimation(animation: BodyAnimation | HeadAnimation) {
		if (this.mode === 'body') {
			this.selectBodyAnimation(animation as BodyAnimation);
		} else {
			this.selectHeadAnimation(animation as HeadAnimation);
		}
	}
	selectBeforeAnimation(animation: BodyAnimation | undefined) {
		this.beforeAnimation = animation;
		this.update();
	}
	selectAfterAnimation(animation: BodyAnimation | undefined) {
		this.afterAnimation = animation;
		this.update();
	}
	selectFrame(index: number) {
		this.frame = index;
	}
	prevFrame() {
		this.frame = this.frame === 0 ? (this.frames.length - 1) : (this.frame - 1);
	}
	nextFrame() {
		this.frame = this.frame + 1;
	}
	addFrame() {
		const frames = this.frames as any[];
		const frame = this.mode === 'body' ? createDefaultBodyFrame() : createDefaultHeadFrame();
		frames.splice(this.frame + 1, 0, frame);
		this.update();
		this.frame++;
	}
	duplicateFrame() {
		const frames = this.frames as any[];
		frames.splice(this.frame + 1, 0, cloneDeep(frames[this.frame]));
		this.update();
		this.frame++;
	}
	removeFrame() {
		const frames = this.frames;

		if (frames.length && confirm('are you sure ?')) {
			frames.splice(this.frame, 1);
			this.update();
			this.frame = Math.min(this.frame, frames.length - 1);
		}
	}
	moveFrameLeft() {
		if (this.frame > 0) {
			swap(this.frames, this.frame, this.frame - 1);
			this.update();
			this.frame--;
		}
	}
	moveFrameRight() {
		const frames = this.frames;

		if (this.frame < (frames.length - 1)) {
			swap(frames, this.frame, this.frame + 1);
			this.update();
			this.frame++;
		}
	}
	isActive(index: number) {
		return this.frame === index;
	}
	get animations() {
		return this.mode === 'body' ? this.bodyAnimations : this.headAnimations;
	}
	get animation() {
		return this.mode === 'body' ? this.bodyAnimation : this.headAnimation;
	}
	get frames() {
		return this.animation.frames;
	}
	@HostListener('window:keydown', ['$event'])
	keydown(e: KeyboardEvent) {
		if (!isKeyEventInvalid(e) && this.handleKey(e.keyCode)) {
			e.preventDefault();
		}
	}
	moveAllHead(x: number, y: number) {
		(this.frames as HeadAnimationFrame[]).forEach(f => {
			f.headX += x;
			f.headY += y;
		});
		this.update();
	}
	moveAllBody(x: number, y: number) {
		(this.frames as BodyAnimationFrame[]).forEach(f => {
			f.bodyX += x;
			f.bodyY += y;
		});
		this.update();
	}
	handleKey(keyCode: number) {
		if (keyCode === Key.OPEN_BRACKET || keyCode === Key.LEFT || keyCode === Key.COMMA) {
			this.prevFrame();
		} else if (keyCode === Key.CLOSE_BRACKET || keyCode === Key.RIGHT || keyCode === Key.PERIOD) {
			this.nextFrame();
		} else if (keyCode === Key.ENTER) {
			this.playing = !this.playing;
		} else {
			return false;
		}

		return true;
	}
	share() {
		const wasOpened = this.shareLinkOpen;
		this.shareLink = undefined;
		this.shareLinkOpen = false;

		if (!wasOpened) {
			const animation = { type: this.mode, animation: this.animation };
			this.http.post<{ name: string; }>('/api-tools/animation', { animation })
				.subscribe(({ name }) => {
					this.shareLink = `${location.protocol}//${location.host}/tools/animation/${name}`;
					this.shareLinkOpen = true;
				});
		}
	}
	export() {
		if (this.mode === 'body') {
			const frames = this.bodyAnimation.frames
				.map(f => [f.duration, '[' + compressBodyFrame(f).join(', ') + ']'])
				.map(([repeat, frame]) => repeat > 1 ? `...repeat(${repeat}, ${frame})` : frame);
			console.log(`frames: [\n${frames.map(x => `\t${x}`).join(',\n')}\n]`);

			if (this.bodyAnimation.frames.some(f => !!f.shadowFrame || !!f.shadowOffset)) {
				const shadow = this.bodyAnimation.frames.map(f => [f.shadowFrame, f.shadowOffset]);
				console.log(`shadow: [${shadow.map(x => `[${x.join(', ')}]`).join(', ')}]`);
			}
		} else {
			const animation = toHeadAnimation(this.headAnimation, true);
			const compressed = animation.frames.map(compressHeadFrame);
			console.log(JSON.stringify(compressed));
		}
	}
	png(scale = 1) {
		const { canvas } = this.createAnimationSprites(scale);
		saveCanvas(canvas, `${this.animation.name}.png`);
	}
	gif(scale = 1) {
		const { canvas, empty } = this.createAnimationSprites(scale);
		const wnd = window.open('')!;
		const width = scale * ponyWidth;
		const height = scale * ponyHeight;
		const fps = this.animation.fps || 24;
		const image = canvas.toDataURL();

		this.http.post<{ name: string; }>('/api-tools/animation-gif', { image, width, height, fps, remove: empty })
			.subscribe(({ name }) => wnd.location.href = `/api-tools/animation/${name}.gif`);
	}
	sortAnimations() {
		this.bodyAnimations.sort(compareAnimations);
		this.headAnimations.sort(compareAnimations);
	}
	private update() {
		if (this.headAnimation && this.headAnimation.lockEyes) {
			this.headAnimation.frames.forEach(f => f.left = f.right);
		}

		if (this.bodyAnimation) {
			if (this.bodyAnimation.lockFrontLegs) {
				this.bodyAnimation.frames.forEach(f => {
					f.frontFarLeg = f.frontLeg;
					f.frontFarLegX = f.frontLegX;
					f.frontFarLegY = f.frontLegY;
				});
			}

			if (this.bodyAnimation.lockBackLegs) {
				this.bodyAnimation.frames.forEach(f => {
					f.backFarLeg = f.backLeg;
					f.backFarLegX = f.backLegX;
					f.backFarLegY = f.backLegY;
				});
			}
		}

		this.bodyAnimationsToPlay = compact([
			this.playing && this.beforeAnimation && { ...toBodyAnimation(this.beforeAnimation, true, false), loop: false },
			toBodyAnimation(this.bodyAnimation, this.playing, this.switch),
			this.playing && this.afterAnimation && { ...toBodyAnimation(this.afterAnimation, true, false), loop: true },
		]);

		this.bodyAnimationPlaying = 0;

		this.state.animation = this.bodyAnimationsToPlay[this.bodyAnimationPlaying];
		this.state.headAnimation = toHeadAnimation(this.headAnimation, this.playing);

		if (this.playing) {
			this.state.animationFrame = 0;
			this.state.headAnimationFrame = 0;
		}

		this.saveAnimations();
	}
	private bodyAnimationsToPlay: IBodyAnimation[] = [];
	private bodyAnimationPlaying = 0;
	private time = 0;
	private tick(delta: number) {
		if (this.playing) {
			this.time += delta;

			if (this.mode === 'body') {
				if (this.state.animation) {
					const frame = this.time * this.state.animation.fps;

					if (frame > this.state.animation.frames.length && !this.state.animation.loop) {
						this.bodyAnimationPlaying = (this.bodyAnimationPlaying + 1) % this.bodyAnimationsToPlay.length;
						this.state.animation = this.bodyAnimationsToPlay[this.bodyAnimationPlaying];
						this.state.animationFrame = 0;
						this.time = 0;
					} else {
						this.state.animationFrame = Math.floor(frame) % this.state.animation.frames.length;
					}
				}
			} else {
				if (this.state.headAnimation) {
					const frame = Math.floor(this.time * this.state.headAnimation.fps);
					this.state.headAnimationFrame = frame % this.state.headAnimation.frames.length;
				}
			}
		}
	}
	private saveAnimations() {
		this.storage.setJSON('tools-animations', <AnimationsData>{
			active: this.bodyAnimations.indexOf(this.bodyAnimation).toString(),
			animations: this.bodyAnimations.filter(a => !a.builtin),
			headActive: this.headAnimations.indexOf(this.headAnimation).toString(),
			headAnimations: this.headAnimations.filter(a => !a.builtin),
		});
	}
	private loadAnimations(): AnimationsData {
		return this.storage.getJSON<AnimationsData>('tools-animations', {});
	}
	private createAnimationSprites(scale: number) {
		const animation = toBodyAnimation(this.bodyAnimation, true, this.switch);
		const headAnimation = toHeadAnimation(this.headAnimation, true);
		const frames = this.mode === 'body' ? animation.frames.length : headAnimation.frames.length;
		const buffer = createCanvas(ponyWidth, ponyHeight);
		const batch = new ContextSpriteBatch(buffer);
		const info = toPalette(this.pony.info);
		const cols = Math.ceil(Math.sqrt(frames));
		const canvas = createCanvas(ponyWidth * cols * scale, ponyHeight * Math.ceil(frames / cols) * scale);
		const context = canvas.getContext('2d')!;
		const empty = (cols * Math.ceil(frames / cols)) - frames;
		const options = defaultDrawPonyOptions();
		disableImageSmoothing(context);
		context.scale(scale, scale);

		for (let i = 0; i < frames; i++) {
			const x = i % cols;
			const y = Math.floor(i / cols);

			batch.start(sprites.paletteSpriteSheet, 0);

			drawPony(batch, info, {
				...defaultPonyState(),
				animation,
				animationFrame: this.mode === 'body' ? i : 0,
				headAnimation: this.mode === 'head' ? headAnimation : undefined,
				headAnimationFrame: this.mode === 'head' ? i : 0,
				blinkFrame: 1,
			}, ponyWidth / 2, ponyHeight - 10, options);

			batch.end();
			context.drawImage(buffer, x * ponyWidth, y * ponyHeight);
		}

		return { canvas, empty };
	}
}

// helper methods

function compareAnimations<T extends { name: string; }>(a: T, b: T): number {
	return a.name.localeCompare(b.name);
}

function swap(array: any[], a: number, b: number) {
	const temp = array[a];
	array[a] = array[b];
	array[b] = temp;
}

function fromBodyAnimation({ name, frames, fps, loop, shadow }: IBodyAnimation, index: number): BodyAnimation {
	const fs: BodyAnimationFrame[] = [];

	frames.forEach((f, i) => {
		const l = fs[fs.length - 1];
		const s = shadow && shadow[i];

		if (
			l && l.headX === f.headX && l.headY === f.headY && l.bodyX === f.bodyX && l.bodyY === f.bodyY
			&& l.body === f.body && l.frontLeg === f.frontLeg && l.backLeg === f.backLeg
			&& l.frontFarLeg === f.frontFarLeg && l.backFarLeg === f.backFarLeg
			&& l.frontLegX === f.frontLegX && l.frontLegY === f.frontLegY
			&& l.frontFarLegX === f.frontFarLegX && l.frontFarLegY === f.frontFarLegY
			&& l.backLegX === f.backLegX && l.backLegY === f.backLegY
			&& l.backFarLegX === f.backFarLegX && l.backFarLegY === f.backFarLegY
			&& l.wing === f.wing
		) {
			l.duration++;
		} else {
			fs.push({
				duration: 1,
				...f,
				shadowOffset: s && s.offset || 0,
				shadowFrame: s && s.frame || 0
			});
		}
	});

	return {
		builtin: true,
		loop,
		fps,
		name: `# ${index.toString().padStart(2, '0')}-${name}`,
		frames: fs,
	};
}

function toBodyAnimation({ name, loop, fps, frames }: BodyAnimation, full: boolean, switchFarClose: boolean): IBodyAnimation {
	let shadow: BodyShadow[] | undefined = undefined;

	if (frames.some(f => !!f.shadowFrame || !!f.shadowOffset)) {
		shadow = flatMap(frames, f => repeat(full ? f.duration : 1, { frame: f.shadowFrame, offset: f.shadowOffset }));
	}

	return {
		name,
		loop,
		fps,
		shadow,
		frames: flatMap(frames, f => repeat(full ? f.duration : 1, {
			body: f.body,
			head: f.head,
			wing: f.wing,
			tail: f.tail,
			frontLeg: switchFarClose ? f.frontFarLeg : f.frontLeg,
			frontFarLeg: switchFarClose ? f.frontLeg : f.frontFarLeg,
			backLeg: switchFarClose ? f.backFarLeg : f.backLeg,
			backFarLeg: switchFarClose ? f.backLeg : f.backFarLeg,
			bodyX: f.bodyX,
			bodyY: f.bodyY,
			headX: f.headX,
			headY: f.headY,
			frontLegX: switchFarClose ? f.frontFarLegX : f.frontLegX,
			frontLegY: switchFarClose ? f.frontFarLegY : f.frontLegY,
			frontFarLegX: switchFarClose ? f.frontLegX : f.frontFarLegX,
			frontFarLegY: switchFarClose ? f.frontLegY : f.frontFarLegY,
			backLegX: switchFarClose ? f.backFarLegX : f.backLegX,
			backLegY: switchFarClose ? f.backFarLegY : f.backLegY,
			backFarLegX: switchFarClose ? f.backLegX : f.backFarLegX,
			backFarLegY: switchFarClose ? f.backLegY : f.backFarLegY,
		})),
	};
}

function compressBodyFrame(f: BodyAnimationFrame): number[] {
	return dropRightWhile([
		f.body, f.head, f.wing, f.tail, f.frontLeg, f.frontFarLeg, f.backLeg, f.backFarLeg,
		f.bodyX, f.bodyY, f.headX, f.headY,
		f.frontLegX, f.frontLegY, f.frontFarLegX, f.frontFarLegY,
		f.backLegX, f.backLegY, f.backFarLegX, f.backFarLegY,
	], x => !x);
}

function fromHeadAnimation({ name, fps, loop, frames }: IHeadAnimation, index: number): HeadAnimation {
	const fs: HeadAnimationFrame[] = [];

	frames.forEach(f => {
		const l = fs[fs.length - 1];

		if (l && l.headX === f.headX && l.headY === f.headY && l.left === f.left && l.right === f.right && l.mouth === f.mouth) {
			l.duration++;
		} else {
			fs.push({ duration: 1, ...f });
		}
	});

	return {
		builtin: true,
		fps,
		loop,
		name: `# builtin ${index.toString().padStart(2, '0')} # ${name}`,
		frames: fs,
	};
}

function toHeadAnimation({ name, frames, fps, loop }: HeadAnimation, full: boolean): IHeadAnimation {
	const fs = (full && !loop) ? repeat(fps, createDefaultHeadFrame()).concat(frames) : frames;

	return {
		name,
		fps,
		loop,
		frames: flatMap(fs, f => repeat(full ? f.duration : 1, f)),
	};
}

function compressHeadFrame({ headX, headY, left, right, mouth }: IHeadAnimationFrame) {
	return [headX, headY, left, right, mouth];
}

function createDefaultBodyFrame(): BodyAnimationFrame {
	return { duration: 1, ...createBodyFrame([1, 1, 0, 0, 1, 1, 1, 1]), shadowFrame: 0, shadowOffset: 0 };
}

function createDefaultHeadFrame(): HeadAnimationFrame {
	return { duration: 1, ...createHeadFrame([0, 0, 1, 1, 0]) };
}

// fixing helpers

function fixBodyAnimation(a: BodyAnimation): BodyAnimation {
	return {
		name: a.name || '',
		fps: a.fps || 24,
		loop: a.loop || false,
		lockFrontLegs: a.lockFrontLegs || false,
		lockBackLegs: a.lockBackLegs || false,
		frames: (a.frames || []).map(fixBodyFrame),
	};
}

function fixBodyFrame(f: BodyAnimationFrame): BodyAnimationFrame {
	return {
		duration: f.duration || 1,
		body: f.body || 0,
		head: f.head || 0,
		wing: f.wing || 0,
		tail: f.tail || 0,
		frontLeg: f.frontLeg || 0,
		frontFarLeg: f.frontFarLeg || 0,
		backLeg: f.backLeg || 0,
		backFarLeg: f.backFarLeg || 0,
		bodyX: f.bodyX || 0,
		bodyY: f.bodyY || 0,
		headX: f.headX || 0,
		headY: f.headY || 0,
		frontLegX: f.frontLegX || 0,
		frontLegY: f.frontLegY || 0,
		frontFarLegX: f.frontFarLegX || 0,
		frontFarLegY: f.frontFarLegY || 0,
		backLegX: f.backLegX || 0,
		backLegY: f.backLegY || 0,
		backFarLegX: f.backFarLegX || 0,
		backFarLegY: f.backFarLegY || 0,
		shadowFrame: f.shadowFrame || 0,
		shadowOffset: f.shadowOffset || 0,
	};
}

function fixHeadAnimation(a: HeadAnimation): HeadAnimation {
	return {
		name: a.name || '',
		fps: a.fps || 24,
		loop: a.loop || false,
		lockEyes: a.lockEyes || false,
		frames: (a.frames || []).map(fixHeadFrame),
	};
}

function fixHeadFrame(f: HeadAnimationFrame): HeadAnimationFrame {
	return {
		duration: f.duration || 1,
		headX: f.headX || 0,
		headY: f.headY || 0,
		left: f.left || 0,
		right: f.right || 0,
		mouth: f.mouth || 0,
	};
}
