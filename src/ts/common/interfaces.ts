import { Texture2D } from '../graphics/webgl/texture2d';
import { WHITE, SHADOW_COLOR } from './colors';
import { AnimationPlayer } from './animationPlayer';
import { Animator } from './animator';

export type Log = (...args: any[]) => void;
export type Apply = (func: () => void) => void;
export type Matrix4 = Float32Array;
export type Matrix2D = Float32Array;

export interface Dict<T> {
	[key: string]: T;
}

export const enum Season {
	Summer = 1,
	Autumn = 2,
	Winter = 4,
	Spring = 8,
}

export const enum Holiday {
	None,
	Christmas,
	Halloween,
	StPatricks,
	Easter,
}

export const enum Weather {
	None,
	Rain,
}

export const enum MapType {
	None,
	Island,
	House,
	Cave,
}

export const enum MapFlags {
	None = 0,
	EditableWalls = 1,
	EditableEntities = 2,
	EditableTiles = 4,
	EdibleGrass = 8,
}

export const enum NotificationFlags {
	None = 0,
	Ok = 1,
	Yes = 2,
	No = 4,
	Accept = 8,
	Reject = 16,
	Supporter = 32,
	Ignore = 64,
	NameBad = 128,
}

export interface Notification {
	id: number;
	message: string;
	note?: string;
	flags: NotificationFlags;
	pony: Pony;
	open: boolean;
	fresh: boolean;
}

export interface Palette {
	x: number;
	y: number;
	u: number;
	v: number;
	refs: number;
	colors: Uint32Array;
}

export interface JoinResponse {
	token?: string;
	alert?: string;
}

export interface PaletteManager {
	add(colors: number[]): Palette;
	addArray(colors: Uint32Array): Palette;
	init(gl: WebGLRenderingContext): void;
}

export type Batch = Float32Array;

export interface SpriteBatchBase {
	globalAlpha: number;
	crop(x: number, y: number, w: number, h: number): void;
	clearCrop(): void;
	save(): void;
	restore(): void;
	translate(x: number, y: number): void;
	scale(x: number, y: number): void;
	rotate(angle: number): void;
	multiplyTransform(mat: Matrix2D): void;
	drawBatch(batch: Batch): void;
	startBatch(): void;
	finishBatch(): Batch | undefined;
	releaseBatch(batch: Batch): void;
}

export interface SpriteBatchCommons extends SpriteBatchBase {
	palette: boolean;
	depth?: number;
	drawRect(color: number, x: number, y: number, w: number, h: number): void;
}

export interface SpriteBatch extends SpriteBatchCommons {
	drawImage(
		color: number,
		sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number
	): void;
	drawSprite(sprite: Sprite | undefined, color: number, x: number, y: number): void;
}

export interface PaletteSpriteBatch extends SpriteBatchCommons {
	drawImage(
		type: number, color: number, palette: Palette | undefined,
		sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number
	): void;
	drawSprite(sprite: Sprite, color: number, palette: Palette | undefined, x: number, y: number): void;
}

export function isPaletteSpriteBatch(batch: SpriteBatch | PaletteSpriteBatch): batch is PaletteSpriteBatch {
	return batch.palette;
}

export interface ServerFeatureFlags {
	test?: boolean; // test server
	editor?: boolean; // editor
	// more flags here ...
}

export const enum ServerFlags {
	None = 0,
	TreeCrown = 1,
	DoNotSave = 2,
	Seasonal = 4,
}

export const enum EntityFlags {
	None = 0,
	Movable = 1,
	Decal = 2,
	Critter = 4,
	Usable = 8,
	Debug = 16,
	StaticY = 32, // ignore ground Y
	CanCollide = 64, // can this object collide with other objects
	CanCollideWith = 128, // can other objects collide with this one
	Interactive = 256,
	Light = 512,
	OnOff = 1024,
	Bobbing = 2048,
	IgnoreTool = 4096,
}

export const enum EntityState {
	None = 0,

	// general
	Flying = 1,
	FacingRight = 2,

	// lights
	On = 4,

	// other
	Editable = 8,

	// pony
	HeadTurned = 4,
	Magic = 8,
	// CanFly ?, // Or in flags ?

	// pony state
	PonyStanding = 0 << 4,
	PonyWalking = 1 << 4,
	PonyTrotting = 2 << 4,
	PonySitting = 3 << 4,
	PonyLying = 4 << 4,
	PonyFlying = 5 << 4,
	PonyStateMask = 0xf << 4,

	// animated entities
	AnimationMask = 0xf << 4,

	// max 0xff
}

export const enum EntityPlayerState {
	None = 0,
	Ignored = 1,
	Hidden = 2,
	Friend = 4,

	// max 0xff
}

export function getAnimationFromEntityState(state: EntityState) {
	return (state & EntityState.AnimationMask) >> 4;
}

export function setAnimationToEntityState(state: EntityState, animation: number) {
	return (state & ~EntityState.AnimationMask) | (animation << 4);
}

