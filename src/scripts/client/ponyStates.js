"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const animator_1 = require("../common/animator");
const ponyAnimations_1 = require("./ponyAnimations");
function n(value) {
    return (DEVELOPMENT || SERVER) ? value : '';
}
exports.standing = animator_1.animatorState(n('standing'), ponyAnimations_1.stand);
exports.trotting = animator_1.animatorState(n('trotting'), ponyAnimations_1.trot);
exports.swimming = animator_1.animatorState(n('swimming'), ponyAnimations_1.swim);
exports.swimmingToTrotting = animator_1.animatorState(n('swimming-to-trotting'), ponyAnimations_1.swimToTrot);
exports.trottingToSwimming = animator_1.animatorState(n('trotting-to-swimming'), ponyAnimations_1.trotToSwim);
exports.swimmingToFlying = animator_1.animatorState(n('swimming-to-flying'), ponyAnimations_1.swimToFly, { bug: ponyAnimations_1.swimToFlyBug });
exports.flyingToSwimming = animator_1.animatorState(n('flying-to-swimming'), ponyAnimations_1.flyToSwim, { bug: ponyAnimations_1.flyToSwimBug });
exports.booping = animator_1.animatorState(n('booping'), ponyAnimations_1.boop);
exports.boopingSitting = animator_1.animatorState(n('booping-sitting'), ponyAnimations_1.boopSit);
exports.boopingLying = animator_1.animatorState(n('booping-lying'), ponyAnimations_1.boopLie);
exports.boopingFlying = animator_1.animatorState(n('booping-flying'), ponyAnimations_1.boopFly, { bug: ponyAnimations_1.boopFlyBug });
exports.boopingSwimming = animator_1.animatorState(n('booping-swimming'), ponyAnimations_1.boopSwim);
exports.sitting = animator_1.animatorState(n('sitting'), ponyAnimations_1.sit);
exports.sittingDown = animator_1.animatorState(n('sitting-down'), ponyAnimations_1.sitDown);
exports.standingUp = animator_1.animatorState(n('standing-up'), ponyAnimations_1.standUp);
exports.sittingToTrotting = animator_1.animatorState(n('sitting-to-trotting'), ponyAnimations_1.sitToTrot);
exports.lying = animator_1.animatorState(n('lying'), ponyAnimations_1.lie);
exports.lyingDown = animator_1.animatorState(n('lying-down'), ponyAnimations_1.lieDown);
exports.sittingUp = animator_1.animatorState(n('sitting-up'), ponyAnimations_1.sitUp);
exports.lyingToTrotting = animator_1.animatorState(n('lying-to-trotting'), ponyAnimations_1.lieToTrot);
exports.hovering = animator_1.animatorState(n('hovering'), ponyAnimations_1.fly, { bug: ponyAnimations_1.flyBug });
exports.flying = animator_1.animatorState(n('flying'), ponyAnimations_1.fly, { bug: ponyAnimations_1.flyBug });
exports.flyingUp = animator_1.animatorState(n('flying-up'), ponyAnimations_1.flyUp, { bug: ponyAnimations_1.flyUpBug });
exports.flyingDown = animator_1.animatorState(n('flying-down'), ponyAnimations_1.flyDown, { bug: ponyAnimations_1.flyDownBug });
exports.trottingToFlying = animator_1.animatorState(n('trotting-to-flying'), ponyAnimations_1.trotToFly, { bug: ponyAnimations_1.trotToFlyBug });
exports.flyingToTrotting = animator_1.animatorState(n('flying-to-trotting'), ponyAnimations_1.flyToTrot, { bug: ponyAnimations_1.flyToTrotBug });
exports.swinging = animator_1.animatorState(n('swinging'), ponyAnimations_1.swing);
exports.ponyStates = [
    animator_1.anyState, exports.standing, exports.trotting, exports.swimming, exports.swimmingToTrotting, exports.trottingToSwimming,
    exports.booping, exports.boopingSitting, exports.boopingLying, exports.boopingFlying,
    exports.sitting, exports.sittingDown, exports.standingUp, exports.sittingToTrotting,
    exports.lying, exports.lyingDown, exports.sittingUp, exports.lyingToTrotting,
    exports.hovering, exports.flying, exports.flyingUp, exports.flyingDown, exports.trottingToFlying, exports.flyingToTrotting,
    exports.swinging, exports.swimmingToFlying, exports.flyingToSwimming, exports.boopingSwimming,
];
animator_1.animatorTransition(exports.hovering, exports.flyingDown, { exitAfter: 0 });
animator_1.animatorTransition(exports.flyingDown, exports.standing);
animator_1.animatorTransition(exports.standing, exports.sittingDown, { exitAfter: 0 });
animator_1.animatorTransition(exports.sittingDown, exports.sitting);
animator_1.animatorTransition(exports.sitting, exports.lyingDown, { exitAfter: 0 });
animator_1.animatorTransition(exports.lyingDown, exports.lying);
animator_1.animatorTransition(exports.lying, exports.sittingUp, { exitAfter: 0 });
animator_1.animatorTransition(exports.sittingUp, exports.sitting);
animator_1.animatorTransition(exports.sitting, exports.standingUp, { exitAfter: 0 });
animator_1.animatorTransition(exports.standingUp, exports.standing);
animator_1.animatorTransition(exports.standing, exports.flyingUp, { exitAfter: 0 });
animator_1.animatorTransition(exports.flyingUp, exports.hovering);
// transition(flyingUp, trottingToFlying, { exitAfter: 0, keepTime: true });
animator_1.animatorTransition(exports.sitting, exports.sittingToTrotting, { exitAfter: 0, onlyDirectTo: exports.trotting });
animator_1.animatorTransition(exports.sittingToTrotting, exports.trotting, { enterTime: 6.1 / 16 });
animator_1.animatorTransition(exports.sittingToTrotting, exports.standing);
animator_1.animatorTransition(exports.lying, exports.lyingToTrotting, { exitAfter: 0, onlyDirectTo: exports.trotting });
animator_1.animatorTransition(exports.lyingToTrotting, exports.trotting, { enterTime: 6.1 / 16 });
animator_1.animatorTransition(exports.lyingToTrotting, exports.standing, { exitAfter: 5 / 6 });
animator_1.animatorTransition(exports.trotting, exports.trottingToFlying, { exitAfter: 4 / 16 });
animator_1.animatorTransition(exports.trottingToFlying, exports.flying);
animator_1.animatorTransition(exports.flying, exports.flyingToTrotting, { exitAfter: 0 });
animator_1.animatorTransition(exports.flyingToTrotting, exports.trotting, { enterTime: 6 / 16 });
animator_1.animatorTransition(exports.swimming, exports.swimmingToTrotting, { exitAfter: 0 });
animator_1.animatorTransition(exports.swimming, exports.swimmingToFlying, { exitAfter: 0 });
animator_1.animatorTransition(exports.swimmingToTrotting, exports.trotting);
animator_1.animatorTransition(exports.swimmingToTrotting, exports.standing);
animator_1.animatorTransition(exports.trotting, exports.trottingToSwimming, { exitAfter: 0 });
animator_1.animatorTransition(exports.standing, exports.trottingToSwimming, { exitAfter: 0 });
animator_1.animatorTransition(exports.trottingToSwimming, exports.swimming);
animator_1.animatorTransition(exports.swimmingToFlying, exports.hovering);
animator_1.animatorTransition(exports.swimmingToFlying, exports.flying);
animator_1.animatorTransition(exports.flying, exports.flyingToSwimming, { exitAfter: 0 });
animator_1.animatorTransition(exports.hovering, exports.flyingToSwimming, { exitAfter: 0 });
animator_1.animatorTransition(exports.flyingToSwimming, exports.swimming);
animator_1.animatorTransition(exports.trotting, exports.standing, { exitAfter: 0 });
animator_1.animatorTransition(exports.flying, exports.hovering, { exitAfter: 0, keepTime: true });
animator_1.animatorTransition(exports.boopingSwimming, exports.swimming);
animator_1.animatorTransition(exports.swimming, exports.boopingSwimming, { exitAfter: 0 });
animator_1.animatorTransition(exports.booping, exports.standing);
animator_1.animatorTransition(exports.standing, exports.booping, { exitAfter: 0 });
animator_1.animatorTransition(exports.boopingSitting, exports.sitting);
animator_1.animatorTransition(exports.sitting, exports.boopingSitting, { exitAfter: 0 });
animator_1.animatorTransition(exports.boopingLying, exports.lying);
animator_1.animatorTransition(exports.lying, exports.boopingLying, { exitAfter: 0 });
animator_1.animatorTransition(exports.boopingFlying, exports.hovering, { enterTime: 1.1 / 10 });
animator_1.animatorTransition(exports.hovering, exports.boopingFlying, { exitAfter: 0 });
// transition(anyState, trottingToSwimming, { exitAfter: 0 });
animator_1.animatorTransition(animator_1.anyState, exports.trotting, { exitAfter: 0, keepTime: true });
animator_1.animatorTransition(animator_1.anyState, exports.flying, { exitAfter: 0, keepTime: true });
animator_1.animatorTransition(exports.standing, exports.swinging, { exitAfter: 0 });
animator_1.animatorTransition(exports.swinging, exports.standing);
function isFlyingUp(state) {
    return state === exports.flyingUp || state === exports.trottingToFlying || state === exports.swimmingToFlying;
}
exports.isFlyingUp = isFlyingUp;
function isFlyingDown(state) {
    return state === exports.flyingDown || state === exports.flyingToTrotting || state === exports.flyingToSwimming;
}
exports.isFlyingDown = isFlyingDown;
function isSwimmingState(state) {
    return state === exports.swimming || state === exports.trottingToSwimming || state === exports.swimmingToTrotting ||
        state === exports.flyingToSwimming || state === exports.swimmingToFlying || state === exports.boopingSwimming;
}
exports.isSwimmingState = isSwimmingState;
function isFlyingUpOrDown(state) {
    return isFlyingUp(state) || isFlyingDown(state);
}
exports.isFlyingUpOrDown = isFlyingUpOrDown;
function isSittingDown(state) {
    return state === exports.sittingDown;
}
exports.isSittingDown = isSittingDown;
function isSittingUp(state) {
    return state === exports.sittingUp;
}
exports.isSittingUp = isSittingUp;
function toBoopState(state) {
    switch (state) {
        case exports.standing: return exports.booping;
        case exports.sitting: return exports.boopingSitting;
        case exports.lying: return exports.boopingLying;
        case exports.hovering: return exports.boopingFlying;
        case exports.swimming: return exports.boopingSwimming;
        default: return undefined;
    }
}
exports.toBoopState = toBoopState;
//# sourceMappingURL=ponyStates.js.map