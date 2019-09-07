import {
	PonyEye, PonyState, PalettePonyInfo, PaletteSpriteSet, Palette, HeadAnimationFrame,
	Eye, Iris, ColorExtraSets, ExpressionExtra, BodyAnimationFrame, DrawPonyOptions, Muzzle, BodyShadow, DrawOptions,
	NoDraw, PaletteSpriteBatch, defaultDrawOptions, PonyStateFlags, PaletteManager, isEyeSleeping, Matrix2D,
} from '../common/interfaces';
import { WHITE, SHINES_COLOR, FAR_COLOR, TRANSPARENT, fillToOutlineColor } from '../common/colors';
import { toInt, hasFlag, repeat, flatten, point } from '../common/utils';
import * as sprites from '../generated/sprites';
import * as offsets from '../common/offsets';
import { defaultHeadAnimation, defaultBodyFrame, defaultHeadFrame } from './ponyAnimations';
import { toWorldX, toWorldY } from '../common/positionUtils';
import {
	frontHooves, PONY_WIDTH, PONY_HEIGHT, wings, chestBehind, tails, chest, neckAccessories, waistAccessories,
	SLEEVED_ACCESSORIES, blinkFrames, flipIris, claws, Sets, backAccessories, SLEEVED_BACK_ACCESSORIES,
	CHEST_ACCESSORIES_IN_FRONT, flipFaceAccessoryType, flipFaceAccessoryPattern, backLegSleeves,
	NO_MANE_HEAD_ACCESSORIES, backHoovesInFront, frontHoovesInFront
} from './ponyUtils';
import { HEAD_ACCESSORY_OFFSETS, EAR_ACCESSORY_OFFSETS, EXTRA_ACCESSORY_OFFSETS } from '../common/offsets';
import { createMat2D, identityMat2D, translateMat2D, copyMat2D, rotateMat2D, scaleMat2D } from '../common/mat2d';
import { darkenForOutline } from '../common/ponyInfo';

type Batch = PaletteSpriteBatch;
type Info = Readonly<PalettePonyInfo>;
type State = Readonly<PonyState>;
type Options = Readonly<DrawPonyOptions>;

const holdingDrawOptions: DrawOptions = {
	...defaultDrawOptions,
	shadowColor: TRANSPARENT,
};

function checker(parts: number[]) {
	const set = new Set(parts);
	return (part: number) => set.has(part);
}

function partChecker(parts: number[]) {
	const check = checker(parts);
	return (set: PaletteSpriteSet | undefined) => set !== undefined && !!set.type && check(set.type);
}

const SHADOW_OX = 20;
const SHADOW_OY = 64;
const FAR_OX = -3;
const FAR_OY = -1;
const FAR_WING_OX = -4;
const FAR_WING_OY = 0;

const hasNoMane = checker(NO_MANE_HEAD_ACCESSORIES);
const behindBackAccessory = partChecker([1]);
const sleevedAccessory = partChecker(SLEEVED_ACCESSORIES);
const sleevedBackAccessory = partChecker(SLEEVED_BACK_ACCESSORIES);
const chestAccessoryInFront = partChecker(CHEST_ACCESSORIES_IN_FRONT);

const pointZero = point(0, 0);

const headFlipOffsetX = 35.5;
const headFlipOffsetY = 42;

const headTransform = createMat2D();

function clamp(value: number, min: number, max: number): number {
	return value > min ? (value < max ? value : max) : min;
}

function at<T>(items: T[], index: any): T | undefined {
	// if (DEVELOPMENT) {
	// 	if (items.length === 0) {
	// 		console.warn(`Empty array at: ${getStackLocation(2)} / ${getStackLocation(3)}`);
	// 	} else if (index < 0 || index >= items.length) {
	// 		console.warn(`Index out of range ${index} of 0..${items.length} at: ${getStackLocation(2)} / ${getStackLocation(3)}`);
	// 	}
	// }

	return items[clamp(index | 0, 0, items.length - 1)];
}

function att<T>(items: T[] | undefined, index: any): T | undefined {
	return items && items[clamp(index | 0, 0, items.length - 1)];
}

function atDef<T>(items: T[] | undefined, index: number, def: T): T {
	return (items && items.length > 0 && index >= 0 && index < items.length) ? items[index | 0] : def;
}

export function getPonyAnimationFrame<T>({ frames }: { frames: T[] }, frame: number, defaultFrame: T): T {
	return frames.length > 0 ? frames[Math.max(0, frame) % frames.length] : defaultFrame;
}

function getHeadXY(x: number, y: number, turned: boolean, frame: BodyAnimationFrame, headFrame: HeadAnimationFrame) {
	const headOffset = at(offsets.headOffsets, frame.body)!;
	const headX = x + frame.headX + (headFrame.headX * (turned ? -1 : 1)) + headOffset.x;
	const headY = y + frame.headY + headFrame.headY + headOffset.y;
	return { headX, headY };
}