export const enum MessageType {
	Chat = 0,
	System = 1,
	Admin = 2,
	Mod = 3,
	Party = 4,
	Thinking = 5,
	PartyThinking = 6,
	Announcement = 7,
	PartyAnnouncement = 8,
	Supporter1 = 9,
	Supporter2 = 10,
	Supporter3 = 11,
	Dismiss = 12,
	Whisper = 13,
	WhisperTo = 14,
	WhisperAnnouncement = 15,
	WhisperToAnnouncement = 16,
}

export function toMessageType(type: MessageType) {
	if (type === MessageType.WhisperAnnouncement) {
		return MessageType.WhisperToAnnouncement;
	} else {
		return MessageType.WhisperTo;
	}
}

export function toAnnouncementMessageType(type: ChatType) {
	switch (type) {
		case ChatType.Party: return MessageType.PartyAnnouncement;
		case ChatType.Whisper: return MessageType.WhisperAnnouncement;
		default: return MessageType.Announcement;
	}
}

export function isWhisper(type: MessageType) {
	return type === MessageType.Whisper ||
		type === MessageType.WhisperAnnouncement;
}

export function isWhisperTo(type: MessageType) {
	return type === MessageType.WhisperTo ||
		type === MessageType.WhisperToAnnouncement;
}

export function isThinking(type: MessageType) {
	return type === MessageType.Thinking ||
		type === MessageType.PartyThinking;
}

export function isModOrAdminMessage(type: MessageType) {
	return type === MessageType.Mod ||
		type === MessageType.Admin;
}

export function isPartyMessage(type: MessageType) {
	return type === MessageType.Party ||
		type === MessageType.PartyThinking ||
		type === MessageType.PartyAnnouncement;
}

export function isPublicMessage(type: MessageType) {
	return type === MessageType.Chat ||
		type === MessageType.Thinking ||
		type === MessageType.Announcement ||
		type === MessageType.Admin ||
		type === MessageType.Mod ||
		type === MessageType.Supporter1 ||
		type === MessageType.Supporter2 ||
		type === MessageType.Supporter3;
}

export function isNonIgnorableMessage(type: MessageType) {
	return isModOrAdminMessage(type) ||
		isPartyMessage(type) ||
		type === MessageType.System ||
		type === MessageType.Dismiss ||
		type === MessageType.Announcement;
}

export const enum ChatType {
	Say = 0,
	Party = 1,
	Think = 2,
	PartyThink = 3,
	Supporter = 4,
	Supporter1 = 5,
	Supporter2 = 6,
	Supporter3 = 7,
	Dismiss = 8,
	Whisper = 9,
}

export function isPartyChat(type: ChatType | undefined) {
	return type === ChatType.Party || type === ChatType.PartyThink;
}

export function isPublicChat(type: ChatType) {
	return type !== ChatType.Party &&
		type !== ChatType.PartyThink &&
		type !== ChatType.Dismiss &&
		type !== ChatType.Whisper;
}

export interface Point {
	x: number;
	y: number;
}

export interface Size {
	width: number;
	height: number;
}

export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface Camera extends Rect {
	offset: number;
	shift: number;
	shiftTarget: number;
	shiftRatio: number;
	actualY: number;
}

export interface Sprite {
	x: number;
	y: number;
	w: number;
	h: number;
	ox: number;
	oy: number;
	type: number;
}

export interface SpriteSheet {
	src?: string;
	srcA?: string;
	data?: ImageData;
	texture: Texture2D | undefined;
	sprites: (Sprite | undefined)[];
	palette: boolean;
}

export interface SpriteBorder {
	border: number;
	topLeft: Sprite;
	top: Sprite;
	topRight: Sprite;
	left: Sprite;
	bg: Sprite;
	right: Sprite;
	bottomLeft: Sprite;
	bottom: Sprite;
	bottomRight: Sprite;
	palette?: number[];
}

export interface SpritePalette {
	sprite: Sprite;
	palette: number[];
}

export interface SpriteMap {
	[key: string]: Sprite;
}

export interface PonyEye {
	base?: Sprite;
	irises: (Sprite | undefined)[];
	shadow?: Sprite;
	shine?: Sprite;
}

export interface PonyNose extends ColorExtra {
	mouth?: Sprite;
	fangs?: Sprite;
}

export interface FillOutline {
	fill: Sprite;
	outline?: Sprite;
	extra?: Sprite;
}

export interface Says {
	created: number;
	message: string;
	type?: MessageType;
	timer?: number;
	total?: number;
}

export interface PaletteRenderable {
	color?: Sprite;
	shadow?: Sprite;
	palettes?: Uint32Array[];
}

export interface Collider {
	x: number;
	y: number;
	w: number;
	h: number;
	tall: boolean;
	exact: boolean;
}

export const enum InteractAction {
	None,
	Toolbox,
	GiveLantern,
	GiveFruits,
	GiveCookie1,
	GiveCookie2,
}

export interface EntityPart {
	// info
	name?: string;
	crc?: number;
	tag?: string;
	fake?: boolean;

	// chat
	says?: Says;
	chatX?: number;
	chatY?: number;
	chatBounds?: Rect;

	// interaction
	interactBounds?: Rect;
	interactRange?: number;

	// collisions
	colliders?: Collider[];
	collidersBounds?: Rect;

	// cover
	coverBounds?: Rect;
	coverLifted?: boolean;
	coverLifting?: number;

	// pickable
	pickableX?: number;
	pickableY?: number;

