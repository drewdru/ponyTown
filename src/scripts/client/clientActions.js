"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const browser_1 = require("ag-sockets/dist/browser");
const interfaces_1 = require("../common/interfaces");
const utils_1 = require("../common/utils");
const pony_1 = require("../common/pony");
const worldMap_1 = require("../common/worldMap");
const clientUtils_1 = require("./clientUtils");
const sec_1 = require("./sec");
const partyUtils_1 = require("./partyUtils");
const gameUtils_1 = require("./gameUtils");
const updateDecoder_1 = require("../common/encoders/updateDecoder");
const handlers_1 = require("./handlers");
const emoji_1 = require("./emoji");
const BinEntityId = browser_1.Bin.U32;
const BinEntityPlayerState = browser_1.Bin.U8;
const BinNotificationId = browser_1.Bin.U16;
const BinSayDatas = [BinEntityId, browser_1.Bin.Str, browser_1.Bin.U8];
function findPonyById(map, id) {
    const entity = worldMap_1.findEntityById(map, id);
    return entity && pony_1.isPony(entity) ? entity : undefined;
}
class ClientActions {
    constructor(gameService, game, model, zone) {
        this.gameService = gameService;
        this.game = game;
        this.model = model;
        this.zone = zone;
        this.apply = func => this.zone.run(func);
    }
    connected() {
        gameUtils_1.resetGameFields(this.game);
        this.game.map = worldMap_1.createWorldMap();
        this.game.player = undefined;
        this.game.joined();
        this.apply(() => this.gameService.joined());
        const supportsWasm = typeof WebAssembly !== 'undefined';
        const info = 0 |
            (clientUtils_1.isInIncognitoMode ? 1 /* Incognito */ : 0) |
            (supportsWasm ? 2 /* SupportsWASM */ : 0) |
            (clientUtils_1.supportsLetAndConst() ? 4 /* SupportsLetAndConst */ : 0);
        this.game.send(server => server.actionParam2(20 /* Info */, info));
    }
    disconnected() {
        gameUtils_1.resetGameFields(this.game);
        this.apply(() => this.gameService.disconnected());
    }
    invalidVersion() {
        DEVELOPMENT && !TESTS && console.error('Invalid version');
    }
    queue(place) {
        this.game.placeInQueue = place;
    }
    worldState(state, initial) {
        this.game.placeInQueue = 0;
        this.game.setWorldState(state, initial);
    }
    mapState(info, state) {
        this.game.map = worldMap_1.createWorldMap(info, state);
        this.game.player = undefined;
        this.game.setupMap();
        worldMap_1.updateMapState(this.game.map, interfaces_1.defaultMapState, this.game.map.state);
    }
    mapUpdate(state) {
        const prevState = this.game.map.state;
        this.game.map.state = state;
        worldMap_1.updateMapState(this.game.map, prevState, this.game.map.state);
    }
    mapSwitching() {
        this.game.loaded = false;
        this.game.placeInQueue = 0;
        if (this.game.player) {
            this.game.player.vx = 0;
            this.game.player.vy = 0;
        }
    }
    mapTest(width, height, buffer) {
        const data = new Uint32Array(width * height);
        (new Uint8Array(data.buffer)).set(buffer);
        this.game.minimap = { width, height, data };
    }
    myEntity(id, name, info, characterId, crc) {
        this.game.playerId = id;
        this.game.playerName = name;
        this.game.playerInfo = info;
        this.game.playerCRC = crc;
        const pony = utils_1.findById(this.model.ponies, characterId);
        if (pony) {
            this.model.selectPony(pony);
        }
        if (this.game.party) {
            this.game.party.members.forEach(m => m.self = m.id === id);
            this.game.onPartyUpdate.next();
        }
        const entity = worldMap_1.findEntityById(this.game.map, id);
        if (entity) {
            entity.name = name;
            handlers_1.updatePonyInfoWithPoof(this.game, entity, info, crc);
        }
        this.game.onActionsUpdate.next();
    }
    update(unsubscribes, subscribes, updates, regions, says) {
        worldMap_1.removeRegions(this.game.map, unsubscribes);
        for (const subscribe of subscribes) {
            handlers_1.subscribeRegion(this.game, subscribe);
        }
        if (subscribes.length) {
            gameUtils_1.markGameAsLoaded(this.game);
        }
        if (updates) {
            handlers_1.handleUpdates(this.game, updates);
        }
        for (const region of regions) {
            const { x, y, updates, removes, tiles } = updateDecoder_1.decodeUpdate(region);
            for (const update of updates) {
                handlers_1.handleUpdateEntity(this.game, update);
            }
            for (const id of removes) {
                handlers_1.handleRemoveEntity(this.game, id);
            }
            for (const tile of tiles) {
                worldMap_1.setTileAtRegion(this.game.map, x, y, tile.x, tile.y, tile.type);
            }
        }
        for (const [id, message, type] of says) {
            handlers_1.handleSays(this.game, id, message, type);
        }
    }
    fixPosition(x, y, safe) {
        if (DEVELOPMENT && !TESTS && !safe) {
            console.error(`fix position (${x.toFixed(2)}, ${y.toFixed(2)})`);
        }
        const player = this.game.player;
        if (player) {
            player.x = x;
            player.y = y;
            sec_1.savePlayerPosition();
        }
        this.game.send(server => server.fixedPosition());
    }
    actionParam(id, action, param) {
        switch (action) {
            case 25 /* ACL */:
                if (id === this.game.playerId && param) {
                    sec_1.setAclCookie(param);
                }
                break;
            case 23 /* FriendsCRC */:
                this.game.nextFriendsCRC = 0;
                break;
            default:
                DEVELOPMENT && !TESTS && console.error(`actionParam: Invalid action: ${action}`);
        }
    }
    left(reason) {
        this.game.player = undefined;
        this.game.map = worldMap_1.createWorldMap();
        this.apply(() => this.gameService.left('clientActions.left', reason));
    }
    addNotification(id, entityId, name, message, note, flags) {
        const defaultCharacter = utils_1.hasFlag(flags, 32 /* Supporter */) ? this.game.supporterPony : this.game.offlinePony;
        const pony = (entityId && findPonyById(this.game.map, entityId)) || defaultCharacter;
        const filteredName = handlers_1.filterEntityName(this.game, name, utils_1.hasFlag(flags, 128 /* NameBad */));
        message = message.replace(/#NAME#/g, emoji_1.nameToHTML(filteredName || ''));
        this.apply(() => gameUtils_1.addNotification(this.game, { id, message, note, pony, flags, open: false, fresh: true }));
    }
    removeNotification(id) {
        this.apply(() => gameUtils_1.removeNotification(this.game, id));
    }
    updateSelection(currentId, newId) {
        if (gameUtils_1.isSelected(this.game, currentId)) {
            this.game.select(newId ? findPonyById(this.game.map, newId) : undefined);
        }
    }
    updateParty(party) {
        const members = party && party.map(([id, flags]) => ({
            id,
            pony: findPonyById(this.game.map, id) || this.game.fallbackPonies.get(id),
            self: id === this.game.playerId,
            leader: utils_1.hasFlag(flags, 1 /* Leader */),
            pending: utils_1.hasFlag(flags, 2 /* Pending */),
            offline: utils_1.hasFlag(flags, 4 /* Offline */),
        }));
        if (members) {
            const missing = members.filter(p => !p.pony).map(p => p.id);
            if (missing.length) {
                this.game.send(server => server.getPonies(missing));
            }
        }
        this.apply(() => {
            this.game.party = partyUtils_1.updateParty(this.game.party, members);
            this.game.onPartyUpdate.next();
        });
    }
    updatePonies(ponies) {
        handlers_1.handleUpdatePonies(this.game, ponies);
    }
    updateFriends(friends, removeMissing) {
        handlers_1.handleUpdateFriends(this.game, friends, removeMissing);
    }
    entityInfo(id, name, crc, nameBad) {
        handlers_1.handleEntityInfo(this.game, id, name, crc, nameBad);
    }
    entityList(value) {
        if (DEVELOPMENT || BETA) {
            const list = value.map(({ name, x, y }) => `${name}(${x.toFixed(2)}, ${y.toFixed(2)})`).join('\n');
            console.log(`ENTITIES:\n${list}`);
        }
    }
    testPositions(data) {
        if (DEVELOPMENT) {
            const round = (x) => Math.round(x * 100);
            const same = (ax = 0, ay = 0, bx = 0, by = 0) => round(ax) === round(bx) && round(ay) === round(by);
            const fmt = (x) => (x === undefined ? '-' : x.toFixed(2)).padStart(5);
            for (let i = 1; i < data.length; i++) {
                if (data[i - 1].frame !== (data[i].frame - 1)) {
                    data.splice(i, 0, { frame: data[i - 1].frame + 1, x: undefined, y: undefined, moved: false });
                }
            }
            const clientIndex = this.game.positions.findIndex(p => p.moved);
            const serverIndex = data.findIndex(p => p.moved);
            const offset = serverIndex - clientIndex;
            const dat = data.map((p, i) => {
                const pt = this.game.positions[i - offset] || { x: undefined, y: undefined };
                return { frame: p.frame, ax: p.x, ay: p.y, bx: pt.x, by: pt.y, serverMoved: p.moved, clientMoved: pt.moved };
            });
            const log = dat.map(({ frame, ax, ay, bx, by, serverMoved, clientMoved }, i) => `${frame.toString().padStart(7)} | ` +
                `${fmt(ax)}, ${fmt(ay)} ${serverMoved ? 'M' : ' '} | ` +
                `${fmt(bx)}, ${fmt(by)} ${clientMoved ? 'M' : ' '} | ` +
                `${same(ax, ay, bx, by) ? '= ' : '  '} ` +
                `${i > 0 && dat[i - 1].frame !== (frame - 1) ? 'I ' : '  '}`)
                .join('\n');
            console.log(`  frame |     server     |     client     |    \n` +
                `-----------------------------------------------\n` +
                `${log}`);
        }
    }
}
tslib_1.__decorate([
    browser_1.Method({ binary: [browser_1.Bin.U32] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number]),
    tslib_1.__metadata("design:returntype", void 0)
], ClientActions.prototype, "queue", null);
tslib_1.__decorate([
    browser_1.Method({ binary: [browser_1.Bin.Obj, browser_1.Bin.Bool] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Boolean]),
    tslib_1.__metadata("design:returntype", void 0)
], ClientActions.prototype, "worldState", null);
tslib_1.__decorate([
    browser_1.Method({ binary: [browser_1.Bin.Obj, browser_1.Bin.Obj] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object]),
    tslib_1.__metadata("design:returntype", void 0)
], ClientActions.prototype, "mapState", null);
tslib_1.__decorate([
    browser_1.Method({ binary: [browser_1.Bin.Obj] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", void 0)
], ClientActions.prototype, "mapUpdate", null);
tslib_1.__decorate([
    browser_1.Method({ binary: [] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], ClientActions.prototype, "mapSwitching", null);
tslib_1.__decorate([
    browser_1.Method({ binary: [browser_1.Bin.I32, browser_1.Bin.I32, browser_1.Bin.U8Array] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number, Number, Uint8Array]),
    tslib_1.__metadata("design:returntype", void 0)
], ClientActions.prototype, "mapTest", null);
tslib_1.__decorate([
    browser_1.Method({ binary: [BinEntityId, browser_1.Bin.Str, browser_1.Bin.Str, browser_1.Bin.Str, browser_1.Bin.U16] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number, String, String, String, Number]),
    tslib_1.__metadata("design:returntype", void 0)
], ClientActions.prototype, "myEntity", null);
tslib_1.__decorate([
    browser_1.Method({ binary: [[browser_1.Bin.U8], [browser_1.Bin.U8Array], browser_1.Bin.U8Array, [browser_1.Bin.U8Array], BinSayDatas] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Array, Array, Object, Array, Array]),
    tslib_1.__metadata("design:returntype", void 0)
], ClientActions.prototype, "update", null);
tslib_1.__decorate([
    browser_1.Method({ binary: [browser_1.Bin.F32, browser_1.Bin.F32, browser_1.Bin.Bool] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number, Number, Boolean]),
    tslib_1.__metadata("design:returntype", void 0)
], ClientActions.prototype, "fixPosition", null);
tslib_1.__decorate([
    browser_1.Method({ binary: [BinEntityId, browser_1.Bin.U8, browser_1.Bin.Obj] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number, Number, Object]),
    tslib_1.__metadata("design:returntype", void 0)
], ClientActions.prototype, "actionParam", null);
tslib_1.__decorate([
    browser_1.Method({ binary: [browser_1.Bin.U8] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number]),
    tslib_1.__metadata("design:returntype", void 0)
], ClientActions.prototype, "left", null);
tslib_1.__decorate([
    browser_1.Method({ binary: [BinNotificationId, BinEntityId, browser_1.Bin.Str, browser_1.Bin.Str, browser_1.Bin.Str, browser_1.Bin.U8] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number, Number, String, String, String, Number]),
    tslib_1.__metadata("design:returntype", void 0)
], ClientActions.prototype, "addNotification", null);
tslib_1.__decorate([
    browser_1.Method({ binary: [BinNotificationId] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number]),
    tslib_1.__metadata("design:returntype", void 0)
], ClientActions.prototype, "removeNotification", null);
tslib_1.__decorate([
    browser_1.Method({ binary: [BinEntityId, BinEntityId] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number, Number]),
    tslib_1.__metadata("design:returntype", void 0)
], ClientActions.prototype, "updateSelection", null);
tslib_1.__decorate([
    browser_1.Method({ binary: [[BinEntityId, browser_1.Bin.U8]] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", void 0)
], ClientActions.prototype, "updateParty", null);
tslib_1.__decorate([
    browser_1.Method({ binary: [[BinEntityId, browser_1.Bin.Obj, browser_1.Bin.U8Array, browser_1.Bin.U8Array, BinEntityPlayerState, browser_1.Bin.Bool]] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Array]),
    tslib_1.__metadata("design:returntype", void 0)
], ClientActions.prototype, "updatePonies", null);
tslib_1.__decorate([
    browser_1.Method({ binary: [browser_1.Bin.Obj, browser_1.Bin.Bool] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Array, Boolean]),
    tslib_1.__metadata("design:returntype", void 0)
], ClientActions.prototype, "updateFriends", null);
tslib_1.__decorate([
    browser_1.Method({ binary: [BinEntityId, browser_1.Bin.Str, browser_1.Bin.U32, browser_1.Bin.Bool] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number, String, Number, Boolean]),
    tslib_1.__metadata("design:returntype", void 0)
], ClientActions.prototype, "entityInfo", null);
tslib_1.__decorate([
    browser_1.Method({ binary: [browser_1.Bin.Obj] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Array]),
    tslib_1.__metadata("design:returntype", void 0)
], ClientActions.prototype, "entityList", null);
tslib_1.__decorate([
    browser_1.Method({ binary: [browser_1.Bin.Obj] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Array]),
    tslib_1.__metadata("design:returntype", void 0)
], ClientActions.prototype, "testPositions", null);
exports.ClientActions = ClientActions;
/* istanbul ignore next */
if (DEVELOPMENT) {
    browser_1.getMethods(ClientActions)
        .filter(m => !m.options.binary)
        .forEach(m => console.error(`Missing binary encoding for ClientActions.${m.name}()`));
}
//# sourceMappingURL=clientActions.js.map