import { Component, NgZone } from '@angular/core';
import { uniq } from 'lodash';
import { faEdit, faCog, faDrawPolygon, faTrash, emptyIcon, faCheck } from '../../../client/icons';
import { PonyTownGame, engines } from '../../../client/game';
import { StorageService } from '../../services/storageService';
import { Model, getEntityNameFromType, getEntityNames } from '../../services/model';
import { getAlpha, withAlpha, colorToHexRGB, parseColor } from '../../../common/color';
import { BLACK } from '../../../common/colors';
import { Entity, Engine, EngineInfo, DebugFlags, tileTypeNames } from '../../../common/interfaces';

@Component({
	selector: 'editor-box',
	templateUrl: 'editor-box.pug',
})
export class EditorBox {
	readonly dev = DEVELOPMENT;
	readonly cogIcon = faCog;
	readonly editIcon = faEdit;
	readonly selectIcon = faDrawPolygon;
	readonly deleteIcon = faTrash;
	readonly checkIcon = faCheck;
	readonly emptyIcon = emptyIcon;
	readonly tiles = ['---', ...tileTypeNames];
	readonly engines = engines;
	readonly editorEntities: string[];
	readonly showFields: (keyof DebugFlags)[] = ['id', 'bounds', 'collider', 'cover', 'interact', 'trigger'];
	private showEditor = false;
	constructor(
		public model: Model,
		private game: PonyTownGame,
		private storage: StorageService,
		private zone: NgZone,
	) {
		this.game.editor.type = this.storage.getItem('editor-entity') || 'rock';
		this.showEditor = this.storage.getBoolean('show-editor');
		this.editorEntities = getEntityNames().slice().sort();
	}
	get editor() {
		return this.game.editor;
	}
	get hasElevation() {
		return this.game.engine === Engine.LayeredTiles;
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
	set editorEntity(value: string) {
		this.game.editor.type = value;
		this.storage.setItem('editor-entity', value);
	}
	get editorTile() {
		return this.game.editor.tile;
	}
	set editorTile(value: number) {
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
		return getAlpha(this.game.shadowColor);
	}
	set shadowOpacity(value) {
		this.game.shadowColor = withAlpha(this.game.shadowColor, value);
	}
	private getEntityName(type: number) {
		return getEntityNameFromType(type);
	}
	private getEntityValue<T>(map: (entity: Entity) => T) {
		const entity = this.editor.selectedEntities[0] as any;
		return map(entity);
	}
	get entityName() {
		const entities = this.editor.selectedEntities;
		const types = entities.map(e => e.type);
		const names = uniq(types).map(type => this.getEntityName(type)).join(', ');
		return types.length === 1 ? `${names} [${entities[0].id}]` : names;
	}
	get entityLightColor() {
		return colorToHexRGB(this.getEntityValue(e => e && e.lightColor || BLACK));
	}
	set entityLightColor(value) {
		this.editor.selectedEntities.forEach(e => e.lightColor = parseColor(value));
	}
	get entityLightSpriteColor() {
		const entity = this.editor.selectedEntities[0];
		return colorToHexRGB(entity && entity.lightSpriteColor || BLACK);
	}
	set entityLightSpriteColor(value) {
		this.editor.selectedEntities.forEach(e => e.lightSpriteColor = parseColor(value));
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
	setEngine(engine: EngineInfo) {
		this.game.engine = engine.engine;
	}
	isActiveEngine(engine: EngineInfo) {
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
	toggleShow(field: keyof DebugFlags) {
		(this.game.debug as any)[field] = !this.isShow(field);
		this.game.saveDebug();
	}
	isShow(field: keyof DebugFlags) {
		return !!this.game.debug[field];
	}
}