	// update
	update?(delta: number, gameTime: number): void | boolean;

	// draw
	ox?: number;
	oy?: number;
	oz?: number;
	bounds?: Rect;
	draw?(batch: PaletteSpriteBatch, options: DrawOptions): void;

	// light
	lightOn?: boolean;
	lightScale?: number;
	lightTarget?: number;
	lightColor?: number;
	lightScaleAdjust?: number;
	lightBounds?: Rect;
	drawLight?(batch: SpriteBatch, options: DrawOptions): void;

	// light sprite
	lightSpriteOn?: boolean;
	lightSpriteX?: number;
	lightSpriteY?: number;
	lightSpriteColor?: number;
	lightSpriteBounds?: Rect;
	drawLightSprite?(batch: SpriteBatch, options: DrawOptions): void;

	// trigger
	triggerBounds?: Rect;
	triggerTall?: boolean;
	triggerOn?: boolean;

	// bobbing
	bobsFps?: number;
	bobs?: number[];

	// resources to release
	palettes?: (Palette | undefined)[];

	// server
	// expr?: number;
	serverFlags?: ServerFlags;

	// other
	text?: string;
	inTheAirDelay?: number;
	options?: EntityOrPonyOptions;
	extraOptions?: any;
	selected?: boolean;

	// for setting entity fields
	order?: number;
	flags?: EntityFlags;
	state?: EntityState;
	vx?: number;
	vy?: number;

	// minimap
	minimap?: { color: number; rect: Rect; order: number; };

	// interact
	interactAction?: InteractAction;
}

export interface Entity extends EntityPart {
	id: number;
	type: number;
	flags: EntityFlags;
	state: EntityState;
	playerState: EntityPlayerState;
	order: number;
	x: number;
	y: number;
	z: number;
	vx: number;
	vy: number;
	// frame: number; // last update frame
	timestamp: number;

	// editor / debug
	movedOnFrame?: number;
	draggingStart?: Point;
}

export interface FakeEntity {
	fake: true;
	id: number;
	type: number;
	name?: string;
	crc?: number;
}

export const enum DoAction {
	None,
	Boop,
	Swing,
	HoldPoof,
}

export interface Pony extends Entity {
	info: string | Uint8Array | undefined;
	expr: number;
	currentExpression: number;
	extra: boolean;
	toy: number;
	swimming: boolean;
	inTheAirDelay: number;
	hold: number;
	palettePonyInfo: PalettePonyInfo | undefined;
	headAnimation: HeadAnimation | undefined;
	batch: Batch | undefined;
	discardBatch: boolean;
	headTime: number;
	blinkTime: number;
	nextBlink: number;
	ponyState: PonyState;
	drawingOptions: DrawPonyOptions;
	animator: Animator<BodyAnimation>;
	initialized: boolean;
	doAction: DoAction;
	paletteManager: PaletteManager;
	magicColor: number;

	// player info
	name: string | undefined;
	tag: string | undefined;
	site: SocialSite | undefined;
	modInfo: ModInfo | undefined;
	ex: boolean; // extended data indicator, sent in extended options

	// effect animations
	zzzEffect: AnimationPlayer;
	cryEffect: AnimationPlayer;
	sneezeEffect: AnimationPlayer;
	holdPoofEffect: AnimationPlayer;
	heartsEffect: AnimationPlayer;
	magicEffect: AnimationPlayer;

	// last state
	lastX: number;
	lastY: number;
	lastRight: boolean;
	lastState: PonyState;

	lastBoopSplash: number;
}

export interface Region {
	x: number; // region number in X axis
	y: number; // region number in Y axis
	tiles: Uint8Array;
	tileIndices: Int16Array;
	tilesDirty: boolean;
	lastTileUpdate?: number;
	randoms: Uint8Array;
	entities: Entity[];
	colliders: Entity[];
	collider: Uint8Array;
	colliderDirty: boolean;
	// elevation: Uint8Array;
}

export interface CharacterTag {
	id: string;
	name: string;
	label: string;
	className: string;
	tagClass: string;
	color: number;
}

export interface SocialSite {
	id: string;
	name: string;
	provider: string;
	url: string;
}

export interface SocialSiteInfo {
	id: string;
	name: string;
	url: string;
	icon?: string;
	color?: string;
}

// NOTE: also modify fixAccountSettings
export interface AccountSettings {
	defaultServer?: string;
	filterSwearWords?: boolean;
	filterCyrillic?: boolean;
	filterWords?: string;
	ignorePartyInvites?: boolean;
	ignoreFriendInvites?: boolean;
	ignorePublicChat?: boolean;
	ignoreNonFriendWhispers?: boolean;
	chatlogOpacity?: number;
	seeThroughObjects?: boolean;
	chatlogRange?: number;
	actions?: string;
	hidden?: boolean;
}

export interface BrowserSettings {
	lowGraphicsMode?: boolean;
	chatlogClosed?: boolean;
	chatlogTab?: string;
	chatlogWidth?: number;
	chatlogHeight?: number;
	volume?: number;
	disableGamepad?: boolean;
	disableFKeys?: boolean;
	showStats?: boolean;
	showFps?: boolean;
	powerSaving?: boolean;
	scale?: number;
	walkByDefault?: boolean;
	brightNight?: boolean;
}