export function getPonyHeadPosition(state: State, ponyX: number, ponyY: number) {
	const frame = getPonyAnimationFrame(state.animation, state.animationFrame, defaultBodyFrame);
	const headFrame = getPonyAnimationFrame(state.headAnimation || defaultHeadAnimation, state.headAnimationFrame, defaultHeadFrame);
	const baseX = ponyX - PONY_WIDTH / 2;
	const baseY = ponyY - PONY_HEIGHT;
	const x = baseX + frame.bodyX;
	const y = baseY + frame.bodyY;
	const { headX, headY } = getHeadXY(x, y, state.headTurned, frame, headFrame);
	return { x: headX, y: headY };
}

export function createHeadTransform(
	originalTransform: Matrix2D | undefined, headX: number, headY: number, { headTilt, headTurned }: State
) {
	if (originalTransform !== undefined) {
		copyMat2D(headTransform, originalTransform);
	} else {
		identityMat2D(headTransform);
	}

	translateMat2D(headTransform, headTransform, headX + headFlipOffsetX, headY + headFlipOffsetY);

	if (headTilt) {
		rotateMat2D(headTransform, headTransform, headTilt * 0.1);
	}

	scaleMat2D(headTransform, headTransform, headTurned ? -1 : 1, 1);
	translateMat2D(headTransform, headTransform, -headFlipOffsetX, -headFlipOffsetY);
	return headTransform;
}

export function getHeadY(frame: BodyAnimationFrame, headFrame: HeadAnimationFrame): number {
	const headOffset = offsets.headOffsets[frame.body];
	return frame.bodyY + frame.headY + headFrame.headY + headOffset.y;
}

const defaultShadow: BodyShadow = { frame: 0, offset: 0 };
const hairOffsets = [
	0, 0, 0, 0,
	-1, -1, 0, 0,
	0, 0, 0, -1,
	-1, 0, 0, 0,
	0, 0, 0, 0,
	...repeat(100, 0),
];

function draw(options: Options, flag: NoDraw) {
	if (TOOLS) {
		return !hasFlag(options.no, flag);
	} else {
		return true;
	}
}

const headOffsetsX = [0, 1, 1, 1, 1, 1, 0];
const headOffsetsY = [0, 0, 1, 1, 0, 0, 0];

let toys: (PaletteSpriteSet | undefined)[] = [];

export function initializeToys(paletteManager: PaletteManager) {
	function set(type: number, pattern: number, colors: number[]): PaletteSpriteSet {
		const palette = [
			TRANSPARENT,
			...flatten(colors.map(color => [color, darkenForOutline(fillToOutlineColor(color))]))
		];

		return { type, pattern, palette: paletteManager.add(palette) };
	}

	toys = [
		undefined,
		// hat
		set(2, 0, [0xffffffff, 0xff2525ff]),
		set(2, 0, [0xffffffff, 0x22ac22ff]),
		set(2, 0, [0xffffffff, 0x2e58f4ff]),
		set(2, 0, [0xffffffff, 0xff71ffff]),
		// snowpony
		set(3, 0, [0xffffffff, 0x000000ff, 0xff9100ff, 0xff0000ff]),
		set(4, 0, [0xffffffff, 0x000000ff, 0xff9100ff, 0xff0000ff]),
		set(4, 0, [0x404040ff, 0xff0000ff, 0x000000ff, 0xff0000ff]),
		// gift
		set(6, 0, [0xcf1717ff, 0xecd132ff]),
		set(6, 0, [0xdfc588ff, 0xe7559bff]),
		set(6, 0, [0x7fc484ff, 0x4a79daff]),
		set(6, 0, [0xd56a69ff, 0x62ab64ff]),
		set(6, 0, [0xe586dfff, 0x9553c1ff]),
		// hanging thing
		set(5, 0, [0x91622fff, 0xc02455ff, 0x429a51ff, 0xb9c0d8ff, 0xffd94fff, 0xeca242ff]), // bell
		set(7, 0, [0x91622fff, 0xc02455ff, 0x429a51ff, 0xb9c0d8ff, 0xc0ccc4ff]), // mistletoe
		set(17, 0, [0x91622fff, 0xc02455ff, 0x429a51ff, 0x000000ff, 0xe7b86fff, 0x3f1d0fff]), // cookie
		set(10, 0, [0x91622fff, 0xc02455ff, 0x429a51ff, 0x000000ff]), // spider
		// teddy
		set(8, 0, [0xa86230ff, 0xdfbe8bff, TRANSPARENT, TRANSPARENT]), // brown
		set(8, 0, [0xa86230ff, 0xdfbe8bff, 0xffa500ff, 0xffffffff]), // brown angel
		set(8, 0, [0x474444ff, 0x96623eff, TRANSPARENT, TRANSPARENT]), // black
		set(8, 0, [0x474444ff, 0x96623eff, 0xffa500ff, 0xffffffff]), // black angel
		set(9, 1, [0xa86230ff, 0xdfbe8bff, 0xff0000ff, TRANSPARENT, 0xf5f5f5ff]), // brown clothes
		set(9, 1, [0x474444ff, 0x96623eff, 0xff0000ff, TRANSPARENT, 0xf5f5f5ff]), // black clothes
		set(9, 0, [0xdce5edff, 0xffffffff, 0xff0000ff, 0xdfbe8bff, 0x645137ff]), // white santa
		// xmas tree
		set(11, 0, [0x1a9b2fff, 0x56c7ffff, 0xde4d68ff, 0xf1d224ff]),
		set(11, 1, [0x1a9b2fff, 0xf1d224ff, 0x1a9b2fff, 0xde4d68ff]),
		// deer
		set(12, 0, [0x7b4b24ff, 0xcf0e0eff, 0xbfaa8cff]),
		set(16, 0, [0x7b4b24ff, 0xcf0e0eff, 0xbfaa8cff, 0xffffffff, 0x56c7ffff, 0xf1d224ff]),
		// candy horns
		set(13, 0, [0xffffffff, 0xff1b1bff, TRANSPARENT, TRANSPARENT]), // one
		set(13, 0, [0xffffffff, 0xff1b1bff, 0xffffffff, 0xff1b1bff]), // two
		set(13, 0, [0x58df6aff, 0xffffffff, 0x3387e9ff, 0xffffffff]), // two (alt)
		// star
		set(14, 0, [0xffd94fff, 0xeca242ff]),
		// halo
		set(15, 0, [0xffd94fff, 0xeca242ff]),
	];

	if (DEVELOPMENT && toys.length > 33) {
		console.error('too many toys', toys.length);
	}
}

