"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const ponyUtils_1 = require("../../../client/ponyUtils");
const ponyHelpers_1 = require("../../../client/ponyHelpers");
const constants_1 = require("../../../common/constants");
const ponyAnimations_1 = require("../../../client/ponyAnimations");
const frameService_1 = require("../../services/frameService");
const character_preview_1 = require("../character-preview/character-preview");
const compressPony_1 = require("../../../common/compressPony");
const BLEP = Object.assign({}, ponyUtils_1.defaultExpression, { muzzle: 4 /* Blep */ });
const EXCITED = Object.assign({}, ponyUtils_1.defaultExpression, { muzzle: 5 /* SmileOpen */ });
const DERP = Object.assign({}, ponyUtils_1.defaultExpression, { muzzle: 5 /* SmileOpen */, leftIris: 1 /* Up */ });
let SupporterPony = class SupporterPony {
    constructor(frameService) {
        this.scale = 3;
        this.pony = compressPony_1.decompressPonyString(constants_1.SUPPORTER_PONY);
        this.state = ponyHelpers_1.defaultPonyState();
        this.headTime = 0;
        this.loop = frameService.create(delta => this.tick(delta));
    }
    ngOnInit() {
        this.loop.init();
    }
    ngOnDestroy() {
        this.loop.destroy();
    }
    excite() {
        this.headTime = 0;
        this.headAnimation = ponyAnimations_1.excite;
        this.expression = Math.random() < 0.2 ? DERP : EXCITED;
    }
    reset() {
        this.expression = undefined;
    }
    tick(delta) {
        this.headTime += delta;
        if (this.headAnimation) {
            const frame = Math.floor(this.headTime * this.headAnimation.fps);
            if (frame >= this.headAnimation.frames.length && !this.headAnimation.loop) {
                this.headAnimation = undefined;
                this.state.headAnimation = undefined;
                this.state.headAnimationFrame = 0;
                this.characterPreview.blink();
            }
            else {
                this.state.headAnimation = this.headAnimation;
                this.state.headAnimationFrame = frame % this.headAnimation.frames.length;
            }
        }
        else {
            this.state.headAnimation = undefined;
            if (this.expression) {
                if (Math.random() < 0.01) {
                    this.expression = undefined;
                }
            }
            else {
                if (Math.random() < 0.005) {
                    this.expression = BLEP;
                }
            }
        }
        this.state.expression = this.expression;
    }
};
tslib_1.__decorate([
    core_1.ViewChild('characterPreview', { static: true }),
    tslib_1.__metadata("design:type", character_preview_1.CharacterPreview)
], SupporterPony.prototype, "characterPreview", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SupporterPony.prototype, "scale", void 0);
SupporterPony = tslib_1.__decorate([
    core_1.Component({
        selector: 'supporter-pony',
        templateUrl: 'supporter-pony.pug',
    }),
    tslib_1.__metadata("design:paramtypes", [frameService_1.FrameService])
], SupporterPony);
exports.SupporterPony = SupporterPony;
//# sourceMappingURL=supporter-pony.js.map