import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { compact } from 'lodash';
import { getCols, getRows, createPsd, savePsd, drawPsd } from '../sheetExport';
import { loadAndInitSpriteSheets } from '../../../client/spriteUtils';
import { saveCanvas } from '../../../client/canvasUtils';
import { faHome, faSync, faFileImage } from '../../../client/icons';
import { StorageService } from '../../services/storageService';
import { at } from '../../../common/utils';
import { sheets, Sheet } from '../../../common/sheets';

@Component({
	selector: 'tools-sheet',
	templateUrl: 'tools-sheet.pug',
	styleUrls: ['tools-sheet.scss'],
})
export class ToolsSheet implements OnInit {
	readonly homeIcon = faHome;
	readonly syncIcon = faSync;
	readonly imageIcon = faFileImage;
	@ViewChild('canvas', { static: true }) canvas!: ElementRef;
	sheets = sheets;
	sheet = sheets[0] as Sheet;
	scale = 2;
	rows = 1;
	cols = 1;
	pattern = -1;
	constructor(private storage: StorageService) {
		const sheet = at(this.sheets, storage.getInt('tools-sheet-sheet'))!;

		if ('name' in sheet) {
			this.setSheet(sheet);
		}
	}
	ngOnInit() {
		loadAndInitSpriteSheets()
			.then(() => this.redraw());
	}
	setSheet(sheet: Sheet) {
		sheet = sheet.spacer ? this.sheets[0] as Sheet : sheet;
		this.sheet = sheet;
		this.cols = getCols(sheet);
		this.rows = getRows(sheet);
		this.redraw();
		this.storage.setInt('tools-sheet-sheet', this.sheets.indexOf(sheet));
	}
	png() {
		this.redraw();
		saveCanvas(this.canvas.nativeElement, 'sheet.png');
	}
	psd() {
		const psd = createPsd(this.sheet, this.rows, this.cols);
		psd.canvas = drawPsd(psd, 1);
		savePsd(psd, `${this.sheet.file}.psd`);
	}
	allPSDs() {
		this.sheets
			.filter(x => 'name' in x && !!x.file)
			.map(x => x as Sheet)
			.forEach(sheet => {
				const rows = getRows(sheet);
				const cols = getCols(sheet);
				const psd = createPsd(sheet, rows, cols);
				psd.canvas = drawPsd(psd, 1);
				savePsd(psd, `${sheet.file}.psd`);
			});
	}
	redraw() {
		if (this.canvas) {
			const psd = createPsd(this.sheet, this.rows, this.cols);
			const layers = compact(psd.children!.map(c => c.children));
			const patterns = compact(layers.map(xs => xs.find(x => x.name === `pattern ${this.pattern}`)));
			patterns.forEach(x => x.hidden = false);
			drawPsd(psd, this.scale, this.canvas.nativeElement);
		}
	}
}