const zeroPoint = point(0, 0);
const wakes = [
	{ ox: 21, oy: 60, behind: sprites.pony_wake_4, front: sprites.pony_wake_3 },
	{ ox: 24, oy: 60, behind: sprites.pony_wake_6, front: sprites.pony_wake_5 },
	{ ox: 18, oy: 51, behind: sprites.pony_wake_2, front: sprites.pony_wake_1 },
];

const wakeIndices = [0, 2, 1, 0, 2, 2, 2, 0, 2, 2, 2, 1, 2, 2, 2, 1, 1, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 2, 2, 2, 1];

function getWakeIndex(info: Info) {
	const tail = info.tail && info.tail.type || 0;
	return wakeIndices[tail];
}

export function drawPony(batch: Batch, info: Info, state: State, ponyX: number, ponyY: number, options: Options) {
	const frame = getPonyAnimationFrame(state.animation, state.animationFrame, defaultBodyFrame);
	const headFrame = getPonyAnimationFrame(state.headAnimation || defaultHeadAnimation, state.headAnimationFrame, defaultHeadFrame);
	const baseX = ponyX - PONY_WIDTH / 2;
	const baseY = ponyY - PONY_HEIGHT;
	const x = baseX + frame.bodyX;
	const y = baseY + frame.bodyY;
	const body = frame.body;
	const { headX, headY } = getHeadXY(x, y, state.headTurned, frame, headFrame);
	const frontLegOffset = at(offsets.frontLegOffsets, body)!;
	const backLegOffset = at(offsets.backLegOffsets, body)!;
	const wingOffset = at(offsets.wingOffsets, body)!;
	const chestOffset = at(offsets.chestAccessoryOffsets, body)!;
	const chestX = x + chestOffset.x;
	const chestY = y + chestOffset.y;
	const shadow = atDef(state.animation.shadow, state.animationFrame, defaultShadow);
	const backOffset = at(offsets.backAccessoryOffsets, body)!;
	const wing = at(wings, frame.wing);
	const flipped = options.flipped;

	const headOffset = clamp(state.headTurn, 0, headOffsetsX.length - 1);
	const headOffsetX = headOffsetsX[headOffset];
	const headOffsetY = headOffsetsY[headOffset];

	const headTotalY = headY + headOffsetY;
	const headTransform = createHeadTransform(undefined, headX + headOffsetX, headTotalY, state);
	const headCropY = 42 - ((headTotalY + headFlipOffsetY) - baseY);
	const cropW = 80;
	const cropH = 65;

	const shadowX = baseX + shadow.offset + SHADOW_OX;
	const shadowY = baseY + SHADOW_OY;

	const wake = wakes[getWakeIndex(info)];
	const wakeX = baseX + wake.ox;
	const wakeY = baseY + wake.oy;
	const wakeFrame = Math.floor(options.gameTime * 7 / 1000) % wake.behind.frames.length;
	const swimming = options.swimming;

	if (swimming) {
		batch.drawSprite(wake.behind.frames[wakeFrame], WHITE, info.waterPalette, wakeX, wakeY);
		batch.crop(-40, -70, cropW, cropH);
	}

	// selection
	if (options.selected) {
		const sprite = at(sprites.ponySelections, shadow.frame);
		sprite && batch.drawSprite(sprite, WHITE, info.defaultPalette, shadowX, shadowY);
	}

	// shadow
	if (options.shadow) {
		const sprite = at(sprites.ponyShadows, shadow.frame);
		sprite && batch.drawSprite(sprite, options.shadowColor, info.defaultPalette, shadowX, shadowY);
	}

	// head accessory
	const bounce = BETA && options.bounce;
	const maneOffsetY = bounce ? hairOffsets[state.animationFrame] : 0;
	const maneBehindOffsetY = bounce ? hairOffsets[state.animationFrame] : 0;
	const hatOffsetY = maneBehindOffsetY;
	let hatOffset = at(HEAD_ACCESSORY_OFFSETS, info.mane ? info.mane.type : 0)!;
	const noMane = !info.mane || hasNoMane(info.mane.type);

	if (info.headAccessory !== undefined && info.headAccessory.type === 20) {
		hatOffset = zeroPoint;
	}

	if (draw(options, NoDraw.Behind)) {
		// far wing
		drawSet(batch, wing, info.wings, x + FAR_WING_OX + wingOffset.x, y + FAR_WING_OY + wingOffset.y, FAR_COLOR);

		batch.save();
		batch.multiplyTransform(headTransform);

		if (swimming) {
			// batch.drawRect(0xffff0066, 0, headCropY, cropW, cropH);
			batch.crop(0, headCropY, cropW, cropH);
		}

		if (noMane) {
			drawSet(batch, sprites.headAccessoriesBehind, info.headAccessory, hatOffset.x, hatOffset.y + hatOffsetY, WHITE);
		}

		if (draw(options, NoDraw.FarEar)) {
			drawSet(batch, sprites.earAccessoriesBehind, info.earAccessory, 0, 0, WHITE);
		}
	}

	if (draw(options, NoDraw.Body) && draw(options, NoDraw.FarEar)) {
		drawSet(batch, sprites.earsFar, info.ears, 0, 0, draw(options, NoDraw.FarEarShade) ? FAR_COLOR : WHITE);
	}

	if (draw(options, NoDraw.Behind)) {
		drawSet(batch, sprites.hornsBehind, info.horn, 0, 0, WHITE);

		if (!noMane) {
			drawSet(batch, sprites.headAccessoriesBehind, info.headAccessory, hatOffset.x, hatOffset.y + hatOffsetY, WHITE);
		}

		drawSet(batch, sprites.backBehindManes, info.backMane, 0, maneBehindOffsetY, WHITE);

		if (!state.headTurned) {
			drawSet(batch, sprites.behindManes, info.mane, 0, maneBehindOffsetY, WHITE);
		}

		batch.restore();

		// chest accessory behind
		drawSet(batch, chestBehind[body], info.chestAccessory, chestX, chestY, WHITE);
	}

	// legs
	const behindX = x + FAR_OX;
	const behindY = y + FAR_OY;
	const hasTailAccessory = behindBackAccessory(info.backAccessory);
	const hasSleeves = sleevedAccessory(info.chestAccessory);
	const hasBackSleeves = sleevedBackAccessory(info.backAccessory);

	const frontBehindX = behindX + frontLegOffset.x + frame.frontFarLegX;
	const frontBehindY = behindY + frontLegOffset.y + frame.frontFarLegY;
	const backBehindX = behindX + backLegOffset.x + frame.backFarLegX;
	const backBehindY = behindY + backLegOffset.y + frame.backFarLegY;

	// far leg back
	if (draw(options, NoDraw.BackFarLeg)) {
		drawLeg(batch, backBehindX, backBehindY, frame.backFarLeg, sprites.backLegs,
			sprites.backLegHooves, sprites.backLegAccessories, info.backLegs,
			flipped ? info.backLegAccessory : info.backLegAccessoryRight, info.backHooves, backHoovesInFront, FAR_COLOR,
			undefined, false, 0, 0);
	}

	// far leg front
	if (draw(options, NoDraw.FrontFarLeg)) {
		drawLeg(batch, frontBehindX, frontBehindY, frame.frontFarLeg, sprites.frontLegs,
			frontHooves, sprites.frontLegAccessories, info.frontLegs,
			flipped ? info.frontLegAccessory : info.frontLegAccessoryRight, info.frontHooves, frontHoovesInFront, FAR_COLOR,
			undefined, false, 0, 0);
	}

	// far leg back sleeve
	if (draw(options, NoDraw.FarSleeves) && hasBackSleeves) {
		drawSet(batch, at(sprites.backLegSleeves, frame.backFarLeg), info.backAccessory, backBehindX, backBehindY, FAR_COLOR);
	}

	// far leg front sleeve
	if (draw(options, NoDraw.FarSleeves) && hasSleeves) {
		drawSet(batch, at(sprites.frontLegSleeves, frame.frontFarLeg), info.sleeveAccessory, frontBehindX, frontBehindY, FAR_COLOR);
	}

	// tail
	const tailOffset = at(offsets.tailOffsets, body)!;
	const tailX = x + tailOffset.x;
	const tailY = y + tailOffset.y;
	const failFrame = hasFlag(state.flags, PonyStateFlags.CurlTail) ? 1 : frame.tail;

	drawSet(batch, at(tails, failFrame), info.tail, tailX, tailY, WHITE);

	// tail accessory
	if (draw(options, NoDraw.BackAccessory) && hasTailAccessory) {
		drawSet(batch, backAccessories[body], info.backAccessory, x + backOffset.x, y + backOffset.y, WHITE);
	}

	// body
	if (draw(options, NoDraw.Body) && draw(options, NoDraw.BodyOnly)) {
		drawSet(batch, sprites.body[body], info.body, x, y, WHITE);
	}

	// neck accessory
	const frontNeckAccessory = true; // hasPart(info.neckAccessory, FRONT_NECK_ACCESSORIES);

	// if (!frontNeckAccessory) {
	// 	drawSpriteSet(context, neckAccessories[frame.body], info.neckAccessory, x, y);
	// }

	const frontX = x + frontLegOffset.x + frame.frontLegX;
	const frontY = y + frontLegOffset.y + frame.frontLegY;
	const backX = x + backLegOffset.x + frame.backLegX;
	const backY = y + backLegOffset.y + frame.backLegY;
	const cmOffset = at(offsets.cmOffsets, body)!;
	const hooves = (TOOLS && options.useAllHooves) ? sprites.frontLegHooves : frontHooves;

	// close legs back
	if (draw(options, NoDraw.BackLeg)) {
		drawLeg(
			batch, backX, backY, frame.backLeg, sprites.backLegs, sprites.backLegHooves, sprites.backLegAccessories,
			info.backLegs, flipped ? info.backLegAccessoryRight : info.backLegAccessory, info.backHooves, backHoovesInFront, WHITE,
			info.cmPalette, flipped && !!info.cmFlip, x + cmOffset.x, y + cmOffset.y);
	}

	// back accessory
	if (draw(options, NoDraw.BackAccessory) && !hasTailAccessory) {
		drawSet(batch, backAccessories[body], info.backAccessory, x + backOffset.x, y + backOffset.y, WHITE);
	}

	// close leg back sleeves
	if (draw(options, NoDraw.CloseSleeves) && hasBackSleeves) {
		drawSet(batch, at(backLegSleeves, frame.backLeg), info.backAccessory, backX, backY, WHITE);
	}

	const isChestAccessoryInFront = chestAccessoryInFront(info.chestAccessory);

	// chest accessory
	if (!isChestAccessoryInFront && draw(options, NoDraw.Front)) {
		drawSet(batch, chest[body], info.chestAccessory, chestX, chestY, WHITE);
	}

	// close legs front
	if (draw(options, NoDraw.FrontLeg)) {
		drawLeg(
			batch, frontX, frontY, frame.frontLeg, sprites.frontLegs, hooves, sprites.frontLegAccessories,
			info.frontLegs, flipped ? info.frontLegAccessoryRight : info.frontLegAccessory, info.frontHooves, frontHoovesInFront, WHITE,
			undefined, false, 0, 0);
	}

	// close legs front sleeves
	if (draw(options, NoDraw.CloseSleeves) && hasSleeves) {
		drawSet(batch, at(sprites.frontLegSleeves, frame.frontLeg), info.sleeveAccessory, frontX, frontY, WHITE);
	}

	// chest accessory
	if (isChestAccessoryInFront && draw(options, NoDraw.Front)) {
		drawSet(batch, chest[body], info.chestAccessory, chestX, chestY, WHITE);
	}

	// close legs back (2)
	if (draw(options, NoDraw.BackLeg)) {
		drawLeg(
			batch, backX, backY, frame.backLeg, sprites.backLegs2, sprites.backLegHooves2, sprites.backLegAccessories2,
			info.backLegs, flipped ? info.backLegAccessoryRight : info.backLegAccessory, info.backHooves, backHoovesInFront, WHITE,
			undefined, false, 0, 0);
	}

	// close legs back sleeves (2)
	if (draw(options, NoDraw.CloseSleeves) && hasBackSleeves) {
		drawSet(batch, at(sprites.backLegSleeves2, frame.backLeg), info.backAccessory, backX, backY, WHITE);
	}

	// neck accessory
	if (frontNeckAccessory) {
		const neckOffset = at(offsets.neckAccessoryOffsets, body)!;
		drawSet(batch, neckAccessories[body], info.neckAccessory, x + neckOffset.x, y + neckOffset.y, WHITE);
	}

	// waist accessory
	const waistFrame = frame.wing > 2 ? 16 : body;
	const waistOffset = at(offsets.waistAccessoryOffsets, waistFrame)!;
	drawSet(batch, waistAccessories[waistFrame], info.waistAccessory, x + waistOffset.x, y + waistOffset.y, WHITE);

	// wings
	drawSet(batch, wing, info.wings, x + wingOffset.x, y + wingOffset.y, WHITE);

	// head
	const headTurned = state.headTurned;
	const headFlip = headTurned ? !flipped : flipped;
	const headSprite = headFlip ? sprites.head0[frame.head] : sprites.head1[frame.head];

	if (swimming) {
		batch.clearCrop();
	}

	batch.save();
	batch.multiplyTransform(headTransform);

	if (swimming) {
		batch.crop(0, headCropY, cropW, cropH);
	}

	if (headTurned) {
		drawSet(batch, sprites.behindManes, info.mane, 0, maneBehindOffsetY, WHITE);
	}

	drawHead(batch, info, 0, 0, headSprite, headFrame, state, options, headFlip, maneOffsetY);
	drawSet(batch, sprites.headAccessories, info.headAccessory, hatOffset.x, hatOffset.y + hatOffsetY, WHITE);

	batch.restore();

	if (swimming) {
		batch.drawSprite(wake.front.frames[wakeFrame], WHITE, info.waterPalette, wakeX, wakeY);
	}
}

