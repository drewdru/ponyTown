import { ClientExtensions, BinaryWriter } from 'ag-sockets';
import { ClientActions } from '../client/clientActions';
import {
	Entity, ServerFlags, AccountSettings, NotificationFlags, Expression, Camera, SayData, Region, TileUpdate,
	Rect, IMap, MapType, TileType, MapState, UpdateFlags, Action, EntityOrPonyOptions, EntityPlayerState, MapFlags
} from '../common/interfaces';
import { IAccount, ICharacter, UpdateAccount } from './db';
import { AccountUpdate, CharacterState, GameServerSettings, Suspicious } from '../common/adminInterfaces';

export interface EntityUpdate {
	entity: Entity;
	flags: UpdateFlags;

	// NOTE: need to use different position than current entity.x/y
	//       otherwise we get jump at the start of movement due to
	//       updated position after the frame
	x: number;
	y: number;
	vx: number;
	vy: number;

	action: Action;
	playerState: EntityPlayerState;
	options: EntityOrPonyOptions | undefined;
}

export type EntityUpdateBase = Partial<EntityUpdate> & { entity: ServerEntity; flags: UpdateFlags; };

export interface Reporter {
	info(message: string, desc?: string): void;
	warn(message: string, desc?: string): void;
	warnLog(message: string): void;
	danger(message: string, desc?: string): void;
	error(error: Error, desc?: string): void;
	system(message: string, desc?: string, logEvent?: boolean): void;
	systemLog(message: string): void;
	setPony(pony: any): void;
}

export interface ServerNotification {
	id: number;
	name: string;
	message: string;
	note?: string;
	flags?: NotificationFlags;
	entityId?: number;
	accept?(): void;
	reject?(): void;
	sender?: IClient;
}

export interface ServerParty {
	id: string;
	leader: IClient;
	leaderTimeout?: any;
	clients: IClient[];
	pending: { client: IClient; notificationId: number; }[];
	cleanup?: number;
}

export interface TokenData {
	accountId: string;
	account: IAccount;
	character: ICharacter;
}

export interface TokenService {
	clearTokensForAccount(accountId: string): void;
	clearTokensAll(): void;
	createToken(token: TokenData): string;
}

export interface LastSay {
	message: string;
	count: number;
	age: number;
}

export interface QueuedSay {
	id: number;
	type: number;
	message: string;
}

export interface ServerRegion extends Region {
	tiles: Uint8Array;
	entities: ServerEntity[];
	movables: ServerEntity[];
	colliders: ServerEntity[];
	// entityAdds: any[];
	reusedUpdates: number;
	entityUpdates: EntityUpdate[];
	entityRemoves: number[];
	tileUpdates: TileUpdate[];
	clients: IClient[]; // subscribed clients
	bounds: Readonly<Rect>;
	boundsWithBorder: Readonly<Rect>;
	subscribeBounds: Readonly<Rect>; // screen space
	unsubscribeBounds: Readonly<Rect>; // screen space
	tilesSnapshot: Uint8Array | undefined;
	tilesTimeouts: Uint8Array | undefined;
	encodedTiles: Uint8Array | undefined;
}

export const enum MapUsage {
	Public,
	Party,
}

export interface ServerMap extends IMap<ServerRegion> {
	id: string;
	usage: MapUsage;
	flags: MapFlags;
	readonly type: MapType;
	readonly width: number;
	readonly height: number;
	readonly regionsX: number;
	readonly regionsY: number;
	instance: string | undefined;
	defaultTile: TileType;
	state: MapState;
	regions: ServerRegion[];
	spawnArea: Rect;
	spawns: Map<string, Rect>;
	lockedTiles: Set<number>;
	lastUsed: number;
	controllers: Controller[];
	dontUpdateTilesAndColliders: boolean;
	tilesLocked: boolean;
	editableEntityLimit: number;
	editableArea?: Rect;
	editingLocked: boolean;
}

export interface IClient extends ClientActions, ClientExtensions {
	// origin info
	ip: string;
	country: string;
	userAgent?: string;

	// browser info
	incognito?: boolean;
	supportsWasm?: boolean;
	supportsLetAndConst?: boolean;

	// quick access account fields
	accountId: string;
	accountName: string;
	accountSettings: AccountSettings;
	account: IAccount;
	friends: Set<string>;
	friendsCRC: number | undefined;

