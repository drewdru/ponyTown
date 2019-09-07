import { range, compact, escapeRegExp } from 'lodash';
import {
	MessageType, ChatType, Expression, Eye, Muzzle, Action, Season, Holiday, Weather, toAnnouncementMessageType,
} from '../common/interfaces';
import { hasRole } from '../common/accountUtils';
import { butterfly, bat, firefly, cloud, getEntityType, getEntityTypeName } from '../common/entities';
import { emojis } from '../client/emoji';
import { IClient, ServerMap } from './serverInterfaces';
import { World } from './world';
import { NotificationService } from './services/notification';
import { UserError, isUserError } from './userError';
import { parseExpression, expression } from '../common/expressionUtils';
import { filterBadWords } from '../common/swears';
import { randomString } from '../common/stringUtils';
import {
	getCounter, holdToy, getCollectedToysCount, holdItem, playerSleep, playerBlush, playerLove, playerCry,
	setEntityExpression, execAction, teleportTo
} from './playerUtils';
import { ServerLiveSettings, GameServerSettings } from '../common/adminInterfaces';
import { isCommand, processCommand, clamp, flatten, includes, randomPoint } from '../common/utils';
import { createNotifyUpdate, createShutdownServer } from './api/internal';
import { logger } from './logger';
import { pathTo } from './paths';
import { sayTo, sayToEveryone, sayToOthers, sayToAll, saySystem } from './chat';
import { resetTiles } from './serverRegion';
import {
	findEntities, updateMapState, loadMapFromFile, saveMapToFile, saveEntitiesToFile, getSizeOfMap,
	saveMapToFileBinaryAlt, saveRegionCollider, saveMap, loadMap
} from './serverMap';
import { PARTY_LIMIT, tileWidth, tileHeight, MAP_LOAD_SAVE_TIMEOUT } from '../common/constants';
import { PartyService } from './services/party';
import { getRegionGlobal } from '../common/worldMap';
import { swapCharacter } from './characterUtils';
import { writeFileAsync } from 'fs';
import { Account } from './db';
import { defaultHouseSave, removeToolbox, restoreToolbox } from './maps/houseMap';

export interface CommandContext {
	world: World;
	notifications: NotificationService;
	liveSettings: ServerLiveSettings;
	party: PartyService;
	random: (min: number, max: number, floating?: boolean) => number;
}

export type CommandHandler = (
	context: CommandContext, client: IClient, message: string, type: ChatType, target: IClient | undefined,
	settings: GameServerSettings
) => any;

export interface Command {
	names: string[];
	help: string;
	role: string;
	spam?: boolean;
	handler: CommandHandler;
}

function hasRoleNull(client: IClient, role: string) {
	if (!role || hasRole(client.account, role))
		return true;

	return (role === 'sup1' && (client.supporterLevel >= 1 || client.isMod)) ||
		(role === 'sup2' && (client.supporterLevel >= 2 || client.isMod)) ||
		(role === 'sup3' && (client.supporterLevel >= 3 || client.isMod));
}

function command(names: string[], help: string, role: string, handler: CommandHandler, spam = false): Command {
	return { names, help, role, handler, spam };
}

function emote(names: string[], expr: Expression, timeout?: number, cancellable?: boolean) {
	return command(names, '', '', ({ }, { pony }) => setEntityExpression(pony, expr, timeout, cancellable));
}

function action(names: string[], action: Action) {
	return command(names, '', '', ({ }, client, _, __, ___, settings) => execAction(client, action, settings));
}

function adminModChat(names: string[], help: string, role: string, type: MessageType) {
	return command(names, help, role, ({ }, client, message, _, __, settings) => {
		sayToEveryone(client, message, filterBadWords(message), type, settings);
	});
}

function parseSeason(value: string): Season | undefined {
	switch (value.toLowerCase()) {
		case 'spring': return Season.Spring;
		case 'summer': return Season.Summer;
		case 'autumn': return Season.Autumn;
		case 'winter': return Season.Winter;
		default: return undefined;
	}
}

function parseHoliday(value: string): Holiday | undefined {
	switch (value.toLowerCase()) {
		case 'none': return Holiday.None;
		case 'halloween': return Holiday.Halloween;
		case 'christmas': return Holiday.Christmas;
		default: return undefined;
	}
}

function parseWeather(value: string): Weather | undefined {
	switch (value.toLowerCase()) {
		case 'none': return Weather.None;
		case 'rain': return Weather.Rain;
		default: return undefined;
	}
}

