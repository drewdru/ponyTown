import { Injectable, NgZone } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { debounce } from 'lodash';
import {
	EntityState, Pony, Notification, TileType, Action, IServerActions, Season, WorldState, Holiday,
	TileSets, ChatMessage, PartyInfo, Entity, DrawOptions, Engine, defaultDrawOptions, PonyStateFlags,
	DoAction, ChatType, WorldStateFlags, DebugFlags, MessageType, AccountSettings, Matrix4,
	FakeEntity, SelectFlags, WorldMap, MapType, MapFlags, EntityFlags, houseTiles, isValidTile
} from '../common/interfaces';
import {
	clamp, lengthOfXY, setFlag, hasFlag, boundsIntersect, point, toInt, lerpColor, distanceXY
} from '../common/utils';
import {
	OFFLINE_PONY, MAX_SCALE, SUPPORTER_PONY, HOUR, MIN_SCALE, CAMERA_WIDTH_MIN, CAMERA_WIDTH_MAX,
	CAMERA_HEIGHT_MIN, CAMERA_HEIGHT_MAX, SECOND, TILE_CHANGE_RANGE, MINUTE, PONY_TYPE,
	REGION_SIZE, tileWidth, tileHeight
} from '../common/constants';
import {
	ensureAllVisiblePoniesAreDecoded, invalidatePalettes, updateMap, updateEntities,
	getMapHeightAt, updateEntitiesWithNames, updateEntitiesCoverLifted, getTile,
	pickEntities, updateEntitiesTriggers, getElevation, setElevation, createWorldMap
} from '../common/worldMap';
import { updateCamera, centerCameraOn, screenToWorld, createCamera } from '../common/camera';
import { WHITE, BLACK, SHADOW_COLOR, getTileColor, RED, CAVE_LIGHT, CAVE_SHADOW } from '../common/colors';
import { formatHourMinutes, getLightColor, getShadowColor, createLightData } from '../common/timeUtils';
import { toggleWalls } from '../common/mixins';
import { getEntityTypeName, hammer, broom, createAnEntity, saw, placeableEntities, shovel } from '../common/entities';
import { hasExtendedInfo, setHeadAnimation, createPony } from '../common/pony';
import { PaletteManager } from '../graphics/paletteManager';
import { getRenderTargetSize, isWebGL2 } from '../graphics/webgl/webglUtils';
import { drawFullScreenMessage, drawNames, drawChat } from '../graphics/graphicsUtils';
import { Key } from './input/input';
import { loadAndInitSpriteSheets } from './spriteUtils';
import { version, isMobile } from './data';
import { Game } from './gameLoop';
import { Audio } from '../components/services/audio';
import { getPixelRatio } from './canvasUtils';
import { colorToFloatArray, parseColor, colorToExistingFloatArray, makeTransparent } from '../common/color';
import { nom } from './ponyAnimations';
import { InputManager } from './input/inputManager';
import { roundPositionX, roundPositionY, toScreenX, toScreenY } from '../common/positionUtils';
import { StorageService } from '../components/services/storageService';
import { SettingsService } from '../components/services/settingsService';
import {
	isPonyLying, isPonySitting, setPonyState, getInteractBounds, entityInRange, isFacingRight,
	isHidden, updateEntityVelocity, releaseEntity, addChatBubble
} from '../common/entityUtils';
import { vectorToDir, dirToVector, flagsToSpeed, encodeMovement, isMovingRight } from '../common/movementUtils';
import { createDefaultButtonActions, useAction, deserializeActions } from './buttonActions';
import { ClientSocketService } from '../components/services/gameService';
import { attachDebugMethod, initFeatureFlags, updateRangeIndicator, initLogger, log, getSaysTime } from './clientUtils';
import { restorePlayerPosition, savePlayerPosition } from './sec';
import { drawEntityLights, drawEntityLightSprites, drawMap, drawDebugRegions } from './draw';
import { updateTileSets, initializeTileHeightmaps } from './tileUtils';
import {
	downAction, upAction, turnHeadAction, boopAction, interact, toggleWall, editorMoveEntities,
	editorSelectEntities, editorDragEntities
} from './playerActions';
import { fontSmallPal, fontSmall, font, fontMono } from './fonts';
import { drawText, drawOutlinedText, measureText } from '../graphics/spriteFont';
import { initializeToys } from './ponyDraw';
import { ErrorReporter } from '../components/services/errorReporter';
import { mockPaletteManager } from '../common/ponyInfo';
import { timeStart, timeEnd, timingCollate, timeReset } from './timing';
import { bindFrameBuffer, unbindFrameBuffer, resizeFrameBuffer } from '../graphics/webgl/frameBuffer';
import { WebGL, initWebGL, disposeWebGL, initWebGLResources } from './webgl';
import { bindTexture } from '../graphics/webgl/texture2d';
import {
	normalSpriteSheet, paletteSpriteSheet, defaultPalette, wall_h_placeholder, wall_v_placeholder
} from '../generated/sprites';
import { createMat4, ortho } from '../common/mat4';
import { Model } from '../components/services/model';
import { filterEntityName } from './handlers';
import { isOutsideMap } from '../common/collision';

interface Minimap {
	width: number;
	height: number;
	data: Uint32Array;
}

interface IncompleteSay {
	id: number;
	message: string;
	type: MessageType;
	time: number;
}

const LOG_POSITION = false;
const CONNECTION_ISSUE_TIMEOUT = 10 * SECOND;
const white = colorToFloatArray(WHITE);
const light = colorToFloatArray(WHITE);
const highlightColor = new Float32Array([2, 2, 2, 0.5]);
const toggleWallsTool = saw;
const removeEntitiesTool = broom;
const placeEntitiesTool = hammer;
const changeTileTool = shovel;

const numpad = [
	Key.NUMPAD_0,
	Key.NUMPAD_1,
	Key.NUMPAD_2,
	Key.NUMPAD_3,
	Key.NUMPAD_4,
	Key.NUMPAD_5,
	Key.NUMPAD_6,
	Key.NUMPAD_7,
	Key.NUMPAD_8,
	Key.NUMPAD_9,
];

export const engines = [
	{ name: 'Default', engine: Engine.Default },
	{ name: 'LayeredTiles', engine: Engine.LayeredTiles },
	{ name: 'Whiteness', engine: Engine.Whiteness },
	// { name: 'NewLighting', engine: Engines.NewLighting },
];

let pixelRatioEnabled = true;
let pixelRatioCache = 1;

function pixelRatio() {
	return pixelRatioEnabled ? pixelRatioCache : 1;
}

function integerPixelRatio() {
	return Math.max(1, Math.floor(pixelRatio()));
}

function getMovementFlag(x: number, y: number, walkKey: boolean) {
	const len = lengthOfXY(x, y);
	const walk = len < 0.5 || walkKey;
	return (x || y) ? (walk ? EntityState.PonyWalking : EntityState.PonyTrotting) : EntityState.None;
}

export const actionButtons: { dirty: boolean; draw(): void; }[] = [];

export function redrawActionButtons(force: boolean) {
	for (const button of actionButtons) {
		if (force || button.dirty) {
			button.draw();
		}
	}
}

