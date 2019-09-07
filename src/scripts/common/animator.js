"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function animatorState(name, animation, variants = {}) {
    return { name, animation, variants, from: [] };
}
exports.animatorState = animatorState;
function animatorTransition(from, to, options = {}) {
    to.from.push(Object.assign({ state: from }, options));
}
exports.animatorTransition = animatorTransition;
exports.anyState = animatorState('any', { fps: 1, loop: false, frames: [] });
function createAnimator() {
    return {
        time: 0,
        variant: '',
        state: undefined,
        target: undefined,
        next: undefined,
    };
}
exports.createAnimator = createAnimator;
function getAnimation(animator) {
    return animator.state && getAnimationForState(animator.state, animator.variant);
}
exports.getAnimation = getAnimation;
function getAnimationFrame(animator) {
    const animation = getAnimation(animator);
    return animation ? Math.floor(animator.time * animation.fps) % animation.frames.length : 0;
}
exports.getAnimationFrame = getAnimationFrame;
function resetAnimatorState(animator) {
    animator.state = undefined;
    animator.target = undefined;
    animator.next = undefined;
}
exports.resetAnimatorState = resetAnimatorState;
function setAnimatorState(animator, state) {
    if (animator.target !== state) {
        if (animator.state !== state) {
            if (animator.state === undefined) {
                animator.state = state;
            }
            else {
                animator.target = state;
            }
        }
        else {
            animator.target = undefined;
        }
        animator.next = undefined;
    }
}
exports.setAnimatorState = setAnimatorState;
function updateAnimator(animator, delta) {
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
                    }
                    else {
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
exports.updateAnimator = updateAnimator;
function setCurrentState(animator, state) {
    animator.next = undefined;
    animator.state = state;
    if (state === animator.target) {
        animator.target = undefined;
    }
}
function getAnimationForState(state, variant) {
    return state.variants[variant] || state.animation;
}
function findTransition(current, target) {
    return findTransMinMax(current, target, 0, 1)
        || findTrans(exports.anyState, target, target, 0, 0, [])
        || findTransMinMax(current, target, 2, 10);
}
function findTransMinMax(current, target, min, max) {
    for (let i = min; i <= max; i++) {
        const trans = findTrans(current, target, target, 0, i, [current]);
        if (trans !== undefined) {
            return trans;
        }
    }
    return undefined;
}
function findTrans(current, target, finalTarget, depth, maxDepth, done) {
    if (done.indexOf(target) === -1) {
        done.push(target);
        for (const from of target.from) {
            if (from.state === current && (from.onlyDirectTo === undefined || from.onlyDirectTo === finalTarget)) {
                return Object.assign({}, from, { state: target });
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
//# sourceMappingURL=animator.js.map