function getSpawnTarget(map: ServerMap, message: string) {
	if (message === 'spawn') {
		return randomPoint(map.spawnArea);
	}

	const spawn = map.spawns.get(message);

	if (spawn) {
		return randomPoint(spawn);
	}

	const match = /^(\d+) (\d+)$/.exec(message.trim());

	if (!match) {
		throw new UserError('invalid parameters');
	}

	const [, tx, ty] = match;
	const x = clamp(+tx, 0, map.width - 0.5 / tileWidth);
	const y = clamp(+ty, 0, map.height - 0.5 / tileHeight);
	return { x, y };
}

function execWithFileName(client: IClient, message: string, action: (fileName: string) => Promise<any>) {
	const fileName = message.replace(/[^a-zA-Z0-9_-]/g, '');

	if (!fileName) {
		throw new UserError('invalid file name');
	}

	action(fileName)
		.catch(e => (logger.error(e), e.message))
		.then(error => saySystem(client, error || 'saved'));
}

function shouldNotBeCalled() {
	throw new Error('Should not be called');
}

function isValidMapForEditing(map: ServerMap, client: IClient, checkTimeout: boolean, onlyLeader: boolean) {
	if (map.id !== 'house') {
		saySystem(client, 'Can only be done inside the house');
		return false;
	}

	if (checkTimeout && ((Date.now() - client.lastMapLoadOrSave) < MAP_LOAD_SAVE_TIMEOUT)) {
		saySystem(client, `You need to wait ${Math.floor(MAP_LOAD_SAVE_TIMEOUT / 1000)} seconds before loading or saving again`);
		return false;
	}

	if (onlyLeader && client.party && client.party.leader !== client) {
		saySystem(client, 'Only party leader can do this');
		return false;
	}

	return true;
}

let interval: any;