@Injectable({ providedIn: 'root' })
export class PonyTownGame implements Game {
	fallbackPonies = new Map<number, Pony>();
	positions: { x: number; y: number; moved: boolean; }[] = [];
	lastChatMessageType = ChatType.Say;
	nextFriendsCRC = 0;
	editingActions = false;
	placeInQueue = 0;
	time = performance.now();
	lightData = createLightData(Season.Summer);
	season = Season.Summer;
	holiday = Holiday.None;
	worldFlags = WorldStateFlags.None;
	showMinimap = false;
	minimap: Minimap | undefined = undefined;
	editor = {
		type: 'stoneWall',
		brushSize: 1,
		tile: -1,
		elevation: '',
		special: '',
		draggingEntities: false,
		draggingStart: point(0, 0),
		selectingEntities: false,
		selectedEntities: [] as Entity[],
		customLight: false,
		lightColor: 'ffffff',
	};
	incompleteSays: IncompleteSay[] = [];
	shadowColor = SHADOW_COLOR;
	onChat = new Subject<void>();
	onToggleChat = new Subject<void>();
	onCommand = new Subject<void>();
	onCancel = () => false;
	onClock = new BehaviorSubject<string>('');
	onJoined = new Subject<void>();
	onLeft = new Subject<void>();
	onFrame = new Subject<void>();
	onMessage = new Subject<ChatMessage>();
	messageQueue: ChatMessage[] = [];
	lastWhisperFrom: { entityId: number; accountId?: string; } | undefined = undefined;
	onPonyAddOrUpdate = new Subject<Pony>();
	onActionsUpdate = new Subject<void>();
	onPartyUpdate = new Subject<void>();
	announcements = new Subject<string>();
	onEntityIdUpdate = new Subject<{ old: number; new: number; }>();
	loaded = false;
	fullyLoaded = false;
	fps = 0;
	player: Pony | undefined = undefined;
	playerId: number | undefined = undefined;
	playerName: string | undefined = undefined;
	playerInfo: string | undefined = undefined;
	playerCRC: number | undefined = undefined;
	selected: Pony | undefined = undefined;
	party: PartyInfo | undefined = undefined;
	notifications: Notification[] = [];
	map = createWorldMap();
	camera = createCamera();
	paletteManager = new PaletteManager();
	tileSets?: TileSets;
	offlinePony = createPony(0, 0, OFFLINE_PONY, mockPaletteManager.addArray(defaultPalette), mockPaletteManager);
	supporterPony = createPony(0, 0, SUPPORTER_PONY, mockPaletteManager.addArray(defaultPalette), mockPaletteManager);
	scale: number;
	failedFBO = false;
	rightOverride?: boolean;
	headTurnedOverride?: boolean;
	stateOverride?: EntityState;
	actions = createDefaultButtonActions();
	mod = false;
	webgl?: WebGL;
	actionsChanged = true;
	debug: DebugFlags = {};
	whisperTo: Entity | FakeEntity | undefined = undefined;
	findEntityFromChatLog: (id: number) => FakeEntity | undefined = () => undefined;
	findEntityFromChatLogByName: (name: string) => FakeEntity | undefined = () => undefined;
	private drawOptions: DrawOptions = {
		...defaultDrawOptions,
	};
	private input = new InputManager();
	socket?: ClientSocketService;
	private canvas?: HTMLCanvasElement;
	private statsText?: Text;
	private timeSize = 0;
	private lastStats = 0;
	private sent = 0;
	private recv = 0;
	private hideText = false;
	private hidePublicChat = false;
	private hover = point(0, 0);
	private viewMatrix = createMat4();
	private fboMatrix = createMat4();
	private initialized = false;
	private changedScale = false;
	private baseTime = 0;
	private targetBaseTime = 0;
	private connectedTime = 0;
	private lastPixelRatio = pixelRatio();
	private resized = true;
	private resizedCamera = true;
	private bg = colorToFloatArray(BLACK);
	private deltaMultiplier = 1;
	private lastDraw = 0;
	private entitiesDrawn = 0;
	private lastFps = performance.now();
	private frames = 0;
	private drawFps = 0;
	private lastCanvasRatio = 0;
	private extraStats = '';
	private timingsText = '';
	private statsTextValue = '';
	private windowWidth = 0;
	private windowHeight = 0;
	private debugShortcuts: string[] = [];
	private cameraShiftOn = false;
	private cameraShiftTarget = 0;
	private lastIsKeyboardOpen = false;
	private element?: HTMLElement;
	private showWallPlaceholder = false;
	private highlightEntity?: Entity;
	placeEntity = 0;
	placeTile = 0;
	constructor(
		public audio: Audio,
		private storage: StorageService,
		public settings: SettingsService,
		public model: Model,
		private errorReporter: ErrorReporter,
		private zone: NgZone,
	) {
		this.scale = this.getScale();
		this.audio.initTracks(this.season, this.holiday, this.map.type);
		this.audio.setVolume(this.volume);
		this.debug = storage.getJSON('debug', {});
		this.drawOptions.error = message => errorReporter.reportError(message);
		this.onActionsUpdate.subscribe(() => this.actionsChanged = true);

		if (DEVELOPMENT) {
			attachDebugMethod('setScale', (x: number) => this.setScale(x));
			attachDebugMethod('game', this);
		}
	}
	get volume() {
		return this.settings.browser.volume || 0;
	}
	get disableLighting() {
		return !!this.settings.browser.lowGraphicsMode || this.failedFBO;
	}
	get frameDelay() {
		return (this.settings.browser.powerSaving || this.editingActions) ? (1000 / 45) : 0;
	}
	get engine() {
		return BETA ? (this.debug.engine || Engine.Default) : Engine.Default;
	}
	set engine(value: Engine) {
		if (BETA) {
			this.debug.engine = value;
			this.saveDebug();
		}
	}
	private applied(func: () => void) {
		return () => this.apply(func);
	}
	apply = (func: () => void) => {
		return this.zone.run(func);
	}
	applyChanges = () => this.zone.run(() => { });
	private getScale() {
		const defaultScale = pixelRatio() > 1 ? 3 : 2;
		const scale = toInt(this.settings.browser.scale) || defaultScale;
		return clamp(scale, MIN_SCALE, MAX_SCALE);
	}
	private setScale(scale: number) {
		if (this.scale !== scale) {
			this.scale = scale;
			this.settings.browser.scale = this.scale;
			this.settings.saveBrowserSettings();
			this.changedScale = true;
		}
	}
	private toggleDisableLighting() {
		if (!this.failedFBO) {
			this.settings.browser.lowGraphicsMode = !this.settings.browser.lowGraphicsMode;
			this.settings.saveBrowserSettings();
		}
	}
	send<T>(action: (server: IServerActions) => T) {
		if (this.socket && this.socket.isConnected) {
			return action(this.socket.server);
		} else {
			return undefined;
		}
	}
	changeScale() {
		this.setScale((this.scale % MAX_SCALE) + 1);
		this.changedScale = true;
	}
	zoomIn() {
		this.setScale(Math.min(MAX_SCALE, this.scale + 1));
	}
	zoomOut() {
		this.setScale(Math.max(1, this.scale - 1));
	}
	select(pony: Pony | undefined) {
		if (this.selected === pony)
			return;

		if (pony && isHidden(pony) && !this.mod)
			return;

		this.zone.run(() => {
			if (this.selected) {
				this.selected.selected = false;
			}

			this.selected = pony;

			if (pony && !pony.info && !pony.palettePonyInfo) {
				this.send(server => server.select(pony.id, SelectFlags.FetchEx | SelectFlags.FetchInfo));
			} else {
				this.sendSelected();
			}

			if (this.selected) {
				this.selected.selected = true;
			}
		});
	}
	private sendSelected = debounce(() => {
		const pony = this.selected;
		const id = pony ? pony.id : 0;
		const fetchEx = !!pony && !hasExtendedInfo(pony);
		this.send(server => server.select(id, fetchEx ? SelectFlags.FetchEx : SelectFlags.None));
	}, 300);
	load() {
		return loadAndInitSpriteSheets()
			.then(initializeTileHeightmaps);
	}
	init() {
		this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
		this.updateTileSets();
		this.input.initialize(this.canvas);

		if (!this.initialized) {
			this.canvas.addEventListener('webglcontextlost', e => {
				e.preventDefault();
				DEVELOPMENT && console.warn('Context lost');
				this.errorReporter.captureEvent({ name: 'Context lost' });
			});

			this.canvas.addEventListener('webglcontextrestored', () => {
				DEVELOPMENT && console.warn('Context restored');
				this.errorReporter.captureEvent({ name: 'Context restored' });

				if (this.webgl) {
					this.webgl = initWebGLResources(this.webgl.gl, this.paletteManager, this.camera);
				}
			});

			this.initialized = true;

			const stats = document.getElementById('stats') as HTMLElement;
			this.statsText = document.createTextNode('');
			stats.appendChild(this.statsText);

			this.input.onReleased(Key.KEY_O, () => this.zoomOut());
			this.input.onReleased(Key.KEY_P, () => this.zoomIn());
			this.input.onReleased(Key.GAMEPAD_BUTTON_Y, () => this.changeScale());

			this.input.onPressed(Key.ENTER, () => this.onChat.next());
			this.input.onPressed(Key.ESCAPE, () => this.escape());
			this.input.onPressed(Key.GAMEPAD_BUTTON_X, () => this.onToggleChat.next());
			// this.input.onPressed(Key.BACKSPACE, () => this.backspace());
			this.input.onPressed(Key.KEY_H, () => turnHeadAction(this));
			this.input.onPressed(Key.FORWARD_SLASH, () => this.onCommand.next());
			this.input.onPressed([Key.KEY_B, Key.GAMEPAD_BUTTON_B, Key.TOUCH_SECOND_CLICK], () => boopAction(this));
			this.input.onPressed([Key.KEY_E, Key.GAMEPAD_BUTTON_A], () => {
				interact(this, this.input.isPressed(Key.SHIFT));
			});
			this.input.onPressed([Key.KEY_X, Key.GAMEPAD_BUTTON_DOWN], () => downAction(this));
			this.input.onPressed([Key.KEY_C, Key.GAMEPAD_BUTTON_UP], () => upAction(this));
			this.input.onPressed(Key.F2, () => {
				if (!this.settings.browser.disableFKeys) {
					this.hideText = !this.hideText;
					this.hidePublicChat = false;
				}
			});
			this.input.onPressed(Key.F3, () => {
				if (!this.settings.browser.disableFKeys) {
					this.hideText = false;
					this.hidePublicChat = !this.hidePublicChat;
				}
			});
			this.input.onPressed(Key.F4, () => {
				if (!this.settings.browser.disableFKeys) {
					this.settings.account.seeThroughObjects = !this.settings.account.seeThroughObjects;
					this.settings.saveAccountSettings(this.settings.account);
				}
			});

			[
				Key.KEY_1, Key.KEY_2, Key.KEY_3, Key.KEY_4, Key.KEY_5, Key.KEY_6,
				Key.KEY_7, Key.KEY_8, Key.KEY_9, Key.KEY_0, Key.DASH, Key.EQUALS,
			].forEach((key, index) => this.input.onPressed(key, () => {
				if (this.actions[index]) {
					this.zone.run(() => useAction(this, this.actions[index].action));
				}
			}));

			const addDebugShortcut = (num: number, name: string, action: () => void) => {
				this.input.onPressed(numpad[num], () => {
					if (!this.input.isPressed(Key.SHIFT)) {
						this.apply(action);
					}
				});
				this.debugShortcuts.push(`${num} - ${name}`);
				this.debugShortcuts.sort();
			};

			// const addDebugShortcutShift = (num: number, name: string, action: () => void) => {
			// 	this.input.onPressed(numpad[num], () => {
			// 		if (this.input.isPressed(Key.SHIFT)) {
			// 			this.apply(action);
			// 		}
			// 	});
			// 	this.debugShortcuts.push(`${num} (shift) - ${name}`);
			// 	this.debugShortcuts.sort();
			// };

			if (BETA) {
				// editor
				this.input.onPressed(Key.BACKSPACE, () => {
					if (this.mod) {
						this.send(server => server.editorAction({ type: 'undo' }));
					}
				});
				this.input.onPressed(Key.DELETE, this.applied(() => {
					const entities = this.editor.selectedEntities.map(e => e.id);
					this.send(server => server.editorAction({ type: 'remove', entities }));
					this.editor.selectedEntities.length = 0;
				}));

				[
					{ key: Key.LEFT, dx: -1 / tileWidth, dy: 0 },
					{ key: Key.RIGHT, dx: 1 / tileWidth, dy: 0 },
					{ key: Key.UP, dx: 0, dy: -1 / tileHeight },
					{ key: Key.DOWN, dx: 0, dy: 1 / tileHeight },
				].forEach(({ key, dx, dy }) => this.input.onPressed(key, () => {
					this.editor.selectedEntities.forEach(({ id, x, y }) => {
						this.send(server => server.editorAction({
							type: 'move',
							entities: [{ id, x: x + dx, y: y + dy }],
						}));
					});
				}));

				// debug
				this.input.onReleased(Key.KEY_M, () => this.showMinimap = !this.showMinimap);
				this.input.onPressed(Key.KEY_G, () => {
					if (this.input.isPressed(Key.SHIFT)) {
						let faceDir = 0;
						let dir = 1;
						this.player!.doAction = DoAction.Swing;
						const state = this.player!.ponyState;

						const interval = setInterval(() => {
							faceDir += dir;

							if (faceDir < 0) {
								clearInterval(interval);
								return;
							}

							state.headTurn = faceDir;

							if (faceDir === 3) {
								turnHeadAction(this);
							}

							if (faceDir >= 6) {
								dir = -1;
							}
						}, 1000 / 24);
					} else {
						let faceDir = 0;
						const state = this.player!.ponyState;

						const interval = setInterval(() => {
							faceDir++;
							state.headTurn = faceDir;

							if (faceDir === 3) {
								turnHeadAction(this);
							}

							if (faceDir >= 7) {
								clearInterval(interval);
							}
						}, 1000 / 24);
					}
				});
				addDebugShortcut(1, 'show info at cursor', () => {
					this.debug.showInfo = !this.debug.showInfo;
					this.saveDebug();
				});
				addDebugShortcut(2, 'show water bounds', () => {
					this.drawOptions.showHeightmap = !this.drawOptions.showHeightmap;
				});
				addDebugShortcut(3, 'show collision map', () => {
					this.drawOptions.showColliderMap = !this.drawOptions.showColliderMap;
				});
				addDebugShortcut(4, 'show helpers', () => {
					this.debug.showHelpers = !this.debug.showHelpers;
					this.saveDebug();
				});
				addDebugShortcut(5, 'show tile indices', () => {
					this.drawOptions.tileIndices = !this.drawOptions.tileIndices;
				});
				addDebugShortcut(6, 'show tile grid', () => {
					this.drawOptions.tileGrid = !this.drawOptions.tileGrid;
				});
				addDebugShortcut(7, 'grayscale', () => {
					document.documentElement.style.filter = document.documentElement.style.filter ? null : 'grayscale(100%)';
				});
				addDebugShortcut(8, 'show regions', () => {
					this.debug.showRegions = !this.debug.showRegions;
					this.saveDebug();
				});
			}

			if (DEVELOPMENT) {
				let showingRange = false;
				addDebugShortcut(9, 'show chatlog range', () => {
					showingRange = !showingRange;
					updateRangeIndicator(showingRange ? this.settings.account.chatlogRange : undefined, this);
				});
				this.input.onPressed(Key.F6, () => {
					this.cameraShiftOn = !this.cameraShiftOn;
					this.cameraShiftTarget = 400;
				});
				this.input.onPressed(Key.F7, () => {
					this.debug.showPalette = !this.debug.showPalette;
					this.saveDebug();
				});
				this.input.onPressed(Key.F8, () => {
				});

				let loseContext: WEBGL_lose_context | null = null;

				this.input.onPressed(Key.F9, () => {
					if (loseContext) {
						loseContext.restoreContext();
						loseContext = null;
					} else {
						loseContext = this.webgl!.gl.getExtension('WEBGL_lose_context')!;
						loseContext.loseContext();
					}
				});
				this.input.onPressed(Key.F10, () => {
					this.settings.browser.brightNight = !this.settings.browser.brightNight;
				});
				this.input.onPressed(Key.KEY_R, this.applied(() => {
					if (!Date.now() && this.player) {
						const bounds = getInteractBounds(this.player);
						const entities = this.map.entities.filter(e =>
							e !== this.player && boundsIntersect(e.x, e.y, e.bounds, 0, 0, bounds));

						if (entities.length) {
							const entity = entities[0];
							const typeName = getEntityTypeName(entity.type);
							this.announce(`${typeName}${entities.length > 1 ? ` (1 of ${entities.length})` : ''}`);
						} else {
							this.announce('nothing');
						}
					}

					// if (this.player) this.player.swimming = !this.player.swimming;
					// this.editorElevation = '';
					// this.editorSpecial = this.editorSpecial ? '' : 'ramp-e';
				}));
				this.input.onPressed(Key.KEY_J, () => {
					if (this.player) {
						this.player.ponyState.headTilt = (this.player.ponyState.headTilt || 0) + 0.5;
					}
				});
				this.input.onPressed(Key.KEY_K, () => {
					if (this.player) {
						this.player.ponyState.headTilt = (this.player.ponyState.headTilt || 0) - 0.5;
					}
				});
				this.input.onPressed(Key.KEY_L, () => this.player && setHeadAnimation(this.player, nom));
				this.input.onReleased(Key.KEY_Q, () => this.send(server => server.leave()));
				this.input.onReleased(Key.KEY_T, () => this.toggleDisableLighting());
				this.input.onReleased(Key.KEY_U, () => {
					if (this.player) {
						console.log(
							`position: ${this.player.x.toFixed(2)}, ${this.player.y.toFixed(2)} ` +
							`region: ${Math.floor(this.player.x / REGION_SIZE)}, ${Math.floor(this.player.y / REGION_SIZE)}`);
					}
				});
				this.input.onReleased(Key.KEY_I, () => {
					const state = this.player!.ponyState;
					state.flags = setFlag(state.flags, PonyStateFlags.CurlTail, !hasFlag(state.flags, PonyStateFlags.CurlTail));
				});
				// this.input.onReleased(Key.KEY_N, () => this.engine = (this.engine + 1) % Engine.Total);
				this.input.onPressed(Key.KEY_N, () => this.audio.playRandomTrack());
				// this.input.onPressed(Key.KEY_G, () => this.wind = Math.max(0, this.wind - 1));
				// this.input.onReleased(Key.KEY_M, () => this.send(server => server.editorAction({ type: 'party' })));
				this.input.onPressed(Key.F8, () => toggleWalls());
				this.input.onPressed(Key.COMMA, () => this.deltaMultiplier = 0.5);
				this.input.onPressed(Key.PERIOD, () => this.deltaMultiplier = 2);
			}

			window.addEventListener('resize', () => {
				this.resized = true;
				DEVELOPMENT && log(`resized ${window.innerHeight} (${window.scrollY})`);
			});

			this.canvas.addEventListener('touchstart', () => this.audio.touch());
		}

		this.resized = true;

		if (!this.webgl) {
			this.initWebGL();
		}
	}
	leave() {
		if (this.socket) {
			if (this.socket.isConnected) {
				this.socket.server.leave();
			} else {
				this.socket.disconnect();
			}
		}
	}
	joined() {
		this.connectedTime = Math.round(performance.now());
		this.onJoined.next();
	}
	togglePixelRatio() {
		pixelRatioEnabled = !pixelRatioEnabled;
	}
	private escape() {
		if (this.socket && !this.onCancel()) {
			this.select(undefined);
		}
	}
	backspace() {
		if (this.player && this.player.says !== undefined) {
			this.send(server => server.say(0, '.', ChatType.Dismiss));
		}
	}
	private initWebGL() {
		this.errorReporter.captureEvent({ name: 'game.initWebGL' });

		if (!this.canvas) {
			throw new Error('Missing canvas');
		}

		try {
			this.resizeCamera();
			this.webgl = initWebGL(this.canvas, this.paletteManager, this.camera);
			const { failedFBO, palettes, renderer } = this.webgl;

			if (renderer) {
				this.errorReporter.configureData({ renderer });
			}

			if (failedFBO) {
				this.errorReporter.captureEvent({ name: 'game.initWebGL failed FBO' });
			}

			this.offlinePony = createPony(0, 0, OFFLINE_PONY, palettes.defaultPalette, this.paletteManager);
			this.supporterPony = createPony(0, 0, SUPPORTER_PONY, palettes.defaultPalette, this.paletteManager);
			initializeToys(this.paletteManager);
		} catch (e) {
			this.errorReporter.captureEvent({ name: 'failed game.initWebGL', error: e.message, stack: e.stack });
			this.releaseWebGL();
			DEVELOPMENT && console.error(e);
			throw new Error(`Failed to initialize graphics device (${e.message})`);
		}
	}
	private releaseWebGL() {
		this.errorReporter.captureEvent({ name: 'game.releaseWebGL' });

		if (this.webgl) {
			try {
				this.paletteManager.dispose(this.webgl.gl);
				disposeWebGL(this.webgl);
			} catch (e) {
				DEVELOPMENT && console.error(e);
			}

			this.webgl = undefined;
		}
	}
	private resizeCamera() {
		if (this.canvas) {
			const actualScale = this.scale * integerPixelRatio();
			const w = clamp(Math.ceil(this.canvas.width / actualScale), CAMERA_WIDTH_MIN, CAMERA_WIDTH_MAX);
			const h = clamp(Math.ceil(this.canvas.height / actualScale), CAMERA_HEIGHT_MIN, CAMERA_HEIGHT_MAX);

			if (this.camera.w !== w || this.camera.h !== h) {
				this.camera.w = w;
				this.camera.h = h;
				this.resizedCamera = true;
			}
		}
	}
	release() {
		this.settings.saving(() => false);
		this.loaded = false;
		this.fullyLoaded = false;
		this.player = undefined;
		this.selected = undefined;
		this.party = undefined;
		this.rightOverride = undefined;
		this.headTurnedOverride = undefined;
		this.stateOverride = undefined;
		this.notifications = [];
		this.map = createWorldMap();
		this.camera = createCamera();

		if (this.socket) {
			this.socket.disconnect();
			this.socket = undefined;
		}

		this.audio.stop();
		this.input.release();
		this.releaseWebGL();
	}
	startup(socket: ClientSocketService, mod: boolean) {
		if (this.settings.account.actions) {
			this.actions = deserializeActions(this.settings.account.actions);
		} else {
			this.actions = createDefaultButtonActions();
		}

		const saveSettings = (settings: AccountSettings) => this.send(server => server.saveSettings(settings));
		const saveSettingsDebounced = debounce(saveSettings, 1500);

		this.element = document.getElementById('app-game')!;
		this.settings.saving(settings => (saveSettingsDebounced(settings), true));
		this.lastChatMessageType = ChatType.Say;
		this.selected = undefined;
		this.party = undefined;
		this.socket = socket;
		this.audio.setVolume(this.volume);
		// this.audio.play();
		this.mod = mod;
		this.nextFriendsCRC = performance.now() + 5 * SECOND;

		if (DEVELOPMENT) {
			initLogger(message => this.onMessage.next({
				id: 1, crc: 1, name: 'log', type: MessageType.System,
				message: `[${((performance.now() | 0) % 10000)}] ${message}`
			}));
		}

		if (DEVELOPMENT && LOG_POSITION) {
			this.positions.length = 0;
		}
	}
	private getPixelScale() {
		return this.scale * (integerPixelRatio() / pixelRatio());
	}
	update(delta: number, now: number, last: number) {
		TIMING && timeStart('update');
		delta *= this.deltaMultiplier;

		const shiftSpeed = delta * 10;

		if (this.cameraShiftOn && this.camera.shiftRatio !== 1) {
			this.camera.shiftRatio = Math.min(1, this.camera.shiftRatio + shiftSpeed);
		} else if (!this.cameraShiftOn && this.camera.shiftRatio !== 0) {
			this.camera.shiftRatio = Math.max(0, this.camera.shiftRatio - shiftSpeed);
		}

		updateMap(this.map, delta);

		if (!this.socket || !this.socket.isConnected || !this.element)
			return;

		this.updateGameTime(delta);

		if (this.lastPixelRatio !== pixelRatio()) {
			this.lastPixelRatio = pixelRatio();
			this.resized = true;
		}

		if (this.resized) {
			this.resizeCanvas();
		}

		const player = this.player;
		const camera = this.camera;
		const input = this.input;
		const server = this.socket.server;

		restorePlayerPosition();

		input.disabledGamepad = !!this.settings.browser.disableGamepad;
		input.update();

		this.resizeCamera();
		this.updateCameraShift();

		const actualScale = this.scale * integerPixelRatio();
		this.camera.offset = this.cameraShiftTarget / actualScale;

		let moved = false;

		if (player && this.loaded) {
			if (BETA && this.editor.selectedEntities.length) {
				input.disableArrows = true;
			}

			this.showWallPlaceholder = player.hold === toggleWallsTool.type && hasFlag(this.map.flags, MapFlags.EditableWalls);

			if (this.highlightEntity) {
				if (this.highlightEntity.id === 0) {
					releaseEntity(this.highlightEntity);
				}

				this.highlightEntity = undefined;
			}

			const shift = input.isPressed(Key.SHIFT);
			const x = this.fullyLoaded ? input.axisX : 0;
			const y = this.fullyLoaded ? input.axisY : 0;
			const dir = vectorToDir(x, y);
			const vec = (x || y) ? dirToVector(dir) : { x: 0, y: 0 };
			const walk = input.isMovementFromButtons ? (this.settings.browser.walkByDefault ? !shift : shift) : false;
			const flags = getMovementFlag(x, y, walk);
			const speed = flagsToSpeed(flags);
			const vx = vec.x * speed;
			const vy = vec.y * speed;

			if (BETA) {
				input.disableArrows = false;
			}

			if (player.vx !== vx || player.vy !== vy) {
				if (vx === 0) {
					player.x = roundPositionX(player.x) + 0.5 / tileWidth;
				}

				if (vy === 0) {
					player.y = roundPositionY(player.y) + 0.5 / tileHeight;
				}

				const time = (last - this.connectedTime) >>> 0;
				const [a, b, c, d, e] = encodeMovement(player.x, player.y, dir, flags, time, camera);
				server.move(a, b, c, d, e);
				moved = true;
				this.resizedCamera = false;
			}

			if ((vx || vy) && (isPonySitting(player) || isPonyLying(player))) {
				player.state = setPonyState(player.state, EntityState.PonyStanding);
			}

			updateEntityVelocity(this.map, player, vx, vy);

			const facingRight = isFacingRight(player);
			const right = isMovingRight(vx, facingRight);

			if (facingRight !== right) {
				player.state = setFlag(player.state, EntityState.FacingRight, right);
				player.state = setFlag(player.state, EntityState.HeadTurned, false);
				this.rightOverride = right;
			}

			updateCamera(camera, player, this.map);

			const scale = this.getPixelScale();
			const hover = screenToWorld(camera, point(input.pointerX / scale, input.pointerY / scale));

			if (input.usingTouch && !input.wasPressed(Key.TOUCH_CLICK) && !input.isPressed(Key.TOUCH)) {
				hover.x = -1;
				hover.y = -1;
			}

			this.hover = hover;

			if (this.fullyLoaded) {
				if (BETA && this.editor.draggingEntities) {
					editorDragEntities(this, hover, input.isPressed(Key.MOUSE_BUTTON2));
				}

				if (hasFlag(this.map.flags, MapFlags.EditableEntities)) {
					if (player.hold === removeEntitiesTool.type) {
						this.highlightEntity = pickEntities(this.map, hover, true, false, true)[0];
					} else if (player.hold === placeEntitiesTool.type) {
						if (!isOutsideMap(hover.x, hover.y, this.map)) {
							const { type } = placeableEntities[this.placeEntity];
							let { x, y } = hover;

							if (this.map.editableArea) {
								x = clamp(x, this.map.editableArea.x, this.map.editableArea.x + this.map.editableArea.w);
								y = clamp(y, this.map.editableArea.y, this.map.editableArea.y + this.map.editableArea.h);
							}

							this.highlightEntity = createAnEntity(type, 0, x, y, {}, this.paletteManager, this);
						}
					}
				}

				if (input.wasPressed(Key.MOUSE_BUTTON1) || input.wasPressed(Key.TOUCH_CLICK)) {
					const pickedEntities = pickEntities(this.map, hover, shift, this.mod);
					const pickedEntity = pickedEntities[(pickedEntities.indexOf(this.selected!) + 1) % pickedEntities.length];
					const holdingRemoveTool = player.hold === removeEntitiesTool.type;
					const holdingPlaceTool = player.hold === placeEntitiesTool.type;
					const editableMap = hasFlag(this.map.flags, MapFlags.EditableEntities);
					const holdingTool = holdingRemoveTool || holdingPlaceTool;

					if (BETA && this.editor.selectingEntities) {
						editorSelectEntities(this, hover, shift);
					} else if (pickedEntity && (!holdingTool || !editableMap || hasFlag(pickedEntity.flags, EntityFlags.IgnoreTool))) {
						if (pickedEntity.type === PONY_TYPE) {
							this.select(pickedEntity as Pony);
						} else if (entityInRange(pickedEntity, player)) {
							server.interact(pickedEntity.id);
						}
					} else if (BETA && this.editor.tile !== -1) {
						if (this.editor.brushSize > 1) {
							const x = Math.floor((hover.x - (this.editor.brushSize / 2)));
							const y = Math.floor((hover.y - (this.editor.brushSize / 2)));
							server.editorAction({ type: 'tile', x, y, tile: this.editor.tile, size: this.editor.brushSize });
						} else {
							const x = hover.x | 0;
							const y = hover.y | 0;
							const type = this.editor.tile === getTile(this.map, hover.x, hover.y) ? TileType.Dirt : this.editor.tile;
							server.changeTile(x, y, type);
						}
					} else if (player.hold === changeTileTool.type && hasFlag(this.map.flags, MapFlags.EditableTiles)) {
						const x = hover.x | 0;
						const y = hover.y | 0;
						server.changeTile(x, y, houseTiles[this.placeTile].type);
					} else if (player.hold === toggleWallsTool.type && hasFlag(this.map.flags, MapFlags.EditableWalls)) {
						toggleWall(this, hover);
					} else if (holdingRemoveTool && this.highlightEntity && editableMap) {
						const id = this.highlightEntity.id;
						this.send(server => server.actionParam(Action.RemoveEntity, id));
					} else if (holdingPlaceTool && this.highlightEntity && editableMap) {
						const { x, y, type } = this.highlightEntity;
						this.send(server => server.actionParam(Action.PlaceEntity, { x, y, type }));
					} else if (this.selected) {
						this.select(undefined);
					} else if (hasFlag(this.map.flags, MapFlags.EdibleGrass)) {
						const tile = getTile(this.map, hover.x, hover.y);

						if (isValidTile(tile) && distanceXY(player.x, player.y, hover.x, hover.y) < TILE_CHANGE_RANGE) {
							const x = hover.x | 0;
							const y = hover.y | 0;
							let type = tile === TileType.Grass ? TileType.Dirt : TileType.Grass;
							server.changeTile(x, y, type);
						}
					} else if (DEVELOPMENT && this.engine === Engine.LayeredTiles && this.editor.elevation) {
						const value = getElevation(this.map, hover.x, hover.y);
						setElevation(this.map, hover.x, hover.y, clamp(this.editor.elevation === 'up' ? value + 1 : value - 1, 0, 10));
					}
				}

				if (BETA && input.wasPressed(Key.MOUSE_BUTTON2)) {
					if (this.editor.selectingEntities) {
						editorMoveEntities(this, hover);
					} else if (this.mod) {
						toggleWall(this, hover);
					}
				}

				if (BETA && input.wasPressed(Key.MOUSE_BUTTON3)) {
					if (this.mod) {
						server.editorAction({ type: 'place', entity: this.editor.type, x: hover.x, y: hover.y });
						console.log(`${this.editor.type}(${hover.x.toFixed(2)}, ${hover.y.toFixed(2)})`);
					}
				}

				if (this.player && input.wheelY) {
					if (input.isPressed(Key.SHIFT)) {
						if (hasFlag(this.map.flags, MapFlags.EditableEntities)) {
							const action = input.wheelY < 0 ? Action.SwitchTool : Action.SwitchToolRev;
							this.send(server => server.action(action));
						}
					} else {
						if (this.player.hold === placeEntitiesTool.type) {
							this.changePlaceEntity(input.wheelY < 0);
						} else if (this.player.hold === changeTileTool.type) {
							this.changePlaceTile(input.wheelY < 0);
						}
					}
				}

				const isHeadTurned = hasFlag(player.state, EntityState.HeadTurned);
				const isHeadFacingRight = right ? !isHeadTurned : isHeadTurned;

				if (((input.axis2X < 0 && isHeadFacingRight) || (input.axis2X > 0 && !isHeadFacingRight))) {
					if (server.action(Action.TurnHead) as any) {
						player.state = (player.state) ^ EntityState.HeadTurned;
					}
				}
			}
		}

		if (player) {
			const safe = hasFlag(this.worldFlags, WorldStateFlags.Safe);
			updateEntities(this, this.time, delta, safe);
			savePlayerPosition();
		}

		if (this.changedScale) {
			this.changedScale = false;
			this.resizedCamera = true;

			if (player) {
				centerCameraOn(camera, player);
			}
		}

		if (player) {
			updateCamera(camera, player, this.map);
		}

		if (this.resizedCamera) {
			server.updateCamera(camera.x, camera.y, camera.w, camera.h);
			this.resizedCamera = false;
		}

		if (player) {
			updateEntitiesCoverLifted(this.map, player, !!this.settings.account.seeThroughObjects, delta);
			updateEntitiesWithNames(this.map, this.hover, player);
			updateEntitiesTriggers(this.map, player, this);
		}

		input.end();

		if (this.nextFriendsCRC < now) {
			this.send(server => server.actionParam(Action.FriendsCRC, this.model.computeFriendsCRC()));
			this.nextFriendsCRC = now + 15 * MINUTE;
		}

		const threshold = Date.now() - 10 * SECOND;

		for (let i = this.incompleteSays.length - 1; i >= 0; i--) {
			if (this.incompleteSays[i].time < threshold) {
				this.incompleteSays.splice(i, 1);
			}
		}

		this.updateSocketStats(delta);
		TIMING && timeEnd();

		if (DEVELOPMENT && LOG_POSITION) {
			if (this.player) {
				this.positions.push({ x: this.player.x, y: this.player.y, moved });
			}
		}
	}
	private updateGameTime(delta: number) {
		if (this.baseTime !== this.targetBaseTime) {
			const timeDelta = Math.floor(delta * 0.2 * HOUR);
			const baseTime = this.baseTime + timeDelta * (this.baseTime > this.targetBaseTime ? -1 : 1);

			if (Math.abs(this.targetBaseTime - baseTime) < timeDelta) {
				this.baseTime = this.targetBaseTime;
			} else {
				this.baseTime = baseTime;
			}
		}

		this.time = this.baseTime + performance.now();
	}
	private updateSocketStats(delta: number) {
		this.timeSize += delta;

		if (this.timeSize > 1) {
			this.sent = 8 * this.socket!.sentSize / this.timeSize / 1024;
			this.recv = 8 * this.socket!.receivedSize / this.timeSize / 1024;
			this.socket!.sentSize = 0;
			this.socket!.receivedSize = 0;
			this.timeSize = 0;
		}
	}
	setWorldState(state: WorldState, initial: boolean) {
		this.season = state.season;
		this.holiday = state.holiday;
		this.worldFlags = state.flags;
		this.lightData = createLightData(this.season);
		initFeatureFlags(state.featureFlags);

		const baseTime = state.time - performance.now();

		if (initial) {
			this.baseTime = this.targetBaseTime = baseTime;
		} else {
			this.targetBaseTime = baseTime;
		}

		this.updateTileSets();

		if (this.model.friends) {
			for (const friend of this.model.friends) {
				friend.actualName = filterEntityName(this, friend.name, friend.nameBad) || '';
			}
		}
	}
	setPlayer(player: Pony) {
		this.player = player;
		centerCameraOn(this.camera, player);
		this.send(server => server.loaded());
	}
	setupMap() {
		this.bg = colorToFloatArray(getTileColor(this.map.defaultTile, this.season));
		this.audio.initTracks(this.season, this.holiday, this.map.type);
		this.audio.playOrSwitchToRandomTrack();
		this.updateTileSets();
	}
	private updateTileSets() {
		this.tileSets = updateTileSets(this.paletteManager, this.tileSets, this.season, this.map.type);
	}
	draw() {
		redrawActionButtons(this.actionsChanged);
		this.actionsChanged = false;

		if (!this.webgl)
			return;

		if (this.webgl.gl.isContextLost()) {
			DEVELOPMENT && console.warn('Context is lost');
			return;
		}

		// start frame
		const now = performance.now();

		if ((now - this.lastDraw) < this.frameDelay) {
			return;
		}

		this.frames++;

		if ((now - this.lastFps) > 1000) {
			this.drawFps = this.frames * 1000 / (now - this.lastFps);
			this.frames = 0;
			this.lastFps = now;
		}

		this.lastDraw = now;

		// draw
		const {
			gl, frameBuffer, frameBufferSheet, spriteShader, spriteBatch, lightShader, paletteBatch, paletteShader,
			palettes,
		} = this.webgl;

		TIMING && timeStart('draw');

		TIMING && timeStart('draw init');
		let lightColor = WHITE;
		let shadowColor = 0;

		if (this.map.type === MapType.Cave) {
			lightColor = CAVE_LIGHT;
			shadowColor = CAVE_SHADOW;
		} else {
			lightColor = getLightColor(this.lightData, this.time);
			shadowColor = getShadowColor(this.lightData, this.time);
		}

		if (BETA && this.editor.customLight) {
			lightColor = parseColor(this.editor.lightColor);
			shadowColor = this.shadowColor;
		}

		const camera = this.camera;
		const width = camera.w;
		const height = camera.h;
		const ratio = integerPixelRatio();
		const actualScale = this.scale * ratio;
		const bg = this.bg;

		colorToExistingFloatArray(light, lightColor);

		const drawOptions = this.drawOptions;
		drawOptions.gameTime = this.time;
		drawOptions.lightColor = lightColor;
		drawOptions.shadowColor = shadowColor;
		drawOptions.drawHidden = this.mod;
		drawOptions.season = this.season;

		if (DEVELOPMENT) {
			drawOptions.debug = this.debug;
		}

		if (DEVELOPMENT || BETA) {
			drawOptions.engine = this.engine;
		}

		ortho(this.fboMatrix, 0, gl.drawingBufferWidth / actualScale, gl.drawingBufferHeight / actualScale, 0, 0, 1000);
		TIMING && timeEnd();

		TIMING && timeStart('ensureAllVisiblePon...');
		ensureAllVisiblePoniesAreDecoded(this.map, camera, this.paletteManager);
		TIMING && timeEnd();

		TIMING && timeStart('commit+invalidatePalettes');
		if (this.paletteManager.commit(gl)) {
			invalidatePalettes(this.map.entitiesDrawable);
		}
		TIMING && timeEnd();

		if (this.settings.browser.brightNight) {
			lerpColor(light, white, 0.3);
		}

		if (this.engine === Engine.NewLighting) {
			// ...
		} else if (this.disableLighting) {
			ortho(this.viewMatrix, camera.x, camera.x + camera.w, camera.actualY + camera.h, camera.actualY, 0, 1000);
			lerpColor(light, white, 0.1); // adjust lighting for missing lights

			// color -> screen
			gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
			gl.disable(gl.DEPTH_TEST);
			gl.enable(gl.BLEND);
			gl.blendEquation(gl.FUNC_ADD);
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

			this.drawMap(this.webgl, this.map, this.viewMatrix, light, drawOptions);
		} else {
			ortho(this.viewMatrix, camera.x, camera.x + camera.w, camera.actualY, camera.actualY + camera.h, 0, 1000);

			TIMING && timeStart('initializeFrameBuffer');
			this.initializeFrameBuffer(this.webgl, width, height);
			TIMING && timeEnd();

			if (!frameBuffer) {
				DEVELOPMENT && console.warn('No frame buffer');
				return;
			}

			// color -> fbo
			TIMING && timeStart('color -> fbo');
			// gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer.handle);
			bindFrameBuffer(gl, frameBuffer);
			gl.viewport(0, 0, frameBuffer.width, frameBuffer.height);
			gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
			gl.clear(gl.COLOR_BUFFER_BIT); // | gl.DEPTH_BUFFER_BIT);
			gl.viewport(0, 0, width, height);
			gl.disable(gl.DEPTH_TEST);
			//gl.depthFunc(gl.LEQUAL);
			gl.enable(gl.BLEND);
			gl.blendEquation(gl.FUNC_ADD);
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
			this.drawMap(this.webgl, this.map, this.viewMatrix, white, drawOptions);
			TIMING && timeEnd();

			// color -> screen
			TIMING && timeStart('color -> screen');
			// gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			unbindFrameBuffer(gl);
			gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
			gl.clearColor(0, 0, 0, 1);
			gl.clear(gl.COLOR_BUFFER_BIT);
			// gl.disable(gl.DEPTH_TEST);
			gl.disable(gl.BLEND);

			gl.useProgram(spriteShader.program);
			gl.uniformMatrix4fv(spriteShader.uniforms.transform, false, this.fboMatrix);
			gl.uniform4fv(spriteShader.uniforms.lighting, white);
			gl.uniform1f(spriteShader.uniforms.textureSize, frameBufferSheet.texture!.width);
			bindTexture(gl, 0, frameBufferSheet.texture);
			spriteBatch.begin();
			spriteBatch.drawImage(WHITE, 0, 0, width, height, 0, 0, width, height);
			spriteBatch.end();
			TIMING && timeEnd();

			// light -> fbo
			TIMING && timeStart('light -> fbo');
			// gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer.handle);
			bindFrameBuffer(gl, frameBuffer);
			gl.viewport(0, 0, frameBuffer.width, frameBuffer.height);
			gl.clearColor(light[0], light[1], light[2], light[3]);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.viewport(0, 0, width, height);
			//gl.enable(gl.DEPTH_TEST);
			gl.enable(gl.BLEND);
			gl.blendEquation(gl.FUNC_ADD);
			gl.blendFunc(gl.ONE, gl.ONE);
			TIMING && timeEnd();

			// shadows
			//for (const e of map.entities) {
			//	if (e.drawShadow && camera.isBoundVisible(e.shadowBounds || e.bounds, e.x, e.y)) {
			//		this.spriteBatch.depth = camera.mapDepth(e.y);
			//		e.drawShadow(this.spriteBatch);
			//	}
			//}

			// soft lights
			TIMING && timeStart('drawEntityLights');
			gl.useProgram(lightShader.program);
			gl.uniformMatrix4fv(lightShader.uniforms.transform, false, this.viewMatrix);
			gl.uniform4fv(lightShader.uniforms.lighting, white);
			spriteBatch.begin();
			drawEntityLights(spriteBatch, this.map.entitiesLight, this.camera, drawOptions);
			spriteBatch.end();
			TIMING && timeEnd();

			// light sprites
			TIMING && timeStart('drawEntityLightSprites');
			gl.useProgram(spriteShader.program);
			gl.uniformMatrix4fv(spriteShader.uniforms.transform, false, this.viewMatrix);
			gl.uniform4fv(spriteShader.uniforms.lighting, white);
			gl.uniform1f(spriteShader.uniforms.textureSize, normalSpriteSheet.texture!.width);
			bindTexture(gl, 0, normalSpriteSheet.texture);
			spriteBatch.begin();
			drawEntityLightSprites(spriteBatch, this.map.entitiesLightSprite, this.camera, drawOptions);
			spriteBatch.end();
			TIMING && timeEnd();

			// light -> screen
			TIMING && timeStart('light -> screen');
			// gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			unbindFrameBuffer(gl);
			gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
			gl.enable(gl.BLEND);
			gl.blendEquation(gl.FUNC_ADD);
			gl.blendFunc(gl.DST_COLOR, gl.ZERO);

			gl.useProgram(spriteShader.program);
			gl.uniformMatrix4fv(spriteShader.uniforms.transform, false, this.fboMatrix);
			gl.uniform4fv(spriteShader.uniforms.lighting, white);
			gl.uniform1f(spriteShader.uniforms.textureSize, frameBufferSheet.texture!.width);
			bindTexture(gl, 0, frameBufferSheet.texture);
			spriteBatch.begin();
			spriteBatch.drawImage(WHITE, 0, 0, width, height, 0, 0, width, height);
			spriteBatch.end();
			TIMING && timeEnd();
		}

		// ui -> screen
		gl.enable(gl.BLEND);
		gl.blendEquation(gl.FUNC_ADD);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		TIMING && timeStart('drawNames+drawChat');
		gl.useProgram(paletteShader.program);
		gl.uniformMatrix4fv(paletteShader.uniforms.transform, false, this.fboMatrix);
		gl.uniform4fv(paletteShader.uniforms.lighting, white);
		gl.uniform1f(paletteShader.uniforms.pixelSize, this.paletteManager.pixelSize);
		gl.uniform1f(paletteShader.uniforms.textureSize, paletteSpriteSheet.texture!.width);
		bindTexture(gl, 0, paletteSpriteSheet.texture);
		bindTexture(gl, 1, this.paletteManager.texture);
		paletteBatch.begin();

		if (!this.hideText) {
			drawNames(
				paletteBatch, this.map.entitiesWithNames, this.player, this.party, this.camera, this.hover, this.mod, palettes);
			drawChat(
				paletteBatch, this.map.entitiesWithChat, this.camera, this.mod, palettes, this.hidePublicChat);
		}

		if (!this.socket || !this.socket.isConnected) {
			this.drawMessage(this.webgl, 'Connecting...');
		} else if (!this.loaded) {
			if (this.placeInQueue) {
				this.drawMessage(this.webgl, `Waiting in queue (${this.placeInQueue})`);
			} else {
				this.drawMessage(this.webgl, 'Loading...');
			}
		} else if ((performance.now() - this.socket.lastPacket) > CONNECTION_ISSUE_TIMEOUT) {
			// this.drawMessage('Connection issues...');
		}

		if (BETA && this.debug.showInfo) {
			try {
				const scale = this.getPixelScale();
				const x = this.input.pointerX / scale + 5;
				const y = this.input.pointerY / scale;
				const height = getMapHeightAt(this.map, this.hover.x, this.hover.y, this.time);
				drawText(paletteBatch, `${height.toFixed(2)}`, fontSmallPal, BLACK, x, y);
			} catch (e) {
				console.warn(e.message);
			}
		}

		if (this.showWallPlaceholder) {
			const x = this.hover.x | 0;
			const y = this.hover.y | 0;
			const dx = this.hover.x - x;
			const dy = this.hover.y - y;
			const palette = this.webgl.palettes.defaultPalette;
			const color = makeTransparent(WHITE, 0.6);
			const screenX = toScreenX(x) - this.camera.x;
			const screenY = toScreenY(y) - this.camera.actualY;

			if (x >= 0 && y >= 0 && x < this.map.width && y < this.map.height) {
				if (dx > dy) {
					if ((dx + dy) < 1) {
						paletteBatch.drawSprite(wall_h_placeholder.color, color, palette, screenX, screenY - 15);
					} else {
						paletteBatch.drawSprite(wall_v_placeholder.color, color, palette, screenX + tileWidth - 4, screenY - 12);
					}
				} else {
					if ((dx + dy) < 1) {
						paletteBatch.drawSprite(wall_v_placeholder.color, color, palette, screenX - 4, screenY - 12);
					} else {
						paletteBatch.drawSprite(wall_h_placeholder.color, color, palette, screenX, screenY + tileHeight - 15);
					}
				}
			}
		}

		paletteBatch.end();
		TIMING && timeEnd();

		gl.useProgram(spriteShader.program);
		gl.uniformMatrix4fv(spriteShader.uniforms.transform, false, this.fboMatrix);
		gl.uniform4fv(spriteShader.uniforms.lighting, white);

		if (BETA && this.showMinimap && this.minimap) {
			gl.uniform1f(spriteShader.uniforms.textureSize, normalSpriteSheet.texture!.width);
			bindTexture(gl, 0, normalSpriteSheet.texture);
			spriteBatch.begin();
			spriteBatch.save();

			const { width, height, data } = this.minimap;
			const scale = 4 / this.scale;

			spriteBatch.translate(100, 100);
			spriteBatch.scale(scale, scale);

			spriteBatch.drawRect(BLACK, -1, -1, width + 2, height + 2);

			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					spriteBatch.drawRect(data[x + y * width], x, y, 1, 1);
				}
			}

