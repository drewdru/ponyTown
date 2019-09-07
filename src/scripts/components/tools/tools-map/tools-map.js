"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const http_1 = require("@angular/common/http");
const canvasUtils_1 = require("../../../client/canvasUtils");
const spriteUtils_1 = require("../../../client/spriteUtils");
const constants_1 = require("../../../common/constants");
const icons_1 = require("../../../client/icons");
const worldMap_1 = require("../../../common/worldMap");
const interfaces_1 = require("../../../common/interfaces");
const contextSpriteBatch_1 = require("../../../graphics/contextSpriteBatch");
const sprites_1 = require("../../../generated/sprites");
const region_1 = require("../../../common/region");
const compress_1 = require("../../../common/compress");
const tileUtils_1 = require("../../../client/tileUtils");
const camera_1 = require("../../../common/camera");
const ponyInfo_1 = require("../../../common/ponyInfo");
const entityUtils_1 = require("../../../common/entityUtils");
const entities_1 = require("../../../common/entities");
const draw_1 = require("../../../client/draw");
const utils_1 = require("../../../common/utils");
const timeUtils_1 = require("../../../common/timeUtils");
const storageService_1 = require("../../services/storageService");
const colors_1 = require("../../../common/colors");
const color_1 = require("../../../common/color");
let ToolsMap = class ToolsMap {
    constructor(http, storage) {
        this.http = http;
        this.storage = storage;
        this.homeIcon = icons_1.faHome;
        this.maps = [];
        this.selectedMap = '';
        this.grid = false;
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
        await spriteUtils_1.loadAndInitSpriteSheets();
        await this.fetchList();
        await this.fetch();
    }
    setType(type) {
        this.type = type;
        this.redraw();
    }
    async fetchList() {
        this.maps = await utils_1.observableToPromise(this.http.get('/api-tools/maps'));
    }
    fetch() {
        this.http.get('/api-tools/map', { params: { map: this.selectedMap } }).subscribe(map => {
            this.info = map.info;
            const regionsX = map.width / constants_1.REGION_SIZE;
            const regionsY = map.height / constants_1.REGION_SIZE;
            const { type, defaultTile } = map;
            this.map = worldMap_1.createWorldMap({ type, flags: 0 /* None */, defaultTile, regionsX, regionsY });
            const tiles = compress_1.deserializeTiles(map.tiles);
            for (let y = 0, i = 0; y < regionsX; y++) {
                for (let x = 0; x < regionsY; x++, i++) {
                    worldMap_1.setRegion(this.map, x, y, region_1.createRegion(x, y));
                }
            }
            for (let y = 0, i = 0; y < map.height; y++) {
                for (let x = 0; x < map.width; x++, i++) {
                    worldMap_1.setTile(this.map, x, y, tiles[i]);
                }
            }
            this.redraw();
        });
    }
    selectMap(map) {
        this.selectedMap = map;
        this.fetch();
    }
    redraw() {
        this.draw();
    }
    png() {
        canvasUtils_1.saveCanvas(this.canvas.nativeElement, 'map.png');
    }
    draw() {
        if (this.map && this.info) {
            if (this.type === 'regular') {
                drawTheMap(this.canvas.nativeElement, this.map, this.info, this.scale, this.grid);
            }
            else if (this.type === 'minimap') {
                drawMinimap(this.canvas.nativeElement, this.map, this.info, this.scale);
            }
        }
    }
};
tslib_1.__decorate([
    core_1.ViewChild('canvas', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], ToolsMap.prototype, "canvas", void 0);
ToolsMap = tslib_1.__decorate([
    core_1.Component({
        selector: 'tools-map',
        templateUrl: 'tools-map.pug',
    }),
    tslib_1.__metadata("design:paramtypes", [http_1.HttpClient, storageService_1.StorageService])
], ToolsMap);
exports.ToolsMap = ToolsMap;
function drawTheMap(canvas, map, info, scale, grid) {
    const mapCanvas = contextSpriteBatch_1.drawCanvas(map.width * constants_1.tileWidth, map.height * constants_1.tileHeight, sprites_1.paletteSpriteSheet, 0x222222ff, batch => {
        const camera = camera_1.createCamera();
        camera.w = map.width * constants_1.tileWidth;
        camera.h = map.height * constants_1.tileHeight;
        const tileSets = tileUtils_1.createTileSets(ponyInfo_1.mockPaletteManager, info.season, map.type);
        const lightData = timeUtils_1.createLightData(info.season);
        const drawOptions = Object.assign({}, interfaces_1.defaultDrawOptions, { tileGrid: grid, shadowColor: timeUtils_1.getShadowColor(lightData, timeUtils_1.HOUR_LENGTH * 12) });
        const ignoreTypes = [
            entities_1.cloud, entities_1.pony, entities_1.apple, entities_1.apple2, entities_1.appleGreen, entities_1.appleGreen2, entities_1.orange, entities_1.orange2, entities_1.candy, entities_1.gift1, entities_1.gift2
        ].map(e => e.type);
        const shouldDraw = (e) => {
            return !utils_1.hasFlag(e.flags, 16 /* Debug */) && !entityUtils_1.isCritter(e) && !utils_1.includes(ignoreTypes, e.type);
        };
        map.entitiesDrawable = info.entities
            .map(({ type, id, x, y }) => entities_1.createAnEntity(type, id, x, y, {}, ponyInfo_1.mockPaletteManager, interfaces_1.defaultWorldState))
            .filter(shouldDraw);
        worldMap_1.updateMap(map, 0);
        draw_1.drawMap(batch, map, camera, {}, drawOptions, tileSets, []);
    });
    canvas.width = Math.floor(mapCanvas.width / scale);
    canvas.height = Math.floor(mapCanvas.height / scale);
    const context = canvas.getContext('2d');
    // disableImageSmoothing(context);
    context.scale(1 / scale, 1 / scale);
    context.drawImage(mapCanvas, 0, 0);
}
function drawMinimap(canvas, map, info, scale) {
    const tileWidth = 1;
    const tileHeight = 1;
    const mapCanvas = canvasUtils_1.createCanvas(map.width * tileWidth, map.height * tileHeight);
    const mapContext = mapCanvas.getContext('2d');
    worldMap_1.updateMap(map, 0);
    for (let x = 0; x < map.width; x++) {
        for (let y = 0; y < map.height; y++) {
            const tile = worldMap_1.getTile(map, x, y);
            const color = colors_1.getTileColor(tile, info.season);
            mapContext.fillStyle = color_1.colorToCSS(color);
            mapContext.fillRect(x, y, 1, 1);
        }
    }
    map.entities = info.entities
        .map(({ type, id, x, y }) => entities_1.createAnEntity(type, id, x, y, {}, ponyInfo_1.mockPaletteManager, interfaces_1.defaultWorldState));
    for (let i = 1; i <= 2; i++) {
        for (const e of map.entities) {
            if (e.minimap && e.minimap.order === i) {
                const { color, rect } = e.minimap;
                mapContext.fillStyle = color_1.colorToCSS(color);
                mapContext.fillRect(Math.round(e.x + rect.x), Math.round(e.y + rect.y), rect.w, rect.h);
            }
        }
    }
    canvas.width = mapCanvas.width * scale;
    canvas.height = mapCanvas.height * scale;
    const context = canvas.getContext('2d');
    context.save();
    if (scale >= 1) {
        canvasUtils_1.disableImageSmoothing(context);
    }
    context.scale(scale, scale);
    context.drawImage(mapCanvas, 0, 0);
    context.restore();
}
//# sourceMappingURL=tools-map.js.map