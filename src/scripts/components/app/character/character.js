"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const lodash_1 = require("lodash");
const constants_1 = require("../../../common/constants");
const utils_1 = require("../../../common/utils");
const ponyUtils_1 = require("../../../client/ponyUtils");
const ponyHelpers_1 = require("../../../client/ponyHelpers");
const ponyInfo_1 = require("../../../common/ponyInfo");
const sprites = require("../../../generated/sprites");
const ponyAnimations_1 = require("../../../client/ponyAnimations");
const contextSpriteBatch_1 = require("../../../graphics/contextSpriteBatch");
const model_1 = require("../../services/model");
const spriteUtils_1 = require("../../../client/spriteUtils");
const gameService_1 = require("../../services/gameService");
const colors_1 = require("../../../common/colors");
const compressPony_1 = require("../../../common/compressPony");
const canvasUtils_1 = require("../../../client/canvasUtils");
const ponyDraw_1 = require("../../../client/ponyDraw");
const sign_in_box_1 = require("../../shared/sign-in-box/sign-in-box");
const icons_1 = require("../../../client/icons");
const clientUtils_1 = require("../../../client/clientUtils");
const tags_1 = require("../../../common/tags");
const color_1 = require("../../../common/color");
const frontHoofTitles = ['', 'Fetlocks', 'Paws', 'Claws', ''];
const backHoofTitles = ['', 'Fetlocks', 'Paws', '', ''];
const horns = spriteUtils_1.addLabels(sprites.horns, [
    'None', 'Unicorn horn', 'Short unicorn horn', 'Curved unicorn horn', 'Tiny deer antlers',
    'Short deer antlers', 'Medium deer antlers', 'Large deer antlers', 'Raindeer antlers', 'Goat horns',
    'Ram horns', 'Buffalo horns', 'Moose horns', 'Bug antenna', 'Long unicorn horn',
]);
const wings = spriteUtils_1.addLabels(sprites.wings[0], [
    'None', 'Pegasus wings', 'Bat wings', 'Gryphon wings', 'Bug wings'
]);
const ears = spriteUtils_1.addLabels(sprites.ears, [
    'Regular ears', 'Fluffy ears', 'Long feathered ears', 'Bug ears', 'Short feathered ears', 'Deer ears',
]);
const noses = spriteUtils_1.addTitles(sprites.noses[0], ['Pony muzzle', 'Gryphon beak', 'Deer nose']);
const flyAnimations = [Object.assign({}, ponyAnimations_1.stand, { name: 'fly' }), ponyAnimations_1.fly, ponyAnimations_1.fly, ponyAnimations_1.fly, Object.assign({}, ponyAnimations_1.flyBug, { name: 'fly' })];
function eyeSprite(e) {
    return spriteUtils_1.createEyeSprite(e, 0, sprites.defaultPalette);
}
let Character = class Character {
    constructor(gameService, model) {
        this.gameService = gameService;
        this.model = model;
        this.debug = DEVELOPMENT || BETA;
        this.playIcon = icons_1.faPlay;
        this.lockIcon = icons_1.faLock;
        this.saveIcon = icons_1.faSave;
        this.codeIcon = icons_1.faCode;
        this.infoIcon = icons_1.faInfoCircle;
        this.maxNameLength = constants_1.PLAYER_NAME_MAX_LENGTH;
        this.maxDescLength = constants_1.PLAYER_DESC_MAX_LENGTH;
        this.horns = horns;
        this.manes = ponyUtils_1.mergedManes;
        this.backManes = ponyUtils_1.mergedBackManes;
        this.tails = sprites.tails[0];
        this.wings = wings;
        this.ears = ears;
        this.facialHair = ponyUtils_1.mergedFacialHair;
        this.headAccessories = ponyUtils_1.mergedHeadAccessories;
        this.earAccessories = ponyUtils_1.mergedEarAccessories;
        this.faceAccessories = ponyUtils_1.mergedFaceAccessories;
        this.neckAccessories = sprites.neckAccessories[1];
        this.frontLegAccessories = sprites.frontLegAccessories[1];
        this.backLegAccessories = sprites.backLegAccessories[1];
        this.backAccessories = ponyUtils_1.mergedBackAccessories;
        this.chestAccessories = ponyUtils_1.mergedChestAccessories;
        this.sleeveAccessories = sprites.frontLegSleeves[1];
        this.waistAccessories = sprites.waistAccessories[1];
        this.extraAccessories = ponyUtils_1.mergedExtraAccessories;
        this.frontHooves = spriteUtils_1.addTitles(ponyUtils_1.frontHooves[1], frontHoofTitles);
        this.backHooves = spriteUtils_1.addTitles(sprites.backLegHooves[1], backHoofTitles);
        this.animations = [
            () => ponyAnimations_1.stand,
            () => ponyAnimations_1.trot,
            () => ponyAnimations_1.boop,
            () => ponyAnimations_1.sitDownUp,
            () => ponyAnimations_1.lieDownUp,
            () => flyAnimations[this.previewInfo.wings.type || 0],
        ];
        this.eyelashes = sprites.eyeLeft[1].map(eyeSprite);
        this.eyesLeft = sprites.eyeLeft.map(e => e && e[0]).map(eyeSprite);
        this.eyesRight = sprites.eyeRight.map(e => e && e[0]).map(eyeSprite);
        this.noses = noses;
        this.heads = sprites.head1[1];
        this.buttMarkState = {
            brushType: 'brush',
            brush: 'orange',
        };
        this.tags = [
            tags_1.emptyTag,
        ];
        this.state = ponyHelpers_1.defaultPonyState();
        this.saved = [];
        this.activeAnimation = 0;
        this.loaded = false;
        this.playAnimation = true;
        this.deleting = false;
        this.fixed = false;
        this.previewExtra = false;
        this.previewPony = undefined;
        this.sites = [];
        this.canSaveFiles = clientUtils_1.isFileSaverSupported();
        this.savingLocked = false;
        this.animationTime = 0;
        this.createMuzzles();
        this.updateMuzzles();
    }
    getMuzzleType() {
        return lodash_1.clamp(utils_1.toInt(this.info && this.info.nose && this.info.nose.type), 0, sprites.noses[0].length);
    }
    createMuzzles() {
        const type = this.getMuzzleType();
        const happy = sprites.noses[0][type][0];
        this.muzzles = sprites.noses
            .slice()
            .map(n => n[type][0])
            .map(({ color, colors, mouth }) => ({ color, colors, extra: mouth, palettes: [sprites.defaultPalette] }));
        this.fangs = [undefined, { color: happy.color, colors: 3, extra: happy.fangs, palettes: [sprites.defaultPalette] }];
    }
    updateMuzzles() {
        const type = this.getMuzzleType();
        const happy = sprites.noses[0][type][0];
        this.muzzles.forEach((m, i) => {
            if (m) {
                const { color, colors, mouth } = sprites.noses[i][type][0];
                m.color = color;
                m.colors = colors;
                m.extra = mouth;
                m.timestamp = Date.now();
            }
        });
        const fangs = this.fangs[1];
        fangs.color = happy.color;
        fangs.extra = happy.fangs;
        fangs.timestamp = Date.now();
    }
    get account() {
        return this.model.account;
    }
    get loading() {
        return this.model.loading || this.model.updating;
    }
    get updateWarning() {
        return this.gameService.updateWarning;
    }
    get playing() {
        return this.gameService.playing;
    }
    get previewInfo() {
        return this.previewPony ? this.previewPony.ponyInfo : this.pony.ponyInfo;
    }
    get previewName() {
        return this.previewPony ? this.previewPony.name : this.pony.name;
    }
    get previewTag() {
        return model_1.getPonyTag(this.previewPony || this.pony, this.account);
    }
    get customOutlines() {
        return this.info.customOutlines;
    }
    get ponies() {
        return this.model.ponies;
    }
    get pony() {
        return this.model.pony;
    }
    set pony(value) {
        this.model.selectPony(value);
    }
    get info() {
        return this.pony.ponyInfo;
    }
    get maneFill() {
        return ponyInfo_1.getBaseFill(this.info.mane);
    }
    get coatFill() {
        return this.info.coatFill;
    }
    get hoovesFill() {
        return ponyInfo_1.getBaseFill(this.info.frontHooves);
    }
    get canExport() {
        return DEVELOPMENT;
    }
    get site() {
        return utils_1.findById(this.sites, this.pony.site) || this.sites[0];
    }
    set site(value) {
        this.pony.site = value.id;
    }
    get tag() {
        return utils_1.findById(this.tags, this.pony.tag) || this.tags[0];
    }
    set tag(value) {
        this.pony.tag = value.id;
    }
    get lockEyeWhites() {
        return !this.info.unlockEyeWhites;
    }
    set lockEyeWhites(value) {
        this.info.unlockEyeWhites = !value;
    }
    get darken() {
        return !this.info.freeOutlines;
    }
    get lockFrontLegAccessory() {
        return !this.info.unlockFrontLegAccessory;
    }
    set lockFrontLegAccessory(value) {
        this.info.unlockFrontLegAccessory = !value;
    }
    get lockBackLegAccessory() {
        return !this.info.unlockBackLegAccessory;
    }
    set lockBackLegAccessory(value) {
        this.info.unlockBackLegAccessory = !value;
    }
    get lockEyelashColor() {
        return !this.info.unlockEyelashColor;
    }
    set lockEyelashColor(value) {
        this.info.unlockEyelashColor = !value;
    }
    icon(id) {
        return sign_in_box_1.getProviderIcon(id);
    }
    hasSleeves(type) {
        return ponyUtils_1.SLEEVED_ACCESSORIES.indexOf(type) !== -1;
    }
    ngOnInit() {
        if (this.model.account) {
            this.tags.push(...tags_1.getAvailableTags(this.model.account));
        }
        this.sites = this.model.sites.filter(s => !!s.name);
        this.updateMuzzles();
        let last = Date.now();
        return spriteUtils_1.loadAndInitSpriteSheets().then(() => {
            this.loaded = true;
            this.interval = setInterval(() => {
                const now = Date.now();
                this.update((now - last) / 1000);
                last = now;
            }, 1000 / 24);
        });
    }
    ngOnDestroy() {
        clearInterval(this.interval);
    }
    changed() {
        if (!this.syncTimeout) {
            this.syncTimeout = requestAnimationFrame(() => {
                this.syncTimeout = undefined;
                ponyInfo_1.syncLockedPonyInfo(this.info);
            });
        }
        if (DEVELOPMENT || BETA) {
            this.state.blushColor = colors_1.blushColor(color_1.parseColorWithAlpha(this.coatFill || '', 1));
        }
    }
    update(delta) {
        this.animationTime += delta;
        const animation = this.animations[this.activeAnimation]();
        this.state.animation = animation;
        if (this.playAnimation) {
            this.state.animationFrame = Math.floor(this.animationTime * animation.fps) % animation.frames.length;
        }
    }
    copyCoatColorToTail() {
        if (this.info.tail && this.info.tail.fills) {
            this.info.tail.fills[0] = this.info.coatFill;
            this.changed();
        }
    }
    eyeColorLockChanged(locked) {
        if (locked) {
            this.info.eyeColorLeft = this.info.eyeColorRight;
        }
    }
    eyeWhiteLockChanged(locked) {
        if (locked) {
            this.info.eyeWhitesLeft = this.info.eyeWhites;
        }
    }
    eyeOpennessChanged(locked) {
        if (locked) {
            this.info.eyeOpennessLeft = this.info.eyeOpennessRight;
        }
    }
    eyelashLockChanged(locked) {
        if (locked) {
            this.info.eyelashColorLeft = this.info.eyelashColor;
        }
    }
    select(pony) {
        if (pony) {
            this.deleting = false;
            this.pony = pony;
        }
    }
    setActiveAnimation(index) {
        this.activeAnimation = index;
        this.animationTime = 0;
    }
    freeOutlinesChanged(_free) {
        this.changed();
    }
    darkenLockedOutlinesChanged(_darken) {
        this.changed();
    }
    get canSave() {
        return !this.model.pending && !!this.pony && !!this.pony.name && !this.savingLocked;
    }
    save() {
        if (this.canSave) {
            this.error = undefined;
            this.deleting = false;
            this.savingLocked = true;
            this.model.savePony(this.pony)
                .catch((e) => this.error = e.message)
                .then(() => utils_1.delay(2000))
                .then(() => this.savingLocked = false);
        }
    }
    get canRevert() {
        return !!utils_1.findById(this.ponies, this.pony.id);
    }
    revert() {
        if (this.canRevert) {
            this.select(utils_1.findById(this.ponies, this.pony.id));
        }
    }
    get canDuplicate() {
        return this.ponies.length < this.model.characterLimit;
    }
    duplicate() {
        if (this.canDuplicate) {
            this.deleting = false;
            this.pony = utils_1.cloneDeep(this.pony);
            this.pony.name = '';
            this.pony.id = '';
        }
    }
    export(index) {
        const frameWidth = 80;
        const frameHeight = 90;
        const animations = index === undefined ? this.animations.map(a => a()) : [this.animations[index]()];
        const frames = animations.reduce((sum, a) => sum + a.frames.length, 0);
        const info = ponyInfo_1.toPalette(this.info);
        const options = ponyHelpers_1.defaultDrawPonyOptions();
        const canvas = contextSpriteBatch_1.drawCanvas(frameWidth * frames, frameHeight, sprites.paletteSpriteSheet, colors_1.TRANSPARENT, batch => {
            let i = 0;
            animations.forEach(a => {
                for (let f = 0; f < a.frames.length; f++, i++) {
                    const state = Object.assign({}, ponyHelpers_1.defaultPonyState(), { animation: a, animationFrame: f, blinkFrame: 1 });
                    ponyDraw_1.drawPony(batch, info, state, i * frameWidth + frameWidth / 2, frameHeight - 10, options);
                }
            });
        });
        const name = animations.length === 1 ? animations[0].name : 'all';
        canvasUtils_1.saveCanvas(canvas, `${this.pony.name}-${name}.png`);
    }
    import() {
        if (DEVELOPMENT) {
            const data = prompt('enter data');
            if (data) {
                this.importPony(data);
            }
        }
    }
    importPony(data) {
        if (DEVELOPMENT) {
            this.pony.ponyInfo = compressPony_1.decompressPonyString(data, true);
            const t = compressPony_1.decompressPonyString(data, false);
            console.log(JSON.stringify(t, undefined, 2));
        }
    }
    addBlush() {
        if (DEVELOPMENT || BETA) {
            this.state = Object.assign({}, this.state, { expression: clientUtils_1.createExpression(1 /* Neutral */, 1 /* Neutral */, 0 /* Smile */, 0 /* Forward */, 0 /* Forward */, 1 /* Blush */) });
            this.changed();
        }
    }
    testSize() {
        function stringifyValues(values) {
            return values.map(x => JSON.stringify(x)).join(typeof values[0] === 'object' ? ',\n\t' : ', ');
        }
        if (DEVELOPMENT) {
            const compressed = compressPony_1.compressPonyString(this.info);
            const regularSize = JSON.stringify(this.info).length;
            const ponyInfoNumber = compressPony_1.decompressPony(compressed);
            const precomp = compressPony_1.precompressPony(ponyInfoNumber, colors_1.BLACK, x => x);
            const details = Object.keys(precomp)
                .filter(key => key !== 'version')
                .map(key => ({ key, values: precomp[key] || [] }))
                .map(({ key, values }) => `${key}: [\n\t${stringifyValues(values)}\n]`)
                .join(',\n');
            const serialized = compressPony_1.compressPonyString(this.info);
            console.log(serialized);
            console.log(details);
            console.log(`${serialized.length} / ${regularSize}`);
        }
    }
    testJSON() {
        if (DEVELOPMENT) {
            console.log(JSON.stringify(this.info, undefined, 2));
        }
    }
    exportPony() {
        const data = ponyToExport(this.pony) + '\r\n';
        saveAs(new Blob([data], { type: 'text/plain;charset=utf-8' }), `${this.pony.name}.txt`);
    }
    exportPonies() {
        const data = this.ponies.map(ponyToExport).join('\r\n') + '\r\n';
        saveAs(new Blob([data], { type: 'text/plain;charset=utf-8' }), 'ponies.txt');
    }
    async importPonies(file) {
        if (file) {
            const text = await clientUtils_1.readFileAsText(file);
            const lines = text.split(/\r?\n/g);
            let imported = 0;
            for (const line of lines) {
                try {
                    const [name, info, desc = ''] = line.split(/\t/g);
                    if (name && info) {
                        const pony = {
                            name,
                            id: '',
                            info,
                            desc,
                            ponyInfo: compressPony_1.decompressPonyString(info, true),
                        };
                        await this.model.savePony(pony, true);
                        imported++;
                    }
                }
                catch (e) {
                    DEVELOPMENT && console.error(e);
                }
            }
            alert(`Imported ${imported} ponies`);
        }
    }
};
Character = tslib_1.__decorate([
    core_1.Component({
        selector: 'character',
        templateUrl: 'character.pug',
        styleUrls: ['character.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [gameService_1.GameService, model_1.Model])
], Character);
exports.Character = Character;
function ponyToExport(pony) {
    return `${pony.name}\t${pony.info}\t${pony.desc || ''}`.trim();
}
//# sourceMappingURL=character.js.map