export interface EntityTypeName {
	type: number;
	name: string;
}

export interface EntityNameTypes {
	name: string;
	types: number[];
}

export interface EntitiesEditorInfo {
	names: string[];
	typeToName: EntityTypeName[];
	nameToTypes: EntityNameTypes[];
}

export interface HiddenPlayer {
	id: string;
	name: string;
	date: string;
}

export interface AccountDataExtra {
	sites?: SocialSite[];
	ponies?: PonyObject[];
	supporterInvited?: boolean;
	editor?: EntitiesEditorInfo;
	alert?: string;
}

export const enum AccountDataFlags {
	None = 0,
	Duplicates = 1,
	PastSupporter = 4,
}

export interface FriendData {
	accountId: string;
	accountName: string;
	name: string | undefined;
	pony: string | undefined;
	nameBad: boolean;
}

export const enum FriendStatusFlags {
	None = 0,
	Online = 1,
	Remove = 2,
}

export interface FriendStatusData {
	accountId: string;
	accountName?: string;
	status: FriendStatusFlags;
	entityId?: number;
	name?: string;
	info?: string;
	crc?: number;
	nameBad?: boolean;
}

export interface AccountData extends AccountDataExtra {
	id: string;
	name: string;
	birthdate: string;
	birthyear?: number;
	settings: AccountSettings;
	characterCount: number;
	supporter?: number;
	roles?: string[] | undefined;
	check?: any;
	flags: AccountDataFlags;
}

export interface UpdateAccountData {
	name: string;
	birthdate: string;
}

export interface AccountCounters {
	spam?: number;
	swears?: number;
	timeouts?: number;
	inviteLimit?: number;
	friendLimit?: number;
}

export interface ModInfo {
	age?: number;
	note?: string;
	mute?: string;
	shadow?: string;
	account?: string;
	country?: string;
	counters?: AccountCounters;
}

export interface PonyOptions {
	expr?: number; // TODO: move to dedicated field
	tag?: string; // TODO: move to flags ?
	extra?: boolean; // TODO: move to flags ?
	hold?: number;
	toy?: number;
	// mod/extra info
	site?: SocialSite;
	modInfo?: ModInfo;
}

// id, options, name, info, playerState, badName
export type PonyData = [number, PonyOptions | undefined, Uint8Array | undefined, Uint8Array | undefined, number, boolean];

// NOTE: also update in serverActions.ts
export const enum PlayerAction {
	None,
	Ignore,
	Unignore,
	InviteToParty,
	RemoveFromParty,
	PromotePartyLeader,
	HidePlayer,
	InviteToSupporterServers,
	AddFriend,
	RemoveFriend,
}

export const enum ModAction {
	None,
	Report,
	Mute,
	Shadow,
	Kick,
	Ban,
}

export const enum LeaveReason {
	None,
	Swearing,
}

export interface TileUpdate {
	x: number;
	y: number;
	type: TileType;
}

// [id, message, type]
export type SayData = [number, string, MessageType];

export const enum UpdateType {
	None = 0,
	AddEntity = 1,
	UpdateEntity = 2,
	RemoveEntity = 3,
	UpdateTile = 4,
}

export interface DecodedUpdate {
	id: number;
	type: number | undefined;
	state: EntityState | undefined;
	x: number | undefined;
	y: number | undefined;
	vx: number;
	vy: number;
	expression: number | undefined;
	options: EntityOrPonyOptions | undefined;
	crc: number | undefined;
	name: string | undefined;
	filterName: boolean;
	info: Uint8Array | undefined;
	action: Action | undefined;
	switchRegion: boolean;
	playerState: EntityPlayerState | undefined;
}

export interface DecodedRegionUpdate {
	x: number;
	y: number;
	updates: DecodedUpdate[];
	removes: number[];
	tiles: TileUpdate[];
	tileData: Uint8Array | null;
}

export const enum WorldStateFlags {
	None = 0,
	Safe = 1,
}

export interface WorldState {
	time: number;
	season: Season;
	holiday: Holiday;
	flags: WorldStateFlags;
	featureFlags: ServerFeatureFlags;
}

export interface MapState {
	weather: Weather;
}

export const defaultMapState: MapState = {
	weather: Weather.None,
};

export const enum WallType {
	None = 0,
	Wood = 1,
}

export const enum TileType {
	None = 0,
	Dirt = 1,
	Grass = 2,
	Water = 3,
	Wood = 4,
	Ice = 5,
	SnowOnIce = 6,
	WalkableWater = 7,
	Boat = 8,
	WalkableIce = 9,
	Stone = 10,
	Stone2 = 11,
	ElevatedDirt = 12,

	// special
	WallH = 100,
	WallV = 101,
}

export const tileTypeNames = [
	'none', 'dirt', 'grass', 'water', 'wood', 'ice', 'snow-on-ice', 'walkable-water', 'boat', 'walkable-ice',
	'stone', 'stone-2', 'elevated-dirt',
];