	// quick access character fields
	characterId: string;
	characterName: string;
	character: ICharacter;

	isMod: boolean;
	shadowed: boolean;
	supporterLevel: number;
	pony: ServerEntity;
	regions: ServerRegion[];
	map: ServerMap;
	isSwitchingMap: boolean;
	camera: Camera;
	characterState: CharacterState;
	offline?: boolean;
	offlineAt?: Date;
	selected?: ServerEntity;
	reporter: Reporter;
	notifications: ServerNotification[];
	party?: ServerParty;
	ignores: Set<string>;
	hides: Set<string>;
	permaHides: Set<string>;
	lastSwap: number;
	lastMapLoadOrSave: number;

	// last state
	safeX: number;
	safeY: number;
	lastPacket: number;
	lastAction: number;
	lastBoopAction: number;
	lastExpressionAction: number;
	lastSays: LastSay[];
	lastX: number;
	lastY: number;
	lastTime: number;
	lastVX: number;
	lastVY: number;

	// sitting reporting
	lastSitX: number;
	lastSitY: number;
	lastSitTime: number;
	sitCount: number;

	// subscription checking
	lastCameraX: number;
	lastCameraY: number;
	lastCameraW: number;
	lastCameraH: number;

	// flags
	lastMapSwitch: number;
	// queuedMapSwitch?: { map: ServerMap; x: number; y: number; };
	logDisconnect?: boolean;
	loading?: boolean;
	fixingPosition?: boolean;
	connectedTime: number;
	leaveReason?: string;

	// pending data
	updateQueue: BinaryWriter;
	regionUpdates: Uint8Array[];
	saysQueue: SayData[];
	unsubscribes: number[];
	subscribes: Uint8Array[];

	// error reporting
	rateLimitMessage?: string;
	rateLimitCount?: number;

	// debug
	positions: { frame: number; x: number; y: number; moved: boolean; }[];
}

export type Interact = (target: ServerEntity, client: IClient) => void;

export interface ServerEntity extends Entity {
	// flags
	serverFlags?: ServerFlags;
	canFly?: boolean;
	canMagic?: boolean;

	// state
	region?: ServerRegion;
	client?: IClient;

	// interaction
	interact?: Interact;

	// trigger
	trigger?: Interact;

	// boop
	boop?(client: IClient): void;
	boopX?: number;
	boopY?: number;

	// expression
	exprTimeout?: number;
	exprCancellable?: boolean;
	exprPermanent?: Expression;

	// other
	lightDelay?: number;

	// cached info & name
	nameBad?: boolean;
	encodedName?: Uint8Array;
	info?: string;
	infoSafe?: string;
	encryptedInfoSafe?: Uint8Array;

	// update
	serverUpdate?: (delte: number, now: number) => void;
}

export interface ServerEntityWithClient extends ServerEntity {
	client: IClient;
}

export interface Controller {
	initialize(now: number): void;
	update(delta: number, now: number): void;
	sparseUpdate?(): void;
	toggleWall?(x: number, y: number, type: TileType): void;
}

export interface AccountService {
	update(accountId: string, update: AccountUpdate): Promise<void>;
	updateSettings(account: IAccount, settings: AccountSettings): Promise<void>;
	refreshSettings(account: IAccount): Promise<void>;
	updateAccount: UpdateAccount;
	updateCharacterState(characterId: string, state: CharacterState): Promise<void>;
}

export interface SocketStats {
	stats(): { sent: number; sentPackets: number; received: number; receivedPackets: number; };
}

export type OnMessage = (client: IClient, message: string) => void;
export type OnMessageSettings = (client: IClient, message: string, settings: GameServerSettings) => void;
export type OnSuspiciousMessage = (client: IClient, message: string, suspicious: Suspicious) => void;
export type IgnorePlayer = (client: IClient, target: IClient, ignored: boolean) => void;
export type FindClientByEntityId = (client: IClient, entityId: number) => IClient | undefined;
export type ReportAccount = (accountId: string) => Promise<void>;
export type TimeoutAccount = (accountId: string, timeout: Date, message?: string) => Promise<void>;
export type ReportInviteLimit = (client: IClient) => void;
export type ReportError = (message: string, data: any) => void;

export type LogAccountMessage = (accountId: string, message: string) => void;
export type LogMessage = (message: string) => void;

export type GetSettings = () => GameServerSettings;
