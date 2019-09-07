"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const router_1 = require("@angular/router");
const http_1 = require("@angular/common/http");
const lodash_1 = require("lodash");
const utils_1 = require("../../../common/utils");
const ponyInfo_1 = require("../../../common/ponyInfo");
const ponyHelpers_1 = require("../../../client/ponyHelpers");
const ponyAnimations_1 = require("../../../client/ponyAnimations");
const contextSpriteBatch_1 = require("../../../graphics/contextSpriteBatch");
const sprites = require("../../../generated/sprites");
const canvasUtils_1 = require("../../../client/canvasUtils");
const spriteUtils_1 = require("../../../client/spriteUtils");
const ponyDraw_1 = require("../../../client/ponyDraw");
const icons_1 = require("../../../client/icons");
const frameService_1 = require("../../services/frameService");
const storageService_1 = require("../../services/storageService");
const compressPony_1 = require("../../../common/compressPony");
const ponyWidth = 80;
const ponyHeight = 80;
const testPony = { name: 'test pony', info: ponyInfo_1.createDefaultPony() };
function eyeSprite(e) {
    return spriteUtils_1.createEyeSprite(e, 0, sprites.defaultPalette);
}
let ToolsAnimation = class ToolsAnimation {
    constructor(http, route, storage, frameService) {
        this.http = http;
        this.route = route;
        this.storage = storage;
        this.lockIcon = icons_1.faLock;
        this.homeIcon = icons_1.faHome;
        this.rightIcon = icons_1.faArrowRight;
        this.leftIcon = icons_1.faArrowLeft;
        this.stopIcon = icons_1.faStop;
        this.pauseIcon = icons_1.faPause;
        this.playIcon = icons_1.faPlay;
        this.replayIcon = icons_1.faRedo;
        this.prevIcon = icons_1.faChevronLeft;
        this.nextIcon = icons_1.faChevronRight;
        this.switchIcon = icons_1.faRetweet;
        this.fileIcon = icons_1.faFile;
        this.copyIcon = icons_1.faCopy;
        this.trashIcon = icons_1.faTrash;
        this.shareIcon = icons_1.faShare;
        this.codeIcon = icons_1.faCode;
        this.doubleLeftIcon = icons_1.faAngleDoubleLeft;
        this.doubleRightIcon = icons_1.faAngleDoubleRight;
        this.doubleUpIcon = icons_1.faAngleDoubleUp;
        this.doubleDownIcon = icons_1.faAngleDoubleDown;
        this.plusIcon = icons_1.faPlus;
        this.cloneIcon = icons_1.faClone;
        this.syncIcon = icons_1.faSync;
        this.loaded = false;
        this.ponies = [testPony];
        this.scale = 3;
        this.shareLinkOpen = false;
        this.state = ponyHelpers_1.defaultPonyState();
        this.bodyAnimations = ponyAnimations_1.animations.map(fromBodyAnimation);
        this.headAnimations = ponyAnimations_1.headAnimations.map(fromHeadAnimation);
        this.body = sprites.body.map(x => x && x[0] && x[0][0].color).map(color => ({ color: color, colors: 2 }));
        this.wing = sprites.wings.map(types => types[3][0]);
        this.tail = sprites.tails.map(types => types[17][0]);
        this.frontLegs = sprites.frontLegs.map(x => x && x[0] && x[0][0].color).map(color => ({ color: color, colors: 2 }));
        this.backLegs = sprites.backLegs.map(x => x && x[0] && x[0][0].color).map(color => ({ color: color, colors: 2 }));
        this.leftEyes = sprites.eyeLeft.map(e => e && e[0]).map(eyeSprite);
        this.rightEyes = sprites.eyeRight.map(e => e && e[0]).map(eyeSprite);
        this.mouths = sprites.noses
            .map(m => m[0][0])
            .map(({ color, colors, mouth }) => ({ color, colors, extra: mouth, palette: sprites.defaultPalette }));
        this.flip = false;
        this.switch = false;
        this._playing = false;
        this._frame = 0;
        this.bodyAnimationsToPlay = [];
        this.bodyAnimationPlaying = 0;
        this.time = 0;
        this.mode = storage.getItem('tools-animation-mode') || 'body';
        this.loop = frameService.create(delta => this.tick(delta));
        const data = this.loadAnimations();
        const extraAnimations = [
            ponyAnimations_1.mergeAnimations('sit-lie-sit', 24, false, [...utils_1.repeat(12, ponyAnimations_1.sit), ponyAnimations_1.lieDown, ...utils_1.repeat(12, ponyAnimations_1.lie), ponyAnimations_1.sitUp, ponyAnimations_1.sit]),
            ponyAnimations_1.mergeAnimations('stand-sit-stand', 24, false, [...utils_1.repeat(12, ponyAnimations_1.stand), ponyAnimations_1.sitDown, ...utils_1.repeat(12, ponyAnimations_1.sit), ponyAnimations_1.standUp, ponyAnimations_1.stand]),
            ponyAnimations_1.mergeAnimations('stand-to-sit', 24, false, [ponyAnimations_1.stand, ponyAnimations_1.sitDown, ponyAnimations_1.sit]),
            ponyAnimations_1.mergeAnimations('sit-to-lie', 24, false, [ponyAnimations_1.sit, ponyAnimations_1.lieDown, ponyAnimations_1.lie]),
            Object.assign({}, ponyAnimations_1.stand, { loop: false, name: 'standing (1s)', frames: utils_1.array(ponyAnimations_1.stand.fps, ponyAnimations_1.stand.frames[0]) }),
            Object.assign({}, ponyAnimations_1.sit, { loop: false, name: 'sitting (1s)', frames: utils_1.array(ponyAnimations_1.sit.fps, ponyAnimations_1.sit.frames[0]) }),
            Object.assign({}, ponyAnimations_1.lie, { loop: false, name: 'lying (1s)', frames: utils_1.array(ponyAnimations_1.lie.fps, ponyAnimations_1.lie.frames[0]) }),
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
        this.pony.info.mane.type = 9;
        this.pony.info.mane.fills[0] = '#e2cf67';
        this.pony.info.lockEyes = false;
        this.pony.info.cm = [
            'orange', 'orange', 'orange', 'orange', 'orange',
            'orange', '', '', '', 'orange',
            'orange', '', '', '', 'orange',
            'orange', '', '', '', 'orange',
            'orange', 'orange', 'orange', 'orange', 'orange',
        ];
        ponyInfo_1.syncLockedPonyInfo(this.pony.info);
        this.reloadPonies();
    }
    get info() {
        return this.pony.info;
    }
    get frame() {
        return this._frame;
    }
    set frame(value) {
        if (this._frame !== value) {
            this._frame = value % this.frames.length;
            if (!this.playing) {
                if (this.mode === 'body') {
                    this.state.animationFrame = this.frame;
                }
                else {
                    this.state.headAnimationFrame = this.frame;
                }
            }
        }
    }
    get activeFrame() {
        return this.frames[this.frame] || {};
    }
    get totalFrames() {
        return this.frames.length;
    }
    get playing() {
        return this._playing;
    }
    set playing(value) {
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
        return spriteUtils_1.loadAndInitSpriteSheets().then(() => {
            this.loaded = true;
            this.update();
            this.loop.init();
        });
    }
    ngOnDestroy() {
        this.loop.destroy();
    }
    reloadPonies() {
        this.http.get('/api-tools/ponies')
            .subscribe(data => {
            this.ponies = [
                testPony,
                ...data
                    .map(p => ({ name: p.name, info: compressPony_1.decompressPonyString(p.info) }))
                    .sort((a, b) => a.name.localeCompare(b.name)),
            ];
            const ponyName = this.storage.getItem('tools-animation-pony');
            if (ponyName) {
                this.pony = this.ponies.find(p => p.name === ponyName) || this.pony;
            }
        });
    }
    setPony(pony) {
        this.pony = pony;
        this.update();
        this.storage.setItem('tools-animation-pony', pony.name);
    }
    selectBodyAnimation(animation) {
        this.bodyAnimation = animation;
        this.update();
    }
    selectHeadAnimation(animation) {
        this.headAnimation = animation;
        this.update();
    }
    setMode(mode) {
        this.mode = mode;
        this.storage.setItem('tools-animation-mode', mode);
    }
    replay() {
        this.bodyAnimationPlaying = 0;
        this.state.animation = this.bodyAnimationsToPlay[this.bodyAnimationPlaying];
        this.time = 0;
    }
    fetchAnimation(id) {
        return this.http.get(`/api-tools/animation/${id}`)
            .subscribe(({ type, animation }) => {
            if (type === 'body') {
                this.bodyAnimations.push(animation);
            }
            else {
                this.headAnimations.push(animation);
            }
            this.sortAnimations();
            this.selectAnimation(animation);
        });
    }
    createAnimation() {
        if (this.mode === 'body') {
            return { name: 'new animation', loop: true, fps: 24, frames: [createDefaultBodyFrame()] };
        }
        else {
            return { name: 'new animation', loop: true, fps: 24, frames: [createDefaultHeadFrame()] };
        }
    }
    newAnimation() {
        const animation = this.createAnimation();
        const animations = this.animations;
        animations.push(animation);
        this.selectAnimation(animation);
    }
    duplicateAnimation() {
        const animation = utils_1.cloneDeep(this.animation);
        const animations = this.animations;
        animation.name = animation.name.replace(/# builtin \d+ #/, '').trim() + ' (clone)';
        delete animation.builtin;
        animations.push(animation);
        this.selectAnimation(animation);
    }
    removeAnimation() {
        const animations = this.animations;
        if (animations.length && confirm('are you sure ?')) {
            utils_1.removeItem(animations, this.animation);
            this.selectAnimation(animations[0]);
        }
    }
    selectAnimation(animation) {
        if (this.mode === 'body') {
            this.selectBodyAnimation(animation);
        }
        else {
            this.selectHeadAnimation(animation);
        }
    }
    selectBeforeAnimation(animation) {
        this.beforeAnimation = animation;
        this.update();
    }
    selectAfterAnimation(animation) {
        this.afterAnimation = animation;
        this.update();
    }
    selectFrame(index) {
        this.frame = index;
    }
    prevFrame() {
        this.frame = this.frame === 0 ? (this.frames.length - 1) : (this.frame - 1);
    }
    nextFrame() {
        this.frame = this.frame + 1;
    }
    addFrame() {
        const frames = this.frames;
        const frame = this.mode === 'body' ? createDefaultBodyFrame() : createDefaultHeadFrame();
        frames.splice(this.frame + 1, 0, frame);
        this.update();
        this.frame++;
    }
    duplicateFrame() {
        const frames = this.frames;
        frames.splice(this.frame + 1, 0, utils_1.cloneDeep(frames[this.frame]));
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
    isActive(index) {
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
    keydown(e) {
        if (!utils_1.isKeyEventInvalid(e) && this.handleKey(e.keyCode)) {
            e.preventDefault();
        }
    }
    moveAllHead(x, y) {
        this.frames.forEach(f => {
            f.headX += x;
            f.headY += y;
        });
        this.update();
    }
    moveAllBody(x, y) {
        this.frames.forEach(f => {
            f.bodyX += x;
            f.bodyY += y;
        });
        this.update();
    }
    handleKey(keyCode) {
        if (keyCode === 219 /* OPEN_BRACKET */ || keyCode === 37 /* LEFT */ || keyCode === 188 /* COMMA */) {
            this.prevFrame();
        }
        else if (keyCode === 221 /* CLOSE_BRACKET */ || keyCode === 39 /* RIGHT */ || keyCode === 190 /* PERIOD */) {
            this.nextFrame();
        }
        else if (keyCode === 13 /* ENTER */) {
            this.playing = !this.playing;
        }
        else {
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
            this.http.post('/api-tools/animation', { animation })
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
        }
        else {
            const animation = toHeadAnimation(this.headAnimation, true);
            const compressed = animation.frames.map(compressHeadFrame);
            console.log(JSON.stringify(compressed));
        }
    }
    png(scale = 1) {
        const { canvas } = this.createAnimationSprites(scale);
        canvasUtils_1.saveCanvas(canvas, `${this.animation.name}.png`);
    }
    gif(scale = 1) {
        const { canvas, empty } = this.createAnimationSprites(scale);
        const wnd = window.open('');
        const width = scale * ponyWidth;
        const height = scale * ponyHeight;
        const fps = this.animation.fps || 24;
        const image = canvas.toDataURL();
        this.http.post('/api-tools/animation-gif', { image, width, height, fps, remove: empty })
            .subscribe(({ name }) => wnd.location.href = `/api-tools/animation/${name}.gif`);
    }
    sortAnimations() {
        this.bodyAnimations.sort(compareAnimations);
        this.headAnimations.sort(compareAnimations);
    }
    update() {
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
        this.bodyAnimationsToPlay = lodash_1.compact([
            this.playing && this.beforeAnimation && Object.assign({}, toBodyAnimation(this.beforeAnimation, true, false), { loop: false }),
            toBodyAnimation(this.bodyAnimation, this.playing, this.switch),
            this.playing && this.afterAnimation && Object.assign({}, toBodyAnimation(this.afterAnimation, true, false), { loop: true }),
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
    tick(delta) {
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
                    }
                    else {
                        this.state.animationFrame = Math.floor(frame) % this.state.animation.frames.length;
                    }
                }
            }
            else {
                if (this.state.headAnimation) {
                    const frame = Math.floor(this.time * this.state.headAnimation.fps);
                    this.state.headAnimationFrame = frame % this.state.headAnimation.frames.length;
                }
            }
        }
    }
    saveAnimations() {
        this.storage.setJSON('tools-animations', {
            active: this.bodyAnimations.indexOf(this.bodyAnimation).toString(),
            animations: this.bodyAnimations.filter(a => !a.builtin),
            headActive: this.headAnimations.indexOf(this.headAnimation).toString(),
            headAnimations: this.headAnimations.filter(a => !a.builtin),
        });
    }
    loadAnimations() {
        return this.storage.getJSON('tools-animations', {});
    }
    createAnimationSprites(scale) {
        const animation = toBodyAnimation(this.bodyAnimation, true, this.switch);
        const headAnimation = toHeadAnimation(this.headAnimation, true);
        const frames = this.mode === 'body' ? animation.frames.length : headAnimation.frames.length;
        const buffer = canvasUtils_1.createCanvas(ponyWidth, ponyHeight);
        const batch = new contextSpriteBatch_1.ContextSpriteBatch(buffer);
        const info = ponyInfo_1.toPalette(this.pony.info);
        const cols = Math.ceil(Math.sqrt(frames));
        const canvas = canvasUtils_1.createCanvas(ponyWidth * cols * scale, ponyHeight * Math.ceil(frames / cols) * scale);
        const context = canvas.getContext('2d');
        const empty = (cols * Math.ceil(frames / cols)) - frames;
        const options = ponyHelpers_1.defaultDrawPonyOptions();
        canvasUtils_1.disableImageSmoothing(context);
        context.scale(scale, scale);
        for (let i = 0; i < frames; i++) {
            const x = i % cols;
            const y = Math.floor(i / cols);
            batch.start(sprites.paletteSpriteSheet, 0);
            ponyDraw_1.drawPony(batch, info, Object.assign({}, ponyHelpers_1.defaultPonyState(), { animation, animationFrame: this.mode === 'body' ? i : 0, headAnimation: this.mode === 'head' ? headAnimation : undefined, headAnimationFrame: this.mode === 'head' ? i : 0, blinkFrame: 1 }), ponyWidth / 2, ponyHeight - 10, options);
            batch.end();
            context.drawImage(buffer, x * ponyWidth, y * ponyHeight);
        }
        return { canvas, empty };
    }
};
tslib_1.__decorate([
    core_1.HostListener('window:keydown', ['$event']),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [KeyboardEvent]),
    tslib_1.__metadata("design:returntype", void 0)
], ToolsAnimation.prototype, "keydown", null);
ToolsAnimation = tslib_1.__decorate([
    core_1.Component({
        selector: 'tools-animation',
        templateUrl: 'tools-animation.pug',
        styleUrls: ['tools-animation.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [http_1.HttpClient,
        router_1.ActivatedRoute,
        storageService_1.StorageService,
        frameService_1.FrameService])
], ToolsAnimation);
exports.ToolsAnimation = ToolsAnimation;
// helper methods
function compareAnimations(a, b) {
    return a.name.localeCompare(b.name);
}
function swap(array, a, b) {
    const temp = array[a];
    array[a] = array[b];
    array[b] = temp;
}
function fromBodyAnimation({ name, frames, fps, loop, shadow }, index) {
    const fs = [];
    frames.forEach((f, i) => {
        const l = fs[fs.length - 1];
        const s = shadow && shadow[i];
        if (l && l.headX === f.headX && l.headY === f.headY && l.bodyX === f.bodyX && l.bodyY === f.bodyY
            && l.body === f.body && l.frontLeg === f.frontLeg && l.backLeg === f.backLeg
            && l.frontFarLeg === f.frontFarLeg && l.backFarLeg === f.backFarLeg
            && l.frontLegX === f.frontLegX && l.frontLegY === f.frontLegY
            && l.frontFarLegX === f.frontFarLegX && l.frontFarLegY === f.frontFarLegY
            && l.backLegX === f.backLegX && l.backLegY === f.backLegY
            && l.backFarLegX === f.backFarLegX && l.backFarLegY === f.backFarLegY
            && l.wing === f.wing) {
            l.duration++;
        }
        else {
            fs.push(Object.assign({ duration: 1 }, f, { shadowOffset: s && s.offset || 0, shadowFrame: s && s.frame || 0 }));
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
function toBodyAnimation({ name, loop, fps, frames }, full, switchFarClose) {
    let shadow = undefined;
    if (frames.some(f => !!f.shadowFrame || !!f.shadowOffset)) {
        shadow = lodash_1.flatMap(frames, f => utils_1.repeat(full ? f.duration : 1, { frame: f.shadowFrame, offset: f.shadowOffset }));
    }
    return {
        name,
        loop,
        fps,
        shadow,
        frames: lodash_1.flatMap(frames, f => utils_1.repeat(full ? f.duration : 1, {
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
function compressBodyFrame(f) {
    return lodash_1.dropRightWhile([
        f.body, f.head, f.wing, f.tail, f.frontLeg, f.frontFarLeg, f.backLeg, f.backFarLeg,
        f.bodyX, f.bodyY, f.headX, f.headY,
        f.frontLegX, f.frontLegY, f.frontFarLegX, f.frontFarLegY,
        f.backLegX, f.backLegY, f.backFarLegX, f.backFarLegY,
    ], x => !x);
}
function fromHeadAnimation({ name, fps, loop, frames }, index) {
    const fs = [];
    frames.forEach(f => {
        const l = fs[fs.length - 1];
        if (l && l.headX === f.headX && l.headY === f.headY && l.left === f.left && l.right === f.right && l.mouth === f.mouth) {
            l.duration++;
        }
        else {
            fs.push(Object.assign({ duration: 1 }, f));
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
function toHeadAnimation({ name, frames, fps, loop }, full) {
    const fs = (full && !loop) ? utils_1.repeat(fps, createDefaultHeadFrame()).concat(frames) : frames;
    return {
        name,
        fps,
        loop,
        frames: lodash_1.flatMap(fs, f => utils_1.repeat(full ? f.duration : 1, f)),
    };
}
function compressHeadFrame({ headX, headY, left, right, mouth }) {
    return [headX, headY, left, right, mouth];
}
function createDefaultBodyFrame() {
    return Object.assign({ duration: 1 }, ponyAnimations_1.createBodyFrame([1, 1, 0, 0, 1, 1, 1, 1]), { shadowFrame: 0, shadowOffset: 0 });
}
function createDefaultHeadFrame() {
    return Object.assign({ duration: 1 }, ponyAnimations_1.createHeadFrame([0, 0, 1, 1, 0]));
}
// fixing helpers
function fixBodyAnimation(a) {
    return {
        name: a.name || '',
        fps: a.fps || 24,
        loop: a.loop || false,
        lockFrontLegs: a.lockFrontLegs || false,
        lockBackLegs: a.lockBackLegs || false,
        frames: (a.frames || []).map(fixBodyFrame),
    };
}
function fixBodyFrame(f) {
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
function fixHeadAnimation(a) {
    return {
        name: a.name || '',
        fps: a.fps || 24,
        loop: a.loop || false,
        lockEyes: a.lockEyes || false,
        frames: (a.frames || []).map(fixHeadFrame),
    };
}
function fixHeadFrame(f) {
    return {
        duration: f.duration || 1,
        headX: f.headX || 0,
        headY: f.headY || 0,
        left: f.left || 0,
        right: f.right || 0,
        mouth: f.mouth || 0,
    };
}
//# sourceMappingURL=tools-animation.js.map