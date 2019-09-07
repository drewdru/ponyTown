import { NgZone } from '@angular/core';
import { Method, SocketClient, Bin, getMethods } from 'ag-sockets/dist/browser';
import {
	MapInfo, WorldState, PartyMember, PartyFlags, Action, NotificationFlags, Pony, LeaveReason,
	SayData, MapState, defaultMapState, Apply, InfoFlags, PonyData, FriendStatusData, WorldMap
} from '../common/interfaces';
import { hasFlag, findById } from '../common/utils';
import { isPony } from '../common/pony';
import { setTileAtRegion, findEntityById, createWorldMap, removeRegions, updateMapState } from '../common/worldMap';
import { GameService } from '../components/services/gameService';
import { PonyTownGame } from './game';
import { supportsLetAndConst, isInIncognitoMode } from './clientUtils';
import { savePlayerPosition, setAclCookie } from './sec';
import { updateParty } from './partyUtils';
import { addNotification, removeNotification, markGameAsLoaded, resetGameFields, isSelected } from './gameUtils';
import { Model } from '../components/services/model';
import { decodeUpdate } from '../common/encoders/updateDecoder';
import {
	updatePonyInfoWithPoof, subscribeRegion, handleUpdates, handleUpdateEntity, handleRemoveEntity, handleSays,
	handleEntityInfo, handleUpdatePonies, filterEntityName, handleUpdateFriends
} from './handlers';
import { nameToHTML } from './emoji';

const BinEntityId = Bin.U32;
const BinEntityPlayerState = Bin.U8;
const BinNotificationId = Bin.U16;
const BinSayDatas = [BinEntityId, Bin.Str, Bin.U8];

function findPonyById(map: WorldMap, id: number) {
	const entity = findEntityById(map, id);
	return entity && isPony(entity) ? entity : undefined;
}