export function drawHead(
	batch: Batch, info: Info, x: number, y: number, headSprites: ColorExtraSets, headFrame: HeadAnimationFrame,
	{ blinkFrame, expression, holding, blushColor, drawFaceExtra }: State,
	options: Options, flip: boolean, maneOffsetY: number,
) {
	const extraOffset = at(EXTRA_ACCESSORY_OFFSETS, info.mane && info.mane.type) || pointZero;
	const extraX = x + extraOffset.x;
	const extraY = y + extraOffset.y;
	const toy = att(toys, options.toy);

	if (toy !== undefined) {
		drawSet(batch, sprites.extraAccessoriesBehind, toy, extraX, extraY, WHITE);
	} else if (options.extra && draw(options, NoDraw.Behind)) {
		drawSet(batch, sprites.extraAccessoriesBehind, info.extraAccessory, extraX, extraY, WHITE);
	}

	if (draw(options, NoDraw.Body)) {
		if (draw(options, NoDraw.Head)) {
			drawSet(batch, headSprites, info.head, x, y, WHITE);
		}

		let eyeLeftBase = -1;
		let eyeRightBase = -1;
		let irisLeft = Iris.Forward;
		let irisRight = Iris.Forward;

		if (expression !== undefined) {
			if (hasFlag(expression.extra, ExpressionExtra.Blush)) {
				batch.drawSprite(sprites.blush, blushColor, info.defaultPalette, x, y);
			}

			eyeLeftBase = expression.left;
			eyeRightBase = expression.right;
			irisLeft = expression.leftIris;
			irisRight = expression.rightIris;

			// make sure eyes are closed if sleeping
			if (hasFlag(expression.extra, ExpressionExtra.Zzz)) {
				if (!isEyeSleeping(eyeLeftBase)) {
					eyeLeftBase = Eye.Closed;
				}

				if (!isEyeSleeping(eyeRightBase)) {
					eyeRightBase = Eye.Closed;
				}
			}
		}

		const eyeRight = getEyeFrame(info.eyeOpennessRight || 1, eyeRightBase, headFrame.right, blinkFrame);
		const eyeLeft = getEyeFrame(info.eyeOpennessLeft || 1, eyeLeftBase, headFrame.left, blinkFrame);
		const eyeFrameLeft = flip ? eyeRight : eyeLeft;
		const eyeFrameRight = flip ? eyeLeft : eyeRight;
		const eyeColorLeft = flip ? info.eyeColorRight : info.eyeColorLeft;
		const eyeColorRight = flip ? info.eyeColorLeft : info.eyeColorRight;
		const eyePaletteLeft = flip ? info.eyePalette : info.eyePaletteLeft;
		const eyePaletteRight = flip ? info.eyePaletteLeft : info.eyePalette;
		const eyeIrisLeft = flip ? flipIris(irisRight) : irisLeft;
		const eyeIrisRight = flip ? flipIris(irisLeft) : irisRight;
		const eyeLeftSprites = sprites.eyeLeft;
		const eyeRightSprites = sprites.eyeRight;

		if (draw(options, NoDraw.Eyes)) {
			drawEye(
				batch, att(at(eyeLeftSprites, eyeFrameLeft), info.eyelashes),
				eyeIrisLeft, info, eyeColorLeft, eyePaletteLeft, x, y);
			drawEye(
				batch, att(at(eyeRightSprites, eyeFrameRight), info.eyelashes),
				eyeIrisRight, info, eyeColorRight, eyePaletteRight, x, y);
		}
	}

	if (draw(options, NoDraw.Front)) {
		drawSet(batch, sprites.facialHairBehind, info.facialHair, x, y, WHITE);
	}

	if (drawFaceExtra !== undefined) {
		drawFaceExtra(batch);
	}

	const faceAccessory = info.faceAccessory;
	let faceAccessoryType = 0;
	let faceAccessoryPattern = 0;

	if (faceAccessory !== undefined) {
		faceAccessoryType = flip ? flipFaceAccessoryType(faceAccessory.type) : faceAccessory.type;
		faceAccessoryPattern = flip ? flipFaceAccessoryPattern(faceAccessoryType, faceAccessory.pattern) : faceAccessory.pattern;

		if (draw(options, NoDraw.FaceAccessory1)) {
			drawTypePattern(
				batch, sprites.faceAccessories, faceAccessoryType, faceAccessoryPattern,
				faceAccessory.palette, faceAccessory.extraPalette, x, y, WHITE);

			// if (info.faceAccessoryExtraPalette) {
			// 	drawTypePattern(
			// 		batch, sprites.faceAccessoriesExtra, faceAccessoryType, faceAccessoryPattern,
			// 		info.faceAccessoryExtraPalette, x, y, WHITE);
			// }
		}
	}

	if (draw(options, NoDraw.Body) && draw(options, NoDraw.Nose)) {
		const muzzle = holding ?
			Muzzle.Smile :
			headFrame.mouth === -1 ?
				(expression ? expression.muzzle : info.muzzle) :
				headFrame.mouth;

		const noses = at(sprites.noses, muzzle);
		const nose = att(noses, info.nose && info.nose.type)![0];

		nose.mouth && batch.drawSprite(nose.mouth, WHITE, info.defaultPalette, x, y);

		if (holding !== undefined && holding.draw !== undefined) {
			holding.x = toWorldX(x + toInt(holding.pickableX));
			holding.y = toWorldY(y + toInt(holding.pickableY));
			holding.draw(batch, holdingDrawOptions);
		}

		drawSet(batch, noses, info.nose, x, y, WHITE);

		if (info.fangs && nose.fangs) {
			batch.drawSprite(nose.fangs, WHITE, info.defaultPalette, x, y);
		}
	}

	if (draw(options, NoDraw.Front2)) {
		drawSet(batch, sprites.facialHair, info.facialHair, x, y, WHITE);
	}

	const skipTopAndFrontMane = info.headAccessory !== undefined && info.headAccessory.type === 20;

	if (draw(options, NoDraw.FrontMane)) {
		drawSet(batch, sprites.backFrontManes, info.backMane, x, y + maneOffsetY, WHITE);
	}

	if (draw(options, NoDraw.TopMane) && !skipTopAndFrontMane) {
		drawSet(batch, sprites.topManes, info.mane, x, y, WHITE);
	}

	if (toy !== undefined) {
		drawSet(batch, sprites.extraAccessories, toy, extraX, extraY, WHITE);
	} else if (options.extra && draw(options, NoDraw.Front)) {
		drawSet(batch, sprites.extraAccessories, info.extraAccessory, extraX, extraY, WHITE);
	}

	if (draw(options, NoDraw.Front)) {
		drawSet(batch, sprites.horns, info.horn, x, y, WHITE);
	}

	if (draw(options, NoDraw.Body) && draw(options, NoDraw.CloseEar) && !options.noEars) {
		drawSet(batch, sprites.ears, info.ears, x, y, WHITE);
	}

	if (faceAccessory !== undefined && draw(options, NoDraw.FaceAccessory2)) {
		drawTypePattern(
			batch, sprites.faceAccessories2, faceAccessoryType, faceAccessoryPattern,
			faceAccessory.palette, faceAccessory.extraPalette, x, y, WHITE);

		// if (info.faceAccessoryExtraPalette) {
		// 	drawTypePattern(
		// 		batch, sprites.faceAccessories2Extra, faceAccessoryType, faceAccessoryPattern,
		// 		info.faceAccessoryExtraPalette, x, y, WHITE);
		// }
	}

	const earAccessoryOffset = at(EAR_ACCESSORY_OFFSETS, info.ears && info.ears.type)!;
	const frontEarAccessory = false; // info.earAccessory !== undefined && info.earAccessory.type === 13;

	if (!frontEarAccessory && draw(options, NoDraw.Front) && draw(options, NoDraw.CloseEar)) {
		drawSet(batch, sprites.earAccessories, info.earAccessory, x + earAccessoryOffset.x, y + earAccessoryOffset.y, WHITE);
	}

	if (draw(options, NoDraw.FrontMane) && !skipTopAndFrontMane) {
		drawSet(batch, sprites.frontManes, info.mane, x, y + maneOffsetY, WHITE);
	}

	if (frontEarAccessory && draw(options, NoDraw.Front) && draw(options, NoDraw.CloseEar)) {
		drawSet(batch, sprites.earAccessories, info.earAccessory, x + earAccessoryOffset.x, y + earAccessoryOffset.y, WHITE);
	}
}