			if (this.player) {
				spriteBatch.drawRect(RED, Math.floor(this.player.x), Math.floor(this.player.y), 1, 1);
			}

			spriteBatch.restore();
			spriteBatch.end();
		}

		if (BETA && this.debug.showRegions && this.player) {
			gl.uniform1f(spriteShader.uniforms.textureSize, normalSpriteSheet.texture!.width);
			bindTexture(gl, 0, normalSpriteSheet.texture);
			spriteBatch.begin();
			drawDebugRegions(spriteBatch, this.map, this.player, this.camera);
			spriteBatch.end();
		}

		const showFPS = !!this.settings.browser.showFps;
		const showHelp = BETA && this.input.isPressed(Key.F1);
		const showPalette = DEVELOPMENT && this.debug.showPalette;

		if (showFPS || showHelp || showPalette) {
			// 1 to 1 pixel scale drawing
			TIMING && timeStart('showFps');
			const scale = 2;
			// const height = gl.drawingBufferHeight / (ratio * scale);
			ortho(this.fboMatrix, 0, gl.drawingBufferWidth / ratio, gl.drawingBufferHeight / ratio, 0, 0, 1000);
			gl.uniformMatrix4fv(spriteShader.uniforms.transform, false, this.fboMatrix);
			gl.uniform1f(spriteShader.uniforms.textureSize, normalSpriteSheet.texture!.width);
			bindTexture(gl, 0, normalSpriteSheet.texture);
			spriteBatch.begin();
			spriteBatch.save();
			spriteBatch.scale(scale, scale);

			if (showFPS) {
				drawText(spriteBatch, this.drawFps.toFixed(), fontSmall, BLACK, 2, 2);

				if (this.timingsText) {
					const size = measureText(this.timingsText, fontMono);
					spriteBatch.drawRect(0x000000aa, 2, 26, 220, size.h + 8);
					drawText(spriteBatch, this.timingsText, fontMono, WHITE, 2, 30);
				}
			}

			if (BETA && showHelp) {
				let y = 25;

				for (const shortcut of this.debugShortcuts) {
					drawOutlinedText(spriteBatch, shortcut, font, WHITE, BLACK, 5, y);
					y += 10;
				}
			}

			// if (DEVELOPMENT) {
			// 	const width = gl.drawingBufferWidth / (ratio * scale);
			// 	const { isCollidingCount, isCollidingObjectCount } = getCollisionStats();
			// 	const text =
			// 		`${isCollidingCount.toString().padStart(7)} calls\n` +
			// 		`${isCollidingObjectCount.toString().padStart(7)} total checks\n` +
			// 		`${this.markedColliding.toString().padStart(7)} player checks`;
			// 	const size = measureText(text, fontMono);
			// 	const x = width - 160;
			// 	const y = 26;
			// 	spriteBatch.drawRect(0x000000aa, x, y, 150, size.h + 10);
			// 	drawText(spriteBatch, text, fontMono, WHITE, x + 5, y + 5);
			// }

			spriteBatch.restore();
			spriteBatch.end();

			if (DEVELOPMENT && showPalette) {
				const paletteTexture = this.paletteManager.texture!;
				const { width, height } = paletteTexture;

				gl.uniform1f(spriteShader.uniforms.textureSize, normalSpriteSheet.texture!.width);
				bindTexture(gl, 0, normalSpriteSheet.texture);
				spriteBatch.begin();
				spriteBatch.drawRect(0x00000066, 20, 20, width, height);
				spriteBatch.end();

				gl.uniform1f(spriteShader.uniforms.textureSize, width);
				bindTexture(gl, 0, paletteTexture);
				spriteBatch.begin();
				spriteBatch.drawImage(WHITE, 0, 0, width, height, 20, 20, width, height);
				spriteBatch.end();
			}

			TIMING && timeEnd();
		}

		bindTexture(gl, 0, undefined);
		bindTexture(gl, 1, undefined);
		gl.useProgram(null);

		TIMING && timeEnd();
		this.updateStatsText();

		TIMING && timeStart('messageQueue');
		while (this.messageQueue.length) {
			this.onMessage.next(this.messageQueue.shift()!);
		}
		TIMING && timeEnd();

		TIMING && timeStart('onFrame');
		this.onFrame.next();
		TIMING && timeEnd();
	}
	private drawMessage({ paletteBatch, palettes }: WebGL, message: string) {
		drawFullScreenMessage(paletteBatch, this.camera, message, palettes.mainFont.white);
	}
	private drawMap(webgl: WebGL, map: WorldMap, viewMatrix: Matrix4, lighting: Float32Array, options: DrawOptions) {
		const { gl, paletteBatch, paletteShader } = webgl;

		TIMING && timeStart('drawMap');
		if (this.tileSets && this.player) {
			gl.useProgram(paletteShader.program);
			gl.uniformMatrix4fv(paletteShader.uniforms.transform, false, viewMatrix);
			gl.uniform4fv(paletteShader.uniforms.lighting, lighting);
			gl.uniform1f(paletteShader.uniforms.pixelSize, this.paletteManager.pixelSize);
			gl.uniform1f(paletteShader.uniforms.textureSize, paletteSpriteSheet.texture!.width);
			bindTexture(gl, 0, paletteSpriteSheet.texture);
			bindTexture(gl, 1, this.paletteManager.texture);
			paletteBatch.begin();
			this.entitiesDrawn = drawMap(
				paletteBatch, map, this.camera, this.player, options, this.tileSets, this.editor.selectedEntities);
			paletteBatch.end();

			if (this.highlightEntity && this.highlightEntity.draw) {
				gl.uniform4fv(paletteShader.uniforms.lighting, highlightColor);
				paletteBatch.begin();
				this.highlightEntity.draw(paletteBatch, this.drawOptions);
				paletteBatch.end();
			}
		}
		TIMING && timeEnd();
	}
	private updateCameraShift() {
		if (isMobile) {
			const isKeyboardOpen = !!document.activeElement && /input/i.test(document.activeElement.tagName);

			if (this.lastIsKeyboardOpen !== isKeyboardOpen) {
				DEVELOPMENT && log(`keyboard open ${isKeyboardOpen}`);
				this.lastIsKeyboardOpen = isKeyboardOpen;
			}

			if (isKeyboardOpen) {
				if (!this.cameraShiftOn && window.scrollY > 100) {
					this.cameraShiftOn = true;
					this.cameraShiftTarget = window.scrollY;

					if (DEVELOPMENT) {
						log(`shift camera ${this.cameraShiftTarget} (${this.windowHeight} - ${window.innerHeight}, ${window.scrollY})`);
					}
				}
			} else {
				if (this.cameraShiftOn && window.scrollY < 100) {
					this.cameraShiftOn = false;
					DEVELOPMENT && log(`unshift camera`);
				}
			}
		}
	}
	private resizeCanvas() {
		pixelRatioCache = getPixelRatio();
		const canvas = this.canvas;
		const ratio = pixelRatio();
		const rect = this.element!.getBoundingClientRect();
		this.windowWidth = rect.width;
		this.windowHeight = rect.height;
		let w = Math.ceil(this.windowWidth * ratio);
		let h = Math.ceil(this.windowHeight * ratio);

		while ((w % 12) !== 0) {
			w++;
		}

		while ((h % 12) !== 0) {
			h++;
		}

		if (canvas && w && h && (canvas.width !== w || canvas.height !== h || this.lastCanvasRatio !== ratio)) {
			canvas.width = w;
			canvas.height = h;
			canvas.style.width = `${w / ratio}px`;
			canvas.style.height = `${h / ratio}px`;
			this.lastCanvasRatio = ratio;
			this.resized = false;
			DEVELOPMENT && log(`scrollY: ${window.scrollY}`);
		}
	}
	private initializeFrameBuffer({ gl, frameBuffer }: WebGL, width: number, height: number) {
		const targetSize = getRenderTargetSize(width, height);

		if (frameBuffer && targetSize !== frameBuffer.width) {
			const maxSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);

			if (maxSize != null && targetSize > maxSize) {
				this.setScale(this.scale + 1);
			} else {
				resizeFrameBuffer(gl, frameBuffer, targetSize, targetSize);
			}
		}
	}
	private announce(announcement: string) {
		this.announcements.next(announcement);
	}
	changePlaceEntity(reverse: boolean) {
		if (reverse) {
			this.placeEntity = this.placeEntity === 0 ? (placeableEntities.length - 1) : (this.placeEntity - 1);
		} else {
			this.placeEntity = (this.placeEntity + 1) % placeableEntities.length;
		}

		const { name } = placeableEntities[this.placeEntity];
		const total = getSaysTime(name);
		addChatBubble(this.map, this.player!, { message: name, type: MessageType.System, total, timer: total, created: Date.now() });
	}
	changePlaceTile(reverse: boolean) {
		if (reverse) {
			this.placeTile = this.placeTile === 0 ? (houseTiles.length - 1) : (this.placeTile - 1);
		} else {
			this.placeTile = (this.placeTile + 1) % houseTiles.length;
		}

		const { name } = houseTiles[this.placeTile];
		const total = getSaysTime(name);
		addChatBubble(this.map, this.player!, { message: name, type: MessageType.System, total, timer: total, created: Date.now() });
	}
	saveDebug() {
		this.storage.setJSON('debug', this.debug);
	}
	private updateStatsText() {
		const { gl, spriteBatch, paletteBatch } = this.webgl!;

		if ((performance.now() - this.lastStats) > SECOND) {
			TIMING && timingCollate();

			if (TIMING) {
				const timings = timingCollate();
				this.timingsText = timings
					.map(({ selfTime, selfPercent, totalPercent, count, name }) =>
						`${selfTime.toFixed(2).padStart(6)}ms` +
						`${selfPercent.toFixed(2).padStart(6)}%` +
						`${totalPercent.toFixed(2).padStart(6)}%` +
						`${count.toString().padStart(6)} ${name}`)
					.join('\n');
			}

			if (this.statsText) {
				let value = '';

				if (this.settings.browser.showStats) {
					const tris = spriteBatch.tris + paletteBatch.tris;
					const flush = paletteBatch.flushes;
					const sent = this.sent.toFixed();
					const recv = this.recv.toFixed();
					const drawn = this.entitiesDrawn;
					const total = this.map.entities.length;
					const ponies = this.map.entities.reduce((sum, e) => sum + (e.type === PONY_TYPE ? 1 : 0), 0);
					const extra = DEVELOPMENT ? `(${drawn}/${total}) ${tris} tris, ${flush} flush, ${this.audio.trackName}` : version;
					const gl2 = isWebGL2(gl) ? ' WebGL2' : '';
					const engine = this.engine === Engine.Default ? '' : Engine[this.engine].toUpperCase();
					const fps = this.drawFps.toFixed(0);
					const low = this.disableLighting ? ' LOW' : '';
					const extraStats = this.extraStats;
					const palSize = ` pal ${this.paletteManager.textureSize}`;
					value = `${extraStats}${engine} ${fps} fps ${sent}/${recv} kb/s ${ponies} ` +
						`ponies ${extra}${gl2}${low}${palSize}`.trim();
				}

				if (value !== this.statsTextValue) {
					this.statsText.nodeValue = value;
					this.statsTextValue = value;
				}
			}

			this.lastStats = performance.now();
			this.onClock.next(formatHourMinutes(this.time));
		}

		TIMING && timeReset();

		spriteBatch!.tris = 0;
		spriteBatch!.flushes = 0;
		paletteBatch!.tris = 0;
		paletteBatch!.flushes = 0;
	}
}
