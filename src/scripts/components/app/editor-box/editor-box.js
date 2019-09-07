"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const lodash_1 = require("lodash");
const icons_1 = require("../../../client/icons");
const game_1 = require("../../../client/game");
const storageService_1 = require("../../services/storageService");
const model_1 = require("../../services/model");
const color_1 = require("../../../common/color");
const colors_1 = require("../../../common/colors");
const interfaces_1 = require("../../../common/interfaces");
let EditorBox = class EditorBox {
    constructor(model, game, storage, zone) {
        this.model = model;
        this.game = game;
        this.storage = storage;
        this.zone = zone;
        this.dev = DEVELOPMENT;
        this.cogIcon = icons_1.faCog;
        this.editIcon = icons_1.faEdit;
        this.selectIcon = icons_1.faDrawPolygon;
        this.deleteIcon = icons_1.faTrash;
        this.checkIcon = icons_1.faCheck;
        this.emptyIcon = icons_1.emptyIcon;
        this.tiles = ['---', ...interfaces_1.tileTypeNames];
        this.engines = game_1.engines;
        this.showFields = ['id', 'bounds', 'collider', 'cover', 'interact', 'trigger'];
        this.showEditor = false;
        this.game.editor.type = this.storage.getItem('editor-entity') || 'rock';
        this.showEditor = this.storage.getBoolean('show-editor');
        this.editorEntities = model_1.getEntityNames().slice().sort();
    }
    get editor() {
        return this.game.editor;
    }
    get hasElevation() {
        return this.game.engine === interfaces_1.Engine.LayeredTiles;
    }
    get editorElevation() {
        return this.game.editor.elevation;
    }
    get editorSpecial() {
        return this.game.editor.special;
    }
    get editorEntity() {
        return this.game.editor.type;
    }
    set editorEntity(value) {
        this.game.editor.type = value;
        this.storage.setItem('editor-entity', value);
    }
    get editorTile() {
        return this.game.editor.tile;
    }
    set editorTile(value) {
        this.game.editor.tile = value;
    }
    get hasEditor() {
        return this.model.isMod && this.showEditor;
    }
    get oneEntity() {
        return this.editor.selectedEntities[0];
    }
    get singleEntity() {
        return this.editor.selectedEntities.length === 1;
    }
    get hasSelectedEntities() {
        return this.editor.selectedEntities.length > 0;
    }
    get isLightEntity() {
        return this.editor.selectedEntities.some(e => !!e.drawLight);
    }
    get isLightSpriteEntity() {
        return this.editor.selectedEntities.some(e => !!e.drawLightSprite);
    }
    get selectingEntities() {
        return this.game.editor.selectingEntities;
    }
    set selectingEntities(value) {
        this.game.editor.selectingEntities = value;
    }
    get shadowOpacity() {
        return color_1.getAlpha(this.game.shadowColor);
    }
    set shadowOpacity(value) {
        this.game.shadowColor = color_1.withAlpha(this.game.shadowColor, value);
    }
    getEntityName(type) {
        return model_1.getEntityNameFromType(type);
    }
    getEntityValue(map) {
        const entity = this.editor.selectedEntities[0];
        return map(entity);
    }
    get entityName() {
        const entities = this.editor.selectedEntities;
        const types = entities.map(e => e.type);
        const names = lodash_1.uniq(types).map(type => this.getEntityName(type)).join(', ');
        return types.length === 1 ? `${names} [${entities[0].id}]` : names;
    }
    get entityLightColor() {
        return color_1.colorToHexRGB(this.getEntityValue(e => e && e.lightColor || colors_1.BLACK));
    }
    set entityLightColor(value) {
        this.editor.selectedEntities.forEach(e => e.lightColor = color_1.parseColor(value));
    }
    get entityLightSpriteColor() {
        const entity = this.editor.selectedEntities[0];
        return color_1.colorToHexRGB(entity && entity.lightSpriteColor || colors_1.BLACK);
    }
    set entityLightSpriteColor(value) {
        this.editor.selectedEntities.forEach(e => e.lightSpriteColor = color_1.parseColor(value));
    }
    get entityLightSpriteX() {
        const entity = this.editor.selectedEntities[0];
        return entity && entity.lightSpriteX || 0;
    }
    set entityLightSpriteX(value) {
        console.log('set x', value, this.editor.selectedEntities);
        this.editor.selectedEntities.forEach(e => e.lightSpriteX = value);
    }
    get entityLightSpriteY() {
        const entity = this.editor.selectedEntities[0];
        return entity && entity.lightSpriteY || 0;
    }
    set entityLightSpriteY(value) {
        this.editor.selectedEntities.forEach(e => e.lightSpriteY = value);
    }
    get entityLightScale() {
        return this.editor.selectedEntities.length ? this.editor.selectedEntities[0].lightScaleAdjust : 1;
    }
    set entityLightScale(value) {
        this.editor.selectedEntities.forEach(e => e.lightScaleAdjust = value);
    }
    get entityX() {
        return this.oneEntity.x;
    }
    set entityX(value) {
        this.oneEntity.x = value;
        const { id, x, y } = this.oneEntity;
        this.game.send(server => server.editorAction({
            type: 'move',
            entities: [{ id, x, y }],
        }));
    }
    get entityY() {
        return this.oneEntity.y;
    }
    set entityY(value) {
        this.oneEntity.y = value;
        const { id, x, y } = this.oneEntity;
        this.game.send(server => server.editorAction({
            type: 'move',
            entities: [{ id, x, y }],
        }));
    }
    editorClear() {
        this.game.send(server => server.editorAction({ type: 'clear' }));
    }
    clearLocalStorage() {
        this.storage.clear();
    }
    setEngine(engine) {
        this.game.engine = engine.engine;
    }
    isActiveEngine(engine) {
        return this.game.engine === engine.engine;
    }
    toggleEditor() {
        this.zone.run(() => {
            this.showEditor = !this.showEditor;
            this.storage.setBoolean('show-editor', this.showEditor);
        });
    }
    toggleSelecting() {
        this.selectingEntities = !this.selectingEntities;
        if (!this.selectingEntities) {
            this.editor.selectedEntities.length = 0;
        }
    }
    listEntities() {
        this.game.send(server => server.editorAction({ type: 'list' }));
    }
    deleteEntities() {
        const entities = this.editor.selectedEntities.map(e => e.id);
        this.game.send(server => server.editorAction({ type: 'remove', entities }));
        this.editor.selectedEntities.length = 0;
    }
    showEntitiesInfo() {
        console.log(this.editor.selectedEntities);
    }
    toggleShow(field) {
        this.game.debug[field] = !this.isShow(field);
        this.game.saveDebug();
    }
    isShow(field) {
        return !!this.game.debug[field];
    }
};
EditorBox = tslib_1.__decorate([
    core_1.Component({
        selector: 'editor-box',
        templateUrl: 'editor-box.pug',
    }),
    tslib_1.__metadata("design:paramtypes", [model_1.Model,
        game_1.PonyTownGame,
        storageService_1.StorageService,
        core_1.NgZone])
], EditorBox);
exports.EditorBox = EditorBox;
//# sourceMappingURL=editor-box.js.map