export class ClientActions implements SocketClient {
	constructor(private gameService: GameService, private game: PonyTownGame, private model: Model, private zone: NgZone) {
	}
	private apply: Apply = func => this.zone.run(func);
	connected() {
		resetGameFields(this.game);
		this.game.map = createWorldMap();
		this.game.player = undefined;
		this.game.joined();
		this.apply(() => this.gameService.joined());

		const supportsWasm = typeof WebAssembly !== 'undefined';
		const info = 0 |
			(isInIncognitoMode ? InfoFlags.Incognito : 0) |
			(supportsWasm ? InfoFlags.SupportsWASM : 0) |
			(supportsLetAndConst() ? InfoFlags.SupportsLetAndConst : 0);

		this.game.send(server => server.actionParam2(Action.Info, info));
	}
	disconnected() {
		resetGameFields(this.game);
		this.apply(() => this.gameService.disconnected());
	}
	invalidVersion() {
		DEVELOPMENT && !TESTS && console.error('Invalid version');
	}
	@Method({ binary: [Bin.U32] })
	queue(place: number) {
		this.game.placeInQueue = place;
	}
	@Method({ binary: [Bin.Obj, Bin.Bool] })
	worldState(state: WorldState, initial: boolean) {
		this.game.placeInQueue = 0;
		this.game.setWorldState(state, initial);
	}
	@Method({ binary: [Bin.Obj, Bin.Obj] })
	mapState(info: MapInfo, state: MapState) {
		this.game.map = createWorldMap(info, state);
		this.game.player = undefined;
		this.game.setupMap();
		updateMapState(this.game.map, defaultMapState, this.game.map.state);
	}
	@Method({ binary: [Bin.Obj] })
	mapUpdate(state: MapState) {
		const prevState = this.game.map.state;
		this.game.map.state = state;
		updateMapState(this.game.map, prevState, this.game.map.state);
	}
	@Method({ binary: [] })
	mapSwitching() {
		this.game.loaded = false;
		this.game.placeInQueue = 0;

		if (this.game.player) {
			this.game.player.vx = 0;
			this.game.player.vy = 0;
		}
	}
	@Method({ binary: [Bin.I32, Bin.I32, Bin.U8Array] })
	mapTest(width: number, height: number, buffer: Uint8Array) {
		const data = new Uint32Array(width * height);
		(new Uint8Array(data.buffer)).set(buffer);
		this.game.minimap = { width, height, data };
	}
	@Method({ binary: [BinEntityId, Bin.Str, Bin.Str, Bin.Str, Bin.U16] })
	myEntity(id: number, name: string, info: string, characterId: string, crc: number) {
		this.game.playerId = id;
		this.game.playerName = name;
		this.game.playerInfo = info;
		this.game.playerCRC = crc;

		const pony = findById(this.model.ponies, characterId);

		if (pony) {
			this.model.selectPony(pony);
		}

		if (this.game.party) {
			this.game.party.members.forEach(m => m.self = m.id === id);
			this.game.onPartyUpdate.next();
		}

		const entity = findEntityById(this.game.map, id) as Pony | undefined;

		if (entity) {
			entity.name = name;
			updatePonyInfoWithPoof(this.game, entity, info, crc);
		}

		this.game.onActionsUpdate.next();
	}
	@Method({ binary: [[Bin.U8], [Bin.U8Array], Bin.U8Array, [Bin.U8Array], BinSayDatas] })
	update(unsubscribes: number[], subscribes: Uint8Array[], updates: Uint8Array | null, regions: Uint8Array[], says: SayData[]) {
		removeRegions(this.game.map, unsubscribes);

		for (const subscribe of subscribes) {
			subscribeRegion(this.game, subscribe);
		}

		if (subscribes.length) {
			markGameAsLoaded(this.game);
		}

		if (updates) {
			handleUpdates(this.game, updates);
		}

		for (const region of regions) {
			const { x, y, updates, removes, tiles } = decodeUpdate(region);

			for (const update of updates) {
				handleUpdateEntity(this.game, update);
			}

			for (const id of removes) {
				handleRemoveEntity(this.game, id);
			}

			for (const tile of tiles) {
				setTileAtRegion(this.game.map, x, y, tile.x, tile.y, tile.type);
			}
		}

		for (const [id, message, type] of says) {
			handleSays(this.game, id, message, type);
		}
	}
	@Method({ binary: [Bin.F32, Bin.F32, Bin.Bool] })
	fixPosition(x: number, y: number, safe: boolean) {
		if (DEVELOPMENT && !TESTS && !safe) {
			console.error(`fix position (${x.toFixed(2)}, ${y.toFixed(2)})`);
		}

		const player = this.game.player;

		if (player) {
			player.x = x;
			player.y = y;
			savePlayerPosition();
		}

		this.game.send(server => server.fixedPosition());
	}
	@Method({ binary: [BinEntityId, Bin.U8, Bin.Obj] })
	actionParam(id: number, action: Action, param: any) {
		switch (action) {
			case Action.ACL:
				if (id === this.game.playerId && param) {
					setAclCookie(param);
				}
				break;
			case Action.FriendsCRC:
				this.game.nextFriendsCRC = 0;
				break;
			default:
				DEVELOPMENT && !TESTS && console.error(`actionParam: Invalid action: ${action}`);
		}
	}
	@Method({ binary: [Bin.U8] })
	left(reason: LeaveReason) {
		this.game.player = undefined;
		this.game.map = createWorldMap();
		this.apply(() => this.gameService.left('clientActions.left', reason));
	}
	@Method({ binary: [BinNotificationId, BinEntityId, Bin.Str, Bin.Str, Bin.Str, Bin.U8] })
	addNotification(id: number, entityId: number, name: string, message: string, note: string, flags: NotificationFlags) {
		const defaultCharacter = hasFlag(flags, NotificationFlags.Supporter) ? this.game.supporterPony : this.game.offlinePony;
		const pony = (entityId && findPonyById(this.game.map, entityId)) || defaultCharacter;

		const filteredName = filterEntityName(this.game, name, hasFlag(flags, NotificationFlags.NameBad));
		message = message.replace(/#NAME#/g, nameToHTML(filteredName || ''));

		this.apply(() => addNotification(this.game, { id, message, note, pony, flags, open: false, fresh: true }));
	}
	@Method({ binary: [BinNotificationId] })
	removeNotification(id: number) {
		this.apply(() => removeNotification(this.game, id));
	}
	@Method({ binary: [BinEntityId, BinEntityId] })
	updateSelection(currentId: number, newId: number) {
		if (isSelected(this.game, currentId)) {
			this.game.select(newId ? findPonyById(this.game.map, newId) : undefined);
		}
	}
	@Method({ binary: [[BinEntityId, Bin.U8]] })
	updateParty(party: [number, PartyFlags][] | undefined) {
		const members = party && party.map<PartyMember>(([id, flags]) => ({
			id,
			pony: findPonyById(this.game.map, id) || this.game.fallbackPonies.get(id),
			self: id === this.game.playerId,
			leader: hasFlag(flags, PartyFlags.Leader),
			pending: hasFlag(flags, PartyFlags.Pending),
			offline: hasFlag(flags, PartyFlags.Offline),
		}));

		if (members) {
			const missing = members.filter(p => !p.pony).map(p => p.id);

			if (missing.length) {
				this.game.send(server => server.getPonies(missing));
			}
		}

		this.apply(() => {
			this.game.party = updateParty(this.game.party, members);
			this.game.onPartyUpdate.next();
		});
	}
	@Method({ binary: [[BinEntityId, Bin.Obj, Bin.U8Array, Bin.U8Array, BinEntityPlayerState, Bin.Bool]] })
	updatePonies(ponies: PonyData[]) {
		handleUpdatePonies(this.game, ponies);
	}
	@Method({ binary: [Bin.Obj, Bin.Bool] })
	updateFriends(friends: FriendStatusData[], removeMissing: boolean) {
		handleUpdateFriends(this.game, friends, removeMissing);
	}
	@Method({ binary: [BinEntityId, Bin.Str, Bin.U32, Bin.Bool] })
	entityInfo(id: number, name: string, crc: number, nameBad: boolean) {
		handleEntityInfo(this.game, id, name, crc, nameBad);
	}
	@Method({ binary: [Bin.Obj] })
	entityList(value: { name: string; x: number; y: number; }[]) {
		if (DEVELOPMENT || BETA) {
			const list = value.map(({ name, x, y }) => `${name}(${x.toFixed(2)}, ${y.toFixed(2)})`).join('\n');
			console.log(`ENTITIES:\n${list}`);
		}
	}
	@Method({ binary: [Bin.Obj] })
	testPositions(data: { frame: number; x: number | undefined; y: number | undefined; moved: boolean; }[]) {
		if (DEVELOPMENT) {
			const round = (x: number) => Math.round(x * 100);
			const same = (ax = 0, ay = 0, bx = 0, by = 0) => round(ax) === round(bx) && round(ay) === round(by);
			const fmt = (x: number | undefined) => (x === undefined ? '-' : x.toFixed(2)).padStart(5);

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

			const log = dat.map(({ frame, ax, ay, bx, by, serverMoved, clientMoved }, i) =>
				`${frame.toString().padStart(7)} | ` +
				`${fmt(ax)}, ${fmt(ay)} ${serverMoved ? 'M' : ' '} | ` +
				`${fmt(bx)}, ${fmt(by)} ${clientMoved ? 'M' : ' '} | ` +
				`${same(ax, ay, bx, by) ? '= ' : '  '} ` +
				`${i > 0 && dat[i - 1].frame !== (frame - 1) ? 'I ' : '  '}`)
				.join('\n');

			console.log(
				`  frame |     server     |     client     |    \n` +
				`-----------------------------------------------\n` +
				`${log}`);
		}
	}
}

/* istanbul ignore next */
if (DEVELOPMENT) {
	getMethods(ClientActions)
		.filter(m => !m.options.binary)
		.forEach(m => console.error(`Missing binary encoding for ClientActions.${m.name}()`));
}
