"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const rxjs_1 = require("rxjs");
const lodash_1 = require("lodash");
const interfaces_1 = require("../common/interfaces");
const utils_1 = require("../common/utils");
const constants_1 = require("../common/constants");
const worldMap_1 = require("../common/worldMap");
const camera_1 = require("../common/camera");
const colors_1 = require("../common/colors");
const timeUtils_1 = require("../common/timeUtils");
const mixins_1 = require("../common/mixins");
const entities_1 = require("../common/entities");
const pony_1 = require("../common/pony");
const paletteManager_1 = require("../graphics/paletteManager");
const webglUtils_1 = require("../graphics/webgl/webglUtils");
const graphicsUtils_1 = require("../graphics/graphicsUtils");
const spriteUtils_1 = require("./spriteUtils");
const data_1 = require("./data");
const audio_1 = require("../components/services/audio");
const canvasUtils_1 = require("./canvasUtils");
const color_1 = require("../common/color");
const ponyAnimations_1 = require("./ponyAnimations");
const inputManager_1 = require("./input/inputManager");
const positionUtils_1 = require("../common/positionUtils");
const storageService_1 = require("../components/services/storageService");
const settingsService_1 = require("../components/services/settingsService");
const entityUtils_1 = require("../common/entityUtils");
const movementUtils_1 = require("../common/movementUtils");
const buttonActions_1 = require("./buttonActions");
const clientUtils_1 = require("./clientUtils");
const sec_1 = require("./sec");
const draw_1 = require("./draw");
const tileUtils_1 = require("./tileUtils");
const playerActions_1 = require("./playerActions");
const fonts_1 = require("./fonts");
const spriteFont_1 = require("../graphics/spriteFont");
const ponyDraw_1 = require("./ponyDraw");
const errorReporter_1 = require("../components/services/errorReporter");
const ponyInfo_1 = require("../common/ponyInfo");
const timing_1 = require("./timing");
const frameBuffer_1 = require("../graphics/webgl/frameBuffer");
const webgl_1 = require("./webgl");
const texture2d_1 = require("../graphics/webgl/texture2d");
const sprites_1 = require("../generated/sprites");
const mat4_1 = require("../common/mat4");
const model_1 = require("../components/services/model");
const handlers_1 = require("./handlers");
const collision_1 = require("../common/collision");
const LOG_POSITION = false;
const CONNECTION_ISSUE_TIMEOUT = 10 * constants_1.SECOND;
const white = color_1.colorToFloatArray(colors_1.WHITE);
const light = color_1.colorToFloatArray(colors_1.WHITE);
const highlightColor = new Float32Array([2, 2, 2, 0.5]);
const toggleWallsTool = entities_1.saw;
const removeEntitiesTool = entities_1.broom;
const placeEntitiesTool = entities_1.hammer;
const changeTileTool = entities_1.shovel;
const numpad = [
    96 /* NUMPAD_0 */,
    97 /* NUMPAD_1 */,
    98 /* NUMPAD_2 */,
    99 /* NUMPAD_3 */,
    100 /* NUMPAD_4 */,
    101 /* NUMPAD_5 */,
    102 /* NUMPAD_6 */,
    103 /* NUMPAD_7 */,
    104 /* NUMPAD_8 */,
    105 /* NUMPAD_9 */,
];
exports.engines = [
    { name: 'Default', engine: interfaces_1.Engine.Default },
    { name: 'LayeredTiles', engine: interfaces_1.Engine.LayeredTiles },
    { name: 'Whiteness', engine: interfaces_1.Engine.Whiteness },
];
let pixelRatioEnabled = true;
let pixelRatioCache = 1;
function pixelRatio() {
    return pixelRatioEnabled ? pixelRatioCache : 1;
}
function integerPixelRatio() {
    return Math.max(1, Math.floor(pixelRatio()));
}
function getMovementFlag(x, y, walkKey) {
    const len = utils_1.lengthOfXY(x, y);
    const walk = len < 0.5 || walkKey;
    return (x || y) ? (walk ? 16 /* PonyWalking */ : 32 /* PonyTrotting */) : 0 /* None */;
}
exports.actionButtons = [];
function redrawActionButtons(force) {
    for (const button of exports.actionButtons) {
        if (force || button.dirty) {
            button.draw();
        }
    }
}
exports.redrawActionButtons = redrawActionButtons;
let PonyTownGame = class PonyTownGame {
    constructor(audio, storage, settings, model, errorReporter, zone) {
        this.audio = audio;
        this.storage = storage;
        this.settings = settings;
        this.model = model;
        this.errorReporter = errorReporter;
        this.zone = zone;
        this.fallbackPonies = new Map();
        this.positions = [];
        this.lastChatMessageType = 0 /* Say */;
        this.nextFriendsCRC = 0;
        this.editingActions = false;
        this.placeInQueue = 0;
        this.time = performance.now();
        this.lightData = timeUtils_1.createLightData(1 /* Summer */);
        this.season = 1 /* Summer */;
        this.holiday = 0 /* None */;
        this.worldFlags = 0 /* None */;
        this.showMinimap = false;
        this.minimap = undefined;
        this.editor = {
            type: 'stoneWall',
            brushSize: 1,
            tile: -1,
            elevation: '',
            special: '',
            draggingEntities: false,
            draggingStart: utils_1.point(0, 0),
            selectingEntities: false,
            selectedEntities: [],
            customLight: false,
            lightColor: 'ffffff',
        };
        this.incompleteSays = [];
        this.shadowColor = colors_1.SHADOW_COLOR;
        this.onChat = new rxjs_1.Subject();
        this.onToggleChat = new rxjs_1.Subject();
        this.onCommand = new rxjs_1.Subject();
        this.onCancel = () => false;
        this.onClock = new rxjs_1.BehaviorSubject('');
        this.onJoined = new rxjs_1.Subject();
        this.onLeft = new rxjs_1.Subject();
        this.onFrame = new rxjs_1.Subject();
        this.onMessage = new rxjs_1.Subject();
        this.messageQueue = [];
        this.lastWhisperFrom = undefined;
        this.onPonyAddOrUpdate = new rxjs_1.Subject();
        this.onActionsUpdate = new rxjs_1.Subject();
        this.onPartyUpdate = new rxjs_1.Subject();
        this.announcements = new rxjs_1.Subject();
        this.onEntityIdUpdate = new rxjs_1.Subject();
        this.loaded = false;
        this.fullyLoaded = false;
        this.fps = 0;
        this.player = undefined;
        this.playerId = undefined;
        this.playerName = undefined;
        this.playerInfo = undefined;
        this.playerCRC = undefined;
        this.selected = undefined;
        this.party = undefined;
        this.notifications = [];
        this.map = worldMap_1.createWorldMap();
        this.camera = camera_1.createCamera();
        this.paletteManager = new paletteManager_1.PaletteManager();
        this.offlinePony = pony_1.createPony(0, 0, constants_1.OFFLINE_PONY, ponyInfo_1.mockPaletteManager.addArray(sprites_1.defaultPalette), ponyInfo_1.mockPaletteManager);
        this.supporterPony = pony_1.createPony(0, 0, constants_1.SUPPORTER_PONY, ponyInfo_1.mockPaletteManager.addArray(sprites_1.defaultPalette), ponyInfo_1.mockPaletteManager);
        this.failedFBO = false;
        this.actions = buttonActions_1.createDefaultButtonActions();
        this.mod = false;
        this.actionsChanged = true;
        this.debug = {};
        this.whisperTo = undefined;
        this.findEntityFromChatLog = () => undefined;
        this.findEntityFromChatLogByName = () => undefined;
        this.drawOptions = Object.assign({}, interfaces_1.defaultDrawOptions);
        this.input = new inputManager_1.InputManager();
        this.timeSize = 0;
        this.lastStats = 0;
        this.sent = 0;
        this.recv = 0;
        this.hideText = false;
        this.hidePublicChat = false;
        this.hover = utils_1.point(0, 0);
        this.viewMatrix = mat4_1.createMat4();
        this.fboMatrix = mat4_1.createMat4();
        this.initialized = false;
        this.changedScale = false;
        this.baseTime = 0;
        this.targetBaseTime = 0;
        this.connectedTime = 0;
        this.lastPixelRatio = pixelRatio();
        this.resized = true;
        this.resizedCamera = true;
        this.bg = color_1.colorToFloatArray(colors_1.BLACK);
        this.deltaMultiplier = 1;
        this.lastDraw = 0;
        this.entitiesDrawn = 0;
        this.lastFps = performance.now();
        this.frames = 0;
        this.drawFps = 0;
        this.lastCanvasRatio = 0;
        this.extraStats = '';
        this.timingsText = '';
        this.statsTextValue = '';
        this.windowWidth = 0;
        this.windowHeight = 0;
        this.debugShortcuts = [];
        this.cameraShiftOn = false;
        this.cameraShiftTarget = 0;
        this.lastIsKeyboardOpen = false;
        this.showWallPlaceholder = false;
        this.placeEntity = 0;
        this.placeTile = 0;
        this.apply = (func) => {
            return this.zone.run(func);
        };
        this.applyChanges = () => this.zone.run(() => { });
        this.sendSelected = lodash_1.debounce(() => {
            const pony = this.selected;
            const id = pony ? pony.id : 0;
            const fetchEx = !!pony && !pony_1.hasExtendedInfo(pony);
            this.send(server => server.select(id, fetchEx ? 1 /* FetchEx */ : 0 /* None */));
        }, 300);
        this.scale = this.getScale();
        this.audio.initTracks(this.season, this.holiday, this.map.type);
        this.audio.setVolume(this.volume);
        this.debug = storage.getJSON('debug', {});
        this.drawOptions.error = message => errorReporter.reportError(message);
        this.onActionsUpdate.subscribe(() => this.actionsChanged = true);
        if (DEVELOPMENT) {
            clientUtils_1.attachDebugMethod('setScale', (x) => this.setScale(x));
            clientUtils_1.attachDebugMethod('game', this);
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
        return BETA ? (this.debug.engine || interfaces_1.Engine.Default) : interfaces_1.Engine.Default;
    }
    set engine(value) {
        if (BETA) {
            this.debug.engine = value;
            this.saveDebug();
        }
    }
    applied(func) {
        return () => this.apply(func);
    }
    getScale() {
        const defaultScale = pixelRatio() > 1 ? 3 : 2;
        const scale = utils_1.toInt(this.settings.browser.scale) || defaultScale;
        return utils_1.clamp(scale, constants_1.MIN_SCALE, constants_1.MAX_SCALE);
    }
    setScale(scale) {
        if (this.scale !== scale) {
            this.scale = scale;
            this.settings.browser.scale = this.scale;
            this.settings.saveBrowserSettings();
            this.changedScale = true;
        }
    }
    toggleDisableLighting() {
        if (!this.failedFBO) {
            this.settings.browser.lowGraphicsMode = !this.settings.browser.lowGraphicsMode;
            this.settings.saveBrowserSettings();
        }
    }
    send(action) {
        if (this.socket && this.socket.isConnected) {
            return action(this.socket.server);
        }
        else {
            return undefined;
        }
    }
    changeScale() {
        this.setScale((this.scale % constants_1.MAX_SCALE) + 1);
        this.changedScale = true;
    }
    zoomIn() {
        this.setScale(Math.min(constants_1.MAX_SCALE, this.scale + 1));
    }
    zoomOut() {
        this.setScale(Math.max(1, this.scale - 1));
    }
    select(pony) {
        if (this.selected === pony)
            return;
        if (pony && entityUtils_1.isHidden(pony) && !this.mod)
            return;
        this.zone.run(() => {
            if (this.selected) {
                this.selected.selected = false;
            }
            this.selected = pony;
            if (pony && !pony.info && !pony.palettePonyInfo) {
                this.send(server => server.select(pony.id, 1 /* FetchEx */ | 2 /* FetchInfo */));
            }
            else {
                this.sendSelected();
            }
            if (this.selected) {
                this.selected.selected = true;
            }
        });
    }
    load() {
        return spriteUtils_1.loadAndInitSpriteSheets()
            .then(tileUtils_1.initializeTileHeightmaps);
    }
    init() {
        this.canvas = document.getElementById('canvas');
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
                    this.webgl = webgl_1.initWebGLResources(this.webgl.gl, this.paletteManager, this.camera);
                }
            });
            this.initialized = true;
            const stats = document.getElementById('stats');
            this.statsText = document.createTextNode('');
            stats.appendChild(this.statsText);
            this.input.onReleased(79 /* KEY_O */, () => this.zoomOut());
            this.input.onReleased(80 /* KEY_P */, () => this.zoomIn());
            this.input.onReleased(314 /* GAMEPAD_BUTTON_Y */, () => this.changeScale());
            this.input.onPressed(13 /* ENTER */, () => this.onChat.next());
            this.input.onPressed(27 /* ESCAPE */, () => this.escape());
            this.input.onPressed(313 /* GAMEPAD_BUTTON_X */, () => this.onToggleChat.next());
            // this.input.onPressed(Key.BACKSPACE, () => this.backspace());
            this.input.onPressed(72 /* KEY_H */, () => playerActions_1.turnHeadAction(this));
            this.input.onPressed(191 /* FORWARD_SLASH */, () => this.onCommand.next());
            this.input.onPressed([66 /* KEY_B */, 312 /* GAMEPAD_BUTTON_B */, 329 /* TOUCH_SECOND_CLICK */], () => playerActions_1.boopAction(this));
            this.input.onPressed([69 /* KEY_E */, 311 /* GAMEPAD_BUTTON_A */], () => {
                playerActions_1.interact(this, this.input.isPressed(16 /* SHIFT */));
            });
            this.input.onPressed([88 /* KEY_X */, 324 /* GAMEPAD_BUTTON_DOWN */], () => playerActions_1.downAction(this));
            this.input.onPressed([67 /* KEY_C */, 323 /* GAMEPAD_BUTTON_UP */], () => playerActions_1.upAction(this));
            this.input.onPressed(113 /* F2 */, () => {
                if (!this.settings.browser.disableFKeys) {
                    this.hideText = !this.hideText;
                    this.hidePublicChat = false;
                }
            });
            this.input.onPressed(114 /* F3 */, () => {
                if (!this.settings.browser.disableFKeys) {
                    this.hideText = false;
                    this.hidePublicChat = !this.hidePublicChat;
                }
            });
            this.input.onPressed(115 /* F4 */, () => {
                if (!this.settings.browser.disableFKeys) {
                    this.settings.account.seeThroughObjects = !this.settings.account.seeThroughObjects;
                    this.settings.saveAccountSettings(this.settings.account);
                }
            });
            [
                49 /* KEY_1 */, 50 /* KEY_2 */, 51 /* KEY_3 */, 52 /* KEY_4 */, 53 /* KEY_5 */, 54 /* KEY_6 */,
                55 /* KEY_7 */, 56 /* KEY_8 */, 57 /* KEY_9 */, 48 /* KEY_0 */, 189 /* DASH */, 187 /* EQUALS */,
            ].forEach((key, index) => this.input.onPressed(key, () => {
                if (this.actions[index]) {
                    this.zone.run(() => buttonActions_1.useAction(this, this.actions[index].action));
                }
            }));
            const addDebugShortcut = (num, name, action) => {
                this.input.onPressed(numpad[num], () => {
                    if (!this.input.isPressed(16 /* SHIFT */)) {
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
                this.input.onPressed(8 /* BACKSPACE */, () => {
                    if (this.mod) {
                        this.send(server => server.editorAction({ type: 'undo' }));
                    }
                });
                this.input.onPressed(46 /* DELETE */, this.applied(() => {
                    const entities = this.editor.selectedEntities.map(e => e.id);
                    this.send(server => server.editorAction({ type: 'remove', entities }));
                    this.editor.selectedEntities.length = 0;
                }));
                [
                    { key: 37 /* LEFT */, dx: -1 / constants_1.tileWidth, dy: 0 },
                    { key: 39 /* RIGHT */, dx: 1 / constants_1.tileWidth, dy: 0 },
                    { key: 38 /* UP */, dx: 0, dy: -1 / constants_1.tileHeight },
                    { key: 40 /* DOWN */, dx: 0, dy: 1 / constants_1.tileHeight },
                ].forEach(({ key, dx, dy }) => this.input.onPressed(key, () => {
                    this.editor.selectedEntities.forEach(({ id, x, y }) => {
                        this.send(server => server.editorAction({
                            type: 'move',
                            entities: [{ id, x: x + dx, y: y + dy }],
                        }));
                    });
                }));
                // debug
                this.input.onReleased(77 /* KEY_M */, () => this.showMinimap = !this.showMinimap);
                this.input.onPressed(71 /* KEY_G */, () => {
                    if (this.input.isPressed(16 /* SHIFT */)) {
                        let faceDir = 0;
                        let dir = 1;
                        this.player.doAction = 2 /* Swing */;
                        const state = this.player.ponyState;
                        const interval = setInterval(() => {
                            faceDir += dir;
                            if (faceDir < 0) {
                                clearInterval(interval);
                                return;
                            }
                            state.headTurn = faceDir;
                            if (faceDir === 3) {
                                playerActions_1.turnHeadAction(this);
                            }
                            if (faceDir >= 6) {
                                dir = -1;
                            }
                        }, 1000 / 24);
                    }
                    else {
                        let faceDir = 0;
                        const state = this.player.ponyState;
                        const interval = setInterval(() => {
                            faceDir++;
                            state.headTurn = faceDir;
                            if (faceDir === 3) {
                                playerActions_1.turnHeadAction(this);
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
                    clientUtils_1.updateRangeIndicator(showingRange ? this.settings.account.chatlogRange : undefined, this);
                });
                this.input.onPressed(117 /* F6 */, () => {
                    this.cameraShiftOn = !this.cameraShiftOn;
                    this.cameraShiftTarget = 400;
                });
                this.input.onPressed(118 /* F7 */, () => {
                    this.debug.showPalette = !this.debug.showPalette;
                    this.saveDebug();
                });
                this.input.onPressed(119 /* F8 */, () => {
                });
                let loseContext = null;
                this.input.onPressed(120 /* F9 */, () => {
                    if (loseContext) {
                        loseContext.restoreContext();
                        loseContext = null;
                    }
                    else {
                        loseContext = this.webgl.gl.getExtension('WEBGL_lose_context');
                        loseContext.loseContext();
                    }
                });
                this.input.onPressed(121 /* F10 */, () => {
                    this.settings.browser.brightNight = !this.settings.browser.brightNight;
                });
                this.input.onPressed(82 /* KEY_R */, this.applied(() => {
                    if (!Date.now() && this.player) {
                        const bounds = entityUtils_1.getInteractBounds(this.player);
                        const entities = this.map.entities.filter(e => e !== this.player && utils_1.boundsIntersect(e.x, e.y, e.bounds, 0, 0, bounds));
                        if (entities.length) {
                            const entity = entities[0];
                            const typeName = entities_1.getEntityTypeName(entity.type);
                            this.announce(`${typeName}${entities.length > 1 ? ` (1 of ${entities.length})` : ''}`);
                        }
                        else {
                            this.announce('nothing');
                        }
                    }
                    // if (this.player) this.player.swimming = !this.player.swimming;
                    // this.editorElevation = '';
                    // this.editorSpecial = this.editorSpecial ? '' : 'ramp-e';
                }));
                this.input.onPressed(74 /* KEY_J */, () => {
                    if (this.player) {
                        this.player.ponyState.headTilt = (this.player.ponyState.headTilt || 0) + 0.5;
                    }
                });
                this.input.onPressed(75 /* KEY_K */, () => {
                    if (this.player) {
                        this.player.ponyState.headTilt = (this.player.ponyState.headTilt || 0) - 0.5;
                    }
                });
                this.input.onPressed(76 /* KEY_L */, () => this.player && pony_1.setHeadAnimation(this.player, ponyAnimations_1.nom));
                this.input.onReleased(81 /* KEY_Q */, () => this.send(server => server.leave()));
                this.input.onReleased(84 /* KEY_T */, () => this.toggleDisableLighting());
                this.input.onReleased(85 /* KEY_U */, () => {
                    if (this.player) {
                        console.log(`position: ${this.player.x.toFixed(2)}, ${this.player.y.toFixed(2)} ` +
                            `region: ${Math.floor(this.player.x / constants_1.REGION_SIZE)}, ${Math.floor(this.player.y / constants_1.REGION_SIZE)}`);
                    }
                });
                this.input.onReleased(73 /* KEY_I */, () => {
                    const state = this.player.ponyState;
                    state.flags = utils_1.setFlag(state.flags, 1 /* CurlTail */, !utils_1.hasFlag(state.flags, 1 /* CurlTail */));
                });
                // this.input.onReleased(Key.KEY_N, () => this.engine = (this.engine + 1) % Engine.Total);
                this.input.onPressed(78 /* KEY_N */, () => this.audio.playRandomTrack());
                // this.input.onPressed(Key.KEY_G, () => this.wind = Math.max(0, this.wind - 1));
                // this.input.onReleased(Key.KEY_M, () => this.send(server => server.editorAction({ type: 'party' })));
                this.input.onPressed(119 /* F8 */, () => mixins_1.toggleWalls());
                this.input.onPressed(188 /* COMMA */, () => this.deltaMultiplier = 0.5);
                this.input.onPressed(190 /* PERIOD */, () => this.deltaMultiplier = 2);
            }
            window.addEventListener('resize', () => {
                this.resized = true;
                DEVELOPMENT && clientUtils_1.log(`resized ${window.innerHeight} (${window.scrollY})`);
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
            }
            else {
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
    escape() {
        if (this.socket && !this.onCancel()) {
            this.select(undefined);
        }
    }
    backspace() {
        if (this.player && this.player.says !== undefined) {
            this.send(server => server.say(0, '.', 8 /* Dismiss */));
        }
    }
    initWebGL() {
        this.errorReporter.captureEvent({ name: 'game.initWebGL' });
        if (!this.canvas) {
            throw new Error('Missing canvas');
        }
        try {
            this.resizeCamera();
            this.webgl = webgl_1.initWebGL(this.canvas, this.paletteManager, this.camera);
            const { failedFBO, palettes, renderer } = this.webgl;
            if (renderer) {
                this.errorReporter.configureData({ renderer });
            }
            if (failedFBO) {
                this.errorReporter.captureEvent({ name: 'game.initWebGL failed FBO' });
            }
            this.offlinePony = pony_1.createPony(0, 0, constants_1.OFFLINE_PONY, palettes.defaultPalette, this.paletteManager);
            this.supporterPony = pony_1.createPony(0, 0, constants_1.SUPPORTER_PONY, palettes.defaultPalette, this.paletteManager);
            ponyDraw_1.initializeToys(this.paletteManager);
        }
        catch (e) {
            this.errorReporter.captureEvent({ name: 'failed game.initWebGL', error: e.message, stack: e.stack });
            this.releaseWebGL();
            DEVELOPMENT && console.error(e);
            throw new Error(`Failed to initialize graphics device (${e.message})`);
        }
    }
    releaseWebGL() {
        this.errorReporter.captureEvent({ name: 'game.releaseWebGL' });
        if (this.webgl) {
            try {
                this.paletteManager.dispose(this.webgl.gl);
                webgl_1.disposeWebGL(this.webgl);
            }
            catch (e) {
                DEVELOPMENT && console.error(e);
            }
            this.webgl = undefined;
        }
    }
    resizeCamera() {
        if (this.canvas) {
            const actualScale = this.scale * integerPixelRatio();
            const w = utils_1.clamp(Math.ceil(this.canvas.width / actualScale), constants_1.CAMERA_WIDTH_MIN, constants_1.CAMERA_WIDTH_MAX);
            const h = utils_1.clamp(Math.ceil(this.canvas.height / actualScale), constants_1.CAMERA_HEIGHT_MIN, constants_1.CAMERA_HEIGHT_MAX);
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
        this.map = worldMap_1.createWorldMap();
        this.camera = camera_1.createCamera();
        if (this.socket) {
            this.socket.disconnect();
            this.socket = undefined;
        }
        this.audio.stop();
        this.input.release();
        this.releaseWebGL();
    }
    startup(socket, mod) {
        if (this.settings.account.actions) {
            this.actions = buttonActions_1.deserializeActions(this.settings.account.actions);
        }
        else {
            this.actions = buttonActions_1.createDefaultButtonActions();
        }
        const saveSettings = (settings) => this.send(server => server.saveSettings(settings));
        const saveSettingsDebounced = lodash_1.debounce(saveSettings, 1500);
        this.element = document.getElementById('app-game');
        this.settings.saving(settings => (saveSettingsDebounced(settings), true));
        this.lastChatMessageType = 0 /* Say */;
        this.selected = undefined;
        this.party = undefined;
        this.socket = socket;
        this.audio.setVolume(this.volume);
        // this.audio.play();
        this.mod = mod;
        this.nextFriendsCRC = performance.now() + 5 * constants_1.SECOND;
        if (DEVELOPMENT) {
            clientUtils_1.initLogger(message => this.onMessage.next({
                id: 1, crc: 1, name: 'log', type: 1 /* System */,
                message: `[${((performance.now() | 0) % 10000)}] ${message}`
            }));
        }
        if (DEVELOPMENT && LOG_POSITION) {
            this.positions.length = 0;
        }
    }
    getPixelScale() {
        return this.scale * (integerPixelRatio() / pixelRatio());
    }
    update(delta, now, last) {
        TIMING && timing_1.timeStart('update');
        delta *= this.deltaMultiplier;
        const shiftSpeed = delta * 10;
        if (this.cameraShiftOn && this.camera.shiftRatio !== 1) {
            this.camera.shiftRatio = Math.min(1, this.camera.shiftRatio + shiftSpeed);
        }
        else if (!this.cameraShiftOn && this.camera.shiftRatio !== 0) {
            this.camera.shiftRatio = Math.max(0, this.camera.shiftRatio - shiftSpeed);
        }
        worldMap_1.updateMap(this.map, delta);
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
        sec_1.restorePlayerPosition();
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
            this.showWallPlaceholder = player.hold === toggleWallsTool.type && utils_1.hasFlag(this.map.flags, 1 /* EditableWalls */);
            if (this.highlightEntity) {
                if (this.highlightEntity.id === 0) {
                    entityUtils_1.releaseEntity(this.highlightEntity);
                }
                this.highlightEntity = undefined;
            }
            const shift = input.isPressed(16 /* SHIFT */);
            const x = this.fullyLoaded ? input.axisX : 0;
            const y = this.fullyLoaded ? input.axisY : 0;
            const dir = movementUtils_1.vectorToDir(x, y);
            const vec = (x || y) ? movementUtils_1.dirToVector(dir) : { x: 0, y: 0 };
            const walk = input.isMovementFromButtons ? (this.settings.browser.walkByDefault ? !shift : shift) : false;
            const flags = getMovementFlag(x, y, walk);
            const speed = movementUtils_1.flagsToSpeed(flags);
            const vx = vec.x * speed;
            const vy = vec.y * speed;
            if (BETA) {
                input.disableArrows = false;
            }
            if (player.vx !== vx || player.vy !== vy) {
                if (vx === 0) {
                    player.x = positionUtils_1.roundPositionX(player.x) + 0.5 / constants_1.tileWidth;
                }
                if (vy === 0) {
                    player.y = positionUtils_1.roundPositionY(player.y) + 0.5 / constants_1.tileHeight;
                }
                const time = (last - this.connectedTime) >>> 0;
                const [a, b, c, d, e] = movementUtils_1.encodeMovement(player.x, player.y, dir, flags, time, camera);
                server.move(a, b, c, d, e);
                moved = true;
                this.resizedCamera = false;
            }
            if ((vx || vy) && (entityUtils_1.isPonySitting(player) || entityUtils_1.isPonyLying(player))) {
                player.state = entityUtils_1.setPonyState(player.state, 0 /* PonyStanding */);
            }
            entityUtils_1.updateEntityVelocity(this.map, player, vx, vy);
            const facingRight = entityUtils_1.isFacingRight(player);
            const right = movementUtils_1.isMovingRight(vx, facingRight);
            if (facingRight !== right) {
                player.state = utils_1.setFlag(player.state, 2 /* FacingRight */, right);
                player.state = utils_1.setFlag(player.state, 4 /* HeadTurned */, false);
                this.rightOverride = right;
            }
            camera_1.updateCamera(camera, player, this.map);
            const scale = this.getPixelScale();
            const hover = camera_1.screenToWorld(camera, utils_1.point(input.pointerX / scale, input.pointerY / scale));
            if (input.usingTouch && !input.wasPressed(328 /* TOUCH_CLICK */) && !input.isPressed(327 /* TOUCH */)) {
                hover.x = -1;
                hover.y = -1;
            }
            this.hover = hover;
            if (this.fullyLoaded) {
                if (BETA && this.editor.draggingEntities) {
                    playerActions_1.editorDragEntities(this, hover, input.isPressed(303 /* MOUSE_BUTTON2 */));
                }
                if (utils_1.hasFlag(this.map.flags, 2 /* EditableEntities */)) {
                    if (player.hold === removeEntitiesTool.type) {
                        this.highlightEntity = worldMap_1.pickEntities(this.map, hover, true, false, true)[0];
                    }
                    else if (player.hold === placeEntitiesTool.type) {
                        if (!collision_1.isOutsideMap(hover.x, hover.y, this.map)) {
                            const { type } = entities_1.placeableEntities[this.placeEntity];
                            let { x, y } = hover;
                            if (this.map.editableArea) {
                                x = utils_1.clamp(x, this.map.editableArea.x, this.map.editableArea.x + this.map.editableArea.w);
                                y = utils_1.clamp(y, this.map.editableArea.y, this.map.editableArea.y + this.map.editableArea.h);
                            }
                            this.highlightEntity = entities_1.createAnEntity(type, 0, x, y, {}, this.paletteManager, this);
                        }
                    }
                }
                if (input.wasPressed(302 /* MOUSE_BUTTON1 */) || input.wasPressed(328 /* TOUCH_CLICK */)) {
                    const pickedEntities = worldMap_1.pickEntities(this.map, hover, shift, this.mod);
                    const pickedEntity = pickedEntities[(pickedEntities.indexOf(this.selected) + 1) % pickedEntities.length];
                    const holdingRemoveTool = player.hold === removeEntitiesTool.type;
                    const holdingPlaceTool = player.hold === placeEntitiesTool.type;
                    const editableMap = utils_1.hasFlag(this.map.flags, 2 /* EditableEntities */);
                    const holdingTool = holdingRemoveTool || holdingPlaceTool;
                    if (BETA && this.editor.selectingEntities) {
                        playerActions_1.editorSelectEntities(this, hover, shift);
                    }
                    else if (pickedEntity && (!holdingTool || !editableMap || utils_1.hasFlag(pickedEntity.flags, 4096 /* IgnoreTool */))) {
                        if (pickedEntity.type === constants_1.PONY_TYPE) {
                            this.select(pickedEntity);
                        }
                        else if (entityUtils_1.entityInRange(pickedEntity, player)) {
                            server.interact(pickedEntity.id);
                        }
                    }
                    else if (BETA && this.editor.tile !== -1) {
                        if (this.editor.brushSize > 1) {
                            const x = Math.floor((hover.x - (this.editor.brushSize / 2)));
                            const y = Math.floor((hover.y - (this.editor.brushSize / 2)));
                            server.editorAction({ type: 'tile', x, y, tile: this.editor.tile, size: this.editor.brushSize });
                        }
                        else {
                            const x = hover.x | 0;
                            const y = hover.y | 0;
                            const type = this.editor.tile === worldMap_1.getTile(this.map, hover.x, hover.y) ? 1 /* Dirt */ : this.editor.tile;
                            server.changeTile(x, y, type);
                        }
                    }
                    else if (player.hold === changeTileTool.type && utils_1.hasFlag(this.map.flags, 4 /* EditableTiles */)) {
                        const x = hover.x | 0;
                        const y = hover.y | 0;
                        server.changeTile(x, y, interfaces_1.houseTiles[this.placeTile].type);
                    }
                    else if (player.hold === toggleWallsTool.type && utils_1.hasFlag(this.map.flags, 1 /* EditableWalls */)) {
                        playerActions_1.toggleWall(this, hover);
                    }
                    else if (holdingRemoveTool && this.highlightEntity && editableMap) {
                        const id = this.highlightEntity.id;
                        this.send(server => server.actionParam(27 /* RemoveEntity */, id));
                    }
                    else if (holdingPlaceTool && this.highlightEntity && editableMap) {
                        const { x, y, type } = this.highlightEntity;
                        this.send(server => server.actionParam(28 /* PlaceEntity */, { x, y, type }));
                    }
                    else if (this.selected) {
                        this.select(undefined);
                    }
                    else if (utils_1.hasFlag(this.map.flags, 8 /* EdibleGrass */)) {
                        const tile = worldMap_1.getTile(this.map, hover.x, hover.y);
                        if (interfaces_1.isValidTile(tile) && utils_1.distanceXY(player.x, player.y, hover.x, hover.y) < constants_1.TILE_CHANGE_RANGE) {
                            const x = hover.x | 0;
                            const y = hover.y | 0;
                            let type = tile === 2 /* Grass */ ? 1 /* Dirt */ : 2 /* Grass */;
                            server.changeTile(x, y, type);
                        }
                    }
                    else if (DEVELOPMENT && this.engine === interfaces_1.Engine.LayeredTiles && this.editor.elevation) {
                        const value = worldMap_1.getElevation(this.map, hover.x, hover.y);
                        worldMap_1.setElevation(this.map, hover.x, hover.y, utils_1.clamp(this.editor.elevation === 'up' ? value + 1 : value - 1, 0, 10));
                    }
                }
                if (BETA && input.wasPressed(303 /* MOUSE_BUTTON2 */)) {
                    if (this.editor.selectingEntities) {
                        playerActions_1.editorMoveEntities(this, hover);
                    }
                    else if (this.mod) {
                        playerActions_1.toggleWall(this, hover);
                    }
                }
                if (BETA && input.wasPressed(304 /* MOUSE_BUTTON3 */)) {
                    if (this.mod) {
                        server.editorAction({ type: 'place', entity: this.editor.type, x: hover.x, y: hover.y });
                        console.log(`${this.editor.type}(${hover.x.toFixed(2)}, ${hover.y.toFixed(2)})`);
                    }
                }
                if (this.player && input.wheelY) {
                    if (input.isPressed(16 /* SHIFT */)) {
                        if (utils_1.hasFlag(this.map.flags, 2 /* EditableEntities */)) {
                            const action = input.wheelY < 0 ? 29 /* SwitchTool */ : 30 /* SwitchToolRev */;
                            this.send(server => server.action(action));
                        }
                    }
                    else {
                        if (this.player.hold === placeEntitiesTool.type) {
                            this.changePlaceEntity(input.wheelY < 0);
                        }
                        else if (this.player.hold === changeTileTool.type) {
                            this.changePlaceTile(input.wheelY < 0);
                        }
                    }
                }
                const isHeadTurned = utils_1.hasFlag(player.state, 4 /* HeadTurned */);
                const isHeadFacingRight = right ? !isHeadTurned : isHeadTurned;
                if (((input.axis2X < 0 && isHeadFacingRight) || (input.axis2X > 0 && !isHeadFacingRight))) {
                    if (server.action(2 /* TurnHead */)) {
                        player.state = (player.state) ^ 4 /* HeadTurned */;
                    }
                }
            }
        }
        if (player) {
            const safe = utils_1.hasFlag(this.worldFlags, 1 /* Safe */);
            worldMap_1.updateEntities(this, this.time, delta, safe);
            sec_1.savePlayerPosition();
        }
        if (this.changedScale) {
            this.changedScale = false;
            this.resizedCamera = true;
            if (player) {
                camera_1.centerCameraOn(camera, player);
            }
        }
        if (player) {
            camera_1.updateCamera(camera, player, this.map);
        }
        if (this.resizedCamera) {
            server.updateCamera(camera.x, camera.y, camera.w, camera.h);
            this.resizedCamera = false;
        }
        if (player) {
            worldMap_1.updateEntitiesCoverLifted(this.map, player, !!this.settings.account.seeThroughObjects, delta);
            worldMap_1.updateEntitiesWithNames(this.map, this.hover, player);
            worldMap_1.updateEntitiesTriggers(this.map, player, this);
        }
        input.end();
        if (this.nextFriendsCRC < now) {
            this.send(server => server.actionParam(23 /* FriendsCRC */, this.model.computeFriendsCRC()));
            this.nextFriendsCRC = now + 15 * constants_1.MINUTE;
        }
        const threshold = Date.now() - 10 * constants_1.SECOND;
        for (let i = this.incompleteSays.length - 1; i >= 0; i--) {
            if (this.incompleteSays[i].time < threshold) {
                this.incompleteSays.splice(i, 1);
            }
        }
        this.updateSocketStats(delta);
        TIMING && timing_1.timeEnd();
        if (DEVELOPMENT && LOG_POSITION) {
            if (this.player) {
                this.positions.push({ x: this.player.x, y: this.player.y, moved });
            }
        }
    }
    updateGameTime(delta) {
        if (this.baseTime !== this.targetBaseTime) {
            const timeDelta = Math.floor(delta * 0.2 * constants_1.HOUR);
            const baseTime = this.baseTime + timeDelta * (this.baseTime > this.targetBaseTime ? -1 : 1);
            if (Math.abs(this.targetBaseTime - baseTime) < timeDelta) {
                this.baseTime = this.targetBaseTime;
            }
            else {
                this.baseTime = baseTime;
            }
        }
        this.time = this.baseTime + performance.now();
    }
    updateSocketStats(delta) {
        this.timeSize += delta;
        if (this.timeSize > 1) {
            this.sent = 8 * this.socket.sentSize / this.timeSize / 1024;
            this.recv = 8 * this.socket.receivedSize / this.timeSize / 1024;
            this.socket.sentSize = 0;
            this.socket.receivedSize = 0;
            this.timeSize = 0;
        }
    }
    setWorldState(state, initial) {
        this.season = state.season;
        this.holiday = state.holiday;
        this.worldFlags = state.flags;
        this.lightData = timeUtils_1.createLightData(this.season);
        clientUtils_1.initFeatureFlags(state.featureFlags);
        const baseTime = state.time - performance.now();
        if (initial) {
            this.baseTime = this.targetBaseTime = baseTime;
        }
        else {
            this.targetBaseTime = baseTime;
        }
        this.updateTileSets();
        if (this.model.friends) {
            for (const friend of this.model.friends) {
                friend.actualName = handlers_1.filterEntityName(this, friend.name, friend.nameBad) || '';
            }
        }
    }
    setPlayer(player) {
        this.player = player;
        camera_1.centerCameraOn(this.camera, player);
        this.send(server => server.loaded());
    }
    setupMap() {
        this.bg = color_1.colorToFloatArray(colors_1.getTileColor(this.map.defaultTile, this.season));
        this.audio.initTracks(this.season, this.holiday, this.map.type);
        this.audio.playOrSwitchToRandomTrack();
        this.updateTileSets();
    }
    updateTileSets() {
        this.tileSets = tileUtils_1.updateTileSets(this.paletteManager, this.tileSets, this.season, this.map.type);
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
        const { gl, frameBuffer, frameBufferSheet, spriteShader, spriteBatch, lightShader, paletteBatch, paletteShader, palettes, } = this.webgl;
        TIMING && timing_1.timeStart('draw');
        TIMING && timing_1.timeStart('draw init');
        let lightColor = colors_1.WHITE;
        let shadowColor = 0;
        if (this.map.type === 3 /* Cave */) {
            lightColor = colors_1.CAVE_LIGHT;
            shadowColor = colors_1.CAVE_SHADOW;
        }
        else {
            lightColor = timeUtils_1.getLightColor(this.lightData, this.time);
            shadowColor = timeUtils_1.getShadowColor(this.lightData, this.time);
        }
        if (BETA && this.editor.customLight) {
            lightColor = color_1.parseColor(this.editor.lightColor);
            shadowColor = this.shadowColor;
        }
        const camera = this.camera;
        const width = camera.w;
        const height = camera.h;
        const ratio = integerPixelRatio();
        const actualScale = this.scale * ratio;
        const bg = this.bg;
        color_1.colorToExistingFloatArray(light, lightColor);
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
        mat4_1.ortho(this.fboMatrix, 0, gl.drawingBufferWidth / actualScale, gl.drawingBufferHeight / actualScale, 0, 0, 1000);
        TIMING && timing_1.timeEnd();
        TIMING && timing_1.timeStart('ensureAllVisiblePon...');
        worldMap_1.ensureAllVisiblePoniesAreDecoded(this.map, camera, this.paletteManager);
        TIMING && timing_1.timeEnd();
        TIMING && timing_1.timeStart('commit+invalidatePalettes');
        if (this.paletteManager.commit(gl)) {
            worldMap_1.invalidatePalettes(this.map.entitiesDrawable);
        }
        TIMING && timing_1.timeEnd();
        if (this.settings.browser.brightNight) {
            utils_1.lerpColor(light, white, 0.3);
        }
        if (this.engine === interfaces_1.Engine.NewLighting) {
            // ...
        }
        else if (this.disableLighting) {
            mat4_1.ortho(this.viewMatrix, camera.x, camera.x + camera.w, camera.actualY + camera.h, camera.actualY, 0, 1000);
            utils_1.lerpColor(light, white, 0.1); // adjust lighting for missing lights
            // color -> screen
            gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.disable(gl.DEPTH_TEST);
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            this.drawMap(this.webgl, this.map, this.viewMatrix, light, drawOptions);
        }
        else {
            mat4_1.ortho(this.viewMatrix, camera.x, camera.x + camera.w, camera.actualY, camera.actualY + camera.h, 0, 1000);
            TIMING && timing_1.timeStart('initializeFrameBuffer');
            this.initializeFrameBuffer(this.webgl, width, height);
            TIMING && timing_1.timeEnd();
            if (!frameBuffer) {
                DEVELOPMENT && console.warn('No frame buffer');
                return;
            }
            // color -> fbo
            TIMING && timing_1.timeStart('color -> fbo');
            // gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer.handle);
            frameBuffer_1.bindFrameBuffer(gl, frameBuffer);
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
            TIMING && timing_1.timeEnd();
            // color -> screen
            TIMING && timing_1.timeStart('color -> screen');
            // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            frameBuffer_1.unbindFrameBuffer(gl);
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            // gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.BLEND);
            gl.useProgram(spriteShader.program);
            gl.uniformMatrix4fv(spriteShader.uniforms.transform, false, this.fboMatrix);
            gl.uniform4fv(spriteShader.uniforms.lighting, white);
            gl.uniform1f(spriteShader.uniforms.textureSize, frameBufferSheet.texture.width);
            texture2d_1.bindTexture(gl, 0, frameBufferSheet.texture);
            spriteBatch.begin();
            spriteBatch.drawImage(colors_1.WHITE, 0, 0, width, height, 0, 0, width, height);
            spriteBatch.end();
            TIMING && timing_1.timeEnd();
            // light -> fbo
            TIMING && timing_1.timeStart('light -> fbo');
            // gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer.handle);
            frameBuffer_1.bindFrameBuffer(gl, frameBuffer);
            gl.viewport(0, 0, frameBuffer.width, frameBuffer.height);
            gl.clearColor(light[0], light[1], light[2], light[3]);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.viewport(0, 0, width, height);
            //gl.enable(gl.DEPTH_TEST);
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFunc(gl.ONE, gl.ONE);
            TIMING && timing_1.timeEnd();
            // shadows
            //for (const e of map.entities) {
            //	if (e.drawShadow && camera.isBoundVisible(e.shadowBounds || e.bounds, e.x, e.y)) {
            //		this.spriteBatch.depth = camera.mapDepth(e.y);
            //		e.drawShadow(this.spriteBatch);
            //	}
            //}
            // soft lights
            TIMING && timing_1.timeStart('drawEntityLights');
            gl.useProgram(lightShader.program);
            gl.uniformMatrix4fv(lightShader.uniforms.transform, false, this.viewMatrix);
            gl.uniform4fv(lightShader.uniforms.lighting, white);
            spriteBatch.begin();
            draw_1.drawEntityLights(spriteBatch, this.map.entitiesLight, this.camera, drawOptions);
            spriteBatch.end();
            TIMING && timing_1.timeEnd();
            // light sprites
            TIMING && timing_1.timeStart('drawEntityLightSprites');
            gl.useProgram(spriteShader.program);
            gl.uniformMatrix4fv(spriteShader.uniforms.transform, false, this.viewMatrix);
            gl.uniform4fv(spriteShader.uniforms.lighting, white);
            gl.uniform1f(spriteShader.uniforms.textureSize, sprites_1.normalSpriteSheet.texture.width);
            texture2d_1.bindTexture(gl, 0, sprites_1.normalSpriteSheet.texture);
            spriteBatch.begin();
            draw_1.drawEntityLightSprites(spriteBatch, this.map.entitiesLightSprite, this.camera, drawOptions);
            spriteBatch.end();
            TIMING && timing_1.timeEnd();
            // light -> screen
            TIMING && timing_1.timeStart('light -> screen');
            // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            frameBuffer_1.unbindFrameBuffer(gl);
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFunc(gl.DST_COLOR, gl.ZERO);
            gl.useProgram(spriteShader.program);
            gl.uniformMatrix4fv(spriteShader.uniforms.transform, false, this.fboMatrix);
            gl.uniform4fv(spriteShader.uniforms.lighting, white);
            gl.uniform1f(spriteShader.uniforms.textureSize, frameBufferSheet.texture.width);
            texture2d_1.bindTexture(gl, 0, frameBufferSheet.texture);
            spriteBatch.begin();
            spriteBatch.drawImage(colors_1.WHITE, 0, 0, width, height, 0, 0, width, height);
            spriteBatch.end();
            TIMING && timing_1.timeEnd();
        }
        // ui -> screen
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        TIMING && timing_1.timeStart('drawNames+drawChat');
        gl.useProgram(paletteShader.program);
        gl.uniformMatrix4fv(paletteShader.uniforms.transform, false, this.fboMatrix);
        gl.uniform4fv(paletteShader.uniforms.lighting, white);
        gl.uniform1f(paletteShader.uniforms.pixelSize, this.paletteManager.pixelSize);
        gl.uniform1f(paletteShader.uniforms.textureSize, sprites_1.paletteSpriteSheet.texture.width);
        texture2d_1.bindTexture(gl, 0, sprites_1.paletteSpriteSheet.texture);
        texture2d_1.bindTexture(gl, 1, this.paletteManager.texture);
        paletteBatch.begin();
        if (!this.hideText) {
            graphicsUtils_1.drawNames(paletteBatch, this.map.entitiesWithNames, this.player, this.party, this.camera, this.hover, this.mod, palettes);
            graphicsUtils_1.drawChat(paletteBatch, this.map.entitiesWithChat, this.camera, this.mod, palettes, this.hidePublicChat);
        }
        if (!this.socket || !this.socket.isConnected) {
            this.drawMessage(this.webgl, 'Connecting...');
        }
        else if (!this.loaded) {
            if (this.placeInQueue) {
                this.drawMessage(this.webgl, `Waiting in queue (${this.placeInQueue})`);
            }
            else {
                this.drawMessage(this.webgl, 'Loading...');
            }
        }
        else if ((performance.now() - this.socket.lastPacket) > CONNECTION_ISSUE_TIMEOUT) {
            // this.drawMessage('Connection issues...');
        }
        if (BETA && this.debug.showInfo) {
            try {
                const scale = this.getPixelScale();
                const x = this.input.pointerX / scale + 5;
                const y = this.input.pointerY / scale;
                const height = worldMap_1.getMapHeightAt(this.map, this.hover.x, this.hover.y, this.time);
                spriteFont_1.drawText(paletteBatch, `${height.toFixed(2)}`, fonts_1.fontSmallPal, colors_1.BLACK, x, y);
            }
            catch (e) {
                console.warn(e.message);
            }
        }
        if (this.showWallPlaceholder) {
            const x = this.hover.x | 0;
            const y = this.hover.y | 0;
            const dx = this.hover.x - x;
            const dy = this.hover.y - y;
            const palette = this.webgl.palettes.defaultPalette;
            const color = color_1.makeTransparent(colors_1.WHITE, 0.6);
            const screenX = positionUtils_1.toScreenX(x) - this.camera.x;
            const screenY = positionUtils_1.toScreenY(y) - this.camera.actualY;
            if (x >= 0 && y >= 0 && x < this.map.width && y < this.map.height) {
                if (dx > dy) {
                    if ((dx + dy) < 1) {
                        paletteBatch.drawSprite(sprites_1.wall_h_placeholder.color, color, palette, screenX, screenY - 15);
                    }
                    else {
                        paletteBatch.drawSprite(sprites_1.wall_v_placeholder.color, color, palette, screenX + constants_1.tileWidth - 4, screenY - 12);
                    }
                }
                else {
                    if ((dx + dy) < 1) {
                        paletteBatch.drawSprite(sprites_1.wall_v_placeholder.color, color, palette, screenX - 4, screenY - 12);
                    }
                    else {
                        paletteBatch.drawSprite(sprites_1.wall_h_placeholder.color, color, palette, screenX, screenY + constants_1.tileHeight - 15);
                    }
                }
            }
        }
        paletteBatch.end();
        TIMING && timing_1.timeEnd();
        gl.useProgram(spriteShader.program);
        gl.uniformMatrix4fv(spriteShader.uniforms.transform, false, this.fboMatrix);
        gl.uniform4fv(spriteShader.uniforms.lighting, white);
        if (BETA && this.showMinimap && this.minimap) {
            gl.uniform1f(spriteShader.uniforms.textureSize, sprites_1.normalSpriteSheet.texture.width);
            texture2d_1.bindTexture(gl, 0, sprites_1.normalSpriteSheet.texture);
            spriteBatch.begin();
            spriteBatch.save();
            const { width, height, data } = this.minimap;
            const scale = 4 / this.scale;
            spriteBatch.translate(100, 100);
            spriteBatch.scale(scale, scale);
            spriteBatch.drawRect(colors_1.BLACK, -1, -1, width + 2, height + 2);
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    spriteBatch.drawRect(data[x + y * width], x, y, 1, 1);
                }
            }
            if (this.player) {
                spriteBatch.drawRect(colors_1.RED, Math.floor(this.player.x), Math.floor(this.player.y), 1, 1);
            }
            spriteBatch.restore();
            spriteBatch.end();
        }
        if (BETA && this.debug.showRegions && this.player) {
            gl.uniform1f(spriteShader.uniforms.textureSize, sprites_1.normalSpriteSheet.texture.width);
            texture2d_1.bindTexture(gl, 0, sprites_1.normalSpriteSheet.texture);
            spriteBatch.begin();
            draw_1.drawDebugRegions(spriteBatch, this.map, this.player, this.camera);
            spriteBatch.end();
        }
        const showFPS = !!this.settings.browser.showFps;
        const showHelp = BETA && this.input.isPressed(112 /* F1 */);
        const showPalette = DEVELOPMENT && this.debug.showPalette;
        if (showFPS || showHelp || showPalette) {
            // 1 to 1 pixel scale drawing
            TIMING && timing_1.timeStart('showFps');
            const scale = 2;
            // const height = gl.drawingBufferHeight / (ratio * scale);
            mat4_1.ortho(this.fboMatrix, 0, gl.drawingBufferWidth / ratio, gl.drawingBufferHeight / ratio, 0, 0, 1000);
            gl.uniformMatrix4fv(spriteShader.uniforms.transform, false, this.fboMatrix);
            gl.uniform1f(spriteShader.uniforms.textureSize, sprites_1.normalSpriteSheet.texture.width);
            texture2d_1.bindTexture(gl, 0, sprites_1.normalSpriteSheet.texture);
            spriteBatch.begin();
            spriteBatch.save();
            spriteBatch.scale(scale, scale);
            if (showFPS) {
                spriteFont_1.drawText(spriteBatch, this.drawFps.toFixed(), fonts_1.fontSmall, colors_1.BLACK, 2, 2);
                if (this.timingsText) {
                    const size = spriteFont_1.measureText(this.timingsText, fonts_1.fontMono);
                    spriteBatch.drawRect(0x000000aa, 2, 26, 220, size.h + 8);
                    spriteFont_1.drawText(spriteBatch, this.timingsText, fonts_1.fontMono, colors_1.WHITE, 2, 30);
                }
            }
            if (BETA && showHelp) {
                let y = 25;
                for (const shortcut of this.debugShortcuts) {
                    spriteFont_1.drawOutlinedText(spriteBatch, shortcut, fonts_1.font, colors_1.WHITE, colors_1.BLACK, 5, y);
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
                const paletteTexture = this.paletteManager.texture;
                const { width, height } = paletteTexture;
                gl.uniform1f(spriteShader.uniforms.textureSize, sprites_1.normalSpriteSheet.texture.width);
                texture2d_1.bindTexture(gl, 0, sprites_1.normalSpriteSheet.texture);
                spriteBatch.begin();
                spriteBatch.drawRect(0x00000066, 20, 20, width, height);
                spriteBatch.end();
                gl.uniform1f(spriteShader.uniforms.textureSize, width);
                texture2d_1.bindTexture(gl, 0, paletteTexture);
                spriteBatch.begin();
                spriteBatch.drawImage(colors_1.WHITE, 0, 0, width, height, 20, 20, width, height);
                spriteBatch.end();
            }
            TIMING && timing_1.timeEnd();
        }
        texture2d_1.bindTexture(gl, 0, undefined);
        texture2d_1.bindTexture(gl, 1, undefined);
        gl.useProgram(null);
        TIMING && timing_1.timeEnd();
        this.updateStatsText();
        TIMING && timing_1.timeStart('messageQueue');
        while (this.messageQueue.length) {
            this.onMessage.next(this.messageQueue.shift());
        }
        TIMING && timing_1.timeEnd();
        TIMING && timing_1.timeStart('onFrame');
        this.onFrame.next();
        TIMING && timing_1.timeEnd();
    }
    drawMessage({ paletteBatch, palettes }, message) {
        graphicsUtils_1.drawFullScreenMessage(paletteBatch, this.camera, message, palettes.mainFont.white);
    }
    drawMap(webgl, map, viewMatrix, lighting, options) {
        const { gl, paletteBatch, paletteShader } = webgl;
        TIMING && timing_1.timeStart('drawMap');
        if (this.tileSets && this.player) {
            gl.useProgram(paletteShader.program);
            gl.uniformMatrix4fv(paletteShader.uniforms.transform, false, viewMatrix);
            gl.uniform4fv(paletteShader.uniforms.lighting, lighting);
            gl.uniform1f(paletteShader.uniforms.pixelSize, this.paletteManager.pixelSize);
            gl.uniform1f(paletteShader.uniforms.textureSize, sprites_1.paletteSpriteSheet.texture.width);
            texture2d_1.bindTexture(gl, 0, sprites_1.paletteSpriteSheet.texture);
            texture2d_1.bindTexture(gl, 1, this.paletteManager.texture);
            paletteBatch.begin();
            this.entitiesDrawn = draw_1.drawMap(paletteBatch, map, this.camera, this.player, options, this.tileSets, this.editor.selectedEntities);
            paletteBatch.end();
            if (this.highlightEntity && this.highlightEntity.draw) {
                gl.uniform4fv(paletteShader.uniforms.lighting, highlightColor);
                paletteBatch.begin();
                this.highlightEntity.draw(paletteBatch, this.drawOptions);
                paletteBatch.end();
            }
        }
        TIMING && timing_1.timeEnd();
    }
    updateCameraShift() {
        if (data_1.isMobile) {
            const isKeyboardOpen = !!document.activeElement && /input/i.test(document.activeElement.tagName);
            if (this.lastIsKeyboardOpen !== isKeyboardOpen) {
                DEVELOPMENT && clientUtils_1.log(`keyboard open ${isKeyboardOpen}`);
                this.lastIsKeyboardOpen = isKeyboardOpen;
            }
            if (isKeyboardOpen) {
                if (!this.cameraShiftOn && window.scrollY > 100) {
                    this.cameraShiftOn = true;
                    this.cameraShiftTarget = window.scrollY;
                    if (DEVELOPMENT) {
                        clientUtils_1.log(`shift camera ${this.cameraShiftTarget} (${this.windowHeight} - ${window.innerHeight}, ${window.scrollY})`);
                    }
                }
            }
            else {
                if (this.cameraShiftOn && window.scrollY < 100) {
                    this.cameraShiftOn = false;
                    DEVELOPMENT && clientUtils_1.log(`unshift camera`);
                }
            }
        }
    }
    resizeCanvas() {
        pixelRatioCache = canvasUtils_1.getPixelRatio();
        const canvas = this.canvas;
        const ratio = pixelRatio();
        const rect = this.element.getBoundingClientRect();
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
            DEVELOPMENT && clientUtils_1.log(`scrollY: ${window.scrollY}`);
        }
    }
    initializeFrameBuffer({ gl, frameBuffer }, width, height) {
        const targetSize = webglUtils_1.getRenderTargetSize(width, height);
        if (frameBuffer && targetSize !== frameBuffer.width) {
            const maxSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
            if (maxSize != null && targetSize > maxSize) {
                this.setScale(this.scale + 1);
            }
            else {
                frameBuffer_1.resizeFrameBuffer(gl, frameBuffer, targetSize, targetSize);
            }
        }
    }
    announce(announcement) {
        this.announcements.next(announcement);
    }
    changePlaceEntity(reverse) {
        if (reverse) {
            this.placeEntity = this.placeEntity === 0 ? (entities_1.placeableEntities.length - 1) : (this.placeEntity - 1);
        }
        else {
            this.placeEntity = (this.placeEntity + 1) % entities_1.placeableEntities.length;
        }
        const { name } = entities_1.placeableEntities[this.placeEntity];
        const total = clientUtils_1.getSaysTime(name);
        entityUtils_1.addChatBubble(this.map, this.player, { message: name, type: 1 /* System */, total, timer: total, created: Date.now() });
    }
    changePlaceTile(reverse) {
        if (reverse) {
            this.placeTile = this.placeTile === 0 ? (interfaces_1.houseTiles.length - 1) : (this.placeTile - 1);
        }
        else {
            this.placeTile = (this.placeTile + 1) % interfaces_1.houseTiles.length;
        }
        const { name } = interfaces_1.houseTiles[this.placeTile];
        const total = clientUtils_1.getSaysTime(name);
        entityUtils_1.addChatBubble(this.map, this.player, { message: name, type: 1 /* System */, total, timer: total, created: Date.now() });
    }
    saveDebug() {
        this.storage.setJSON('debug', this.debug);
    }
    updateStatsText() {
        const { gl, spriteBatch, paletteBatch } = this.webgl;
        if ((performance.now() - this.lastStats) > constants_1.SECOND) {
            TIMING && timing_1.timingCollate();
            if (TIMING) {
                const timings = timing_1.timingCollate();
                this.timingsText = timings
                    .map(({ selfTime, selfPercent, totalPercent, count, name }) => `${selfTime.toFixed(2).padStart(6)}ms` +
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
                    const ponies = this.map.entities.reduce((sum, e) => sum + (e.type === constants_1.PONY_TYPE ? 1 : 0), 0);
                    const extra = DEVELOPMENT ? `(${drawn}/${total}) ${tris} tris, ${flush} flush, ${this.audio.trackName}` : data_1.version;
                    const gl2 = webglUtils_1.isWebGL2(gl) ? ' WebGL2' : '';
                    const engine = this.engine === interfaces_1.Engine.Default ? '' : interfaces_1.Engine[this.engine].toUpperCase();
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
            this.onClock.next(timeUtils_1.formatHourMinutes(this.time));
        }
        TIMING && timing_1.timeReset();
        spriteBatch.tris = 0;
        spriteBatch.flushes = 0;
        paletteBatch.tris = 0;
        paletteBatch.flushes = 0;
    }
};
PonyTownGame = tslib_1.__decorate([
    core_1.Injectable({ providedIn: 'root' }),
    tslib_1.__metadata("design:paramtypes", [audio_1.Audio,
        storageService_1.StorageService,
        settingsService_1.SettingsService,
        model_1.Model,
        errorReporter_1.ErrorReporter,
        core_1.NgZone])
], PonyTownGame);
exports.PonyTownGame = PonyTownGame;
//# sourceMappingURL=game.js.map