import { DrawPonyOptions, NoDraw, PonyState, PonyStateFlags } from '../common/interfaces';
import { SHADOW_COLOR, blushColor } from '../common/colors';
import { stand } from './ponyAnimations';

const defaultBlushColor = blushColor(0);

export function defaultPonyState(): PonyState {
	return {
		animation: stand,
		animationFrame: 0,
		headAnimation: undefined,
		headAnimationFrame: 0,
		headTurned: false,
		headTilt: 0,
		headTurn: 0,
		blinkFrame: 0,
		blushColor: defaultBlushColor,
		holding: undefined,
		expression: undefined,
		drawFaceExtra: undefined,
		flags: PonyStateFlags.None,
	};
}

export function isStateEqual(a: PonyState, b: PonyState) {
	return a.animation === b.animation &&
		a.animationFrame === b.animationFrame &&
		a.headAnimation === b.headAnimation &&
		a.headAnimationFrame === b.headAnimationFrame &&
		a.headTurned === b.headTurned &&
		a.headTilt === b.headTilt &&
		a.headTurn === b.headTurn &&
		a.blinkFrame === b.blinkFrame &&
		a.blushColor === b.blushColor &&
		a.holding === b.holding &&
		a.expression === b.expression &&
		a.drawFaceExtra === b.drawFaceExtra &&
		a.flags === b.flags;
}

export function defaultDrawPonyOptions(): DrawPonyOptions {
	return {
		flipped: false,
		selected: false,
		shadow: false,
		extra: false,
		toy: 0,
		swimming: false,
		bounce: false,
		shadowColor: SHADOW_COLOR,
		noEars: false,
		no: NoDraw.None,
		useAllHooves: false,
		gameTime: 0,
	};
}
