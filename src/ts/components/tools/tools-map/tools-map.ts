import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { saveCanvas, disableImageSmoothing, createCanvas } from '../../../client/canvasUtils';
import { loadAndInitSpriteSheets } from '../../../client/spriteUtils';
import { tileHeight, tileWidth, REGION_SIZE } from '../../../common/constants';
import { faHome } from '../../../client/icons';
import { updateMap, getTile, createWorldMap, setRegion, setTile } from '../../../common/worldMap';
import {
	Season, DrawOptions, defaultDrawOptions, EntityFlags, Entity, WorldMap, defaultWorldState, MapType, MapFlags
} from '../../../common/interfaces';
import { drawCanvas } from '../../../graphics/contextSpriteBatch';
import { paletteSpriteSheet } from '../../../generated/sprites';
import { createRegion } from '../../../common/region';
import { deserializeTiles } from '../../../common/compress';
import { createTileSets } from '../../../client/tileUtils';
import { createCamera } from '../../../common/camera';
import { mockPaletteManager } from '../../../common/ponyInfo';
import { isCritter } from '../../../common/entityUtils';
import {
	createAnEntity, cloud, pony, apple, apple2, orange, orange2, candy, gift1, gift2, appleGreen, appleGreen2
} from '../../../common/entities';
import { drawMap } from '../../../client/draw';
import { includes, observableToPromise, hasFlag } from '../../../common/utils';
import { getShadowColor, HOUR_LENGTH, createLightData } from '../../../common/timeUtils';
import { StorageService } from '../../services/storageService';
import { getTileColor } from '../../../common/colors';
import { colorToCSS } from '../../../common/color';

export interface ToolsMapOtherInfo {
	season: Season;
	entities: { type: number; x: number; y: number; order: number; id: number; }[];
}

export interface ToolsMapInfo {
	width: number;
	height: number;
	defaultTile: number;
	tiles?: string;
	type: MapType;
	info: ToolsMapOtherInfo;
}

@Component({
	selector: 'tools-map',
	templateUrl: 'tools-map.pug',
})
export class ToolsMap implements OnInit {
	readonly homeIcon = faHome;
	@ViewChild('canvas', { static: true }) canvas!: ElementRef;
	maps: string[] = [];
	selectedMap = '';
	grid = false;
	private map?: WorldMap;
	private info?: ToolsMapOtherInfo;
	constructor(private http: HttpClient, private storage: StorageService) {
	}
	get scale() {
		return this.storage.getInt('tools-map-scale') || 1;
	}
	set scale(value) {
		this.storage.setInt('tools-map-scale', value);
	}
	get type() {
		return this.storage.getItem('tools-map-type') || 'regular';
	}
	set type(value) {
		this.storage.setItem('tools-map-type', value);
	}
	async ngOnInit() {
		await loadAndInitSpriteSheets();
		await this.fetchList();
		await this.fetch();
	}
	setType(type: string) {
		this.type = type;
		this.redraw();
	}
	async fetchList() {
		this.maps = await observableToPromise(this.http.get<string[]>('/api-tools/maps'));
	}
	fetch() {
		this.http.get<ToolsMapInfo>('/api-tools/map', { params: { map: this.selectedMap } }).subscribe(map => {
			this.info = map.info;

			const regionsX = map.width / REGION_SIZE;
			const regionsY = map.height / REGION_SIZE;
			const { type, defaultTile } = map;

			this.map = createWorldMap({ type, flags: MapFlags.None, defaultTile, regionsX, regionsY });
			const tiles = deserializeTiles(map.tiles!);

			for (let y = 0, i = 0; y < regionsX; y++) {
				for (let x = 0; x < regionsY; x++ , i++) {
					setRegion(this.map, x, y, createRegion(x, y));
				}
			}

			for (let y = 0, i = 0; y < map.height; y++) {
				for (let x = 0; x < map.width; x++ , i++) {
					setTile(this.map, x, y, tiles[i]);
				}
			}

			this.redraw();
		});
	}
	selectMap(map: string) {
		this.selectedMap = map;
		this.fetch();
	}
	redraw() {
		this.draw();
	}
	png() {
		saveCanvas(this.canvas.nativeElement, 'map.png');
	}
	private draw() {
		if (this.map && this.info) {
			if (this.type === 'regular') {
				drawTheMap(this.canvas.nativeElement, this.map, this.info, this.scale, this.grid);
			} else if (this.type === 'minimap') {
				drawMinimap(this.canvas.nativeElement, this.map, this.info, this.scale);
			}
		}
	}
}