function drawLeg(
	batch: Batch, x: number, y: number, frame: number, leg: Sets, hoof: Sets, sock: Sets,
	legSet: PaletteSpriteSet | undefined, sockSet: PaletteSpriteSet | undefined, hoofSet: PaletteSpriteSet | undefined,
	hoovesInFront: boolean[], color: number, cmPalette: Palette | undefined, cmFlip: boolean, cmX: number, cmY: number
) {
	const hoofInFront = hoofSet !== undefined && !!hoovesInFront[hoofSet.type];

	drawSet(batch, at(leg, frame), legSet, x, y, color);

	if (!hoofInFront) {
		drawSet(batch, at(hoof, frame), hoofSet, x, y, color);
	}

	// CM
	if (cmPalette !== undefined) {
		const cm = cmFlip ? sprites.cmsFlip : sprites.cms;
		batch.drawSprite(cm, WHITE, cmPalette, cmX, cmY);
	}

	drawSet(batch, at(sock, frame), sockSet, x, y, color);

	if (hoofInFront) {
		const hasClaws = hoofSet && hoofSet.type === 3 && hoof === frontHooves;
		const hasSocks = !!(sockSet && sockSet.type > 0);
		const hoofSprites = (hasClaws && hasSocks) ? claws : hoof;
		drawSet(batch, at(hoofSprites, frame), hoofSet, x, y, color);
	}
}