export const houseTiles = [
	{ type: TileType.Dirt, name: 'Dirt' },
	{ type: TileType.Wood, name: 'Wood' },
	{ type: TileType.Grass, name: 'Grass' },
	{ type: TileType.Water, name: 'Water' },
	{ type: TileType.Ice, name: 'Ice' },
	{ type: TileType.Stone, name: 'Stone' },
	{ type: TileType.Stone2, name: 'Brick' },
];

export function canWalk(tile: TileType): boolean {
	return tile !== TileType.None;
}

export function isValidTile(tile: TileType): boolean {
	return tile === TileType.Dirt || tile === TileType.Grass;
}

export function isValidModTile(tile: TileType): boolean {
	return tile >= TileType.None && tile < TileType.WallH;
}

export interface MapInfo {
	type: MapType;
	flags: MapFlags;
	regionsX: number;
	regionsY: number;
	defaultTile: TileType;
	editableArea?: Rect;
}

export interface WorldMap extends IMap<Region | undefined> {
	type: MapType;
	flags: MapFlags;
	tileTime: number;
	entities: Entity[];
	entitiesDrawable: Entity[];
	entitiesWithNames: Entity[];
	entitiesWithChat: Entity[];
	entitiesMoving: Entity[];
	entitiesTriggers: Entity[];
	entitiesLight: Entity[];
	entitiesLightSprite: Entity[];
	entitiesById: Map<number, Entity>;
	poniesToDecode: Pony[];
	width: number;
	height: number;
	regionsX: number;
	regionsY: number;
	defaultTile: TileType;
	regions: (Region | undefined)[];
	minRegionX: number;
	minRegionY: number;
	maxRegionX: number;
	maxRegionY: number;
	state: MapState;
	editableArea?: Rect;
}

export interface TileSet {
	sprites: Sprite[];
	palette: Palette;
}

export type TileSets = TileSet[];

export const enum PartyFlags {
	None = 0,
	Leader = 1,
	Pending = 2,
	Offline = 4,
}

export interface PartyMember {
	id: number;
	pony: Pony | undefined;
	self: boolean;
	leader: boolean;
	pending: boolean;
	offline: boolean;
}

export interface PartyInfo {
	leaderId: number;
	members: PartyMember[];
}

export interface ChatMessage {
	id: number;
	crc: number | undefined;
	name: string;
	message: string;
	type: MessageType;
}

export interface CommonButtonAction {
	title?: string;
}

export interface ExpressionButtonAction {
	type: 'expression';
	expression: Expression | undefined;
	title?: string;
}

export interface CommandButtonAction {
	type: 'command';
	title: string;
	icon: string;
	command: string;
}

export interface ActionButtonAction {
	type: 'action';
	title: string;
	action: string;
	sendAction: Action;
}

export interface ItemButtonAction {
	type: 'item';
	icon: ColorExtra;
	count?: number;
}

export interface EntityButtonAction {
	type: 'entity';
	entity: string;
	title?: string;
}

export type ButtonAction = CommonButtonAction &
	(ExpressionButtonAction | CommandButtonAction | ActionButtonAction | ItemButtonAction | EntityButtonAction);

export interface ButtonActionSlot {
	action: ButtonAction | undefined;
}

export const enum Action {
	None = 0,
	Boop,
	TurnHead,
	Yawn,
	Laugh,
	Sneeze,
	Sit,
	Lie,
	Fly,
	UnhideAllHiddenPlayers,
	Stand,
	SwapCharacter,
	HoldPoof,
	Sleep,
	Drop,
	DropToy,
	Blush,
	Cry,
	Love,
	CancelSupporterInvite,
	Info,
	KeepAlive,
	RemoveFriend,
	FriendsCRC,
	RequestEntityInfo,
	ACL,
	Magic,
	RemoveEntity,
	PlaceEntity,
	SwitchTool,
	SwitchToolRev,
	SwitchToPlaceTool,
	SwitchToTileTool,
}

export const enum InfoFlags {
	None = 0,
	Incognito = 1,
	SupportsWASM = 2,
	SupportsLetAndConst = 4,
}

export function isExpressionAction(action: Action) {
	return action === Action.Yawn || action === Action.Laugh || action === Action.Sneeze;
}

export interface EditorPlaceAction {
	type: 'place';
	entity: string;
	x: number;
	y: number;
}

export interface EditorMoveAction {
	type: 'move';
	entities: { id: number; x: number; y: number; }[];
}

export interface EditorRemoveAction {
	type: 'remove';
	entities: number[];
}

export interface EditorOtherAction {
	type: 'undo' | 'clear' | 'list';
}

export interface EditorTileAction {
	type: 'tile';
	x: number;
	y: number;
	tile: TileType;
	size: number;
}

export interface EditorPartyAction {
	type: 'party';
}

export type EditorAction =
	EditorPlaceAction |
	EditorMoveAction |
	EditorRemoveAction |
	EditorOtherAction |
	EditorTileAction |
	EditorPartyAction;

export const enum SelectFlags {
	None = 0,
	FetchEx = 1,
	FetchInfo = 2,
}

