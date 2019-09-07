"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const lodash_1 = require("lodash");
const sheetExport_1 = require("../sheetExport");
const spriteUtils_1 = require("../../../client/spriteUtils");
const canvasUtils_1 = require("../../../client/canvasUtils");
const icons_1 = require("../../../client/icons");
const storageService_1 = require("../../services/storageService");
const utils_1 = require("../../../common/utils");
const sheets_1 = require("../../../common/sheets");
let ToolsSheet = class ToolsSheet {
    constructor(storage) {
        this.storage = storage;
        this.homeIcon = icons_1.faHome;
        this.syncIcon = icons_1.faSync;
        this.imageIcon = icons_1.faFileImage;
        this.sheets = sheets_1.sheets;
        this.sheet = sheets_1.sheets[0];
        this.scale = 2;
        this.rows = 1;
        this.cols = 1;
        this.pattern = -1;
        const sheet = utils_1.at(this.sheets, storage.getInt('tools-sheet-sheet'));
        if ('name' in sheet) {
            this.setSheet(sheet);
        }
    }
    ngOnInit() {
        spriteUtils_1.loadAndInitSpriteSheets()
            .then(() => this.redraw());
    }
    setSheet(sheet) {
        sheet = sheet.spacer ? this.sheets[0] : sheet;
        this.sheet = sheet;
        this.cols = sheetExport_1.getCols(sheet);
        this.rows = sheetExport_1.getRows(sheet);
        this.redraw();
        this.storage.setInt('tools-sheet-sheet', this.sheets.indexOf(sheet));
    }
    png() {
        this.redraw();
        canvasUtils_1.saveCanvas(this.canvas.nativeElement, 'sheet.png');
    }
    psd() {
        const psd = sheetExport_1.createPsd(this.sheet, this.rows, this.cols);
        psd.canvas = sheetExport_1.drawPsd(psd, 1);
        sheetExport_1.savePsd(psd, `${this.sheet.file}.psd`);
    }
    allPSDs() {
        this.sheets
            .filter(x => 'name' in x && !!x.file)
            .map(x => x)
            .forEach(sheet => {
            const rows = sheetExport_1.getRows(sheet);
            const cols = sheetExport_1.getCols(sheet);
            const psd = sheetExport_1.createPsd(sheet, rows, cols);
            psd.canvas = sheetExport_1.drawPsd(psd, 1);
            sheetExport_1.savePsd(psd, `${sheet.file}.psd`);
        });
    }
    redraw() {
        if (this.canvas) {
            const psd = sheetExport_1.createPsd(this.sheet, this.rows, this.cols);
            const layers = lodash_1.compact(psd.children.map(c => c.children));
            const patterns = lodash_1.compact(layers.map(xs => xs.find(x => x.name === `pattern ${this.pattern}`)));
            patterns.forEach(x => x.hidden = false);
            sheetExport_1.drawPsd(psd, this.scale, this.canvas.nativeElement);
        }
    }
};
tslib_1.__decorate([
    core_1.ViewChild('canvas', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], ToolsSheet.prototype, "canvas", void 0);
ToolsSheet = tslib_1.__decorate([
    core_1.Component({
        selector: 'tools-sheet',
        templateUrl: 'tools-sheet.pug',
        styleUrls: ['tools-sheet.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [storageService_1.StorageService])
], ToolsSheet);
exports.ToolsSheet = ToolsSheet;
//# sourceMappingURL=tools-sheet.js.map