"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const ponyInfo_1 = require("../../../common/ponyInfo");
const ponyHelpers_1 = require("../../../client/ponyHelpers");
const expressions_1 = require("../../../common/expressions");
const canvasUtils_1 = require("../../../client/canvasUtils");
const contextSpriteBatch_1 = require("../../../graphics/contextSpriteBatch");
const colors_1 = require("../../../common/colors");
const spriteUtils_1 = require("../../../client/spriteUtils");
const ponyAnimations_1 = require("../../../client/ponyAnimations");
const ponyDraw_1 = require("../../../client/ponyDraw");
const icons_1 = require("../../../client/icons");
const sprites_1 = require("../../../generated/sprites");
let ToolsExpressions = class ToolsExpressions {
    constructor() {
        this.homeIcon = icons_1.faHome;
        this.scale = 2;
        this.columns = 12;
    }
    ngOnInit() {
        spriteUtils_1.loadAndInitSpriteSheets()
            .then(() => this.redraw());
    }
    redraw() {
        this.draw();
    }
    png() {
        this.draw();
        canvasUtils_1.saveCanvas(this.canvas.nativeElement, 'expressions.png');
    }
    draw() {
        drawSheet(this.canvas.nativeElement, this.scale, this.columns);
    }
};
tslib_1.__decorate([
    core_1.ViewChild('canvas', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], ToolsExpressions.prototype, "canvas", void 0);
ToolsExpressions = tslib_1.__decorate([
    core_1.Component({
        selector: 'tools-expressions',
        templateUrl: 'tools-expressions.pug',
    }),
    tslib_1.__metadata("design:paramtypes", [])
], ToolsExpressions);
exports.ToolsExpressions = ToolsExpressions;
function drawSheet(canvas, scale, columns, bg = 'lightgreen') {
    const frameWidth = 55;
    const frameOffset = 50;
    const frameHeight = 30;
    const buffer = canvasUtils_1.createCanvas(frameWidth, frameHeight);
    const batch = new contextSpriteBatch_1.ContextSpriteBatch(buffer);
    const pony = createPony();
    const state = createState();
    const info = ponyInfo_1.toPalette(pony);
    const filteredExpressions = expressions_1.expressions.filter(([, expr]) => !!expr).slice(2);
    const rows = Math.ceil(filteredExpressions.length / columns);
    const options = ponyHelpers_1.defaultDrawPonyOptions();
    canvas.width = ((frameOffset * (columns - 1)) + frameWidth) * scale;
    canvas.height = (frameHeight * rows) * scale;
    const viewContext = canvas.getContext('2d');
    viewContext.save();
    canvasUtils_1.disableImageSmoothing(viewContext);
    viewContext.scale(scale, scale);
    if (bg) {
        viewContext.fillStyle = bg;
        viewContext.fillRect(0, 0, canvas.width, canvas.height);
    }
    viewContext.font = 'normal 6px monospace';
    viewContext.textAlign = 'right';
    viewContext.fillStyle = 'black';
    filteredExpressions.forEach(([name, [right, left, muzzle, rightIris = 0, leftIris = 0, extra = 0]], i) => {
        state.expression = { right, left, muzzle, rightIris, leftIris, extra };
        batch.start(sprites_1.paletteSpriteSheet, 0);
        ponyDraw_1.drawPony(batch, info, state, 35, 50, options);
        batch.end();
        const x = (i % columns) * frameOffset;
        const y = Math.floor(i / columns) * frameHeight;
        viewContext.drawImage(buffer, x, y);
        viewContext.fillText(name, x + 18, y + 20);
    });
    viewContext.restore();
    return canvas;
}
function createState() {
    const state = ponyHelpers_1.defaultPonyState();
    state.blushColor = colors_1.RED;
    state.animation = ponyAnimations_1.createBodyAnimation('', 24, false, [[0, 1]]);
    return state;
}
function createPony() {
    const pony = ponyInfo_1.createDefaultPony();
    pony.mane.type = 0;
    pony.backMane.type = 0;
    pony.tail.type = 0;
    pony.coatFill = 'dec078';
    pony.lockCoatOutline = true;
    pony.lockBackLegAccessory = false;
    pony.eyeColorRight = 'cornflowerblue';
    return ponyInfo_1.syncLockedPonyInfo(pony);
}
//# sourceMappingURL=tools-expressions.js.map