export interface IServerActions {
	say(entityId: number, text: string, type: ChatType): void;
	select(entityId: number, flags: SelectFlags): void;
	interact(entityId: number): void;
	use(): void;
	action(action: Action): void;
	actionParam(action: Action, param: any): void;
	actionParam2(action: Action, param: any): void;
	getInvites(): Promise<SupporterInvite[]>;
	expression(expression: number): void;
	playerAction(entityId: number, action: PlayerAction, param: any): void;
	leaveParty(): void;
	otherAction(entityId: number, action: ModAction, param: number): Promise<void>;
	setNote(entityId: number, text: string): Promise<void>;
	saveSettings(settings: AccountSettings): void;
	acceptNotification(id: number): void;
	rejectNotification(id: number): void;
	getPonies(ids: number[]): void;
	loaded(): void;
	fixedPosition(): void;
	updateCamera(x: number, y: number, w: number, h: number): void;
	move(a: number, b: number, c: number, d: number, e: number): void;
	changeTile(x: number, y: number, type: TileType): void;
	leave(): void;
	editorAction(action: EditorAction): void;
}

// Pony

export interface PonyObject {
	id: string;
	name: string;
	info: string;
	tag?: string;
	site?: string;
	desc?: string;
	lastUsed?: string;
	creator?: string;
	ponyInfo?: PonyInfo;
	hideSupport?: boolean;
	respawnAtSpawn?: boolean;
}

export interface SpriteSetBase {
	type?: number;
	pattern?: number;
}

export interface SpriteSet<T> extends SpriteSetBase {
	fills?: (T | undefined)[];
	outlines?: (T | undefined)[];
	lockFills?: boolean[];
	lockOutlines?: boolean[];
}

export interface PonyInfoBase<T, SET> {
	head: SET | undefined;
	nose: SET | undefined;
	ears: SET | undefined;
	horn: SET | undefined;
	wings: SET | undefined;
	frontHooves: SET | undefined;
	backHooves: SET | undefined;

	mane: SET | undefined;
	backMane: SET | undefined;
	tail: SET | undefined;
	facialHair: SET | undefined;

	headAccessory: SET | undefined;
	earAccessory: SET | undefined;
	faceAccessory: SET | undefined;
	neckAccessory: SET | undefined;
	frontLegAccessory: SET | undefined;
	backLegAccessory: SET | undefined;
	frontLegAccessoryRight: SET | undefined;
	backLegAccessoryRight: SET | undefined;
	lockBackLegAccessory: boolean | undefined;
	unlockFrontLegAccessory: boolean | undefined;
	unlockBackLegAccessory: boolean | undefined;
	backAccessory: SET | undefined;
	waistAccessory: SET | undefined;
	chestAccessory: SET | undefined;
	sleeveAccessory: SET | undefined;
	extraAccessory: SET | undefined;

	coatFill: T | undefined;
	coatOutline: T | undefined;
	lockCoatOutline: boolean | undefined;

	eyelashes: number | undefined;
	eyeColorLeft: T | undefined;
	eyeColorRight: T | undefined;
	eyeWhitesLeft: T | undefined;
	eyeWhites: T | undefined;
	eyeOpennessLeft: number | undefined;
	eyeOpennessRight: number | undefined;
	eyeshadow: boolean | undefined;
	eyeshadowColor: T | undefined;
	lockEyes: boolean | undefined;
	lockEyeColor: boolean | undefined;
	unlockEyeWhites: boolean | undefined;
	unlockEyelashColor: boolean | undefined;
	eyelashColor: T | undefined;
	eyelashColorLeft: T | undefined;

	fangs: number | undefined;
	muzzle: number | undefined;
	freckles: number | undefined; // TODO: remove
	frecklesColor: T | undefined; // TODO: remove
	magicColor: T | undefined;

	cm: T[] | undefined;
	cmFlip: boolean | undefined;

	customOutlines: boolean | undefined;
	freeOutlines: boolean | undefined;
	darkenLockedOutlines: boolean | undefined;
}

export interface PaletteSpriteSet extends SpriteSetBase {
	type: number;
	pattern: number;
	palette: Palette;
	extraPalette?: Palette;
}

export interface PalettePonyInfo extends PonyInfoBase<Palette, PaletteSpriteSet> {
	coatPalette: Palette;
	eyePaletteLeft: Palette;
	eyePalette: Palette;
	cmPalette?: Palette;
	defaultPalette: Palette;
	waterPalette: Palette;
	// faceAccessoryExtraPalette: Palette | undefined;
	body: PaletteSpriteSet | undefined;
	backLegs: PaletteSpriteSet | undefined;
	frontLegs: PaletteSpriteSet | undefined;
	magicColorValue: number;
}

export interface PonyInfo extends PonyInfoBase<string, SpriteSet<string>> {
}

export interface PonyInfoNumber extends PonyInfoBase<number, SpriteSet<number>> {
}

export interface ColorExtra {
	color: Sprite;
	colors?: number;
	extra?: Sprite;
	palettes?: Uint32Array[];
	title?: string;
	label?: string;
	timestamp?: any;
	colorMany?: Sprite[];
}

export interface TileSprites {
	sprites: Sprite[];
	palettes: Uint32Array[];
}

export interface ColorShadow {
	color: Sprite;
	shadow: Sprite;
	palettes?: Uint32Array[];
}

export interface Shadow {
	shadow: Sprite;
}

export type ColorExtraSet = (ColorExtra | undefined)[] | undefined;
export type ColorExtraSets = ColorExtraSet[] | undefined;

