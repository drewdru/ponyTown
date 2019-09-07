"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const canvasUtils_1 = require("../../../client/canvasUtils");
const ponyInfo_1 = require("../../../common/ponyInfo");
const ponyHelpers_1 = require("../../../client/ponyHelpers");
const contextSpriteBatch_1 = require("../../../graphics/contextSpriteBatch");
const spriteUtils_1 = require("../../../client/spriteUtils");
const compressPony_1 = require("../../../common/compressPony");
const ponyDraw_1 = require("../../../client/ponyDraw");
const icons_1 = require("../../../client/icons");
const sprites_1 = require("../../../generated/sprites");
let ToolsVariants = class ToolsVariants {
    constructor() {
        this.homeIcon = icons_1.faHome;
        this.vertical = 'backMane';
        this.horizontal = 'mane';
        this.coat = 'red';
        this.hair = 'gold';
        this.justHead = false;
        this.scale = 2;
        this.pony = ponyInfo_1.createDefaultPony();
        this.state = ponyHelpers_1.defaultPonyState();
        this.fields = Object.keys(this.pony)
            .filter(key => {
            const value = this.pony[key];
            return value && value.type !== undefined;
        });
    }
    ngOnInit() {
        spriteUtils_1.loadAndInitSpriteSheets()
            .then(() => this.redraw());
    }
    redraw() {
        this.draw();
    }
    draw() {
        this.pony.coatFill = this.coat;
        this.pony.mane.fills[0] = this.hair;
        ponyInfo_1.syncLockedPonyInfo(this.pony);
        this.fields.forEach(f => this.pony[f].type = 0);
        this.pony[this.vertical].type = 999;
        this.pony[this.horizontal].type = 999;
        const fixed = compressPony_1.decompressPony(compressPony_1.compressPonyString(this.pony));
        const maxX = fixed[this.horizontal].type;
        const maxY = fixed[this.vertical].type;
        const scale = this.scale;
        const info = ponyInfo_1.toPalette(this.pony);
        const buffer = canvasUtils_1.createCanvas(80, 80);
        const batch = new contextSpriteBatch_1.ContextSpriteBatch(buffer);
        const options = ponyHelpers_1.defaultDrawPonyOptions();
        const canvas = this.canvas.nativeElement;
        canvas.width = ((maxX + 1) * (this.justHead ? 45 : 60) + 10) * scale;
        canvas.height = ((maxY + 1) * (this.justHead ? 45 : 60) + 10) * scale;
        const viewContext = canvas.getContext('2d');
        viewContext.save();
        canvasUtils_1.disableImageSmoothing(viewContext);
        viewContext.scale(scale, scale);
        viewContext.fillStyle = 'LightGreen';
        viewContext.fillRect(0, 0, canvas.width, canvas.height);
        for (let y = 0; y <= maxY; y++) {
            info[this.vertical].type = y;
            for (let x = 0; x <= maxX; x++) {
                batch.start(sprites_1.paletteSpriteSheet, 0);
                info[this.horizontal].type = x;
                ponyDraw_1.drawPony(batch, info, this.state, 40, 60, options);
                batch.end();
                if (this.justHead) {
                    viewContext.drawImage(buffer, 0, 0, 55, 45, x * 45 - 10, y * 45, 55, 45);
                }
                else {
                    viewContext.drawImage(buffer, x * 60 - 10, y * 60);
                }
            }
        }
        viewContext.restore();
    }
};
tslib_1.__decorate([
    core_1.ViewChild('canvas', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], ToolsVariants.prototype, "canvas", void 0);
ToolsVariants = tslib_1.__decorate([
    core_1.Component({
        selector: 'tools-variants',
        templateUrl: 'tools-variants.pug',
        styleUrls: ['tools-variants.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [])
], ToolsVariants);
exports.ToolsVariants = ToolsVariants;
//# sourceMappingURL=tools-variants.js.map