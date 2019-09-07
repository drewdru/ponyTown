"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sprites = require("../generated/sprites");
exports.zzzAnimation1 = createSpriteAnimation(sprites.emote_sleep1, 8, 8, 4, 7, true, sprites.emote_sleep1_flip.frames);
exports.zzzAnimation2 = createSpriteAnimation(sprites.emote_sleep2, 12, 13, 13, 12, true, sprites.emote_sleep2_flip.frames);
exports.zzzAnimations = [exports.zzzAnimation1, exports.zzzAnimation2];
exports.cryAnimation = createSpriteAnimation(sprites.emote_cry2, 12, 0, 13, 0);
exports.tearsAnimation = createSpriteAnimation(sprites.emote_tears, 12, 0, 1, 0);
exports.heartsAnimation = createSpriteAnimation(sprites.emote_hearts, 12, 18, 18, 9, true);
sprites.emote_sneeze.frames.unshift(sprites.emptySprite, sprites.emptySprite);
exports.sneezeAnimation = createSpriteAnimation(sprites.emote_sneeze, 8, 0, 4, 0, false);
sprites.hold_poof.frames.push(sprites.emptySprite);
exports.holdPoofAnimation = createSpriteAnimation(sprites.hold_poof, 12, 0, 4, 0, false);
exports.magicAnimation = createSpriteAnimation(sprites.magic2, 8, 2, 6, 0, true);
function createSpriteAnimation({ frames, palette }, fps, start, middle, end, loop = true, flipFrames) {
    return { start, middle, end, fps, palette, frames, loop, flipFrames };
}
//# sourceMappingURL=spriteAnimations.js.map