export interface BodyAnimationFrame {
	body: number;
	head: number;
	wing: number;
	tail: number;

	frontLeg: number;
	frontFarLeg: number;
	backLeg: number;
	backFarLeg: number;

	bodyX: number;
	bodyY: number;
	headX: number;
	headY: number;
	frontLegX: number;
	frontLegY: number;
	frontFarLegX: number;
	frontFarLegY: number;
	backLegX: number;
	backLegY: number;
	backFarLegX: number;
	backFarLegY: number;
}

export interface BodyShadow {
	frame: number;
	offset: number;
}

export interface BodyAnimation {
	name: string;
	loop: boolean;
	fps: number;
	frames: BodyAnimationFrame[];
	shadow?: BodyShadow[];
}

export interface HeadAnimationFrame {
	headX: number;
	headY: number;
	left: Eye;
	right: Eye;
	mouth: Muzzle;
}

export interface HeadAnimation {
	name: string;
	loop: boolean;
	fps: number;
	frames: HeadAnimationFrame[];
}

export const enum PonyStateFlags {
	None = 0,
	CurlTail = 1,
	FaceForward = 2,
}

export interface PonyState {
	animation: BodyAnimation;
	animationFrame: number;
	headAnimation: HeadAnimation | undefined;
	headAnimationFrame: number;
	headTurned: boolean;
	headTilt: number;
	headTurn: number;
	blinkFrame: number;
	expression: Expression | undefined;
	holding: Entity | undefined;
	blushColor: number;
	drawFaceExtra?: ((batch: PaletteSpriteBatch) => void) | undefined;
	flags: PonyStateFlags;
}

export const enum NoDraw {
	None = 0x0,
	Front = 0x1,
	Front2 = 0x2,
	BehindLeg = 0x4,
	BehindBody = 0x8,
	Behind = 0x10,
	Body = 0x20,
	BodyOnly = 0x40,
	FarEar = 0x80,
	CloseEar = 0x100,
	FaceAccessory1 = 0x200,
	FaceAccessory2 = 0x400,
	TopMane = 0x800,
	FrontMane = 0x1000,
	Nose = 0x2000,
	Head = 0x4000,
	Eyes = 0x8000,
	BackAccessory = 0x10000,
	BackLeg = 0x20000,
	BackFarLeg = 0x40000,
	FrontLeg = 0x80000,
	FrontFarLeg = 0x100000,
	FarSleeves = 0x200000,
	CloseSleeves = 0x400000,
	FarEarShade = 0x800000,
	Ears = NoDraw.FarEar | NoDraw.CloseEar,
	WholeHead = NoDraw.Head | NoDraw.Nose | NoDraw.Ears,
	FarLegs = NoDraw.BackFarLeg | NoDraw.FrontFarLeg,
	CloseLegs = NoDraw.BackLeg | NoDraw.FrontLeg,
	AllLegs = NoDraw.FarLegs | NoDraw.CloseLegs,
	Sleeves = NoDraw.FarSleeves | NoDraw.CloseSleeves,
}

export interface DrawPonyOptions {
	flipped: boolean;
	selected: boolean;
	shadow: boolean;
	extra: boolean;
	toy: number;
	swimming: boolean;
	bounce: boolean;
	shadowColor: number;
	noEars: boolean;
	gameTime: number;

	// sheet generation switches
	no: NoDraw;
	useAllHooves: boolean;
}

// other

export interface OAuthProvider {
	id: string;
	name: string;
	color: string;
	url?: string;
	disabled?: boolean;
	connectOnly?: boolean;
	faIcon?: any;
}

export interface Profile {
	id: string;
	provider: string;
	emails: string[];
	name: string | undefined;
	username: string | undefined;
	url: string | undefined;
	createdAt: Date | undefined;
	suspended: boolean | undefined;
}

export interface GameStatus {
	version: string;
	update?: boolean;
	servers: (ServerInfo | ServerInfoShort)[];
}

export interface ServerInfoShort {
	id: string;
	offline: boolean;
	online: number;
}

export interface ServerInfo extends ServerInfoShort {
	name: string;
	path: string;
	desc: string;
	host?: string;
	flag?: string;
	alert?: string;
	dead: boolean;
	filter: boolean;
	require?: string;
	flags?: ServerFeatureFlags;
	countryFlags?: string[];
}

// expression

export const enum Muzzle {
	Smile = 0,
	Frown = 1,
	Neutral = 2,
	Scrunch = 3,
	Blep = 4,
	SmileOpen = 5,
	Flat = 6,
	Concerned = 7,
	ConcernedOpen = 8,
	SmileOpen2 = 9,
	FrownOpen = 10,
	NeutralOpen2 = 11,
	ConcernedOpen2 = 12,
	Kiss = 13,
	SmileOpen3 = 14,
	NeutralOpen3 = 15,
	ConcernedOpen3 = 16,
	Kiss2 = 17,
	SmileTeeth = 18,
	FrownTeeth = 19,
	NeutralTeeth = 20,
	ConcernedTeeth = 21,
	SmilePant = 22,
	NeutralPant = 23,
	Oh = 24,
	FlatBlep = 25,
	// max: 31
}