function getEyeFrame(base: Eye, expression: Eye, anim: Eye, blinkFrame: number) {
	if (anim !== -1)
		return anim;

	const frame = expression === -1 ? base : expression;
	const blink = blinkFrames[frame];

	if (blinkFrame > 1 && blink) {
		const frameOffset = 6 - blinkFrame;

		if (frameOffset < blink.length) {
			return blink[blink.length - frameOffset - 1];
		}
	}

	return frame;
}

function drawEye(
	batch: Batch, eye: PonyEye | undefined, iris: Iris, info: Info, palette: Palette | undefined, eyePalette: Palette,
	x: number, y: number
) {
	if (eye !== undefined) {
		if (info.eyeshadow === true) {
			eye.shadow && batch.drawSprite(eye.shadow, WHITE, info.eyeshadowColor, x, y);
			eye.shine && batch.drawSprite(eye.shine, SHINES_COLOR, info.defaultPalette, x, y);
		}

		eye.base && batch.drawSprite(eye.base, WHITE, eyePalette, x, y);
		const sprite = at(eye.irises, iris);
		sprite && batch.drawSprite(sprite, WHITE, palette, x, y);
	}
}

function drawSet(
	batch: Batch, sprites: ColorExtraSets, set: PaletteSpriteSet | undefined, x: number, y: number, tint: number
) {
	if (set !== undefined) {
		const patterns = att(sprites, set.type);

		if (patterns !== undefined) {
			const patternSprite = at(patterns, set.pattern);

			if (patternSprite !== undefined) {
				batch.drawSprite(patternSprite.color, tint, set.palette, x, y);
			}
		}
	}
}

function drawTypePattern(
	batch: Batch, sprites: ColorExtraSets, type: number, pattern: number, palette: Palette, extraPalette: Palette | undefined,
	x: number, y: number, tint: number
) {
	const patterns = att(sprites, type);

	if (patterns !== undefined) {
		const patternSprite = at(patterns, pattern);

		if (patternSprite !== undefined) {
			batch.drawSprite(patternSprite.color, tint, palette, x, y);

			if (patternSprite.extra !== undefined && extraPalette !== undefined) {
				batch.drawSprite(patternSprite.extra, WHITE, extraPalette, x, y);
			}
		}
	}
}
