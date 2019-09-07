export interface Animation {
	fps: number;
	loop: boolean;
	frames: any[];
}

export interface AnimatorTransition<T extends Animation> {
	state: AnimatorState<T>;
	exitAfter?: number;
	enterTime?: number;
	keepTime?: boolean;
	onlyDirectTo?: AnimatorState<T>;
}

export interface AnimatorState<T extends Animation = Animation> {
	name: string;
	animation: T;
	variants: { [key: string]: T; };
	from: AnimatorTransition<T>[];
}

export function animatorState<T extends Animation>(
	name: string, animation: T, variants: { [key: string]: T; } = {}
): AnimatorState<T> {
	return { name, animation, variants, from: [] };
}

export function animatorTransition<T extends Animation>(
	from: AnimatorState<T>, to: AnimatorState<T>, options: Partial<AnimatorTransition<T>> = {}
) {
	to.from.push({ state: from, ...options });
}

export const anyState = animatorState<any>('any', { fps: 1, loop: false, frames: [] });

export interface Animator<T extends Animation> {
	state: AnimatorState<T> | undefined;
	target: AnimatorState<T> | undefined;
	next: AnimatorTransition<T> | undefined;
	time: number;
	variant: string;
}

export function createAnimator<T extends Animation>(): Animator<T> {
	return {
		time: 0,
		variant: '',
		state: undefined,
		target: undefined,
		next: undefined,
	};
}

export function getAnimation<T extends Animation>(animator: Animator<T>) {
	return animator.state && getAnimationForState(animator.state, animator.variant);
}

export function getAnimationFrame<T extends Animation>(animator: Animator<T>) {
	const animation = getAnimation(animator);
	return animation ? Math.floor(animator.time * animation.fps) % animation.frames.length : 0;
}

export function resetAnimatorState<T extends Animation>(animator: Animator<T>) {
	animator.state = undefined;
	animator.target = undefined;
	animator.next = undefined;
}

export function setAnimatorState<T extends Animation>(animator: Animator<T>, state: AnimatorState<T>) {
	if (animator.target !== state) {
		if (animator.state !== state) {
			if (animator.state === undefined) {
				animator.state = state;
			} else {
				animator.target = state;
			}
		} else {
			animator.target = undefined;
		}

		animator.next = undefined;
	}
}

export function updateAnimator<T extends Animation>(animator: Animator<T>, delta: number) {
	const time = animator.time;
	animator.time += delta;

	if (animator.target !== undefined && animator.state !== undefined && animator.state !== animator.target) {
		const animation = getAnimationForState(animator.state, animator.variant);
		const animationLength = animation.frames.length / animation.fps;
		const frameBefore = Math.floor(time / animationLength);
		const frameAfter = Math.floor(animator.time / animationLength);
		const frameTimeAfter = (animator.time % animationLength) / animationLength;

		let animationEnded = frameBefore !== frameAfter;
		let switched = false;

		do {
			switched = false;
			const transition = animator.next = animator.next || findTransition(animator.state, animator.target);

			if (transition !== undefined) {
				const exitAfter = transition.exitAfter === undefined ? 1 : transition.exitAfter;

				if (frameTimeAfter >= exitAfter || animationEnded) {
					if (!transition.keepTime) {
						animator.time = transition.enterTime || 0;
					} else {
						animator.time = animator.time % animationLength;
					}

					setCurrentState(animator, transition.state);

					switched = true;
					animationEnded = false;
				}
			}
		} while (switched && animator.target);
	}
}

function setCurrentState<T extends Animation>(animator: Animator<T>, state: AnimatorState<T>) {
	animator.next = undefined;
	animator.state = state;

	if (state === animator.target) {
		animator.target = undefined;
	}
}

function getAnimationForState<T extends Animation>(state: AnimatorState<T>, variant: string) {
	return state.variants[variant] || state.animation;
}

function findTransition<T extends Animation>(
	current: AnimatorState<T>, target: AnimatorState<T>
): AnimatorTransition<T> | undefined {
	return findTransMinMax(current, target, 0, 1)
		|| findTrans(anyState, target, target, 0, 0, [])
		|| findTransMinMax(current, target, 2, 10);
}

function findTransMinMax<T extends Animation>(
	current: AnimatorState<T>, target: AnimatorState<T>, min: number, max: number
): AnimatorTransition<T> | undefined {
	for (let i = min; i <= max; i++) {
		const trans = findTrans(current, target, target, 0, i, [current]);

		if (trans !== undefined) {
			return trans;
		}
	}

	return undefined;
}

function findTrans<T extends Animation>(
	current: AnimatorState<T>, target: AnimatorState<T>, finalTarget: AnimatorState<T>,
	depth: number, maxDepth: number, done: AnimatorState<T>[]
): AnimatorTransition<T> | undefined {
	if (done.indexOf(target) === -1) {
		done.push(target);

		for (const from of target.from) {
			if (from.state === current && (from.onlyDirectTo === undefined || from.onlyDirectTo === finalTarget)) {
				return { ...from, state: target };
			}
		}

		if (depth < maxDepth) {
			for (const from of target.from) {
				const trans = findTrans(current, from.state, finalTarget, depth + 1, maxDepth, done);

				if (trans !== undefined) {
					return trans;
				}
			}
		}
	}

	return undefined;
}