export const CLOSED_MUZZLES = [
	Muzzle.Smile, Muzzle.Frown, Muzzle.Neutral, Muzzle.Scrunch, Muzzle.Flat, Muzzle.Concerned,
	Muzzle.Kiss, Muzzle.Kiss2,
];

export const enum Eye {
	None = 0,
	Neutral = 1,
	Neutral2 = 2,
	Neutral3 = 3,
	Neutral4 = 4,
	Neutral5 = 5,
	Closed = 6,
	Frown = 7,
	Frown2 = 8,
	Frown3 = 9,
	Frown4 = 10,
	Lines = 11,
	ClosedHappy3 = 12,
	ClosedHappy2 = 13,
	ClosedHappy = 14,
	Sad = 15,
	Sad2 = 16,
	Sad3 = 17,
	Sad4 = 18,
	Angry = 19,
	Angry2 = 20,
	Peaceful = 21,
	Peaceful2 = 22,
	X = 23,
	X2 = 24,
	// max: 31
}

export function isEyeSleeping(eye: Eye) {
	return eye === Eye.Closed ||
		(eye >= Eye.Lines && eye <= Eye.ClosedHappy) ||
		(eye >= Eye.Peaceful && eye <= Eye.X2);
}

export const enum Iris {
	Forward = 0,
	Up = 1,
	Left = 2,
	Right = 3,
	UpLeft = 4,
	UpRight = 5,
	Shocked = 6,
	Down = 7,
	// max: 15
	COUNT,
}

export const enum ExpressionExtra {
	None = 0,
	Blush = 1,
	Zzz = 2,
	Cry = 4, // overrides tears
	Tears = 8,
	Hearts = 16,
	// max: 31
}

export interface Expression {
	left: Eye;
	leftIris: Iris;
	right: Eye;
	rightIris: Iris;
	muzzle: Muzzle;
	extra: ExpressionExtra;
}

export interface SupporterInvite {
	id: string;
	active: boolean;
	name: string;
	info: string;
}

export interface Subscription {
	unsubscribe(): void;
}

export enum Engine {
	Default,
	LayeredTiles,
	Whiteness,
	NewLighting,
	Total,
}

export interface DrawOptions {
	gameTime: number;
	lightColor: number;
	shadowColor: number;
	drawHidden: boolean;
	showColliderMap: boolean;
	showHeightmap: boolean;
	debug: DebugFlags;
	gridLines: boolean;
	tileIndices: boolean;
	tileGrid: boolean;
	engine: Engine;
	season: Season;
	error: (message: string) => void;
}

export const defaultDrawOptions: DrawOptions = {
	gameTime: 0,
	lightColor: WHITE,
	shadowColor: SHADOW_COLOR,
	drawHidden: false,
	showColliderMap: false,
	showHeightmap: false,
	debug: {},
	gridLines: false,
	tileIndices: false,
	tileGrid: false,
	engine: Engine.Default,
	season: Season.Summer,
	error: () => { },
};

export interface PonyEntityOptions {
	hold?: number;
	extra?: boolean;
}

export interface SpiderEntityOptions {
	height: number;
	time: number;
}

export interface SignEntityOptions {
	sign: {
		r?: number;
		n?: number[];
		w?: number[];
		s?: number[];
		e?: number[];
	};
}

export interface EntityDescriptor {
	type: number;
	typeName: string;
	create: CreateEntity;
}

export type EntityOptions = PonyEntityOptions | SpiderEntityOptions | SignEntityOptions | {};
export type EntityOrPonyOptions = Partial<PonyOptions> & EntityOptions;

export interface EntityWorldState {
	season: Season;
}

export const defaultWorldState = {
	season: Season.Summer,
};

export type CreateEntity = (base: Entity, options: EntityOptions, worldState: EntityWorldState) => Entity;
export type MixinEntity = (base: Entity, options: EntityOptions, worldState: EntityWorldState) => void;

export interface CreateEntityMethod {
	type: number;
	typeName: string;
	(x: number, y: number, options?: EntityOptions): Entity;
}

export interface IMap<TRegion> {
	width: number;
	height: number;
	regionsX: number;
	regionsY: number;
	regions: TRegion[];
}

export interface FontPalettes {
	emoji: Palette;
	white: Palette;
	supporter1: Palette;
	supporter2: Palette;
	supporter3: Palette;
}

export interface CommonPalettes {
	defaultPalette: Palette;
	mainFont: FontPalettes;
	smallFont: FontPalettes;
}

export interface EngineInfo {
	name: string;
	engine: Engine;
}

export interface DebugFlags {
	showHelpers?: boolean;
	showPalette?: boolean;
	showRegions?: boolean;
	showInfo?: boolean;
	engine?: number;
	debugCamera?: boolean;
	// entity helpers
	bounds?: boolean;
	collider?: boolean;
	id?: boolean;
	cover?: boolean;
	interact?: boolean;
	trigger?: boolean;
}

export const enum UpdateFlags {
	None = 0,
	Position = 1,
	Velocity = 2,
	State = 4,
	Expression = 8,
	Type = 16,
	Options = 32,
	Info = 64,
	Action = 128,
	Name = 256,
	NameBad = 512,
	PlayerState = 1024,
	SwitchRegion = 2048,
	// max 32768
}