export function createCommands(world: World): Command[] {
	const commands = compact([
		// chat
		command(['help', 'h', '?'], '/help - show help', '', ({ }, client) => {
			const help = commands
				.filter(c => c.help && hasRoleNull(client, c.role))
				.map(c => c.help)
				.join('\n');

			saySystem(client, help);
		}),
		command(['roll', 'rand', 'random'], '/roll [[min-]max] - randomize a number', '',
			({ random }, client, args, type, target, settings) => {
				const ROLL_MAX = 1000000;
				const [, min, max] = /^(?:(\d+)-)?(\d+)$/.exec(args) || ['', '', ''];
				const minValue = clamp((min ? parseInt(min, 10) : 1) | 0, 0, ROLL_MAX);
				const maxValue = clamp((max ? parseInt(max, 10) : 100) | 0, minValue, ROLL_MAX);
				const result = args === '🍎' ? args : random(minValue, maxValue);
				const message = `🎲 rolled ${result} of ${minValue !== 1 ? `${minValue}-` : ''}${maxValue}`;
				sayToOthers(client, message, toAnnouncementMessageType(type), target, settings);
			}, true),
		command(['s', 'say'], '/s - say', '', shouldNotBeCalled),
		command(['p', 'party'], '/p - party chat', '', shouldNotBeCalled),
		command(['t', 'think'], '/t - thinking balloon', '', shouldNotBeCalled),
		command(['w', 'whisper'], '/w <name> - whisper to player', '', shouldNotBeCalled),
		command(['r', 'reply'], '/r - reply to whisper', '', shouldNotBeCalled),
		command(['e'], '/e - set permanent expression', '', ({ }, { pony }, message) => {
			pony.exprPermanent = parseExpression(message);
			setEntityExpression(pony, undefined, 0);
		}),

		// actions
		command(['turn'], '/turn - turn head', '', ({ }, client, _, __, ___, settings) => {
			execAction(client, Action.TurnHead, settings);
		}),
		command(['boop', ')'], '/boop or /) - a boop', '', ({ }, client, message, _, __, settings) => {
			const expression = parseExpression(message);

			if (expression) {
				setEntityExpression(client.pony, expression, 800);
			}

			execAction(client, Action.Boop, settings);
		}),
		command(['drop'], '/drop - drop held item', '', ({ }, client, _, __, ___, settings) => {
			execAction(client, Action.Drop, settings);
		}),
		command(['droptoy'], '/droptoy - drop held toy', '', ({ }, client, _, __, ___, settings) => {
			execAction(client, Action.DropToy, settings);
		}),
		// command(['open'], '/open - open gift', '', ({ }, client) => {
		// 	openGift(client);
		// }),

		// counters
		command(['gifts'], '/gifts - show gift score', '', ({ }, client, _, type, target, settings) => {
			sayToOthers(client, `collected ${getCounter(client, 'gifts')} 🎁`, toAnnouncementMessageType(type), target, settings);
		}, true),
		command(['candies', 'candy'], '/candies - show candy score', '', ({ }, client, _, type, target, settings) => {
			sayToOthers(client, `collected ${getCounter(client, 'candies')} 🍬`, toAnnouncementMessageType(type), target, settings);
		}, true),
		command(['eggs'], '/eggs - show egg score', '', ({ }, client, _, type, target, settings) => {
			sayToOthers(client, `collected ${getCounter(client, 'eggs')} 🥚`, toAnnouncementMessageType(type), target, settings);
		}, true),
		command(['clovers', 'clover'], '/clovers - show clover score', '', ({ }, client, _, type, target, settings) => {
			sayToOthers(client, `collected ${getCounter(client, 'clovers')} 🍀`, toAnnouncementMessageType(type), target, settings);
		}, true),
		command(['toys'], '/toys - show number of collected toys', '', ({ }, client, _, type, target, settings) => {
			const { collected, total } = getCollectedToysCount(client);
			sayToOthers(client, `collected ${collected}/${total} toys`, toAnnouncementMessageType(type), target, settings);
		}),

		// other
		command(['unstuck'], '/unstuck - respawn at spawn point', '', ({ world }, client) => {
			world.resetToSpawn(client);
			world.kick(client, '/unstuck');
		}),
		command(['leave'], '/leave - leave the game', '', ({ world }, client) => {
			world.kick(client, '/leave');
		}),

		// pony states
		command(['sit'], '/sit - sit down or stand up', '', shouldNotBeCalled),
		command(['lie', 'lay'], '/lie - lie down or sit up', '', shouldNotBeCalled),
		command(['fly'], '/fly - fly up or fly down', '', shouldNotBeCalled),
		command(['stand'], '/stand - stand up', '', shouldNotBeCalled),

		// emotes
		command(['blush'], '', '', ({ }, { pony }, message) => playerBlush(pony, message)),
		command(['love', '<3'], '', '', ({ }, { pony }, message) => playerLove(pony, message)),
		command(['sleep', 'zzz'], '', '', ({ }, { pony }, message) => playerSleep(pony, message)),
		command(['cry'], '', '', ({ }, { pony }, message) => playerCry(pony, message)),

		// expressions
		emote(['smile', 'happy'], expression(Eye.Neutral, Eye.Neutral, Muzzle.Smile)),
		emote(['frown'], expression(Eye.Neutral, Eye.Neutral, Muzzle.Frown)),
		emote(['angry'], expression(Eye.Angry, Eye.Angry, Muzzle.Frown)),
		emote(['sad'], expression(Eye.Sad, Eye.Sad, Muzzle.Frown)),
		emote(['thinking'], expression(Eye.Neutral, Eye.Frown2, Muzzle.Concerned)),

		// actions
		action(['yawn'], Action.Yawn),
		action(['laugh', 'lol', 'haha', 'хаха', 'jaja'], Action.Laugh),
		action(['sneeze', 'achoo'], Action.Sneeze),
		action(['magic'], Action.Magic),

		// house
		command(['savehouse'], '/savehouse - saves current house setup', '', async ({ }, client) => {
			if (!isValidMapForEditing(client.map, client, true, false))
				return;

			client.lastMapLoadOrSave = Date.now();

			const savedMap = JSON.stringify(saveMap(client.map,
				{ saveTiles: true, saveEntities: true, saveWalls: true, saveOnlyEditableEntities: true }));

			DEVELOPMENT && console.log(savedMap);

			client.account.savedMap = savedMap;
			await Account.updateOne({ _id: client.accountId }, { savedMap }).exec();

			saySystem(client, 'Saved');
			client.reporter.systemLog(`Saved house`);
		}),
		command(['loadhouse'], '/loadhouse - loads saved house setup', '', ({ world }, client) => {
			if (!isValidMapForEditing(client.map, client, true, true))
				return;

			if (!client.account.savedMap)
				return saySystem(client, 'No saved map state');

			client.lastMapLoadOrSave = Date.now();

			loadMap(world, client.map, JSON.parse(client.account.savedMap),
				{ loadEntities: true, loadWalls: true, loadEntitiesAsEditable: true });

			saySystem(client, 'Loaded');
			client.reporter.systemLog(`Loaded house`);
		}),
		command(['resethouse'], '/resethouse - resets house setup to original state', '', ({ }, client) => {
			if (!isValidMapForEditing(client.map, client, true, true))
				return;

			client.lastMapLoadOrSave = Date.now();

			if (defaultHouseSave) {
				loadMap(world, client.map, defaultHouseSave,
					{ loadEntities: true, loadWalls: true, loadEntitiesAsEditable: true });
			}

			saySystem(client, 'Reset');
			client.reporter.systemLog(`Reset house`);
		}),
		command(['lockhouse'], '/lockhouse - prevents other people from changing the house', '', ({ }, client) => {
			if (!isValidMapForEditing(client.map, client, false, true))
				return;

			client.map.editingLocked = true;

			saySystem(client, 'House locked');
			client.reporter.systemLog(`House locked`);
		}),
		command(['unlockhouse'], '/unlockhouse - enables editing by other people', '', ({ }, client) => {
			if (!isValidMapForEditing(client.map, client, false, true))
				return;

			client.map.editingLocked = false;

			saySystem(client, 'House unlocked');
			client.reporter.systemLog(`House unlocked`);
		}),
		command(['removetoolbox'], '/removetoolbox - removes toolbox from the house', '', ({ world }, client) => {
			if (!isValidMapForEditing(client.map, client, false, true))
				return;

			removeToolbox(world, client.map);

			saySystem(client, 'Toolbox removed');
			client.reporter.systemLog(`Toolbox removed`);
		}),
		command(['restoretoolbox'], '/restoretoolbox - restores toolbox to the house', '', ({ }, client) => {
			if (!isValidMapForEditing(client.map, client, false, true))
				return;

			restoreToolbox(world, client.map);

			saySystem(client, 'Toolbox restored');
			client.reporter.systemLog(`Toolbox restored`);
		}),

		// supporters
		command(['swap'], '/swap <name> - swap character', '', async ({ world }, client, message) => {
			if (!message) {
				return saySystem(client, `You need to provide name of the character`);
			}

			const regex = new RegExp(`^${escapeRegExp(message)}$`, 'i');
			const query = { account: client.account._id, name: { $regex: regex } };
			await swapCharacter(client, world, query);
		}),
		command(['s1'], '', 'sup1', shouldNotBeCalled),
		command(['s2'], '', 'sup2', shouldNotBeCalled),
		command(['s3'], '', 'sup3', shouldNotBeCalled),
		command(['ss'], '/ss - supporter text', 'sup1', shouldNotBeCalled),

		// mod
		adminModChat(['m'], '/m - mod text', 'mod', MessageType.Mod),
		command(['emotetest'], '/emotetest - print all emotes', 'mod', (_context, client) => {
			let text = '';

			for (let i = 0; i < emojis.length;) {
				if (text) {
					text += '\n';
				}

				for (let j = 0; i < emojis.length && j < 20; j++ , i++) {
					text += emojis[i].symbol;
				}
			}

			sayTo(client, client.pony, text, MessageType.Chat);
		}),
		command(['goto'], '/goto <id> [<instance>]', 'mod', ({ world }, client, message) => {
			const [id = '', instance] = message.split(' ');
			const map = world.maps.find(map => map.id === id && map.instance === instance);

			if (map) {
				const { x, y } = randomPoint(map.spawnArea);
				world.switchToMap(client, map, x, y);
			}
		}),
		command(['tp'], '/tp <location> | <x> <y> - teleport to location', 'mod', (_context, client, message) => {
			const { x, y } = getSpawnTarget(client.map, message);
			teleportTo(client, x, y);
		}),

		// admin
		adminModChat(['a'], '/a - admin text', 'admin', MessageType.Admin),
		command(['announce'], '/announce - global announcement', 'admin', ({ }, client, message, _, __, settings) => {
			findEntities(client.map, e => e.type === butterfly.type || e.type === bat.type || e.type === firefly.type)
				.forEach(e => sayToAll(e, message, filterBadWords(message), MessageType.Admin, settings));
		}),
		command(['time'], '/time <hour> - change server time', DEVELOPMENT ? '' : 'admin', ({ world }, _client, message) => {
			if (!/^\d+$/.test(message)) {
				throw new UserError('invalid parameter');
			}

			world.setTime(parseInt(message, 10) % 24);
		}),
		command(['togglerestore'], '/togglerestore - toggle terrain restoration', 'admin', ({ world: { options } }, client) => {
			options.restoreTerrain = !options.restoreTerrain;
			saySystem(client, `restoration is ${options.restoreTerrain ? 'on' : 'off'}`);
		}),
		command(['resettiles'], '/resettiles - reset tiles to original state', 'admin', ({ }, client) => {
			for (const region of client.map.regions) {
				resetTiles(client.map, region);
			}
		}),
		BETA && command(['season'], '/season <season> [<holiday>]', 'admin', ({ world }, _client, message) => {
			const [s = '', h = ''] = message.split(' ');
			const season = parseSeason(s);
			const holiday = parseHoliday(h);

			if (season === undefined) {
				throw new UserError('invalid season');
			} else {
				world.setSeason(season, holiday === undefined ? world.holiday : holiday);
			}
		}),
		BETA && command(['weather'], '/weather <none|rain>', 'admin', ({ }, client, message) => {
			const weather = parseWeather(message);

			if (weather === undefined) {
				throw new UserError('invalid weather');
			} else {
				updateMapState(client.map, { weather });
			}
		}),

		// superadmin
		command(['update'], '/update - prepare server for update', 'superadmin', ({ world, liveSettings }) => {
			createNotifyUpdate(world, liveSettings)();
		}),
		command(['shutdown'], '/shutdown - shutdown server for update', 'superadmin', ({ world, liveSettings }) => {
			createShutdownServer(world, liveSettings)(true);
		}),

		// debug
		DEVELOPMENT && command(['map'], '/map - show map info', '', ({ world }, client) => {
			const map = client.map;
			const { memory, entities } = getSizeOfMap(map);
			const message = `[${map.id}:${map.instance || '-'}] ${world.maps.indexOf(map)}/${world.maps.length} ` +
				`${(memory / 1024).toFixed(2)} kb ${entities} entities`;
			saySystem(client, message);
		}),
		command(['loadmap'], '/loadmap <file name> - load map from file', 'superadmin', ({ world }, client, message) => {
			execWithFileName(client, message, fileName =>
				loadMapFromFile(world, client.map, pathTo('store', `${fileName}.json`), { loadOnlyTiles: true }));
		}),
		command(['savemap'], '/savemap <file name> - save map to file', 'superadmin', (_, client, message) => {
			execWithFileName(client, message, async fileName => {
				await saveMapToFile(client.map, pathTo('store', `${fileName}.json`), { saveTiles: true });
				// await saveMapToFileBinary(client.map, pathTo('store', `${fileName}.bin`));
			});
		}),
		command(['savemapbin'], '/savemapbin <file name> - save map to file', 'superadmin', (_, client, message) => {
			execWithFileName(client, message, fileName => saveMapToFileBinaryAlt(client.map, pathTo('store', `${fileName}.json`)));
		}),
		command(['saveentities'], '/saveentities <file name> - save entities to file', 'superadmin', (_, client, message) => {
			execWithFileName(client, message, fileName => saveEntitiesToFile(client.map, pathTo('store', `${fileName}.txt`)));
		}),
		command(['savehides'], '/savehides - save hides to file', 'superadmin', async ({ world }, client) => {
			const json = world.hidingService.serialize();
			await writeFileAsync(pathTo('store', 'hides.json'), json, 'utf8');
			saySystem(client, 'saved');
		}),
		command(['throwerror'], '/throwerror <message> - throw test error', 'superadmin', (_, _client, message) => {
			throw new Error(message || 'test');
		}),
		BETA && command(['test'], '', 'superadmin', ({ }, client) => {
			client.map.regions.forEach(region => {
				console.log(region.x, region.y, region.colliders.length);
			});
		}),
		BETA && command(['spamchat'], '/spamchat - spam chat messages', 'superadmin',
			({ world, random }, client, _, __, ___, settings) => {
				if (interval) {
					clearInterval(interval);
					interval = undefined;
				} else {
					interval = setInterval(() => {
						if (includes(world.clients, client)) {
							const message = range(random(1, 10)).map(() => randomString(random(1, 10))).join(' ');
							sayToEveryone(client, message, message, MessageType.Chat, settings);
						} else {
							clearInterval(interval);
						}
					}, 100);
				}
			}),
		BETA && command(['noclouds'], '/noclouds - remove clouds', 'superadmin', ({ world }, client) => {
			findEntities(client.map, e => e.type === cloud.type).forEach(e => world.removeEntity(e, client.map));
		}),
		BETA && command(['msg'], '/msg - say random stuff', 'superadmin', ({ }, client, _, __, ___, settings) => {
			findEntities(client.map, e => !!e.options && e.name === 'debug 2')
				.forEach(e => sayToAll(e, 'Hello there!', 'Hello there!', MessageType.Chat, settings));
		}),
		BETA && command(['hold'], '/hold <name> - hold item', 'superadmin', ({ }, client, message) => {
			holdItem(client.pony, getEntityType(message));
		}),
		BETA && command(['toy'], '/toy <number> - hold toy', 'superadmin', ({ }, client, message) => {
			holdToy(client.pony, parseInt(message, 10) | 0);
		}),
		BETA && command(['dc'], '/dc', 'superadmin', ({ }, client) => {
			client.disconnect(true, false);
		}),
		BETA && command(['disconnect'], '/disconnect', 'superadmin', ({ }, client) => {
			client.disconnect(true, true);
		}),
		BETA && command(['info'], '/info <id>', 'superadmin', ({ world }, client, message) => {
			const id = parseInt(message, 10) | 0;
			const entity = world.getEntityById(id);

			if (entity) {
				const { id, type, x, y, options } = entity;
				const info = { id, type: getEntityTypeName(type), x, y, options };
				saySystem(client, JSON.stringify(info, null, 2));
			} else {
				saySystem(client, 'undefined');
			}
		}),
		BETA && command(['collider'], '/collider', 'superadmin', ({ }, client) => {
			const region = getRegionGlobal(client.map, client.pony.x, client.pony.y);

			if (region) {
				saveRegionCollider(region);
				saySystem(client, 'saved');
				// console.log(region.tileIndices);
			}
		}),
		DEVELOPMENT && command(['testparty'], '', 'superadmin', ({ party }, client) => {
			const entities = findEntities(client.map, e => !!e.client && /^debug/.test(e.name || ''));

			for (const e of entities.slice(0, PARTY_LIMIT - 1)) {
				party.invite(client, e.client!);
			}
		}),
	]);

	return commands;
}