function drawTheMap(canvas: HTMLCanvasElement, map: WorldMap, info: ToolsMapOtherInfo, scale: number, grid: boolean) {
	const mapCanvas = drawCanvas(map.width * tileWidth, map.height * tileHeight, paletteSpriteSheet, 0x222222ff, batch => {
		const camera = createCamera();
		camera.w = map.width * tileWidth;
		camera.h = map.height * tileHeight;

		const tileSets = createTileSets(mockPaletteManager, info.season, map.type);
		const lightData = createLightData(info.season);

		const drawOptions: DrawOptions = {
			...defaultDrawOptions,
			tileGrid: grid,
			shadowColor: getShadowColor(lightData, HOUR_LENGTH * 12),
		};

		const ignoreTypes = [
			cloud, pony, apple, apple2, appleGreen, appleGreen2, orange, orange2, candy, gift1, gift2
		].map(e => e.type);

		const shouldDraw = (e: Entity) => {
			return !hasFlag(e.flags, EntityFlags.Debug) && !isCritter(e) && !includes(ignoreTypes, e.type);
		};

		map.entitiesDrawable = info.entities
			.map(({ type, id, x, y }) => createAnEntity(type, id, x, y, {}, mockPaletteManager, defaultWorldState))
			.filter(shouldDraw);

		updateMap(map, 0);
		drawMap(batch, map, camera, {} as any, drawOptions, tileSets, []);
	});

	canvas.width = Math.floor(mapCanvas.width / scale);
	canvas.height = Math.floor(mapCanvas.height / scale);
	const context = canvas.getContext('2d')!;
	// disableImageSmoothing(context);
	context.scale(1 / scale, 1 / scale);
	context.drawImage(mapCanvas, 0, 0);
}

function drawMinimap(canvas: HTMLCanvasElement, map: WorldMap, info: ToolsMapOtherInfo, scale: number) {
	const tileWidth = 1;
	const tileHeight = 1;

	const mapCanvas = createCanvas(map.width * tileWidth, map.height * tileHeight);
	const mapContext = mapCanvas.getContext('2d')!;

	updateMap(map, 0);

	for (let x = 0; x < map.width; x++) {
		for (let y = 0; y < map.height; y++) {
			const tile = getTile(map, x, y);
			const color = getTileColor(tile, info.season);
			mapContext.fillStyle = colorToCSS(color);
			mapContext.fillRect(x, y, 1, 1);
		}
	}

	map.entities = info.entities
		.map(({ type, id, x, y }) => createAnEntity(type, id, x, y, {}, mockPaletteManager, defaultWorldState));

	for (let i = 1; i <= 2; i++) {
		for (const e of map.entities) {
			if (e.minimap && e.minimap.order === i) {
				const { color, rect } = e.minimap;
				mapContext.fillStyle = colorToCSS(color);
				mapContext.fillRect(Math.round(e.x + rect.x), Math.round(e.y + rect.y), rect.w, rect.h);
			}
		}
	}

	canvas.width = mapCanvas.width * scale;
	canvas.height = mapCanvas.height * scale;
	const context = canvas.getContext('2d')!;
	context.save();

	if (scale >= 1) {
		disableImageSmoothing(context);
	}

	context.scale(scale, scale);
	context.drawImage(mapCanvas, 0, 0);
	context.restore();
}
