import '../lib';
import { expect } from 'chai';
import {
	Animator, animatorState, anyState, animatorTransition, getAnimation, getAnimationFrame, setAnimatorState,
	updateAnimator, createAnimator
} from '../../common/animator';

const sit = { name: 'sit', fps: 6, loop: true, frames: { length: 12 } as any };
const sit2 = { name: 'sit2', fps: 6, loop: true, frames: { length: 12 } as any };
const stand = { name: 'stand', fps: 6, loop: true, frames: { length: 6 } as any };
const run = { name: 'run', fps: 6, loop: true, frames: { length: 6 } as any };

describe('Animator', () => {
	let animator: Animator<any>;

	beforeEach(() => {
		animator = createAnimator();
	});

	after(() => {
		animator = undefined as any;
	});

	it('returns undefined animation by default', () => {
		expect(getAnimation(animator)).undefined;
	});

	it('returns 0 frame by default', () => {
		expect(getAnimationFrame(animator)).equal(0);
	});

	it('sets initial state', () => {
		const sitting = animatorState('sitting', sit);

		setAnimatorState(animator, sitting);
		updateAnimator(animator, 0.1);

		expect(animator.state).equal(sitting);
		expect(getAnimation(animator)).equal(sit);
	});

	it('does not switch to new state immediately', () => {
		const sitting = animatorState('sitting', sit);
		const running = animatorState('running', run);
		animatorTransition(sitting, running);
		setAnimatorState(animator, sitting);
		updateAnimator(animator, 0.1);

		expect(getAnimation(animator)).equal(sit);

		setAnimatorState(animator, running);

		expect(getAnimation(animator)).equal(sit);
	});

	it('updates animation frame', () => {
		const sitting = animatorState('sitting', sit);

		setAnimatorState(animator, sitting);
		updateAnimator(animator, 0);
		updateAnimator(animator, 1);

		expect(getAnimationFrame(animator)).equal(6);
	});

	it('loops animation frame', () => {
		const state = animatorState('sitting', sit);

		setAnimatorState(animator, state);
		updateAnimator(animator, 0);
		updateAnimator(animator, 3);

		expect(getAnimationFrame(animator)).equal(6);
	});

	it('switches to next state immediately if exitAfter is set to 0', () => {
		const sitting = animatorState('sitting', sit);
		const running = animatorState('running', run);
		animatorTransition(sitting, running, { exitAfter: 0 });

		setAnimatorState(animator, sitting);
		updateAnimator(animator, 0.1);
		setAnimatorState(animator, running);
		updateAnimator(animator, 0.1);

		expect(getAnimation(animator)).equal(run);
	});

	it('switches to next state after half of the animation if exitAfter is set 0.5', () => {
		const sitting = animatorState('sitting', sit);
		const running = animatorState('running', run);
		animatorTransition(sitting, running, { exitAfter: 0.5 });

		setAnimatorState(animator, sitting);
		updateAnimator(animator, 0);
		setAnimatorState(animator, running);
		updateAnimator(animator, 0);
		updateAnimator(animator, 0.1);
		expect(getAnimation(animator)).equal(sit, 'after 0.1s');
		updateAnimator(animator, 0.4);
		expect(getAnimation(animator)).equal(sit, 'after 0.5s');
		updateAnimator(animator, 0.6);
		expect(getAnimation(animator)).equal(run, 'after 1.1s');
	});

	it('switches to next state immediately if exitAfter is set 0.5 and time is already past 0.5', () => {
		const sitting = animatorState('sitting', sit);
		const running = animatorState('running', run);
		animatorTransition(sitting, running, { exitAfter: 0.5 });

		setAnimatorState(animator, sitting);
		updateAnimator(animator, 0);
		updateAnimator(animator, 1.1);
		setAnimatorState(animator, running);
		updateAnimator(animator, 0);
		expect(getAnimation(animator)).equal(run);
	});

	it('switches to middle of next state if enterTime is set to 0.5', () => {
		const sitting = animatorState('sitting', sit);
		const running = animatorState('running', run);
		animatorTransition(sitting, running, { exitAfter: 0, enterTime: 0.5 });

		setAnimatorState(animator, sitting);
		updateAnimator(animator, 0);
		setAnimatorState(animator, running);
		updateAnimator(animator, 0);

		expect(getAnimation(animator)).equal(run);
		expect(getAnimationFrame(animator)).equal(3);
	});

	it('keeps time of animation after switching if keepTime is set', () => {
		const sitting = animatorState('sitting', sit);
		const running = animatorState('running', run);
		animatorTransition(sitting, running, { exitAfter: 0, keepTime: true });

		setAnimatorState(animator, sitting);
		updateAnimator(animator, 0);
		updateAnimator(animator, 0.5);

		expect(getAnimationFrame(animator)).equal(3, 'before');

		setAnimatorState(animator, running);
		updateAnimator(animator, 0);

		expect(getAnimation(animator)).equal(run);
		expect(getAnimationFrame(animator)).equal(3, 'after');
	});

	it('switches to state if set to switch from any', () => {
		const sitting = animatorState('sitting', sit);
		const running = animatorState('running', run);
		animatorTransition(sitting, running, { exitAfter: 0 });

		setAnimatorState(animator, sitting);
		updateAnimator(animator, 0.1);
		setAnimatorState(animator, running);
		updateAnimator(animator, 0.1);

		expect(getAnimation(animator)).equal(run);
	});

	it('does not use switch from any state as intermediate transition', () => {
		const lying = animatorState('lying', sit);
		const sitting = animatorState('sitting', sit);
		const standing = animatorState('standing', sit);
		const flying = animatorState('flying', sit);
		const hovering = animatorState('hovering', sit);
		animatorTransition(lying, sitting);
		animatorTransition(sitting, standing);
		animatorTransition(anyState, flying);
		animatorTransition(flying, hovering);
		animatorTransition(standing, hovering);

		setAnimatorState(animator, lying);
		updateAnimator(animator, 0);
		setAnimatorState(animator, hovering);
		updateAnimator(animator, 3);
		expect(animator.state).equal(sitting);
		updateAnimator(animator, 3);
		expect(animator.state).equal(standing);
		updateAnimator(animator, 3);
		expect(animator.state).equal(hovering);
	});

	it('does not use switch from any state is another transition is possible', () => {
		const lying = animatorState('lying', sit);
		const standing = animatorState('standing', sit);
		const hovering = animatorState('hovering', sit);
		animatorTransition(lying, standing);
		animatorTransition(anyState, hovering);
		animatorTransition(standing, hovering);

		setAnimatorState(animator, lying);
		updateAnimator(animator, 0);
		setAnimatorState(animator, hovering);
		updateAnimator(animator, 3);
		expect(animator.state).equal(standing);
		updateAnimator(animator, 3);
		expect(animator.state).equal(hovering);
	});

	it('uses switch from any state is another transition is possible but longer than 2 jumps', () => {
		const lying = animatorState('lying', sit);
		const sitting = animatorState('sitting', sit);
		const standing = animatorState('standing', sit);
		const hovering = animatorState('hovering', sit);
		animatorTransition(lying, sitting);
		animatorTransition(sitting, standing);
		animatorTransition(anyState, hovering);
		animatorTransition(standing, hovering);

		setAnimatorState(animator, lying);
		updateAnimator(animator, 0);
		setAnimatorState(animator, hovering);
		updateAnimator(animator, 3);
		expect(animator.state).equal(hovering);
	});

	it('does not switch to next state immediately if exitNow is not set', () => {
		const sitting = animatorState('sitting', sit);
		const running = animatorState('running', run);
		animatorTransition(sitting, running);

		setAnimatorState(animator, sitting);
		updateAnimator(animator, 0.1);
		setAnimatorState(animator, running);
		updateAnimator(animator, 0.1);

		expect(getAnimation(animator)).equal(sit);
	});

	it('switches to next state when animation is finished', () => {
		const sitting = animatorState('sitting', sit);
		const running = animatorState('running', run);
		animatorTransition(sitting, running);

		setAnimatorState(animator, sitting);
		updateAnimator(animator, 0.1);
		setAnimatorState(animator, running);
		updateAnimator(animator, 3);

		expect(getAnimation(animator)).equal(run);
		expect(getAnimationFrame(animator)).equal(0);
	});

	it('does nothing if switching to already targeted state', () => {
		const sitting = animatorState('sitting', sit);
		const running = animatorState('running', run);
		animatorTransition(sitting, running);

		setAnimatorState(animator, sitting);
		updateAnimator(animator, 0.1);
		setAnimatorState(animator, running);
		setAnimatorState(animator, running);
		updateAnimator(animator, 3);

		expect(getAnimation(animator)).equal(run);
	});

	it('does nothing if transition is no possible', () => {
		const sitting = animatorState('sitting', sit);
		const running = animatorState('running', run);

		setAnimatorState(animator, sitting);
		updateAnimator(animator, 0.1);
		setAnimatorState(animator, running);
		updateAnimator(animator, 3);

		expect(getAnimation(animator)).equal(sit);
	});

	it('switches through intermediate state', () => {
		const sitting = animatorState('sitting', sit);
		const other = animatorState('other', sit);
		const standing = animatorState('standing', stand);
		const running = animatorState('running', run);
		animatorTransition(sitting, standing);
		animatorTransition(other, running);
		animatorTransition(standing, running);

		setAnimatorState(animator, sitting);
		updateAnimator(animator, 0.1);
		setAnimatorState(animator, running);
		updateAnimator(animator, 3);

		expect(getAnimation(animator)).equal(stand);

		updateAnimator(animator, 3);

		expect(getAnimation(animator)).equal(run);
	});

	it('switches directly to target state if exitNow is set on both states', () => {
		const sitting = animatorState('sitting', sit);
		const standing = animatorState('standing', stand);
		const running = animatorState('running', run);
		animatorTransition(sitting, standing, { exitAfter: 0 });
		animatorTransition(standing, running, { exitAfter: 0 });

		setAnimatorState(animator, sitting);
		updateAnimator(animator, 0.1);
		setAnimatorState(animator, running);
		updateAnimator(animator, 0.1);

		expect(getAnimation(animator)).equal(run);
	});

	it('cancells switch to target state', () => {
		const sitting = animatorState('sitting', sit);
		const running = animatorState('running', run);
		animatorTransition(sitting, running);

		setAnimatorState(animator, sitting);
		updateAnimator(animator, 0.1);
		setAnimatorState(animator, running);
		updateAnimator(animator, 0.1);
		setAnimatorState(animator, sitting);
		updateAnimator(animator, 3);

		expect(getAnimation(animator)).equal(sit);
	});

	it('handles loops in states', () => {
		const sitting = animatorState('sitting', sit);
		const standing0 = animatorState('standing0', sit);
		const standing1 = animatorState('standing1', stand);
		const standing2 = animatorState('standing2', stand);
		const running = animatorState('running', run);
		animatorTransition(sitting, standing0, { exitAfter: 0 });
		animatorTransition(running, standing1, { exitAfter: 0 });
		animatorTransition(running, standing2, { exitAfter: 0 });
		animatorTransition(standing0, standing2, { exitAfter: 0 });
		animatorTransition(standing1, running, { exitAfter: 0 });
		animatorTransition(standing2, running, { exitAfter: 0 });

		setAnimatorState(animator, sitting);
		updateAnimator(animator, 0.1);
		setAnimatorState(animator, running);
		updateAnimator(animator, 0.1);

		expect(getAnimation(animator)).equal(run);
	});

	it('returns correct animation variant', () => {
		const sitting = animatorState('sitting', sit, { alt: sit2 });

		animator.variant = 'alt';
		setAnimatorState(animator, sitting);
		updateAnimator(animator, 0.1);

		expect(getAnimation(animator)).equal(sit2);
	});

	it('does not use shorter transition route if onlyDirectTo is set', () => {
		const standing = animatorState('standing', run);
		const standingUp = animatorState('standing-up', run);
		const sitting = animatorState('sitting', run);
		const sittingUp = animatorState('sitting-up', run);
		const lying = animatorState('lying', run);
		const lyingToTrotting = animatorState('lying-to-trotting', run);
		const trotting = animatorState('trotting', run);
		animatorTransition(lying, sittingUp);
		animatorTransition(sittingUp, sitting);
		animatorTransition(sitting, standingUp);
		animatorTransition(standingUp, standing);
		animatorTransition(lying, lyingToTrotting, { onlyDirectTo: trotting });
		animatorTransition(lyingToTrotting, standing);
		animatorTransition(lyingToTrotting, trotting);

		setAnimatorState(animator, lying);
		updateAnimator(animator, 0);
		setAnimatorState(animator, standing);
		updateAnimator(animator, 1.1);
		expect(animator.state).equal(sittingUp);
		updateAnimator(animator, 1.1);
		expect(animator.state).equal(sitting);
		updateAnimator(animator, 1.1);
		expect(animator.state).equal(standingUp);
		updateAnimator(animator, 1.1);
		expect(animator.state).equal(standing);
	});
});