export function getSpamCommandNames(commands: Command[]): string[] {
	return flatten(commands.filter(c => c.spam).map(c => c.names));
}

export type RunCommand = ReturnType<typeof createRunCommand>;

export const createRunCommand =
	(context: CommandContext, commands: Command[]) =>
		(client: IClient, command: string, args: string, type: ChatType, target: IClient | undefined, settings: GameServerSettings) => {
			command = command.toLowerCase().trim();
			const func = commands.find(c => c.names.indexOf(command) !== -1);

			try {
				if (func && hasRoleNull(client, func.role)) {
					func.handler(context, client, args, type, target, settings);
				} else {
					return false;
				}
			} catch (e) {
				if (isUserError(e)) {
					saySystem(client, e.message);
				} else {
					throw e;
				}
			}

			return true;
		};

const chatTypes = new Map<string, ChatType>();
chatTypes.set('p', ChatType.Party);
chatTypes.set('party', ChatType.Party);
chatTypes.set('s', ChatType.Say);
chatTypes.set('say', ChatType.Say);
chatTypes.set('t', ChatType.Think);
chatTypes.set('think', ChatType.Think);
chatTypes.set('ss', ChatType.Supporter);
chatTypes.set('s1', ChatType.Supporter1);
chatTypes.set('s2', ChatType.Supporter2);
chatTypes.set('s3', ChatType.Supporter3);
chatTypes.set('r', ChatType.Whisper);
chatTypes.set('reply', ChatType.Whisper);
chatTypes.set('w', ChatType.Whisper);
chatTypes.set('whisper', ChatType.Whisper);

export function parseCommand(text: string, type: ChatType): { command?: string; args: string; type: ChatType; } {
	if (!isCommand(text)) {
		return { args: text, type };
	}

	const { command, args } = processCommand(text);

	if (command) {
		const chatType = chatTypes.get(command.toLowerCase());

		if (chatType !== undefined) {
			if (chatType === ChatType.Think) {
				type = type === ChatType.Party ? ChatType.PartyThink : ChatType.Think;
			} else {
				type = chatType;
			}

			return { args, type };
		}
	}

	return { command, args, type };
}

export function getChatPrefix(type: ChatType) {
	switch (type) {
		case ChatType.Party:
		case ChatType.PartyThink:
			return '/p ';
		case ChatType.Supporter:
			return '/ss ';
		case ChatType.Dismiss:
			return '/dismiss ';
		case ChatType.Whisper:
			return '/w ';
		default:
			return '';
	}
}
